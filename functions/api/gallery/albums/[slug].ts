import { json, type GalleryEnv } from '../../../_lib/gallery';
import { publicAlbumWithPhotos, publicJson, type GalleryAlbumRow, verifyAlbumPassword } from '../../../_lib/embed';

export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env, params, request }) => {
  const slug = String(params.slug);
  const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_albums WHERE slug = ? AND status = ?')
    .bind(slug, 'published')
    .first<GalleryAlbumRow>();
  if (!row) return json({ error: 'album not found' }, { status: 404 });

  const password = request.headers.get('x-gallery-album-password')?.trim();
  if (row.password_hash) {
    if (!password) {
      return json({ error: 'album password required', code: 'album_password_required', requiresPassword: true }, { status: 401 });
    }
    if (!(await verifyAlbumPassword(row, password))) {
      return json({ error: 'invalid album password', code: 'album_password_invalid', requiresPassword: true }, { status: 403 });
    }
  }

  const album = await publicAlbumWithPhotos(env, slug, password);
  if (!album) return json({ error: 'album not found' }, { status: 404 });
  return publicJson({ album, photos: album.photos });
};
