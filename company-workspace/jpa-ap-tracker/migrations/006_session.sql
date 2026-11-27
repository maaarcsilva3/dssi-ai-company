-- express-session store (connect-pg-simple). Owned by migrations because the
-- library's createTableIfMissing reads table.sql from disk via __dirname, which
-- fails when the server is esbuild-bundled into a single file.

CREATE TABLE IF NOT EXISTS session (
  sid    varchar NOT NULL PRIMARY KEY,
  sess   json NOT NULL,
  expire timestamp(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire);
