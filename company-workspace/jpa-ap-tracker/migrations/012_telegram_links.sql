-- Telegram bot account linking for admin report AI.

CREATE TABLE telegram_link_codes (
  code        TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX telegram_link_codes_user_id_idx ON telegram_link_codes (user_id);
CREATE INDEX telegram_link_codes_expires_at_idx ON telegram_link_codes (expires_at);

CREATE TABLE telegram_links (
  telegram_user_id BIGINT PRIMARY KEY,
  user_id          INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT NOT NULL,
  ai_chat_id       UUID NOT NULL DEFAULT gen_random_uuid(),
  linked_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX telegram_links_user_id_idx ON telegram_links (user_id);
