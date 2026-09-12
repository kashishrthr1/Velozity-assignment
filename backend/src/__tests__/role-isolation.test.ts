import { prisma } from '../lib/prisma';
import * as projectService from '../services/project.service';
import * as activityService from '../services/activity.service';
import { AppError } from '../middleware/errorHandler';

// Mock prisma for isolated unit tests
jest.mock('../lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
    },
    activityFeed: {
      findMany: jest.fn(),
    },
  },
}));

describe('PM Ownership Isolation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('PM cannot read a project created by another PM', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      name: 'Secret Project PM1',
      createdById: 'pm-1',
      tasks: [],
    });

    // PM-2 tries to access PM-1's project
    await expect(
      projectService.getProjectById('proj-1', 'pm-2', 'PROJECT_MANAGER')
    ).rejects.toThrow(AppError);

    await expect(
      projectService.getProjectById('proj-1', 'pm-2', 'PROJECT_MANAGER')
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'You do not have access to this project',
    });
  });

  it('PM can read their own project', async () => {
    const mockProject = {
      id: 'proj-1',
      name: 'Project PM1',
      createdById: 'pm-1',
      tasks: [],
    };
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

    const result = await projectService.getProjectById('proj-1', 'pm-1', 'PROJECT_MANAGER');
    expect(result).toBeDefined();
    expect(result.id).toBe('proj-1');
  });

  it('PM cannot edit/update a project created by another PM', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      name: 'PM1 Project',
      createdById: 'pm-1',
    });

    await expect(
      projectService.updateProject('proj-1', 'pm-2', 'PROJECT_MANAGER', { name: 'Tampered Name' })
    ).rejects.toThrow(AppError);

    await expect(
      projectService.updateProject('proj-1', 'pm-2', 'PROJECT_MANAGER', { name: 'Tampered Name' })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'You can only edit your own projects',
    });
  });

  it('PM cannot delete a project created by another PM', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      name: 'PM1 Project',
      createdById: 'pm-1',
    });

    await expect(
      projectService.deleteProject('proj-1', 'pm-2', 'PROJECT_MANAGER')
    ).rejects.toThrow(AppError);

    await expect(
      projectService.deleteProject('proj-1', 'pm-2', 'PROJECT_MANAGER')
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'You can only delete your own projects',
    });
  });
});

describe('Missed-Event Catch-Up Scoping & 20-Event Limit', () => {
  const since = new Date(Date.now() - 3600000);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Admin receives missed events scoped globally with take: 20', async () => {
    const mockEvents = Array.from({ length: 20 }, (_, i) => ({
      id: `ev-${i}`,
      message: `Global event ${i}`,
    }));
    (prisma.activityFeed.findMany as jest.Mock).mockResolvedValue(mockEvents);

    const result = await activityService.getMissedEvents('admin-1', 'ADMIN', since);

    expect(prisma.activityFeed.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdAt: { gt: since } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    );
    expect(result).toHaveLength(20);
  });

  it('PM receives missed events scoped strictly to their own projects with take: 20', async () => {
    // PM owns projects 'p1' and 'p2'
    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1' },
      { id: 'p2' },
    ]);
    const mockEvents = Array.from({ length: 15 }, (_, i) => ({
      id: `ev-pm-${i}`,
      projectId: 'p1',
      message: `PM event ${i}`,
    }));
    (prisma.activityFeed.findMany as jest.Mock).mockResolvedValue(mockEvents);

    const result = await activityService.getMissedEvents('pm-1', 'PROJECT_MANAGER', since);

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { createdById: 'pm-1' },
      select: { id: true },
    });
    expect(prisma.activityFeed.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: { in: ['p1', 'p2'] },
          createdAt: { gt: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    );
    expect(result).toHaveLength(15);
  });

  it('Developer receives missed events scoped strictly to their assigned tasks with take: 20', async () => {
    // Developer is assigned to tasks 't1' and 't2'
    (prisma.task.findMany as jest.Mock).mockResolvedValue([
      { id: 't1' },
      { id: 't2' },
    ]);
    const mockEvents = Array.from({ length: 5 }, (_, i) => ({
      id: `ev-dev-${i}`,
      taskId: 't1',
      message: `Dev event ${i}`,
    }));
    (prisma.activityFeed.findMany as jest.Mock).mockResolvedValue(mockEvents);

    const result = await activityService.getMissedEvents('dev-1', 'DEVELOPER', since);

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { assignedToId: 'dev-1' },
      select: { id: true },
    });
    expect(prisma.activityFeed.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          taskId: { in: ['t1', 't2'] },
          createdAt: { gt: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    );
    expect(result).toHaveLength(5);
  });
});
