ALTER TABLE gallery_albums ADD COLUMN owner_name TEXT NOT NULL DEFAULT '';
ALTER TABLE gallery_albums ADD COLUMN password_hash TEXT;
ALTER TABLE gallery_albums ADD COLUMN password_salt TEXT;

UPDATE gallery_albums
SET owner_name = 'blur account'
WHERE owner_name IS NULL OR owner_name = '';
