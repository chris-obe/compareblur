import { adminAuthError, requireAdmin } from '../../../_lib/admin';
import { getEmbedTemplate, saveEmbedTemplate } from '../../../_lib/embed';
import { json, type GalleryEnv } from '../../../_lib/gallery';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
  ADMIN_API_OPEN?: string;
  ADMIN_API_TOKEN?: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
  } catch (error) {
    return adminAuthError(error);
  }

  return json({ template: await getEmbedTemplate(env) });
};

export const onRequestPatch: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
  } catch (error) {
    return adminAuthError(error);
  }

  const body = await request.json().catch(() => ({}));
  const template = await saveEmbedTemplate(env, (body as { template?: unknown }).template ?? body);
  return json({ template });
};
