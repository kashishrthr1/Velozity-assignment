import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import * as taskService from '../services/task.service';
import { getIo } from '../socket';

const router = Router({ mergeParams: true });
router.use(authenticate);

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectId: z.string().min(1),
  assignedToId: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dueDate: z.string().datetime(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assignedToId: z.string().nullable().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dueDate: z.string().datetime().optional(),
});

const taskQuerySchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
});

router.get('/:projectId', validateQuery(taskQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    const filters: taskService.TaskFilters = {};
    const q = req.query as { status?: string; priority?: string; dueDateFrom?: string; dueDateTo?: string };
    if (q.status) filters.status = q.status as taskService.TaskFilters['status'];
    if (q.priority) filters.priority = q.priority as taskService.TaskFilters['priority'];
    if (q.dueDateFrom) filters.dueDateFrom = new Date(q.dueDateFrom);
    if (q.dueDateTo) filters.dueDateTo = new Date(q.dueDateTo);
    res.json(await taskService.getTasksForProject(req.params.projectId, userId, role, filters));
  } catch (err) { next(err); }
});

router.get('/single/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    res.json(await taskService.getTaskById(req.params.id, userId, role));
  } catch (err) { next(err); }
});

router.post('/', requireRole('ADMIN', 'PROJECT_MANAGER'), validate(createTaskSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role: _role } = req.user!;
    const user = await import('../lib/prisma').then(m => m.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }));
    const data = { ...req.body, dueDate: new Date(req.body.dueDate) };
    const task = await taskService.createTask(data, userId, user?.name || 'Unknown');
    
    // Emit socket event
    const io = getIo();
    if (io) {
      io.to(`project:${task.projectId}`).emit('activity', {
        message: `Task "${task.title}" was created`,
        taskId: task.id,
        projectId: task.projectId,
        timestamp: new Date().toISOString(),
      });
    }
    
    res.status(201).json(task);
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    const user = await import('../lib/prisma').then(m => m.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }));
    const data = { ...req.body };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);

    const io = getIo();
    const task = await taskService.updateTask(
      req.params.id,
      userId,
      role,
      user?.name || 'Unknown',
      data,
      io ? (act) => {
        io.to(`project:${act.projectId}`).emit('activity', {
          ...act,
          timestamp: new Date().toISOString(),
        });
        // Also notify the specific user via their room
        // Notification badge update will be sent via notif route
      } : undefined
    );
    res.json(task);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('ADMIN', 'PROJECT_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    await taskService.deleteTask(req.params.id, userId, role);
    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
});

export default router;
