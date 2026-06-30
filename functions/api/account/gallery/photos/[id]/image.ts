import { adminAuthError, requireAuth0User } from '../../../../../_lib/admin';
import { imageResponse, json, type GalleryEnv, type GalleryRow } from '../../../../../_lib/gallery';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const identity = await requireAuth0User(request, env);
    const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_photos WHERE id = ? AND submitted_by = ?')
      .bind(String(params.id), identity.sub)
      .first<GalleryRow>();
    if (!row) return json({ error: 'image not found' }, { status: 404 });
    return imageResponse(env, row);
  } catch (error) {
    return adminAuthError(error);
  }
};
