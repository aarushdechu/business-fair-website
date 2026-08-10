import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { registerAuthRoutes } from './auth.js';
import { isProduction } from './config.js';
import { registerOrderRoutes } from './orders.js';
import { createRateLimit } from './utils.js';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(serverDirectory, '..', 'public');
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit:'32kb' }));
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy':'same-origin-allow-popups'
  });
  next();
});

const limits = {
  staff:createRateLimit('staff', 40, 60_000),
  tracking:createRateLimit('tracking', 25, 60_000),
  auth:createRateLimit('auth', 12, 60_000),
  publicOrders:createRateLimit('public-orders', 12, 60_000)
};

registerAuthRoutes(app, limits.auth);
registerOrderRoutes(app, limits);

app.use('/assets', express.static(path.join(publicDirectory, 'assets'), {
  maxAge:isProduction ? '7d' : 0
}));
app.use(express.static(publicDirectory, {
  maxAge:0,
  setHeaders:(res, filePath) => {
    if (filePath.endsWith('service-worker.js')) res.set('Cache-Control', 'no-cache');
  }
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error:'Something went wrong. Please try again.' });
});

export default app;
