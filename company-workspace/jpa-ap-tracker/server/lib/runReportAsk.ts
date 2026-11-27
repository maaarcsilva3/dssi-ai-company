import { randomUUID } from 'node:crypto';
import {
  analyzeQueryResults,
  proposeFollowUpQueries,
  proposeReportSql,
  type AnalysisDataset,
  type ProposedQuery,
} from './aiAsk';
import { appendChatTurn, getOrResetChatSession, historyForModel } from './aiChatSessions';
import { HttpError } from './http';
import {
  AiActionClarifyError,
  confirmationPrompt,
  continuePendingAiAction,
  enrichProposedActionFromRows,
  enrichProposedActionFromText,
  enrichSourceAccountFromText,
  executePendingAiAction,
  prepareAiPayableAction,
  type AiProposedActionRaw,
} from './aiPayableActions';
import {
  clearPendingAiAction,
  getPendingAiAction,
  isCancelMessage,
  isConfirmMessage,
  isPendingReady,
  type AiPendingAwaiting,
} from './aiPendingActions';
import { runReadOnlySelect } from './readOnlyQuery';
import { SqlGuardError, validateSelectSql } from './sqlGuard';

export interface ReportAskChart {
  type: 'bar' | 'doughnut';
  labelColumn: string | null;
  valueColumn: string | null;
}

export interface ReportAskPublicDataset {
  purpose: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface ReportAskPendingAction {
  id: string;
  summary: string;
  awaiting?: AiPendingAwaiting;
}
export interface ReportAskResult {
  chatId: string;
  sessionReset: boolean;
  explanation: string;
  sql: null;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  chart: ReportAskChart | null;
  datasets: ReportAskPublicDataset[];
  messages: { role: 'user' | 'assistant'; content: string; rowCount?: number }[];
  pendingAction: ReportAskPendingAction | null;
}

async function runProposedQueries(queries: ProposedQuery[]): Promise<AnalysisDataset[]> {
  const datasets: AnalysisDataset[] = [];
  for (const query of queries) {
    try {
      const safeSql = validateSelectSql(query.sql);
      const result = await runReadOnlySelect(safeSql);
      datasets.push({
        purpose: query.purpose,
        sql: safeSql,
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
      });
    } catch (err) {
      const reason =
        err instanceof SqlGuardError || err instanceof HttpError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Query failed';
      datasets.push({
        purpose: query.purpose,
        sql: null,
        columns: [],
        rows: [],
        rowCount: 0,
        error: reason,
      });
    }
  }
  return datasets;
}

/** Shared report AI pipeline used by the web UI and Telegram bot. */
export async function runReportAsk(input: {
  userId: number;
  question: string;
  chatId?: string;
}): Promise<ReportAskResult> {
  const chatId = input.chatId ?? randomUUID();
  const { messages: prior, sessionReset } = getOrResetChatSession(input.userId, chatId);
  const history = historyForModel(prior);
  const userTurn = { role: 'user' as const, content: input.question };

  const finish = (
    answer: string,
    datasets: AnalysisDataset[],
    chart: ReportAskChart | null,
    pendingAction: ReportAskPendingAction | null = null,
  ): ReportAskResult => {
    const assistantTurn = {
      role: 'assistant' as const,
      content: answer,
      rowCount: datasets.reduce((sum, d) => sum + d.rowCount, 0),
      queries: datasets.map((d) => ({
        purpose: d.purpose,
        rowCount: d.rowCount,
        sql: d.sql ?? undefined,
        error: d.error,
      })),
    };
    const messages = appendChatTurn(input.userId, chatId, userTurn, assistantTurn).map((turn) => ({
      role: turn.role,
      content: turn.content,
      rowCount: turn.rowCount,
    }));
    const publicDatasets = datasets
      .filter((d) => !d.error)
      .map((d) => ({
        purpose: d.purpose,
        columns: d.columns,
        rows: d.rows,
        rowCount: d.rowCount,
      }));
    const chartDataset = chart
      ? publicDatasets.find(
          (d) =>
            chart.labelColumn != null &&
            chart.valueColumn != null &&
            d.columns.includes(chart.labelColumn) &&
            d.columns.includes(chart.valueColumn),
        )
      : undefined;
    return {
      chatId,
      sessionReset,
      explanation: answer,
      sql: null,
      columns: chartDataset?.columns ?? [],
      rows: chartDataset?.rows ?? [],
      rowCount: chartDataset?.rowCount ?? 0,
      chart,
      datasets: publicDatasets,
      messages,
      pendingAction,
    };
  };

  // Confirm / cancel / continue a previously proposed mutation (same for web + Telegram).
  const existingPending = getPendingAiAction(input.userId, chatId);
  if (existingPending && isCancelMessage(input.question)) {
    clearPendingAiAction(input.userId, chatId);
    return finish('Cancelled. No changes were made.', [], null, null);
  }
  if (existingPending && isPendingReady(existingPending) && isConfirmMessage(input.question)) {
    try {
      const done = await executePendingAiAction(existingPending);
      return finish(done, [], null, null);
    } catch (err) {
      clearPendingAiAction(input.userId, chatId);
      if (err instanceof HttpError) throw err;
      throw new HttpError(400, err instanceof Error ? err.message : 'Could not apply the change');
    }
  }
  if (existingPending && !isPendingReady(existingPending)) {
    try {
      const continued = await continuePendingAiAction({
        userId: input.userId,
        chatId,
        text: input.question,
      });
      if ('clarify' in continued) {
        return finish(continued.clarify, [], null, {
          id: continued.pending.id,
          summary: continued.pending.summary,
          awaiting: continued.pending.awaiting ?? null,
        });
      }
      return finish(confirmationPrompt(continued.summary), [], null, {
        id: continued.pending.id,
        summary: continued.pending.summary,
        awaiting: null,
      });
    } catch (err) {
      if (err instanceof AiActionClarifyError) {
        const again = getPendingAiAction(input.userId, chatId);
        return finish(err.question, [], null, again
          ? { id: again.id, summary: again.summary, awaiting: again.awaiting ?? null }
          : null);
      }
      if (err instanceof HttpError) throw err;
      throw new HttpError(400, err instanceof Error ? err.message : 'Could not continue that change');
    }
  }
  if (existingPending && isPendingReady(existingPending)) {
    return finish(
      `You still have a pending change:\n\n${existingPending.summary}\n\nReply **confirm** to apply, or **cancel** to abort.`,
      [],
      null,
      { id: existingPending.id, summary: existingPending.summary, awaiting: null },
    );
  }

  let proposal;
  try {
    proposal = await proposeReportSql(input.question, history);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, err instanceof Error ? err.message : 'AI request failed');
  }

