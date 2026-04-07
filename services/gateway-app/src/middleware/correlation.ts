/**
 * BlackieFi 3.0 - Correlation ID Middleware
 */
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

export function correlationMiddleware(
  req: RequestWithCorrelation,
  res: Response,
  next: NextFunction
): void {
  // Use existing correlation ID or generate new one
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  
  req.correlationId = correlationId;
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  
  next();
}
