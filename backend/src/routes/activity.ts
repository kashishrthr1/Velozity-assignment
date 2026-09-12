import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import * as activityService from '../services/activity.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    res.json(await activityService.getActivityForRole(userId, role));
  } catch (err) { next(err); }
});

// Catch-up endpoint: returns last 20 events since a given timestamp
router.get('/catchup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    const since = req.query.since as string;
    if (!since) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'since query param required' } });
      return;
    }
    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'Invalid since date' } });
      return;
    }
    res.json(await activityService.getMissedEvents(userId, role, sinceDate));
  } catch (err) { next(err); }
});

export default router;
