import sqlParser from 'node-sql-parser';

const { Parser } = sqlParser;

export const MAX_REPORT_ROWS = 200;

const ALLOWED_TABLES = new Set([
  'clients',
  'payment_types',
  'payment_methods',
  'payment_terms',
  'payable_statuses',
  'payables',
  'payable_invoices',
  'payable_pdc_lines',
  'payable_status_history',
  // Live AR = logistics billing (legacy receivables / customers are not queryable by AI)
  'ar_clients',
  'ar_summaries',
  'ar_detail_entries',
  'ar_deductions',
  'ar_deduction_descriptions',
  'users',
  'user_permissions',
  'attachments',
  'settings',
  'source_accounts',
  'source_account_transactions',
  'notifications',
  'liquidations',
  'liquidation_lines',
  'truck_allowances',
  'user_payable_status_permissions',
  'user_payable_default_statuses',
  'payable_status_field_values',
  'payable_status_custom_fields',
  'telegram_links',
  'telegram_link_codes',
]);

const BLOCKED_KEYWORDS = [
  'insert',
  'update',
  'delete',
  'merge',
  'upsert',
  'drop',
  'alter',
  'create',
  'truncate',
  'grant',
  'revoke',
  'copy',
  'call',
  'execute',
  'exec',
  'do',
  'set',
  'show',
  'listen',
  'notify',
  'vacuum',
  'analyze',
  'reindex',
  'cluster',
  'lock',
  'security',
  'refresh',
  'comment',
  'discard',
  'prepare',
  'deallocate',
  'declare',
  'fetch',
  'move',
  'close',
  'load',
  'import',
  'export',
];

const BLOCKED_FUNCTIONS = [
  'pg_read_file',
  'pg_read_binary_file',
  'pg_ls_dir',
  'pg_write_file',
  'lo_import',
  'lo_export',
  'dblink',
  'dblink_exec',
  'query_to_xml',
  'database_to_xml',
];

export class SqlGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SqlGuardError';
  }
}

function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n\r]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordBoundaryHas(haystack: string, word: string): boolean {
  return new RegExp(`(?:^|[^a-z0-9_])${word}(?:[^a-z0-9_]|$)`, 'i').test(haystack);
}

/** Collect base table names from FROM/JOIN/CTE bodies (ignore column table aliases). */
function collectTables(node: unknown, out: Set<string>) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectTables(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  // From-item: { table: 'payables', as: 'p' }. Column ref: { table: 'p', column: 'id' }.
  if (typeof obj.table === 'string' && obj.table && !('column' in obj)) {
    out.add(obj.table.toLowerCase());
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'table' || key === 'column' || key === 'as') continue;
    collectTables(value, out);
  }
}

function extractLimit(ast: Record<string, unknown>): number | null {
  const limit = ast.limit as { value?: Array<{ value?: number | string }> } | null | undefined;
  if (!limit?.value?.length) return null;
  const last = limit.value[limit.value.length - 1];
  const n = Number(last?.value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validate AI-produced SQL. Fail closed: any uncertainty rejects the query.
 * Returns a single SELECT (possibly wrapped) safe to run read-only.
 */
export function validateSelectSql(rawSql: string): string {
  if (!rawSql || typeof rawSql !== 'string') throw new SqlGuardError('Empty SQL');

  let sql = stripComments(rawSql);
  if (!sql) throw new SqlGuardError('Empty SQL after removing comments');

  // Reject multiple statements (allow one optional trailing semicolon).
  const withoutTrailing = sql.replace(/;+\s*$/, '');
  if (withoutTrailing.includes(';')) {
    throw new SqlGuardError('Multiple SQL statements are not allowed');
  }
  sql = withoutTrailing;

  const lower = sql.toLowerCase();
  if (!lower.startsWith('select') && !lower.startsWith('with')) {
    throw new SqlGuardError('Only SELECT (or WITH … SELECT) is allowed');
  }

  for (const kw of BLOCKED_KEYWORDS) {
    if (wordBoundaryHas(lower, kw)) {
      throw new SqlGuardError(`Forbidden keyword: ${kw.toUpperCase()}`);
    }
  }
  for (const fn of BLOCKED_FUNCTIONS) {
    if (wordBoundaryHas(lower, fn)) {
      throw new SqlGuardError(`Forbidden function: ${fn}`);
    }
  }
  if (wordBoundaryHas(lower, 'password_hash')) {
    throw new SqlGuardError('password_hash cannot be selected');
  }

  // Reject SELECT … INTO (table creation / outfile style).
  if (/\binto\b/i.test(lower) && !/\binsert\b/i.test(lower)) {
    // Allow "INTO" only inside identifiers is rare; block SELECT INTO.
    if (/\bselect\b[\s\S]*\binto\b/i.test(lower)) {
      throw new SqlGuardError('SELECT INTO is not allowed');
    }
  }

  const parser = new Parser();
  let ast: unknown;
  try {
    ast = parser.astify(sql, { database: 'PostgresQL' });
  } catch {
    throw new SqlGuardError('SQL could not be parsed; rejected');
  }

  const statements = Array.isArray(ast) ? ast : [ast];
  if (statements.length !== 1) throw new SqlGuardError('Exactly one statement is required');

  const stmt = statements[0] as Record<string, unknown>;
  const type = String(stmt.type || '').toLowerCase();
  if (type !== 'select') {
    throw new SqlGuardError(`Statement type "${type || 'unknown'}" is not allowed`);
  }

  const tables = new Set<string>();
  collectTables(stmt, tables);
  for (const table of tables) {
    // Ignore CTE names that aren't base tables: if not in allowlist and not a known table, reject.
    // CTE names appear as tables in some ASTs; allow if also present as with.name — simplify: only
    // allow allowlisted tables OR names that appear solely as CTE aliases.
    if (ALLOWED_TABLES.has(table)) continue;
    const withClause = stmt.with as Array<{ name?: { value?: string } | string }> | undefined;
    const cteNames = new Set(
      (withClause ?? []).map((w) => {
        const n = w.name;
        if (typeof n === 'string') return n.toLowerCase();
        if (n && typeof n === 'object' && 'value' in n) return String(n.value).toLowerCase();
        return '';
      }),
    );
    if (cteNames.has(table)) continue;
    throw new SqlGuardError(`Table or relation not allowed: ${table}`);
  }

  const limit = extractLimit(stmt);
  if (limit != null && limit > MAX_REPORT_ROWS) {
    throw new SqlGuardError(`LIMIT must be ≤ ${MAX_REPORT_ROWS}`);
  }
  if (limit == null) {
    sql = `SELECT * FROM (${sql}) AS _ai_q LIMIT ${MAX_REPORT_ROWS}`;
  }

  return sql;
}
