ALTER TABLE gallery_photos ADD COLUMN subject_preset TEXT NOT NULL DEFAULT 'full-body';
ALTER TABLE gallery_photos ADD COLUMN subject_width_m REAL NOT NULL DEFAULT 2;
