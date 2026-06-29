CREATE TABLE IF NOT EXISTS gallery_reactions (
  photo_id TEXT NOT NULL,
  user_sub TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  reaction TEXT NOT NULL CHECK (reaction IN ('dislike', 'like', 'love')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (photo_id, user_sub),
  FOREIGN KEY (photo_id) REFERENCES gallery_photos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_reactions_photo_reaction
  ON gallery_reactions(photo_id, reaction);

CREATE INDEX IF NOT EXISTS idx_gallery_reactions_user_updated
  ON gallery_reactions(user_sub, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_gallery_reactions_updated
  ON gallery_reactions(updated_at DESC);
