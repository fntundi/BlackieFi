/**
 * BlackieFi 3.0 - Gateway App Entry Point
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from './config';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth';
import { correlationMiddleware } from './middleware/correlation';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Let nginx handle this
}));

// CORS
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
}));

// Logging
app.use(morgan('combined'));

// Correlation ID
app.use(correlationMiddleware);

// Parse JSON for non-proxied routes
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'gateway-app',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Auth middleware (applied before proxy)
app.use('/api', authMiddleware);

// Proxy options factory
function createProxyOptions(target: string): Options {
  return {
    target,
    changeOrigin: true,
    onError: (err: Error, req: Request, res: Response) => {
      console.error(`Proxy error: ${err.message}`);
      (res as Response).status(502).json({
        error: 'Service unavailable',
        detail: 'Unable to reach the backend service',
      });
    },
    onProxyReq: (proxyReq, req: AuthenticatedRequest) => {
      // Forward correlation ID
      if (req.correlationId) {
        proxyReq.setHeader('x-correlation-id', req.correlationId);
      }
      // Forward user ID if authenticated
      if (req.userId) {
        proxyReq.setHeader('x-user-id', req.userId);
      }
    },
  };
}

// Service routing
app.use('/api/auth', createProxyMiddleware(createProxyOptions(config.services.auth)));
app.use('/api/entities', createProxyMiddleware(createProxyOptions(config.services.entity)));
app.use('/api/accounts', createProxyMiddleware(createProxyOptions(config.services.portfolio)));
app.use('/api/assets', createProxyMiddleware(createProxyOptions(config.services.assets)));
app.use('/api', createProxyMiddleware(createProxyOptions(config.services.core)));

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Gateway error:', err);
  res.status(500).json({
    error: 'Internal server error',
    detail: err.message,
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BlackieFi Gateway App running on port ${PORT}`);
  console.log('Service routes:');
  console.log(`  /api/auth/* -> ${config.services.auth}`);
  console.log(`  /api/entities/* -> ${config.services.entity}`);
  console.log(`  /api/accounts/* -> ${config.services.portfolio}`);
  console.log(`  /api/assets/* -> ${config.services.assets}`);
  console.log(`  /api/* -> ${config.services.core}`);
});

export default app;
