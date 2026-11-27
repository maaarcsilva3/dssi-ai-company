import pg from 'pg';
import { config } from './config';

// Keep DATE columns as 'YYYY-MM-DD' strings so no timezone shifting happens; NUMERIC already arrives as a string.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

export type Queryable = Pick<pg.PoolClient, 'query'>;

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
