import { json, photoFromRow, type GalleryEnv, type GalleryRow } from '../../_lib/gallery';
import { reactionCountsForPhotos } from '../../_lib/reactions';

export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env }) => {
  const rows = await env.GALLERY_DB.prepare(
    `SELECT * FROM gallery_photos
     WHERE status = 'approved'
     ORDER BY COALESCE(published_at, updated_at) DESC, created_at DESC`,
  ).all<GalleryRow>();

  const photos = rows.results ?? [];
  const counts = await reactionCountsForPhotos(env, photos.map((row) => row.id));

  return json({ photos: photos.map((row) => photoFromRow(row, false, counts.get(row.id))) });
};
