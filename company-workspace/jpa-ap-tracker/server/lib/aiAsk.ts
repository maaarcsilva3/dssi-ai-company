import fs from 'node:fs';
import OpenAI from 'openai';
import { config } from '../config';
import type { ChatTurn } from './aiChatSessions';
import { HttpError } from './http';
import { loadAiLiveContext } from './aiLiveContext';
import type { AiProposedActionRaw } from './aiPayableActions';

export interface AiChartSpec {
  type: 'bar' | 'doughnut' | 'none';
  labelColumn?: string;
  valueColumn?: string;
}

export interface ProposedQuery {
  purpose: string;
  sql: string;
}

export interface AiSqlProposal {
  /** When false, answer conversationally without hitting the DB. */
  needsQuery: boolean;
  /** Direct reply when needsQuery is false. */
  reply?: string;
  queries: ProposedQuery[];
  /** Optional mutation the admin asked for; server will ask for confirm before applying. */
  proposedAction?: AiProposedActionRaw | null;
}

/** One guarded query after it has been run (or rejected). Rows sent to the model are capped. */
export interface AnalysisDataset {
  purpose: string;
  sql: string | null;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  error?: string;
}

export interface AiAnalysis {
  answer: string;
  chart: AiChartSpec | null;
  /** Mutation refined after seeing real rows (preferred over step-1 proposedAction). */
  proposedAction?: AiProposedActionRaw | null;
}

function loadStaticContext(): string {
  try {
    return fs.readFileSync(config.aiContextPath, 'utf8');
  } catch {
    throw new HttpError(500, 'AI context file is missing on the server');
  }
}

async function loadContext(): Promise<string> {
  const live = await loadAiLiveContext();
  return `${loadStaticContext()}\n\n${live}`;
}

function parseProposedAction(raw: unknown): AiProposedActionRaw | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as AiProposedActionRaw;
}

function requireApiKey() {
  if (!config.openaiApiKey) {
    throw new HttpError(503, 'AI reports not configured (set OPENAI_API_KEY in .env)');
  }
}

function client() {
  requireApiKey();
  return new OpenAI({ apiKey: config.openaiApiKey });
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('not json');
  }
}

function normalizeChart(raw: unknown): AiChartSpec | null {
  if (raw == null) return null;
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const type = o.type;
  if (type === 'none' || type === 'bar' || type === 'doughnut') {
    return {
      type,
      labelColumn: typeof o.labelColumn === 'string' ? o.labelColumn : undefined,
      valueColumn: typeof o.valueColumn === 'string' ? o.valueColumn : undefined,
    };
  }
  return null;
}

function historyMessages(history: ChatTurn[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  for (const turn of history) {
    if (turn.role === 'user') {
      messages.push({ role: 'user', content: turn.content });
    } else {
      const bits = [turn.content];
      if (turn.queries?.length) {
        for (const q of turn.queries) {
          const status = q.error ? `failed: ${q.error}` : `${q.rowCount} row(s)`;
          bits.push(`(Earlier query "${q.purpose}": ${status}${q.sql ? `\n${q.sql}` : ''})`);
        }
      } else if (turn.sql) {
        bits.push(`(Earlier you used SQL:\n${turn.sql})`);
        if (turn.rowCount != null) bits.push(`(That query returned ${turn.rowCount} row(s).)`);
      }
      messages.push({ role: 'assistant', content: bits.join('\n') });
    }
  }
  return messages;
}

function isTransientAiError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; code?: string; status?: number; cause?: { code?: string } };
  const msg = (e.message ?? '').toLowerCase();
  if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('timeout')) return true;
  if (e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT' || e.code === 'ENOTFOUND') return true;
  if (e.cause?.code === 'ECONNRESET' || e.cause?.code === 'ETIMEDOUT') return true;
  if (e.status === 429 || e.status === 500 || e.status === 502 || e.status === 503) return true;
  return false;
}

function aiTransportError(err: unknown): HttpError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/fetch failed|network|econnreset|etimedout|enotfound/i.test(msg)) {
    return new HttpError(
      502,
      'Could not reach the AI service (network). Please try again in a moment.',
    );
  }
  return new HttpError(502, msg || 'AI request failed');
}

