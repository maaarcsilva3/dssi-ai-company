import { pool } from '../db';
import { HttpError } from './http';
import { MAX_REPORT_ROWS } from './sqlGuard';

export interface ReadOnlyQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

/** Run validated SELECT inside a read-only, time-limited transaction. */
export async function runReadOnlySelect(sql: string): Promise<ReadOnlyQueryResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL transaction_read_only = on');
    await client.query("SET LOCAL statement_timeout = '5000'");
    const result = await client.query(sql);
    await client.query('COMMIT');

    const columns = result.fields.map((f) => f.name);
    const rows = result.rows.slice(0, MAX_REPORT_ROWS).map((row) => {
      const out: Record<string, unknown> = {};
      for (const col of columns) {
        const v = row[col];
        if (v instanceof Date) out[col] = v.toISOString();
        else if (typeof v === 'bigint') out[col] = v.toString();
        else out[col] = v;
      }
      return out;
    });

    return { columns, rows, rowCount: rows.length };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    const message = err instanceof Error ? err.message : 'Query failed';
    // Avoid leaking internal details excessively; keep PG hint short.
    throw new HttpError(400, `Query failed: ${message.split('\n')[0]}`);
  } finally {
    client.release();
  }
}