  const tryPrepareAction = async (
    raw: AiProposedActionRaw | null | undefined,
    datasets: AnalysisDataset[] = [],
  ): Promise<{ hint: string | null; meta: ReportAskPendingAction | null }> => {
    if (!raw) return { hint: null, meta: null };
    const fromRows = enrichProposedActionFromRows(
      raw,
      datasets.filter((d) => !d.error).map((d) => d.rows),
    );
    const historyTexts = [...history.map((t) => t.content), input.question];
    const withInvoice = enrichProposedActionFromText(fromRows, historyTexts);
    const enriched = await enrichSourceAccountFromText(withInvoice, historyTexts);
    try {
      const prepared = await prepareAiPayableAction({
        userId: input.userId,
        chatId,
        raw: enriched,
      });
      return {
        hint: confirmationPrompt(prepared.summary),
        meta: {
          id: prepared.pending.id,
          summary: prepared.pending.summary,
          awaiting: prepared.pending.awaiting ?? null,
        },
      };
    } catch (err) {
      if (err instanceof AiActionClarifyError) {
        const again = getPendingAiAction(input.userId, chatId);
        return {
          hint: err.question,
          meta: again
            ? { id: again.id, summary: again.summary, awaiting: again.awaiting ?? null }
            : null,
        };
      }
      const msg =
        err instanceof HttpError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Something went wrong preparing that change';
      return {
        hint: `I still need a bit more before I can apply that:\n\n${msg}`,
        meta: null,
      };
    }
  };

  // Prepare mutations immediately only when no lookup query is needed (ids already known).
  // When needsQuery=true, wait for SQL rows so we can map invoice_no / fix list-ordinal ids.
  let pendingHint: string | null = null;
  let pendingMeta: ReportAskPendingAction | null = null;
  if (proposal.proposedAction && !proposal.needsQuery) {
    const prepared = await tryPrepareAction(proposal.proposedAction);
    pendingHint = prepared.hint;
    pendingMeta = prepared.meta;
    if (!pendingMeta) {
      return finish(
        `${proposal.reply ?? ''}\n\n${pendingHint ?? 'I could not prepare that change.'}`.trim(),
        [],
        null,
        null,
      );
    }
    const reply = [proposal.reply ?? 'OK.', pendingHint].filter(Boolean).join('\n\n');
    return finish(reply, [], null, pendingMeta);
  }

  if (!proposal.needsQuery) {
    return finish(proposal.reply ?? 'OK.', [], null, null);
  }

  let datasets = await runProposedQueries(proposal.queries);

  try {
    const more = await proposeFollowUpQueries({
      question: input.question,
      history,
      datasets,
    });
    if (more.length) datasets = datasets.concat(await runProposedQueries(more));
  } catch (err) {
    if (err instanceof HttpError && err.status !== 502) throw err;
  }

  // Prefer an action refined after seeing rows; fall back to step-1 action.
  let analysis;
  try {
    analysis = await analyzeQueryResults({
      question: input.question,
      datasets,
      history,
      draftProposedAction: proposal.proposedAction ?? null,
    });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, err instanceof Error ? err.message : 'AI analysis failed');
  }

  const actionToPrepare = analysis.proposedAction ?? proposal.proposedAction ?? null;
  if (actionToPrepare) {
    const prepared = await tryPrepareAction(actionToPrepare, datasets);
    pendingHint = prepared.hint;
    pendingMeta = prepared.meta;
  }

  const chart =
    analysis.chart && analysis.chart.type !== 'none'
      ? {
          type: analysis.chart.type,
          labelColumn: analysis.chart.labelColumn ?? null,
          valueColumn: analysis.chart.valueColumn ?? null,
        }
      : null;

  const answer = pendingHint ? `${analysis.answer}\n\n${pendingHint}` : analysis.answer;
  return finish(answer, datasets, chart, pendingMeta);
}
