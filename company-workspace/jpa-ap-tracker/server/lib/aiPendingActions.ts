export type AiPendingKind = 'change_status' | 'assign' | 'change_status_and_assign';

/** What the admin still needs to provide before confirm. */
export type AiPendingAwaiting =
  | 'source_account'
  | 'remarks'
  | 'check_date'
  | 'assignee'
  | 'custom_fields'
  | 'file'
  | null;

export interface AiPendingAction {
  id: string;
  userId: number;
  chatId: string;
  kind: AiPendingKind;
  payableId: number;
  statusId?: number;
  assigneeId?: number | null;
  remarks?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  checkDate?: string | null;
  sourceAccountId?: number | null;
  /** custom_field_id → value */
  customFieldValues?: Record<number, string>;
  /** When set, action is not ready to confirm yet. */
  awaiting?: AiPendingAwaiting;
  /** Next custom field id to collect when awaiting === 'custom_fields'. */
  nextCustomFieldId?: number | null;
  summary: string;
  createdAt: number;
}

const TTL_MS = 10 * 60 * 1000;
const pendingByKey = new Map<string, AiPendingAction>();

function key(userId: number, chatId: string) {
  return `${userId}:${chatId}`;
}

function prune() {
  const now = Date.now();
  for (const [k, action] of pendingByKey) {
    if (now - action.createdAt > TTL_MS) pendingByKey.delete(k);
  }
}

export function setPendingAiAction(action: AiPendingAction): void {
  prune();
  pendingByKey.set(key(action.userId, action.chatId), action);
}

export function getPendingAiAction(userId: number, chatId: string): AiPendingAction | null {
  prune();
  const action = pendingByKey.get(key(userId, chatId));
  if (!action) return null;
  if (Date.now() - action.createdAt > TTL_MS) {
    pendingByKey.delete(key(userId, chatId));
    return null;
  }
  return action;
}

export function clearPendingAiAction(userId: number, chatId: string): void {
  pendingByKey.delete(key(userId, chatId));
}

export function isConfirmMessage(text: string): boolean {
  return /^(confirm|yes|y|ok|okay|apply|do it|go ahead|proceed)\.?$/i.test(text.trim());
}

export function isCancelMessage(text: string): boolean {
  return /^(cancel|no|n|abort|nevermind|never mind|stop)\.?$/i.test(text.trim());
}

export function isPendingReady(action: AiPendingAction): boolean {
  return !action.awaiting;
}
