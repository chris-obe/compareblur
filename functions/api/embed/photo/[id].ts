import { findPhoto, json, photoFromRow, type GalleryEnv } from '../../../_lib/gallery';
import { GALLERY_FORMAT_IDS } from '../../../_lib/formats';
import {
  albumContainsApprovedPhoto,
  getEmbedTemplate,
  publicAlbumWithPhotos,
  publicJson,
} from '../../../_lib/embed';

export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env, params, request }) => {
  const id = String(params.id);
  const row = await findPhoto(env, id);
  if (!row || row.status !== 'approved') return json({ error: 'photo not found' }, { status: 404 });

  const url = new URL(request.url);
  const albumSlug = url.searchParams.get('album')?.trim();
  const album = albumSlug ? await publicAlbumWithPhotos(env, albumSlug) : null;
  if (albumSlug) {
    if (!album || !(await albumContainsApprovedPhoto(env, albumSlug, id))) {
      return json({ error: 'album photo not found' }, { status: 404 });
    }
  }

  return publicJson({
    photo: photoFromRow(row, false),
    album,
    template: await getEmbedTemplate(env),
    formats: [...GALLERY_FORMAT_IDS],
  });
};
