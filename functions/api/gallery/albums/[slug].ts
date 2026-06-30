import { json, type GalleryEnv } from '../../../_lib/gallery';
import { publicAlbumWithPhotos, publicJson } from '../../../_lib/embed';

export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env, params }) => {
  const album = await publicAlbumWithPhotos(env, String(params.slug));
  if (!album) return json({ error: 'album not found' }, { status: 404 });
  return publicJson({ album, photos: album.photos });
};
