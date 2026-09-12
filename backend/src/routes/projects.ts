import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as projectService from '../services/project.service';

const router = Router();
router.use(authenticate);

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  clientId: z.string().min(1),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
});

const updateProjectSchema = createProjectSchema.partial();

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    res.json(await projectService.getProjectStats(userId, role));
  } catch (err) { next(err); }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    res.json(await projectService.getProjects(userId, role));
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    res.json(await projectService.getProjectById(req.params.id, userId, role));
  } catch (err) { next(err); }
});

router.post('/', requireRole('ADMIN', 'PROJECT_MANAGER'), validate(createProjectSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await projectService.createProject(req.body, req.user!.userId));
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('ADMIN', 'PROJECT_MANAGER'), validate(updateProjectSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    res.json(await projectService.updateProject(req.params.id, userId, role, req.body));
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('ADMIN', 'PROJECT_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    await projectService.deleteProject(req.params.id, userId, role);
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
});

export default router;
