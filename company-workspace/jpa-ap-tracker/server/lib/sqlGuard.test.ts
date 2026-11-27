import { describe, expect, it } from 'vitest';
import { SqlGuardError, validateSelectSql } from './sqlGuard';

describe('validateSelectSql', () => {
  it('allows a simple select and adds LIMIT', () => {
    const sql = validateSelectSql('SELECT id, name FROM clients WHERE active = true');
    expect(sql.toLowerCase()).toContain('limit 200');
    expect(sql.toLowerCase()).toContain('from clients');
  });

  it('allows with ... select', () => {
    const sql = validateSelectSql(`
      WITH open_payables AS (
        SELECT p.id, p.amount
        FROM payables p
        JOIN payable_statuses s ON s.id = p.status_id
        WHERE s.category = 'open'
      )
      SELECT count(*)::int AS count, coalesce(sum(amount),0) AS amount FROM open_payables
    `);
    expect(sql.toLowerCase()).toContain('with');
  });

  it('rejects insert', () => {
    expect(() => validateSelectSql("INSERT INTO clients (name) VALUES ('x')")).toThrow(SqlGuardError);
  });

  it('rejects update', () => {
    expect(() => validateSelectSql('UPDATE payables SET amount = 1')).toThrow(SqlGuardError);
  });

  it('rejects delete', () => {
    expect(() => validateSelectSql('DELETE FROM payables')).toThrow(SqlGuardError);
  });

  it('rejects multi-statement', () => {
    expect(() => validateSelectSql('SELECT 1; SELECT 2')).toThrow(SqlGuardError);
  });

  it('allows source account tables', () => {
    const sql = validateSelectSql(
      'SELECT bank_name, account_number FROM source_accounts WHERE active = true',
    );
    expect(sql.toLowerCase()).toContain('from source_accounts');
  });

  it('rejects unknown tables', () => {
    expect(() => validateSelectSql('SELECT * FROM pg_shadow')).toThrow(SqlGuardError);
  });

  it('rejects the session store', () => {
    expect(() => validateSelectSql('SELECT sid FROM session')).toThrow(SqlGuardError);
  });

  it('rejects password hashes', () => {
    expect(() => validateSelectSql('SELECT id, password_hash FROM users')).toThrow(/password_hash/);
  });

  it('rejects oversized limit', () => {
    expect(() => validateSelectSql('SELECT id FROM clients LIMIT 500')).toThrow(SqlGuardError);
  });

  it('rejects select into', () => {
    expect(() => validateSelectSql('SELECT id INTO tmp FROM clients')).toThrow(SqlGuardError);
  });
});
