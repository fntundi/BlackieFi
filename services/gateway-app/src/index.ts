import express from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import cors from 'cors';
import { config } from './config';
import { correlationMiddleware } from './middleware/correlation';
import { authMiddleware } from './middleware/auth';

const app = express();

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(correlationMiddleware);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'gateway-app', version: '3.0.0' });
});

// Auth middleware (skips public paths)
app.use(authMiddleware);

// Proxy options factory
function proxyOpts(target: string): Options {
  return {
    target,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000,
    on: {
      error: (err, _req, res) => {
        console.error(`Proxy error to ${target}:`, err.message);
        if ('writeHead' in res) {
          (res as any).writeHead(502, { 'Content-Type': 'application/json' });
          (res as any).end(JSON.stringify({ detail: 'Service unavailable' }));
        }
      }
    }
  };
}

// Service routes (order matters - specific before general)
app.use('/api/auth', createProxyMiddleware(proxyOpts(config.services.auth)));
app.use('/api/entities', createProxyMiddleware(proxyOpts(config.services.entity)));

// Portfolio service handles financial routes
app.use('/api/accounts', createProxyMiddleware(proxyOpts(config.services.portfolio)));
app.use('/api/income', createProxyMiddleware(proxyOpts(config.services.portfolio)));
app.use('/api/expenses', createProxyMiddleware(proxyOpts(config.services.portfolio)));
app.use('/api/debts', createProxyMiddleware(proxyOpts(config.services.portfolio)));
app.use('/api/transactions', createProxyMiddleware(proxyOpts(config.services.portfolio)));
app.use('/api/investments', createProxyMiddleware(proxyOpts(config.services.portfolio)));
app.use('/api/budgets', createProxyMiddleware(proxyOpts(config.services.portfolio)));
app.use('/api/savings-funds', createProxyMiddleware(proxyOpts(config.services.portfolio)));

// Assets service
app.use('/api/assets', createProxyMiddleware(proxyOpts(config.services.assets)));

// Core service handles AI, notifications, currency, data, RAG, categories, roles, calendar, dashboard, onboarding
app.use('/api/ai', createProxyMiddleware(proxyOpts(config.services.core)));
app.use('/api/notifications', createProxyMiddleware(proxyOpts(config.services.core)));
app.use('/api/currency', createProxyMiddleware(proxyOpts(config.services.core)));
app.use('/api/data', createProxyMiddleware(proxyOpts(config.services.core)));
app.use('/api/rag', createProxyMiddleware(proxyOpts(config.services.core)));
app.use('/api/categories', createProxyMiddleware(proxyOpts(config.services.core)));
app.use('/api/roles', createProxyMiddleware(proxyOpts(config.services.core)));
app.use('/api/calendar', createProxyMiddleware(proxyOpts(config.services.core)));
app.use('/api/dashboard', createProxyMiddleware(proxyOpts(config.services.core)));
app.use('/api/onboarding', createProxyMiddleware(proxyOpts(config.services.core)));

// Catch-all for /api -> core service
app.use('/api', createProxyMiddleware(proxyOpts(config.services.core)));

// WebSocket proxy for notifications
app.use('/ws', createProxyMiddleware({
  target: config.services.core,
  changeOrigin: true,
  ws: true,
}));

// Start
const port = config.port || 8000;
app.listen(port, () => {
  console.log(`Gateway App running on port ${port}`);
  console.log(`  Auth:      ${config.services.auth}`);
  console.log(`  Core:      ${config.services.core}`);
  console.log(`  Entity:    ${config.services.entity}`);
  console.log(`  Portfolio: ${config.services.portfolio}`);
  console.log(`  Assets:    ${config.services.assets}`);
});

export default app;
