import { json, photoFromRow, type GalleryEnv, type GalleryRow } from '../../_lib/gallery';
import { GALLERY_FORMAT_IDS } from '../../_lib/formats';
import { getEmbedTemplate, publicAlbumWithPhotos, publicJson } from '../../_lib/embed';

// Public selected-set embed: the exact approved photo ids passed via ?ids=a,b,c
// (ephemeral, capped at 24). Order is preserved to match the user's selection.
export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env, request }) => {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get('ids') ?? '';
  const ids = idsParam
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 24);
  if (ids.length === 0) return json({ error: 'no photo ids' }, { status: 400 });
  const albumSlug = url.searchParams.get('album')?.trim();

  if (albumSlug) {
    const album = await publicAlbumWithPhotos(env, albumSlug);
    if (!album) return json({ error: 'album not found' }, { status: 404 });
    const byId = new Map(album.photos.map((photo) => [photo.id, photo]));
    const photos = ids.map((id) => byId.get(id)).filter((photo): photo is NonNullable<typeof photo> => !!photo);
    if (photos.length === 0) return json({ error: 'no embeddable photos' }, { status: 404 });
    return publicJson({
      photos,
      album,
      template: await getEmbedTemplate(env),
      formats: [...GALLERY_FORMAT_IDS],
    });
  }

  const placeholders = ids.map(() => '?').join(',');
  const rows = await env.GALLERY_DB.prepare(
    `SELECT * FROM gallery_photos WHERE id IN (${placeholders}) AND gallery_status = 'approved'`,
  )
    .bind(...ids)
    .all<GalleryRow>();

  const byId = new Map((rows.results ?? []).map((row) => [row.id, photoFromRow(row, false)]));
  const photos = ids.map((id) => byId.get(id)).filter((photo): photo is NonNullable<typeof photo> => !!photo);
  if (photos.length === 0) return json({ error: 'no embeddable photos' }, { status: 404 });

  return publicJson({
    photos,
    template: await getEmbedTemplate(env),
    formats: [...GALLERY_FORMAT_IDS],
  });
};
