CREATE TABLE IF NOT EXISTS catalog_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_runs (
  id TEXT PRIMARY KEY,
  trigger TEXT NOT NULL,
  status TEXT NOT NULL,
  source_hash TEXT,
  camera_count INTEGER NOT NULL DEFAULT 0,
  lens_count INTEGER NOT NULL DEFAULT 0,
  binding_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_catalog_runs_started_at
  ON catalog_runs(started_at DESC);

INSERT OR IGNORE INTO catalog_settings (key, value, updated_at)
VALUES
  ('refresh_interval_days', '30', datetime('now')),
  ('auto_refresh_enabled', 'true', datetime('now'));
