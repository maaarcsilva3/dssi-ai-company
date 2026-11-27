import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`);

export const apiNotFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `No route for ${req.method} ${req.originalUrl}`));
};

const PG_ERRORS: Record<string, [number, string]> = {
  '23505': [409, 'A record with the same value already exists'],
  '23503': [409, 'Referenced record does not exist or is still in use'],
  '23514': [400, 'Value violates a database constraint'],
  '22P02': [400, 'Invalid input value'],
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten() });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message, details: { code: err.code } });
    return;
  }
  const pgCode = (err as { code?: string })?.code;
  if (pgCode && PG_ERRORS[pgCode]) {
    const [status, message] = PG_ERRORS[pgCode];
    res.status(status).json({ error: message, details: { constraint: (err as { constraint?: string }).constraint } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
