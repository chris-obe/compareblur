import { adminAuthError, requireAdmin } from '../../_lib/admin';

interface Env {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
  ADMIN_API_OPEN?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const identity = await requireAdmin(request, env, ['admin:access']);
    return Response.json({ ok: true, identity }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return adminAuthError(error);
  }
};
