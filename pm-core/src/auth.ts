import { Request, Response, NextFunction } from 'express';

/**
 * Optional Bearer auth: if PM_CORE_API_TOKEN is set, require matching token.
 * If unset/empty, allow all requests (local dev).
 */
export function optionalBearerAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.PM_CORE_API_TOKEN?.trim();
  if (!expected) {
    next();
    return;
  }

  const header = req.headers.authorization ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || match[1] !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
