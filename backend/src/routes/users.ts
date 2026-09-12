import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as userService from '../services/user.service';

const router = Router();

router.use(authenticate);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER']),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER']).optional(),
});

// Admin only — get all users
router.get('/', requireRole('ADMIN'), async (_req, res, next) => {
  try {
    res.json(await userService.getAllUsers());
  } catch (err) { next(err); }
});

// Admin + PM — get list of developers for assignment
router.get('/developers', requireRole('ADMIN', 'PROJECT_MANAGER'), async (_req, res, next) => {
  try {
    res.json(await userService.getDeveloperUsers());
  } catch (err) { next(err); }
});

// Admin only — get single user
router.get('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    res.json(await userService.getUserById(req.params.id));
  } catch (err) { next(err); }
});

// Admin only — create user
router.post('/', requireRole('ADMIN'), validate(createUserSchema), async (req, res, next) => {
  try {
    res.status(201).json(await userService.createUser(req.body));
  } catch (err) { next(err); }
});

// Admin only — update user
router.put('/:id', requireRole('ADMIN'), validate(updateUserSchema), async (req, res, next) => {
  try {
    res.json(await userService.updateUser(req.params.id, req.body));
  } catch (err) { next(err); }
});

// Admin only — delete user
router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
});

export default router;
