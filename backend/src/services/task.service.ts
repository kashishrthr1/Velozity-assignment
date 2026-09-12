import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { Role, TaskStatus, TaskPriority } from '@prisma/client';
import { createActivity } from './activity.service';
import { createNotification } from './notification.service';

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDateFrom?: Date;
  dueDateTo?: Date;
}

export async function getTasksForProject(projectId: string, userId: string, role: Role, filters: TaskFilters = {}) {
  const where: Record<string, unknown> = { projectId };

  if (role === 'DEVELOPER') {
    where.assignedToId = userId;
  }

  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.dueDateFrom || filters.dueDateTo) {
    where.dueDate = {};
    if (filters.dueDateFrom) (where.dueDate as Record<string, Date>).gte = filters.dueDateFrom;
    if (filters.dueDateTo) (where.dueDate as Record<string, Date>).lte = filters.dueDateTo;
  }

  return prisma.task.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      taskLogs: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { changedBy: { select: { name: true } } },
      },
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });
}

export async function getTaskById(taskId: string, userId: string, role: Role) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, createdById: true } },
      taskLogs: {
        orderBy: { createdAt: 'desc' },
        include: { changedBy: { select: { name: true } } },
      },
    },
  });

  if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');

  if (role === 'PROJECT_MANAGER' && task.project.createdById !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this task');
  }
  if (role === 'DEVELOPER' && task.assignedToId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this task');
  }

  return task;
}

export async function createTask(
  data: {
    title: string;
    description?: string;
    projectId: string;
    assignedToId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate: Date;
  },
  createdById: string,
  createdByName: string
) {
  // Verify project exists and PM owns it
  const task = await prisma.task.create({
    data: { ...data, createdById },
    include: {
      assignedTo: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Log creation
  await prisma.taskLog.create({
    data: {
      taskId: task.id,
      changedById: createdById,
      newStatus: task.status,
      note: 'Task created',
    },
  });

  // Activity feed
  const message = `${createdByName} created task "${task.title}" in ${task.project.name}`;
  await createActivity({
    projectId: task.projectId,
    userId: createdById,
    taskId: task.id,
    actionType: 'TASK_CREATED',
    message,
  });

  // Notify assigned developer
  if (task.assignedToId) {
    await createNotification({
      userId: task.assignedToId,
      taskId: task.id,
      message: `You have been assigned to task "${task.title}" in project "${task.project.name}"`,
    });
  }

  return task;
}

export async function updateTask(
  taskId: string,
  userId: string,
  role: Role,
  userName: string,
  data: {
    title?: string;
    description?: string;
    assignedToId?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date;
  },
  emitActivity?: (activity: { message: string; taskId: string; projectId: string }) => void
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignedTo: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, createdById: true } },
    },
  });
  if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');

  if (role === 'PROJECT_MANAGER' && task.project.createdById !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this task');
  }
  if (role === 'DEVELOPER') {
    if (task.assignedToId !== userId) throw new AppError(403, 'FORBIDDEN', 'You do not have access to this task');
    // Developers can only update status
    const allowedKeys = ['status'];
    const providedKeys = Object.keys(data);
    for (const key of providedKeys) {
      if (!allowedKeys.includes(key)) {
        throw new AppError(403, 'FORBIDDEN', 'Developers can only update task status');
      }
    }
  }

  const oldStatus = task.status;
  const updated = await prisma.task.update({
    where: { id: taskId },
    data,
    include: {
      assignedTo: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, createdById: true } },
    },
  });

  // Log status change
  if (data.status && data.status !== oldStatus) {
    await prisma.taskLog.create({
      data: {
        taskId: task.id,
        changedById: userId,
        oldStatus,
        newStatus: data.status,
      },
    });

    const statusLabel = (s: TaskStatus) => s.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const message = `${userName} moved "${task.title}" from ${statusLabel(oldStatus)} → ${statusLabel(data.status)} in ${task.project.name}`;

    const activity = await createActivity({
      projectId: task.projectId,
      userId,
      taskId: task.id,
      actionType: 'STATUS_CHANGED',
      message,
    });

    if (emitActivity) {
      emitActivity({ message, taskId: task.id, projectId: task.projectId });
    }

    // Notify PM when task moves to IN_REVIEW
    if (data.status === 'IN_REVIEW') {
      await createNotification({
        userId: task.project.createdById,
        taskId: task.id,
        message: `Task "${task.title}" in "${task.project.name}" has been moved to In Review`,
      });
    }
  }

  // Notify newly assigned developer
  if (data.assignedToId && data.assignedToId !== task.assignedToId) {
    await createNotification({
      userId: data.assignedToId,
      taskId: task.id,
      message: `You have been assigned to task "${task.title}" in project "${task.project.name}"`,
    });

    const message = `${userName} assigned "${task.title}" to a developer in ${task.project.name}`;
    await createActivity({
      projectId: task.projectId,
      userId,
      taskId: task.id,
      actionType: 'TASK_ASSIGNED',
      message,
    });
  }

  return updated;
}

export async function deleteTask(taskId: string, userId: string, role: Role) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { createdById: true } } },
  });
  if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
  if (role === 'PROJECT_MANAGER' && task.project.createdById !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only delete tasks in your own projects');
  }
  if (role === 'DEVELOPER') throw new AppError(403, 'FORBIDDEN', 'Developers cannot delete tasks');
  await prisma.task.delete({ where: { id: taskId } });
}