async function chatJson(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  temperature = 0.2,
): Promise<Record<string, unknown>> {
  const maxAttempts = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const completion = await client().chat.completions.create({
        model: config.openaiModel,
        temperature,
        response_format: { type: 'json_object' },
        messages,
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new HttpError(502, 'AI returned an empty response');
      try {
        const parsed = extractJson(content);
        if (!parsed || typeof parsed !== 'object') throw new Error('not object');
        return parsed as Record<string, unknown>;
      } catch {
        throw new HttpError(502, 'AI returned invalid JSON');
      }
    } catch (err) {
      if (err instanceof HttpError && err.status !== 502 && err.status !== 503) throw err;
      lastErr = err;
      if (attempt < maxAttempts && isTransientAiError(err)) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
      if (err instanceof HttpError) throw err;
      throw aiTransportError(err);
    }
  }
  throw aiTransportError(lastErr);
}

const MAX_PROPOSED_QUERIES = 4;

function parseQueries(raw: unknown, max: number): ProposedQuery[] {
  if (!Array.isArray(raw)) return [];
  const out: ProposedQuery[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const sql = typeof o.sql === 'string' ? o.sql.trim() : '';
    if (!sql) continue;
    const purpose = typeof o.purpose === 'string' && o.purpose.trim() ? o.purpose.trim() : 'Query';
    out.push({ purpose: purpose.slice(0, 120), sql });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Step 1: understand the chat and either propose up to 4 SELECTs, or reply without a query.
 */
export async function proposeReportSql(question: string, history: ChatTurn[]): Promise<AiSqlProposal> {
  const context = await loadContext();
  const system = `${context}

## Your job right now (step 1 of 3)
Understand the admin's message in context of the chat.
- If the answer needs data, set needsQuery=true and propose up to ${MAX_PROPOSED_QUERIES} separate SELECT (or WITH…SELECT) statements. Split the work: one query per fact (balances, monthly dues, a breakdown). Do not try to answer with a single query when several facts are required.
- Upcoming Release / “this week’s release” / “next week” / long payable lists: always propose a **totals** query plus a **detail** query with \`LIMIT 10\` (and \`OFFSET\` when they ask for next/more). Never \`LIMIT 200\` for detail listings.
- Follow-ups like “don’t include overdue”, “exclude overdue”, “next 10”, “more” need fresh SQL (needsQuery=true). For exclude-overdue, require due_date inside the release window only (see live context).
- For a cash or forecast question, always include every active source account's available balance AND the open payables due through the date asked. Follow the forecast rules above, including the double-count rule.
- If the admin asks to **change a payable status** and/or **assign** someone, set proposedAction. Prefer needsQuery=true so you SELECT the payable first (include p.id and p.invoice_no). Use exact status names from the live status list. Never invent status names.
- proposedAction.kind is one of: "change_status", "assign", "change_status_and_assign".
- **payableId must be payables.id from SQL / prior result rows — never a numbered-list position (1, 2, 3…).** Prefer also setting invoiceNo (e.g. "13177") from the row or from your earlier reply when the admin says “those invoices”.
- When the admin means “move these to Create Check for Deposit” (approve / ready for check creation), that is a **status change** to the live status whose name matches Create Check for Deposit — not a filter for payables already in that status.
- If the payable is **already** Create Check for Deposit (or any other status) and the admin only asks to assign someone, use kind **"assign"** — do **not** re-propose that same status (that wrongly requires sourceAccountId again).
- For status changes include statusName (exact) or statusId. For assign include assigneeName or assigneeId. For Create Check for Deposit include sourceAccountId when known. For cancel include remarks. For Check Released / paid include checkDate.
- **Progressive asks (server-assisted):** propose the status change even if custom fields / file / source account are still unknown. The server will ask for missing text/date fields one at a time, then for a file upload if required. Do **not** tell the admin to use the web modal for those.
- When listing payables for approval / check creation, totals + **10** detail rows only (LIMIT 10 / OFFSET for “next 10”).
- Questions about AR unpaid/paid, liquidations, petty cash / truck allowances, or custom status field values should use needsQuery=true and the matching tables — do not claim those modules are unavailable.
- The server will ask the admin to confirm before applying any proposedAction. Do not claim the change already happened.
- If no query is needed (greetings, clarification, capability questions, or the answer is already clear from prior chat), set needsQuery=false and put your full reply in "reply".
- Any money you mention in "reply" must be Philippine pesos formatted like ₱12,345.67 — never $.
- Do NOT invent row values. Do NOT analyze data yet — data comes after the queries run.
- Respond with JSON only:
  { "needsQuery": true, "queries": [ { "purpose": "short label", "sql": "SELECT …" } ], "proposedAction": null | { … } }
  or
  { "needsQuery": false, "reply": "natural language answer", "proposedAction": null | { … } }
`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    ...historyMessages(history),
    {
      role: 'user',
      content: question,
    },
  ];

  const obj = await chatJson(messages, 0.1);
  const proposedAction = parseProposedAction(obj.proposedAction);
  const needsQuery = Boolean(obj.needsQuery);
  if (!needsQuery) {
    const reply = typeof obj.reply === 'string' ? obj.reply.trim() : '';
    if (!reply && !proposedAction) throw new HttpError(502, 'AI did not provide a reply');
    return {
      needsQuery: false,
      reply: reply || 'Ready to apply a change after confirmation.',
      queries: [],
      proposedAction,
    };
  }

  let queries = parseQueries(obj.queries, MAX_PROPOSED_QUERIES);
  if (!queries.length && typeof obj.sql === 'string' && obj.sql.trim()) {
    const purpose = typeof obj.intent === 'string' && obj.intent.trim() ? obj.intent.trim() : 'Query';
    queries = [{ purpose, sql: obj.sql.trim() }];
  }
  if (!queries.length && !proposedAction) throw new HttpError(502, 'AI did not propose any SQL');
  return { needsQuery: queries.length > 0, queries, proposedAction, reply: typeof obj.reply === 'string' ? obj.reply : undefined };
}

const MAX_FOLLOW_UP_QUERIES = 2;
/** Rows shown to the model per dataset — keep in sync with “batch of 10” listing rule. */
const ANALYSIS_ROW_CAP = 10;

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

function looksMoneyColumn(name: string): boolean {
  return /amount|gross|vat|ewt|net|total|balance|price|cost|paid|collected|due/i.test(name);
}

/** Format money-looking cells as ₱ for the model (UI/Telegram still get raw datasets separately). */
function formatCellForModel(column: string, value: unknown): unknown {
  if (!looksMoneyColumn(column) || value == null || value === '') return value;
  if (typeof value === 'string' && /[₱$]/.test(value)) return value;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return value;
  return PESO.format(n);
}

function formatRowForModel(columns: string[], row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const col of columns) {
    if (Object.prototype.hasOwnProperty.call(row, col)) {
      out[col] = formatCellForModel(col, row[col]);
    }
  }
  return out;
}

