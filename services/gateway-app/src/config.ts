/**
 * BlackieFi 3.0 - Gateway App Configuration
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from root
const rootEnv = path.resolve(__dirname, '../../../.env');
const templateEnv = path.resolve(__dirname, '../../../.env.template');

// Auto-create .env from template if missing
if (!fs.existsSync(rootEnv) && fs.existsSync(templateEnv)) {
  fs.copyFileSync(templateEnv, rootEnv);
  console.log('Created .env from .env.template');
}

dotenv.config({ path: rootEnv });

export const config = {
  port: parseInt(process.env.GATEWAY_APP_PORT || '8000', 10),
  
  jwt: {
    secret: process.env.JWT_SECRET || 'blackiefi-super-secret-key-change-in-production',
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
  },
  
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://auth:8001',
    core: process.env.CORE_SERVICE_URL || 'http://core:8002',
    entity: process.env.ENTITY_SERVICE_URL || 'http://entity:8003',
    portfolio: process.env.PORTFOLIO_SERVICE_URL || 'http://portfolio:8004',
    assets: process.env.ASSETS_SERVICE_URL || 'http://assets:8005',
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://redis:6379',
  },
  
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8080').split(','),
  },
  
  logLevel: process.env.LOG_LEVEL || 'info',
};
