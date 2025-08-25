import express, { Request, Response } from 'express';
import { getLogs, clearLogs } from './log.service';

export const LogRoutes = express.Router();

// GET /api/v1/logs?level=INFO&page=1&limit=20
LogRoutes.get('/', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
  const levelParam = ((req.query.level as string) || 'ALL').toUpperCase();
  const level = ['DEBUG','INFO','WARN','ERROR','ALL'].includes(levelParam) ? (levelParam as any) : 'ALL';

  const data = await getLogs({ page, limit, level });
  res.json({ success: true, data });
});

// DELETE /api/v1/logs -> delete all logs
LogRoutes.delete('/', async (_req: Request, res: Response) => {
  const result = await clearLogs();
  res.json({ success: true, deleted: result.count });
});

// POST /api/v1/logs/clear -> delete all logs (for environments blocking DELETE)
LogRoutes.post('/clear', async (_req: Request, res: Response) => {
  const result = await clearLogs();
  res.json({ success: true, deleted: result.count });
});
