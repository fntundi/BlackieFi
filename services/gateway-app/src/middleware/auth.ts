/**
 * BlackieFi 3.0 - JWT Authentication Middleware
 */
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from './config';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  correlationId?: string;
}

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/health',
  '/api/',
  '/health',
];

// Check if path is public
function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(publicPath => {
    if (publicPath.endsWith('/')) {
      return path === publicPath || path === publicPath.slice(0, -1);
    }
    return path === publicPath || path.startsWith(publicPath + '/');
  });
}

// JWT verification middleware
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const path = req.path;
  
  // Skip auth for public paths
  if (isPublicPath(path)) {
    return next();
  }
  
  // Skip auth for health checks on any service
  if (path.endsWith('/health')) {
    return next();
  }
  
  // Get token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Missing or invalid authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
    req.userId = decoded.sub as string;
    
    // Add user context header for downstream services
    req.headers['x-user-id'] = req.userId;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ detail: 'Token has expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ detail: 'Invalid token' });
    } else {
      res.status(401).json({ detail: 'Authentication failed' });
    }
  }
}
