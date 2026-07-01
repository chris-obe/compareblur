CREATE TABLE IF NOT EXISTS app_feature_flags (
  key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

INSERT OR IGNORE INTO app_feature_flags (key, enabled, updated_at, updated_by)
VALUES
  ('gallery', 1, datetime('now'), 'migration'),
  ('albums', 1, datetime('now'), 'migration'),
  ('compare', 1, datetime('now'), 'migration'),
  ('kit', 1, datetime('now'), 'migration'),
  ('suggestions', 1, datetime('now'), 'migration'),
  ('settings', 1, datetime('now'), 'migration');
