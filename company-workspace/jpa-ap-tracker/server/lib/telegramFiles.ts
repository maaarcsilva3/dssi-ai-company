import { config } from '../config';
import { HttpError } from './http';

const TG_API = 'https://api.telegram.org';

type TelegramFile = { file_id: string; file_unique_id?: string; file_size?: number; file_path?: string };

export async function downloadTelegramFile(fileId: string): Promise<{
  buffer: Buffer;
  path: string;
}> {
  if (!config.telegramBotToken) {
    throw new HttpError(503, 'Telegram bot is not configured');
  }
  const metaRes = await fetch(`${TG_API}/bot${config.telegramBotToken}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });
  const meta = (await metaRes.json()) as {
    ok: boolean;
    description?: string;
    result?: TelegramFile;
  };
  if (!meta.ok || !meta.result?.file_path) {
    throw new HttpError(502, meta.description || 'Could not fetch Telegram file metadata');
  }
  if (meta.result.file_size && meta.result.file_size > config.maxUploadBytes) {
    throw new HttpError(400, 'File is too large');
  }
  const fileUrl = `${TG_API}/file/bot${config.telegramBotToken}/${meta.result.file_path}`;
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new HttpError(502, 'Could not download Telegram file');
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  return { buffer, path: meta.result.file_path };
}

export function mimeFromTelegramPath(filePath: string, fallback?: string | null): string | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return fallback ?? null;
}
