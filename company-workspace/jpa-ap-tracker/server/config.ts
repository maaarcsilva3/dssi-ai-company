import fs from 'node:fs';
import path from 'node:path';

/** Load dist/.env or cwd .env when present (Docker --env-file also works). */
function loadEnvFile() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(path.dirname(process.cwd()), '.env'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      // Node 20.12+ / 22
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(file);
        return;
      }
    } catch {
      /* fall through to manual parse */
    }
    try {
      const text = fs.readFileSync(file, 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = value;
      }
      return;
    } catch {
      /* ignore */
    }
  }
}

loadEnvFile();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

const migrationsDir = path.resolve(process.env.MIGRATIONS_DIR ?? './migrations');

export const config = {
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: required('DATABASE_URL'),
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? './uploads'),
  migrationsDir,
  publicDir: path.resolve(process.env.PUBLIC_DIR ?? './public'),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024,
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-ap-tracker-session-secret-change-me',
  sessionSecure: process.env.SESSION_SECURE === 'true',
  openaiApiKey: process.env.OPENAI_API_KEY?.trim() || '',
  openaiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
  aiContextPath: path.resolve(
    process.env.AI_CONTEXT_PATH ?? path.join(path.dirname(migrationsDir), 'ai', 'report-context.md'),
  ),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || '',
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || '',
  telegramWebhookBaseUrl: process.env.TELEGRAM_WEBHOOK_BASE_URL?.trim().replace(/\/$/, '') || '',
};

/** True when all Telegram bot env vars are set so webhook mode can run. */
export function telegramEnabled(): boolean {
  return Boolean(
    config.telegramBotToken && config.telegramWebhookSecret && config.telegramWebhookBaseUrl,
  );
}
