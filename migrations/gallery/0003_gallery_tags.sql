CREATE TABLE IF NOT EXISTS gallery_tags (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gallery_tags_archived_label
  ON gallery_tags(archived, label);

INSERT OR IGNORE INTO gallery_tags (slug, label, archived, created_at, updated_at)
SELECT
  replace(lower(trim(json_each.value)), ' ', '-') AS slug,
  lower(trim(json_each.value)) AS label,
  0,
  datetime('now'),
  datetime('now')
FROM gallery_photos, json_each(gallery_photos.tags_json)
WHERE trim(json_each.value) <> '';

