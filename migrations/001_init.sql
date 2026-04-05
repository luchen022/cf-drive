-- cf-drive database migrations

CREATE TABLE IF NOT EXISTS mounts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  mount_path       TEXT    NOT NULL UNIQUE,
  driver           TEXT    NOT NULL,
  addition         TEXT    NOT NULL DEFAULT '{}',
  cache_expiration INTEGER NOT NULL DEFAULT 300,
  order_num        INTEGER NOT NULL DEFAULT 0,
  disabled         INTEGER NOT NULL DEFAULT 0,
  remark           TEXT    NOT NULL DEFAULT '',
  status           TEXT    NOT NULL DEFAULT 'work',
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  salt          TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'guest',
  disabled      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT NOT NULL PRIMARY KEY,
  value       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'string',
  group_name  TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO settings (key, value, type, group_name, description) VALUES
  ('site_title',   'cf-drive', 'string', 'general', '站点名称'),
  ('guest_access', 'true',     'bool',   'general', '是否允许访客访问'),
  ('announcement', '',         'string', 'general', '公告内容');
