import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as clientService from '../services/client.service';

const router = Router();
router.use(authenticate);

const clientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().min(1),
});

// Admin + PM can read clients
router.get('/', requireRole('ADMIN', 'PROJECT_MANAGER'), async (_req, res, next) => {
  try { res.json(await clientService.getAllClients()); } catch (err) { next(err); }
});

router.get('/:id', requireRole('ADMIN', 'PROJECT_MANAGER'), async (req, res, next) => {
  try { res.json(await clientService.getClientById(req.params.id)); } catch (err) { next(err); }
});

// Admin only — create/update/delete clients
router.post('/', requireRole('ADMIN'), validate(clientSchema), async (req, res, next) => {
  try { res.status(201).json(await clientService.createClient(req.body)); } catch (err) { next(err); }
});

router.put('/:id', requireRole('ADMIN'), validate(clientSchema.partial()), async (req, res, next) => {
  try { res.json(await clientService.updateClient(req.params.id, req.body)); } catch (err) { next(err); }
});

router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try { await clientService.deleteClient(req.params.id); res.json({ message: 'Client deleted' }); } catch (err) { next(err); }
});

export default router;
