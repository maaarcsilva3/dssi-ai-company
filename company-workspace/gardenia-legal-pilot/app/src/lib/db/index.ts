import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "gardenia.db");
const DATA_DIR = path.dirname(DB_PATH);

let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: DatabaseSync | null = null;

export function getSqlite(): DatabaseSync {
  if (!_sqlite) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    _sqlite = new DatabaseSync(DB_PATH);
    _sqlite.exec("PRAGMA journal_mode = DELETE");
    _sqlite.exec("PRAGMA foreign_keys = ON");
  }
  return _sqlite;
}

export function getDb() {
  if (!_db) {
    _db = drizzle({ client: getSqlite() });
  }
  return _db;
}

export { schema, DB_PATH };