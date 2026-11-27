import type { NextFunction, Request, RequestHandler, Response } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db';
import { config } from '../config';
import { HttpError } from './http';
import {
  ALL_PERMISSIONS,
  EMPTY_PERMISSIONS,
  permissionsFromRow,
  type PermissionKey,
  type Permissions,
  type UserRole,
} from './permissions';
import {
  listAllowedPayableStatusIds,
  listDefaultPayableStatusIds,
} from './payableStatusAccess';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

export interface AuthUser {
  id: number;
  username: string;
  display_name: string;
  role: UserRole;
  active: boolean;
  permissions: Permissions;
  /** Staff: statuses they may change a payable into. Admins: empty (all allowed). */
  payable_status_ids: number[];
  /** Staff: statuses that auto-assign this user when a payable enters them. */
  payable_default_status_ids: number[];
}

const PgStore = connectPgSimple(session);

export function createSessionMiddleware() {
  return session({
    store: new PgStore({
      pool,
      tableName: 'session',
      // Table is created by migrations/006_session.sql. Do not use
      // createTableIfMissing: it reads table.sql via __dirname, which breaks
      // when the server is esbuild-bundled into a single file.
      createTableIfMissing: false,
    }),
    name: 'ap.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.sessionSecure,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}

export async function loadAuthUser(userId: number): Promise<AuthUser | null> {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.role, u.active,
            p.*
       FROM users u
       LEFT JOIN user_permissions p ON p.user_id = u.id
      WHERE u.id = $1`,
    [userId],
  );
  const row = rows[0];
  if (!row || !row.active) return null;

  const role = row.role as UserRole;
  const permissions =
    role === 'admin' ? { ...ALL_PERMISSIONS } : permissionsFromRow(row);
  const payable_status_ids =
    role === 'admin' ? [] : await listAllowedPayableStatusIds(pool, userId);
  const payable_default_status_ids =
    role === 'admin' ? [] : await listDefaultPayableStatusIds(pool, userId);

  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role,
    active: row.active,
    permissions,
    payable_status_ids,
    payable_default_status_ids,
  };
}

export function attachUser(): RequestHandler {
  return async (req, _res, next) => {
    try {
      const userId = req.session.userId;
      if (userId) {
        const user = await loadAuthUser(userId);
        if (user) req.user = user;
        else delete req.session.userId;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'Authentication required'));
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'Authentication required'));
  if (req.user.role !== 'admin') return next(new HttpError(403, 'Admin access required'));
  next();
}

export function requirePermission(key: PermissionKey): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Authentication required'));
    if (req.user.role === 'admin' || req.user.permissions[key]) return next();
    return next(new HttpError(403, 'Permission denied'));
  };
}

export function requireAnyPermission(...keys: PermissionKey[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Authentication required'));
    if (req.user.role === 'admin' || keys.some((k) => req.user!.permissions[k])) return next();
    return next(new HttpError(403, 'Permission denied'));
  };
}

export function isAdmin(user: AuthUser | undefined): boolean {
  return user?.role === 'admin';
}

export interface PayableAccessFields {
  assignedTo: number | null;
  createdBy?: number | null;
  isDraft?: boolean;
}

/** Staff see docs assigned to them or created by them; admins see all. */
export function assigneeScopeSql(user: AuthUser, paramStart: number): { sql: string; params: number[] } {
  if (isAdmin(user)) return { sql: '', params: [] };
  return {
    sql: ` AND (p.assigned_to = $${paramStart} OR p.created_by = $${paramStart})`,
    params: [user.id],
  };
}

/** View access: admin, assignee, or creator. */
export function assertCanAccessPayable(user: AuthUser, access: PayableAccessFields, noun = 'Payable') {
  if (isAdmin(user)) return;
  if (access.assignedTo === user.id) return;
  if (access.createdBy != null && access.createdBy === user.id) return;
  throw new HttpError(404, `${noun} not found`);
}

/**
 * Edit access:
 * - admin: all
 * - draft: creator (or assignee, if any)
 * - submitted: assignee only
 */
export function assertCanEditPayable(user: AuthUser, access: PayableAccessFields, noun = 'Payable') {
  if (isAdmin(user)) return;
  if (access.isDraft) {
    if (access.createdBy === user.id || access.assignedTo === user.id) return;
    throw new HttpError(403, `You cannot edit this ${noun.toLowerCase()} draft`);
  }
  if (access.assignedTo === user.id) return;
  throw new HttpError(404, `${noun} not found`);
}

export { EMPTY_PERMISSIONS };
