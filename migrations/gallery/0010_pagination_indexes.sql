-- Keyset pagination support (see functions/_lib/gallery.ts pageParamsFromUrl).

-- Account photo list: WHERE submitted_by = ? ORDER BY updated_at DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_gallery_photos_submitted_by_updated
  ON gallery_photos(submitted_by, updated_at DESC, id DESC);

-- Public gallery list: WHERE gallery_status = 'approved'
-- ORDER BY COALESCE(published_at, updated_at) DESC, created_at DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_gallery_photos_public_order
  ON gallery_photos(gallery_status, COALESCE(published_at, updated_at) DESC, created_at DESC, id DESC);
