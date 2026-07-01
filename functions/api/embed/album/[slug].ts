import { json, type GalleryEnv } from '../../../_lib/gallery';
import { GALLERY_FORMAT_IDS } from '../../../_lib/formats';
import { getEmbedTemplate, publicAlbumWithPhotos, publicJson } from '../../../_lib/embed';

// Public album auto-select embed: the first N approved photos of a PUBLISHED album.
export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env, params, request }) => {
  const slug = String(params.slug);
  const album = await publicAlbumWithPhotos(env, slug);
  if (!album) return json({ error: 'album not found' }, { status: 404 });

  const template = await getEmbedTemplate(env);
  const requested = Number(new URL(request.url).searchParams.get('count'));
  const count = Number.isFinite(requested) && requested > 0
    ? Math.min(24, Math.round(requested))
    : template.gallery.albumCount;
  const photos = album.photos.slice(0, count);

  return publicJson({
    album: { ...album, photos },
    photos,
    template,
    formats: [...GALLERY_FORMAT_IDS],
  });
};
