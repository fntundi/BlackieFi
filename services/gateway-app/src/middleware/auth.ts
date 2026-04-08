import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/password-reset/request',
  '/api/auth/password-reset/confirm',
  '/api/auth/mfa/validate',
  '/api/currency/rates',
  '/api/currency/convert',
  '/api/health',
  '/api/',
  '/health',
];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for public paths
  const isPublic = PUBLIC_PATHS.some(p => req.path === p || req.path.startsWith(p + '/'));
  if (isPublic || req.method === 'OPTIONS') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    // Enrich request headers with user info for downstream services
    req.headers['x-user-id'] = decoded.sub;
    req.headers['x-user-role'] = decoded.role || '';
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ detail: 'Token expired' });
    } else {
      res.status(401).json({ detail: 'Authentication failed' });
    }
  }
}
