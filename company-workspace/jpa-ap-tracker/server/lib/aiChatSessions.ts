/** Keep Telegram/web follow-ups (“next 10”, “don’t include overdue”) in context longer. */
const IDLE_MS = 30 * 60 * 1000;
const MAX_TURNS_TO_MODEL = 10;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  rowCount?: number;
  /** Server-side memory of the queries behind an answer. SQL is not shown in the chat. */
  queries?: { purpose: string; rowCount: number; sql?: string; error?: string }[];
}

interface ChatSession {
  messages: ChatTurn[];
  lastActivityAt: number;
}

const sessions = new Map<string, ChatSession>();

function key(userId: number, chatId: string): string {
  return `${userId}:${chatId}`;
}

export function getOrResetChatSession(
  userId: number,
  chatId: string,
  now = Date.now(),
): { messages: ChatTurn[]; sessionReset: boolean } {
  const k = key(userId, chatId);
  const existing = sessions.get(k);
  if (!existing) {
    sessions.set(k, { messages: [], lastActivityAt: now });
    return { messages: [], sessionReset: false };
  }
  if (now - existing.lastActivityAt > IDLE_MS) {
    sessions.set(k, { messages: [], lastActivityAt: now });
    return { messages: [], sessionReset: true };
  }
  return { messages: existing.messages, sessionReset: false };
}

export function appendChatTurn(userId: number, chatId: string, user: ChatTurn, assistant: ChatTurn, now = Date.now()) {
  const k = key(userId, chatId);
  const session = sessions.get(k) ?? { messages: [], lastActivityAt: now };
  session.messages.push(user, assistant);
  // Keep memory bounded
  if (session.messages.length > 40) {
    session.messages = session.messages.slice(-40);
  }
  session.lastActivityAt = now;
  sessions.set(k, session);
  return session.messages;
}

/** History slice for the LLM (exclude the brand-new user message; caller adds it). */
export function historyForModel(messages: ChatTurn[]): ChatTurn[] {
  return messages.slice(-MAX_TURNS_TO_MODEL * 2);
}

export function touchChatSession(userId: number, chatId: string, now = Date.now()) {
  const k = key(userId, chatId);
  const session = sessions.get(k);
  if (session) session.lastActivityAt = now;
}
