import { findPhoto, imageResponse, json, type GalleryEnv } from '../../../../_lib/gallery';
import { adminAuthError, requireAdmin } from '../../../../_lib/admin';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
  ADMIN_API_OPEN?: string;
  ADMIN_API_TOKEN?: string;
  ADMIN_API_TOKEN_SHA256?: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
  } catch (error) {
    return adminAuthError(error);
  }

  const row = await findPhoto(env, String(params.id));
  if (!row) return json({ error: 'image not found' }, { status: 404 });
  return imageResponse(env, row);
};
