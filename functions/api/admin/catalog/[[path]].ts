import { adminAuthError, requireAdmin } from '../../../_lib/admin';

const DEFAULT_CATALOG_WORKER_ORIGIN = 'https://compareblur-catalog-sync.christian-obe.workers.dev';

interface Env {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
  CATALOG_ADMIN_TOKEN?: string;
  CATALOG_WORKER_ORIGIN?: string;
  ADMIN_API_OPEN?: string;
}

function workerPath(path?: string | string[]) {
  const parts = Array.isArray(path) ? path : path ? [path] : ['status'];
  if (parts[0] === 'latest') return `/catalog/${parts.join('/')}`;
  return `/admin/${parts.join('/')}`;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    await requireAdmin(context.request, context.env, ['admin:access', 'catalog:manage']);
  } catch (error) {
    return adminAuthError(error);
  }

  const token = context.env.CATALOG_ADMIN_TOKEN;
  if (!token) {
    return Response.json({ error: 'CATALOG_ADMIN_TOKEN is not configured' }, { status: 500 });
  }

  const url = new URL(context.request.url);
  const path = workerPath(context.params.path as string | string[] | undefined);
  const origin = context.env.CATALOG_WORKER_ORIGIN ?? DEFAULT_CATALOG_WORKER_ORIGIN;
  const target = new URL(`${path}${url.search}`, origin);
  const headers = new Headers(context.request.headers);

  headers.set('authorization', `Bearer ${token}`);
  headers.set('accept', headers.get('accept') ?? 'application/json');
  headers.delete('host');

  return fetch(target, {
    method: context.request.method,
    headers,
    body:
      context.request.method === 'GET' || context.request.method === 'HEAD'
        ? undefined
        : context.request.body,
  });
};
