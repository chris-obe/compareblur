import { json, photoFromRow, type GalleryEnv, type GalleryRow } from '../../_lib/gallery';

export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env }) => {
  const rows = await env.GALLERY_DB.prepare(
    `SELECT * FROM gallery_photos
     WHERE status = 'approved'
     ORDER BY COALESCE(published_at, updated_at) DESC, created_at DESC`,
  ).all<GalleryRow>();

  return json({ photos: (rows.results ?? []).map((row) => photoFromRow(row)) });
};
