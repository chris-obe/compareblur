import { findPhoto, galleryStatusFromRow, json, photoFromRow, type GalleryEnv } from '../../../_lib/gallery';
import { GALLERY_FORMAT_IDS } from '../../../_lib/formats';
import {
  albumContainsVisiblePhoto,
  getEmbedTemplate,
  publicAlbumWithPhotos,
  publicJson,
} from '../../../_lib/embed';

export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env, params, request }) => {
  const id = String(params.id);
  const url = new URL(request.url);
  const albumSlug = url.searchParams.get('album')?.trim();
  const album = albumSlug ? await publicAlbumWithPhotos(env, albumSlug) : null;
  if (albumSlug) {
    if (!album || !(await albumContainsVisiblePhoto(env, albumSlug, id))) {
      return json({ error: 'album photo not found' }, { status: 404 });
    }
    const photo = album.photos.find((item) => item.id === id);
    if (!photo) return json({ error: 'album photo not found' }, { status: 404 });
    return publicJson({
      photo,
      album,
      template: await getEmbedTemplate(env),
      formats: [...GALLERY_FORMAT_IDS],
    });
  }
  const row = await findPhoto(env, id);
  if (!row || galleryStatusFromRow(row) !== 'approved') return json({ error: 'photo not found' }, { status: 404 });

  return publicJson({
    photo: photoFromRow(row, false),
    album,
    template: await getEmbedTemplate(env),
    formats: [...GALLERY_FORMAT_IDS],
  });
};
