ALTER TABLE gallery_photos ADD COLUMN gallery_status TEXT NOT NULL DEFAULT 'not_submitted';
ALTER TABLE gallery_photos ADD COLUMN gallery_status_review_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gallery_album_photos ADD COLUMN visibility TEXT NOT NULL DEFAULT 'visible';

UPDATE gallery_photos
SET gallery_status = CASE
    WHEN COALESCE(submitted_by, '') = '' AND status = 'approved' THEN 'approved'
    WHEN COALESCE(submitted_by, '') = '' AND status = 'pending' THEN 'pending'
    WHEN COALESCE(submitted_by, '') = '' AND status = 'rejected' THEN 'rejected'
    WHEN COALESCE(submitted_by, '') = '' THEN 'not_submitted'
    WHEN status = 'approved' THEN 'approved'
    WHEN status = 'pending' THEN 'pending'
    WHEN status = 'rejected' THEN 'rejected'
    ELSE 'not_submitted'
  END,
  gallery_status_review_required = CASE
    WHEN COALESCE(submitted_by, '') <> '' AND status = 'approved' THEN 1
    ELSE 0
  END;

UPDATE gallery_album_photos
SET visibility = 'visible'
WHERE visibility IS NULL OR visibility = '';

CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery_status_updated
  ON gallery_photos(gallery_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_review_required
  ON gallery_photos(gallery_status_review_required, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_gallery_album_photos_album_visibility_order
  ON gallery_album_photos(album_slug, visibility, sort_order);
