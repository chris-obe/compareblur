CREATE TABLE IF NOT EXISTS gallery_photos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  object_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  width INTEGER,
  height INTEGER,
  format_id TEXT NOT NULL,
  camera TEXT NOT NULL,
  lens TEXT NOT NULL,
  focal REAL NOT NULL,
  aperture REAL NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  submitted_by TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_status_updated
  ON gallery_photos(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_published
  ON gallery_photos(published_at DESC);
