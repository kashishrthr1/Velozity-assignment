import cron from 'node-cron';
import { prisma } from '../lib/prisma';

export function startOverdueChecker(): void {
  // Runs every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();
      const result = await prisma.task.updateMany({
        where: {
          dueDate: { lt: now },
          status: { notIn: ['DONE'] },
          isOverdue: false,
        },
        data: { isOverdue: true },
      });
      if (result.count > 0) {
        console.log(`[Overdue Checker] Flagged ${result.count} task(s) as overdue at ${now.toISOString()}`);
      }
    } catch (err) {
      console.error('[Overdue Checker] Error:', err);
    }
  });

  console.log('[Overdue Checker] Scheduler started (every 15 minutes)');
}
