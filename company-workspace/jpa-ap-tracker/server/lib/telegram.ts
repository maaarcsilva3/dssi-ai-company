import { config, telegramEnabled } from '../config';
import { formatAiReplyForTelegram, truncateTelegramText } from './telegramFormat';

export {
  chunkTelegramText,
  escapeHtml,
  formatAiReplyForTelegram,
  markdownToTelegramHtml,
  normalizeMarkdownForTelegram,
  rewriteMarkdownTables,
  truncateTelegramText,
} from './telegramFormat';

const TG_API = 'https://api.telegram.org';

type TelegramApiResult = {
  ok: boolean;
  description?: string;
  result?: unknown;
};

async function telegramCall(method: string, body: Record<string, unknown>): Promise<TelegramApiResult> {
  if (!config.telegramBotToken) {
    return { ok: false, description: 'Telegram bot token not configured' };
  }
  const res = await fetch(`${TG_API}/bot${config.telegramBotToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as TelegramApiResult;
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  opts?: { parseMode?: 'HTML' },
): Promise<boolean> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  };
  if (opts?.parseMode) payload.parse_mode = opts.parseMode;

  const result = await telegramCall('sendMessage', payload);
  if (result.ok) return true;

  if (opts?.parseMode) {
    const plain = await telegramCall('sendMessage', {
      chat_id: chatId,
      text: truncateTelegramText(text.replace(/<[^>]+>/g, '')),
      disable_web_page_preview: true,
    });
    return plain.ok;
  }
  console.warn('Telegram sendMessage failed:', result.description);
  return false;
}

export async function sendAiExplanation(chatId: number, explanation: string): Promise<void> {
  const { htmlParts, plainParts } = formatAiReplyForTelegram(explanation);
  for (let i = 0; i < htmlParts.length; i++) {
    const html = htmlParts[i]!;
    const plain = plainParts[i] ?? html.replace(/<[^>]+>/g, '');
    const ok = await sendTelegramMessage(chatId, html, { parseMode: 'HTML' });
    if (!ok) await sendTelegramMessage(chatId, plain);
  }
}

export async function registerTelegramWebhook(): Promise<void> {
  if (!telegramEnabled()) {
    console.log(
      'Telegram bot disabled (set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_WEBHOOK_BASE_URL)',
    );
    return;
  }
  const url = `${config.telegramWebhookBaseUrl}/api/telegram/webhook`;
  const result = await telegramCall('setWebhook', {
    url,
    secret_token: config.telegramWebhookSecret,
    allowed_updates: ['message'],
    drop_pending_updates: false,
  });
  if (!result.ok) {
    console.error('Telegram setWebhook failed:', result.description);
    return;
  }
  console.log(`Telegram webhook registered: ${url}`);
}
