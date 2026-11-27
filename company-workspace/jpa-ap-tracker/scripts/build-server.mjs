import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

await build({
  entryPoints: ['server/index.ts'],
  outfile: 'dist/server/index.cjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  minify: false,
  // pg optionally requires pg-native; it is never installed in the container.
  external: ['pg-native'],
  logLevel: 'info',
});

mkdirSync('dist/migrations', { recursive: true });
cpSync('migrations', 'dist/migrations', { recursive: true });

mkdirSync('dist/ai', { recursive: true });
cpSync('server/ai/report-context.md', 'dist/ai/report-context.md');

/**
 * Ensure dist/.env has OPENAI_* and TELEGRAM_* keys without wiping deployed values.
 */
function ensureDistEnv() {
  const envPath = path.resolve('dist/.env');
  const header =
    '# Fill in for AI ad-hoc reports (admin) and optional Telegram bot. Restart app after changing.\n';
  let existing = '';
  if (existsSync(envPath)) {
    existing = readFileSync(envPath, 'utf8');
  }

  const get = (key) => {
    const m = existing.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return m ? m[1] : undefined;
  };

  const managed = [
    ['OPENAI_API_KEY', get('OPENAI_API_KEY') ?? ''],
    ['OPENAI_MODEL', (get('OPENAI_MODEL') || '').trim() || 'gpt-4o-mini'],
    ['TELEGRAM_BOT_TOKEN', get('TELEGRAM_BOT_TOKEN') ?? ''],
    ['TELEGRAM_WEBHOOK_SECRET', get('TELEGRAM_WEBHOOK_SECRET') ?? ''],
    ['TELEGRAM_WEBHOOK_BASE_URL', get('TELEGRAM_WEBHOOK_BASE_URL') ?? ''],
  ];
  const managedKeys = new Set(managed.map(([k]) => k));

  const lines = [header.trimEnd(), ...managed.map(([k, v]) => `${k}=${v}`), ''];

  // Preserve any other keys already present in dist/.env (e.g. local overrides).
  for (const line of existing.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq);
    if (managedKeys.has(key)) continue;
    lines.push(line);
  }

  writeFileSync(envPath, `${lines.join('\n')}\n`);
}

ensureDistEnv();

// Keeps Node from treating dist as an ES module package if a parent package.json says "type": "module".
writeFileSync('dist/package.json', JSON.stringify({ name: 'ap-tracker-dist', private: true, type: 'commonjs' }, null, 2));

console.log('Server bundle, migrations, AI context, and dist/.env written to dist/');