/**
 * Step 2: look at the first results and request up to 2 more queries when a needed figure is missing.
 */
export async function proposeFollowUpQueries(input: {
  question: string;
  history: ChatTurn[];
  datasets: AnalysisDataset[];
}): Promise<ProposedQuery[]> {
  const context = await loadContext();
  const system = `${context}

## Your job right now (step 2 of 3)
The first queries already ran. Decide if a figure needed to answer the admin is still missing or a query failed.
- If the results are enough, return { "queries": [] }.
- Otherwise propose at most ${MAX_FOLLOW_UP_QUERIES} more SELECT statements. Do not repeat a query that already succeeded.
- For a cash or forecast question, you still need every active account's available balance and the unfunded open payables through the horizon, by month. Do not ask the admin for those numbers.
- Respond with JSON only:
  { "queries": [ { "purpose": "short label", "sql": "SELECT …" } ] }
`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    ...historyMessages(input.history),
    {
      role: 'user',
      content: JSON.stringify(
        {
          question: input.question,
          results: input.datasets.map(datasetForModel),
        },
        null,
        2,
      ),
    },
  ];

  const obj = await chatJson(messages, 0.1);
  return parseQueries(obj.queries, MAX_FOLLOW_UP_QUERIES);
}

function datasetForModel(d: AnalysisDataset) {
  const sample = d.rows.slice(0, ANALYSIS_ROW_CAP).map((row) => formatRowForModel(d.columns, row));
  return {
    purpose: d.purpose,
    error: d.error ?? null,
    columns: d.columns,
    rowCount: d.rowCount,
    rows: sample,
    currency: 'PHP',
    moneyFormat: 'Use ₱ with thousands separators and 2 decimals (e.g. ₱112,000.00). Never use $.',
    note: d.rows.length > sample.length ? `Showing first ${sample.length} of ${d.rowCount} rows.` : null,
  };
}

