import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import * as notifService from '../services/notification.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await notifService.getUserNotifications(req.user!.userId));
  } catch (err) { next(err); }
});

router.get('/unread-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await notifService.getUnreadCount(req.user!.userId);
    res.json({ count });
  } catch (err) { next(err); }
});

router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notifService.markAsRead(req.params.id, req.user!.userId);
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

router.patch('/mark-all-read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notifService.markAllAsRead(req.user!.userId);
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
});

export default router;
