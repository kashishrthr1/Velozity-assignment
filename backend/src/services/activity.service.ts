import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

export async function createActivity(data: {
  projectId?: string;
  userId: string;
  taskId?: string;
  actionType: string;
  message: string;
}) {
  return prisma.activityFeed.create({ data });
}

export async function getActivityForRole(userId: string, role: Role, limit = 50) {
  if (role === 'ADMIN') {
    return prisma.activityFeed.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { name: true } }, task: { select: { title: true } } },
    });
  }

  if (role === 'PROJECT_MANAGER') {
    // Only activity from projects this PM created
    const pmProjects = await prisma.project.findMany({
      where: { createdById: userId },
      select: { id: true },
    });
    const projectIds = pmProjects.map((p) => p.id);
    return prisma.activityFeed.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { name: true } }, task: { select: { title: true } } },
    });
  }

  // Developer — only activity on tasks assigned to them
  const devTasks = await prisma.task.findMany({
    where: { assignedToId: userId },
    select: { id: true },
  });
  const taskIds = devTasks.map((t) => t.id);
  return prisma.activityFeed.findMany({
    where: { taskId: { in: taskIds } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { name: true } }, task: { select: { title: true } } },
  });
}

export async function getMissedEvents(userId: string, role: Role, since: Date) {
  // Return last 20 events since a given timestamp, scoped by role
  if (role === 'ADMIN') {
    return prisma.activityFeed.findMany({
      where: { createdAt: { gt: since } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } }, task: { select: { title: true } } },
    });
  }

  if (role === 'PROJECT_MANAGER') {
    const pmProjects = await prisma.project.findMany({
      where: { createdById: userId },
      select: { id: true },
    });
    const projectIds = pmProjects.map((p) => p.id);
    return prisma.activityFeed.findMany({
      where: { projectId: { in: projectIds }, createdAt: { gt: since } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } }, task: { select: { title: true } } },
    });
  }

  const devTasks = await prisma.task.findMany({
    where: { assignedToId: userId },
    select: { id: true },
  });
  const taskIds = devTasks.map((t) => t.id);
  return prisma.activityFeed.findMany({
    where: { taskId: { in: taskIds }, createdAt: { gt: since } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { user: { select: { name: true } }, task: { select: { title: true } } },
  });
}
