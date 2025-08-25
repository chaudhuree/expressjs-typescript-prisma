import { Request, Response, NextFunction } from 'express';
import prisma from './prisma';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

type LogItem = {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string | null;
  requestUrl?: string | null;
  method?: string | null;
  statusCode?: number | null;
  responseTime?: number | null; // ms
  ip?: string | null;
  userAgent?: string | null;
  meta?: any;
};

// Lightweight in-memory queue with periodic batch flush to DB
class LogQueue {
  private buf: LogItem[] = [];
  private flushing = false;
  private timer: NodeJS.Timeout;

  constructor(private maxBatch = 100, private intervalMs = 1000) {
    this.timer = setInterval(() => this.flush().catch(() => {}), this.intervalMs);
    this.timer.unref?.();
  }

  enqueue(item: LogItem) {
    this.buf.push(item);
    if (this.buf.length >= this.maxBatch) {
      // fire and forget
      void this.flush();
    }
  }

  async flush() {
    if (this.flushing || this.buf.length === 0) return;
    this.flushing = true;
    const batch = this.buf.splice(0, this.maxBatch);
    try {
      await (prisma as any).log.createMany({
        data: batch.map(b => ({
          timestamp: b.timestamp,
          level: b.level as any,
          message: b.message,
          context: b.context ?? undefined,
          requestUrl: b.requestUrl ?? undefined,
          method: b.method ?? undefined,
          statusCode: b.statusCode ?? undefined,
          responseTime: b.responseTime ?? undefined,
          ip: b.ip ?? undefined,
          userAgent: b.userAgent ?? undefined,
          meta: b.meta ?? undefined,
        })),
      });
    } catch (e) {
      // On failure, drop batch to avoid blocking app
      // Optionally could retry with backoff
    } finally {
      this.flushing = false;
    }
  }
}

export const logQueue = new LogQueue();

export function log(level: LogLevel, message: string, fields: Partial<LogItem> = {}) {
  logQueue.enqueue({
    timestamp: new Date(),
    level,
    message,
    context: fields.context ?? null,
    requestUrl: fields.requestUrl ?? null,
    method: fields.method ?? null,
    statusCode: fields.statusCode ?? null,
    responseTime: fields.responseTime ?? null,
    ip: fields.ip ?? null,
    userAgent: fields.userAgent ?? null,
    meta: fields.meta,
  });
}

// Express middleware to log requests/responses
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  const url = req.originalUrl || req.url || '';
  // Only log our API routes, skip everything else (views/static/unknown)
  const isApi = url.startsWith('/api/v1');
  const isExcluded =
    url.startsWith('/.well-known') || // special/unknown probes
    url.startsWith('/api/v1/chat') || // exclude chat API logs
    url.startsWith('/log') || // logs UI
    url.startsWith('/api/v1/logs') || // logs API
    url.startsWith('/api/v1/users'); // logs users API
  if (!isApi || isExcluded) {
    return next();
  }

  // Basic request log
  log('INFO', 'Incoming request', {
    requestUrl: req.originalUrl || req.url,
    method: req.method,
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
    userAgent: req.headers['user-agent'] || '',
    context: 'request',
  });

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const diffMs = Number(end - start) / 1_000_000;
    log('INFO', 'Request completed', {
      requestUrl: req.originalUrl || req.url,
      method: req.method,
      statusCode: res.statusCode,
      responseTime: Math.round(diffMs),
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      context: 'response',
    });
  });

  next();
}

export function logError(err: any, req?: Request, res?: Response) {
  // Only log errors for our API routes, exclude chat and logs endpoints and unknown probes
  const url = req ? (req.originalUrl || req.url || '') : '';
  const isApi = url.startsWith('/api/v1');
  const isExcluded =
    url.startsWith('/.well-known') ||
    url.startsWith('/api/v1/chat') ||
    url.startsWith('/log') ||
    url.startsWith('/api/v1/logs');
  if (!isApi || isExcluded) {
    return;
  }
  log('ERROR', err?.message || 'Unhandled error', {
    context: 'error',
    requestUrl: req ? (req.originalUrl || req.url) : undefined,
    method: req?.method,
    statusCode: res?.statusCode,
    ip: req ? ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '') : undefined,
    userAgent: req?.headers?.['user-agent'],
    meta: {
      stack: err?.stack,
      name: err?.name,
    },
  });
}
