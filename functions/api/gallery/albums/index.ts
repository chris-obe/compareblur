import { albumFromRow, publicJson, type GalleryAlbumRow } from '../../../_lib/embed';
import { type GalleryEnv } from '../../../_lib/gallery';

export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env }) => {
  const rows = await env.GALLERY_DB.prepare(
    `SELECT * FROM gallery_albums
     WHERE status = 'published'
     ORDER BY COALESCE(published_at, updated_at) DESC`,
  ).all<GalleryAlbumRow>();

  return publicJson({ albums: (rows.results ?? []).map((row) => albumFromRow(row)) });
};
