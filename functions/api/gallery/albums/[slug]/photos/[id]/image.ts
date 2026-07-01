import { imageResponse, json, type GalleryEnv, type GalleryRow } from '../../../../../../_lib/gallery';
import { verifyAlbumAccessToken, type GalleryAlbumRow } from '../../../../../../_lib/embed';

export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env, params, request }) => {
  const slug = String(params.slug);
  const id = String(params.id);
  const album = await env.GALLERY_DB.prepare('SELECT * FROM gallery_albums WHERE slug = ? AND status = ?')
    .bind(slug, 'published')
    .first<GalleryAlbumRow>();
  if (!album) return json({ error: 'image not found' }, { status: 404 });

  const token = new URL(request.url).searchParams.get('token');
  if (!(await verifyAlbumAccessToken(album, token))) {
    return json({ error: 'image not found' }, { status: 404 });
  }

  const row = await env.GALLERY_DB.prepare(
    `SELECT gallery_photos.*
     FROM gallery_album_photos
     JOIN gallery_photos ON gallery_photos.id = gallery_album_photos.photo_id
     WHERE gallery_album_photos.album_slug = ?
       AND gallery_album_photos.photo_id = ?
       AND gallery_album_photos.visibility = 'visible'`,
  )
    .bind(slug, id)
    .first<GalleryRow>();
  if (!row) return json({ error: 'image not found' }, { status: 404 });

  return imageResponse(env, row, { publicCache: true });
};