/**
 * Step 3: read every result set and answer the admin.
 */
export async function analyzeQueryResults(input: {
  question: string;
  datasets: AnalysisDataset[];
  history: ChatTurn[];
  /** Draft mutation from step 1 — refine with real ids from results. */
  draftProposedAction?: AiProposedActionRaw | null;
}): Promise<AiAnalysis> {
  const context = await loadContext();
  const system = `${context}

## Your job right now (step 3 of 3)
You are the analyst. Every query has already run. Answer from these results only.
- Lead with the decision or the number that answers the question. Then give the comparison, the breakdown, and any caveat.
- Use markdown: short headings, a **compact table** when listing payables or comparing months/accounts, and bold for the surplus or shortfall.
- **List at most 10 detail rows** in the answer (Upcoming Release, invoice lists, etc.). Lead with totals from the aggregate query. If more remain, say “Showing N–M of TOTAL — ask for next 10.” Do not paste 40+ lines.
- When include_overdue pulled older dues into Upcoming Release, say how many are overdue vs in this release window — do not call every row “due this week.”
- All monetary amounts in the answer must be Philippine pesos as ₱12,345.67 (or copy ₱ values already in the results). Never use $, USD, or bare numbers for money without ₱.
- Status names must come from the result rows / live status list — never invent a status label.
- Do not invent numbers that are not in the results. If a query failed, say what is missing. Do not ask the admin for totals that are stored in the database.
- Forecast questions: first line is the surplus or shortfall. Then name each source account and its available balance, the total funds, the total still to pay, and a month-by-month table. Available balance already subtracts withdrawals in POSTED, PENDING, RESERVED, and ON_HOLD, so do not subtract scheduled payables again. Unfunded amount is open, not-cancelled payables due by the horizon that are not already linked to one of those withdrawals.
- Optionally recommend a chart when one result is a categorical aggregate. labelColumn and valueColumn must be exact column names from that result.
- If the admin asked to change status and/or assign, set proposedAction using **id and invoice_no from the result rows** (never a list ordinal). Prefer invoiceNo plus payableId. Use exact live status names. kind: "change_status" | "assign" | "change_status_and_assign".
- If Create Check for Deposit is requested and sourceAccountId is still unknown, keep proposedAction but the server will ask which account — or ask yourself in "answer" using the live source accounts list. Never say you “could not prepare” the change.
- If draftProposedAction is present, correct it with real ids from the results (keep kind/status/assignee intent). Fill sourceAccountId from the admin’s latest reply when they named a bank or account id.
- Do not claim the change already happened — the server will ask for confirm.
- Respond with JSON only:
  {
    "answer": "markdown for the admin",
    "chart": null | { "type": "bar"|"doughnut"|"none", "labelColumn": "…", "valueColumn": "…" },
    "proposedAction": null | { "kind": "…", "payableId": 123, "invoiceNo": "INV-001", "statusName": "…", "assigneeName": "…", "sourceAccountId": 1 }
  }
`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    ...historyMessages(input.history),
    {
      role: 'user',
      content: JSON.stringify(
        {
          question: input.question,
          results: input.datasets.map(datasetForModel),
          draftProposedAction: input.draftProposedAction ?? null,
        },
        null,
        2,
      ),
    },
  ];

  const obj = await chatJson(messages, 0.3);
  const answer = typeof obj.answer === 'string' ? obj.answer.trim() : '';
  if (!answer) throw new HttpError(502, 'AI did not analyze the results');
  return {
    answer,
    chart: normalizeChart(obj.chart),
    proposedAction: parseProposedAction(obj.proposedAction) ?? input.draftProposedAction ?? null,
  };
}
