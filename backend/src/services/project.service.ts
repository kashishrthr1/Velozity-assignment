import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { Role, ProjectStatus } from '@prisma/client';

export async function getProjects(userId: string, role: Role) {
  if (role === 'ADMIN') {
    return prisma.project.findMany({
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (role === 'PROJECT_MANAGER') {
    return prisma.project.findMany({
      where: { createdById: userId },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Developer — only projects that have tasks assigned to them
  const tasks = await prisma.task.findMany({
    where: { assignedToId: userId },
    select: { projectId: true },
    distinct: ['projectId'],
  });
  const projectIds = tasks.map((t) => t.projectId);
  return prisma.project.findMany({
    where: { id: { in: projectIds } },
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProjectById(projectId: string, userId: string, role: Role) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      createdBy: { select: { id: true, name: true, email: true } },
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      },
    },
  });

  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');

  // PM can only see their own projects
  if (role === 'PROJECT_MANAGER' && project.createdById !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this project');
  }

  // Developer can only see projects with tasks assigned to them
  if (role === 'DEVELOPER') {
    const hasTasks = project.tasks.some((t) => t.assignedToId === userId);
    if (!hasTasks) throw new AppError(403, 'FORBIDDEN', 'You do not have access to this project');
    // Filter tasks to only show developer's own
    project.tasks = project.tasks.filter((t) => t.assignedToId === userId);
  }

  return project;
}

export async function createProject(data: {
  name: string;
  description?: string;
  clientId: string;
  status?: ProjectStatus;
}, createdById: string) {
  return prisma.project.create({
    data: { ...data, createdById },
    include: { client: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
  });
}

export async function updateProject(
  projectId: string,
  userId: string,
  role: Role,
  data: { name?: string; description?: string; status?: ProjectStatus; clientId?: string }
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  if (role === 'PROJECT_MANAGER' && project.createdById !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only edit your own projects');
  }
  return prisma.project.update({ where: { id: projectId }, data });
}

export async function deleteProject(projectId: string, userId: string, role: Role) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  if (role === 'PROJECT_MANAGER' && project.createdById !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only delete your own projects');
  }
  await prisma.project.delete({ where: { id: projectId } });
}

export async function getProjectStats(userId: string, role: Role) {
  if (role === 'ADMIN') {
    const [totalProjects, tasksByStatus, overdueCount, onlineUsers] = await Promise.all([
      prisma.project.count(),
      prisma.task.groupBy({ by: ['status'], _count: true }),
      prisma.task.count({ where: { isOverdue: true } }),
      prisma.user.count({ where: { isOnline: true } }),
    ]);
    return { totalProjects, tasksByStatus, overdueCount, onlineUsers };
  }

  if (role === 'PROJECT_MANAGER') {
    const [projects, tasksByPriority] = await Promise.all([
      prisma.project.findMany({
        where: { createdById: userId },
        include: { _count: { select: { tasks: true } } },
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: { project: { createdById: userId } },
        _count: true,
      }),
    ]);
    const now = new Date();
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const upcomingTasks = await prisma.task.findMany({
      where: {
        project: { createdById: userId },
        dueDate: { gte: now, lte: weekEnd },
        status: { not: 'DONE' },
      },
      include: { assignedTo: { select: { name: true } }, project: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });
    return { projects, tasksByPriority, upcomingTasks };
  }

  // Developer
  const tasks = await prisma.task.findMany({
    where: { assignedToId: userId },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });
  return { tasks };
}
