import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';
import { pool } from './db';
import { migrate } from './migrate';
import { apiNotFound, errorHandler } from './lib/http';
import {
  attachUser,
  createSessionMiddleware,
  requireAnyPermission,
  requireAuth,
  requirePermission,
} from './lib/auth';
import {
  arDeductionDescriptionsRouter,
  clientsRouter,
  customersRouter,
  paymentMethodsRouter,
  paymentTermsRouter,
  paymentTypesRouter,
  receivableStatusesRouter,
  statusesRouter,
} from './routes/masterdata';
import { payablesRouter } from './routes/payables';
import { attachmentsRouter, payableAttachmentsRouter } from './routes/attachments';
import { settingsRouter } from './routes/settings';
import { releasesRouter } from './routes/releases';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { reportsRouter } from './routes/reports';
import { sourceAccountsRouter } from './routes/sourceAccounts';
import { telegramRouter } from './routes/telegram';
import { registerTelegramWebhook } from './lib/telegram';
import { notificationsRouter } from './routes/notifications';
import { liquidationsRouter } from './routes/liquidations';
import { truckAllowancesRouter } from './routes/truckAllowances';
import { arRouter } from './routes/ar';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(createSessionMiddleware());
app.use(attachUser());

/** Allow GET masterdata for any authenticated user (dropdowns); writes need masterdata permission. */
function masterdataGate(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === 'GET') return requireAuth(req, res, next);
  return requirePermission('masterdata')(req, res, next);
}

/** Suppliers (`/clients`): GET any auth user; writes need suppliers or masterdata. */
function clientsGate(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === 'GET') return requireAuth(req, res, next);
  return requireAnyPermission('suppliers', 'masterdata')(req, res, next);
}

function settingsGate(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === 'GET') return requireAuth(req, res, next);
  return requirePermission('settings')(req, res, next);
}

const api = express.Router();
api.get('/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});
api.use('/auth', authRouter);
api.use('/users', usersRouter);
api.use('/clients', clientsGate, clientsRouter);
api.use('/payment-types', masterdataGate, paymentTypesRouter);
api.use('/payment-methods', masterdataGate, paymentMethodsRouter);
api.use('/payment-terms', masterdataGate, paymentTermsRouter);
api.use('/statuses', masterdataGate, statusesRouter);
api.use('/customers', masterdataGate, customersRouter);
api.use('/receivable-statuses', masterdataGate, receivableStatusesRouter);
api.use('/ar-deduction-descriptions', masterdataGate, arDeductionDescriptionsRouter);
api.use('/source-accounts', requireAuth, sourceAccountsRouter);
api.use('/payables', requireAuth, payableAttachmentsRouter);
api.use('/payables', requireAuth, payablesRouter);
api.use('/attachments', requireAuth, attachmentsRouter);
api.use('/settings', settingsGate, settingsRouter);
api.use('/releases', requireAuth, requirePermission('upcoming_release'), releasesRouter);
api.use('/ar', arRouter);
api.use('/reports', reportsRouter);
api.use('/telegram', telegramRouter);
api.use('/notifications', notificationsRouter);
api.use('/liquidations', liquidationsRouter);
api.use('/truck-allowances', truckAllowancesRouter);
api.use(apiNotFound);

app.use('/api', api);

const indexHtml = path.join(config.publicDir, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(config.publicDir, { index: false, maxAge: '1h' }));
  app.get('/{*splat}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}

app.use(errorHandler);

async function main() {
  await migrate(config.migrationsDir);
  const server = app.listen(config.port, () => {
    console.log(`JPAFLI FMCS listening on http://0.0.0.0:${config.port}`);
  });

  void registerTelegramWebhook().catch((err) => {
    console.error('Telegram webhook registration failed:', err);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
