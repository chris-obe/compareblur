ALTER TABLE gallery_photos ADD COLUMN shutter_speed TEXT;
ALTER TABLE gallery_photos ADD COLUMN iso INTEGER;
ALTER TABLE gallery_photos ADD COLUMN captured_at TEXT;

CREATE TABLE IF NOT EXISTS gallery_albums (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  owner_sub TEXT,
  cover_photo_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  FOREIGN KEY (cover_photo_id) REFERENCES gallery_photos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gallery_albums_status_updated
  ON gallery_albums(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS gallery_album_photos (
  album_slug TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  caption TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (album_slug, photo_id),
  FOREIGN KEY (album_slug) REFERENCES gallery_albums(slug) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (photo_id) REFERENCES gallery_photos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_album_photos_album_order
  ON gallery_album_photos(album_slug, sort_order);

CREATE INDEX IF NOT EXISTS idx_gallery_album_photos_photo
  ON gallery_album_photos(photo_id);

CREATE TABLE IF NOT EXISTS gallery_embed_settings (
  id TEXT PRIMARY KEY,
  template_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO gallery_embed_settings (id, template_json, created_at, updated_at)
VALUES (
  'default',
  '{"theme":"light","density":"comfortable","frameStyle":"technical","imageFit":"cover","defaultTargetFormatId":"ff","visibleFields":["camera","lens","focal","aperture","shutter","iso","capturedAt","format","subject"],"ctaLabel":"Open in blur","showEquivalent":true}',
  datetime('now'),
  datetime('now')
);
