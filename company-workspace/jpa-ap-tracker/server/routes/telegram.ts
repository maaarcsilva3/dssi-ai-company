import { Router } from 'express';
import { config, telegramEnabled } from '../config';
import {
  AiActionClarifyError,
  attachFileToPendingAiAction,
  confirmationPrompt,
} from '../lib/aiPayableActions';
import { getPendingAiAction } from '../lib/aiPendingActions';
import { HttpError } from '../lib/http';
import { runReportAsk } from '../lib/runReportAsk';
import {
  consumeTelegramLinkCode,
  resolveTelegramLink,
  rotateTelegramAiChatId,
  unlinkTelegramByTelegramUserId,
} from '../lib/telegramLink';
import { downloadTelegramFile, mimeFromTelegramPath } from '../lib/telegramFiles';
import { sendAiExplanation, sendTelegramMessage } from '../lib/telegram';

export const telegramRouter = Router();

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id?: string;
  width?: number;
  height?: number;
  file_size?: number;
}

interface TelegramDocument {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

interface TelegramMessage {
  message_id?: number;
  text?: string;
  caption?: string;
  chat?: { id: number; type?: string };
  from?: { id: number; username?: string; first_name?: string; is_bot?: boolean };
  document?: TelegramDocument;
  photo?: TelegramPhotoSize[];
}

interface TelegramUpdate {
  update_id?: number;
  message?: TelegramMessage;
}

const START_HELP = [
  'JPAFLI FMCS AI (same capabilities as Reports → Ask AI)',
  '',
  'Link your admin account first:',
  '1. Open Reports in the web app',
  '2. Ask an admin to generate a Telegram link code for your account',
  '3. Send: /link YOURCODE',
  '',
  'Ask report questions, or request payable status / assignment changes.',
  'When a change needs a file, send a photo/PDF here. For text/date fields, reply with the value.',
  'When ready, reply confirm or cancel.',
  '',
  'Commands: /link CODE · /unlink · /new · /help',
].join('\n');

function commandAndArgs(text: string): { command: string; args: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  const [rawCmd, ...rest] = trimmed.split(/\s+/);
  const command = (rawCmd ?? '').split('@')[0]!.toLowerCase();
  return { command, args: rest.join(' ').trim() };
}

function pickTelegramFile(message: TelegramMessage): {
  fileId: string;
  originalName: string;
  mimeHint: string | null;
} | null {
  if (message.document?.file_id) {
    return {
      fileId: message.document.file_id,
      originalName: message.document.file_name || 'document',
      mimeHint: message.document.mime_type ?? null,
    };
  }
  const photos = message.photo;
  if (photos?.length) {
    const best = photos[photos.length - 1]!;
    return {
      fileId: best.file_id,
      originalName: 'photo.jpg',
      mimeHint: 'image/jpeg',
    };
  }
  return null;
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat?.id;
  const fromId = message.from?.id;
  const text = (message.text ?? message.caption ?? '').trim();
  const fileMeta = pickTelegramFile(message);
  if (chatId == null || fromId == null || message.from?.is_bot) return;
  if (!text && !fileMeta) return;

  const parsed = text ? commandAndArgs(text) : null;

  if (parsed?.command === '/start' || parsed?.command === '/help') {
    await sendTelegramMessage(chatId, START_HELP);
    return;
  }

  if (parsed?.command === '/link') {
    if (!parsed.args) {
      await sendTelegramMessage(chatId, 'Usage: /link YOURCODE\nGenerate a code from Reports in the web app.');
      return;
    }
    try {
      const linked = await consumeTelegramLinkCode({
        code: parsed.args,
        telegramUserId: fromId,
        telegramChatId: chatId,
      });
      await sendTelegramMessage(
        chatId,
        `Linked to admin account “${linked.displayName}”. Ask a report question anytime.\nSend /new to start a fresh chat.`,
      );
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not link account';
      await sendTelegramMessage(chatId, msg);
    }
    return;
  }

  if (parsed?.command === '/unlink') {
    const removed = await unlinkTelegramByTelegramUserId(fromId);
    await sendTelegramMessage(
      chatId,
      removed ? 'Unlinked. Generate a new code in the web app to reconnect.' : 'This Telegram account is not linked.',
    );
    return;
  }

  const link = await resolveTelegramLink(fromId);
  if (!link) {
    await sendTelegramMessage(
      chatId,
      'This Telegram account is not linked to an admin user.\nGenerate a code in Reports, then send /link YOURCODE',
    );
    return;
  }

  if (parsed?.command === '/new') {
    await rotateTelegramAiChatId(fromId);
    await sendTelegramMessage(chatId, 'Started a new AI chat session.');
    return;
  }

  if (parsed) {
    await sendTelegramMessage(chatId, 'Unknown command. Try /help');
    return;
  }

  if (text.length > 1000) {
    await sendTelegramMessage(chatId, 'Question is too long (max 1000 characters).');
    return;
  }

  await sendTelegramMessage(chatId, 'Working on it…');
  try {
    const fresh = await resolveTelegramLink(fromId);
    if (!fresh) {
      await sendTelegramMessage(chatId, 'Link expired. Generate a new code in Reports.');
      return;
    }

    if (fileMeta) {
      const pending = getPendingAiAction(fresh.userId, fresh.aiChatId);
      if (!pending) {
        await sendTelegramMessage(
          chatId,
          'I received a file, but there is no status change waiting for one. Ask me to change a payable status first, then send the file.',
        );
        return;
      }
      const downloaded = await downloadTelegramFile(fileMeta.fileId);
      const mimeHint =
        mimeFromTelegramPath(downloaded.path, fileMeta.mimeHint) ?? fileMeta.mimeHint;
      const result = await attachFileToPendingAiAction({
        userId: fresh.userId,
        chatId: fresh.aiChatId,
        buffer: downloaded.buffer,
        originalName: fileMeta.originalName,
        mimeHint,
      });
      if ('clarify' in result) {
        await sendAiExplanation(chatId, result.clarify);
        return;
      }
      await sendAiExplanation(
        chatId,
        `Saved **${fileMeta.originalName}**.\n\n${confirmationPrompt(result.summary)}`,
      );
      return;
    }

    const result = await runReportAsk({
      userId: fresh.userId,
      question: text,
      chatId: fresh.aiChatId,
    });
    const prefix = result.sessionReset ? '(Previous chat timed out; started fresh.)\n\n' : '';
    await sendAiExplanation(chatId, prefix + result.explanation);
  } catch (err) {
    console.error('Telegram AI ask failed:', err);
    if (err instanceof AiActionClarifyError) {
      await sendAiExplanation(chatId, err.question);
      return;
    }
    let msg =
      err instanceof HttpError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'AI request failed';
    if (/fetch failed|network|econnreset|etimedout|enotfound/i.test(msg)) {
      msg = 'Could not reach the AI service (network). Please try again in a moment.';
    }
    await sendTelegramMessage(chatId, `Sorry — ${msg}`);
  }
}

telegramRouter.post('/webhook', (req, res) => {
  if (!telegramEnabled()) {
    res.status(503).json({ error: 'Telegram bot is not configured' });
    return;
  }

  const secret = req.header('X-Telegram-Bot-Api-Secret-Token');
  if (!secret || secret !== config.telegramWebhookSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Acknowledge immediately so Telegram does not retry while AI runs.
  res.json({ ok: true });

  const update = req.body as TelegramUpdate;
  const message = update.message;
  if (!message) return;

  void handleMessage(message).catch((err) => {
    console.error('Telegram message handler error:', err);
  });
});
