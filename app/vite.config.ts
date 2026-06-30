import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const catalogWorkerOrigin =
  process.env.CATALOG_WORKER_ORIGIN ?? 'https://compareblur-catalog-sync.christian-obe.workers.dev';
const galleryPagesOrigin =
  process.env.GALLERY_PAGES_ORIGIN ?? 'https://warsaw-admin-gallery.compareblur.pages.dev';
const adminPagesOrigin = process.env.ADMIN_PAGES_ORIGIN ?? 'https://blur.lightpilot.co';

function localAdminAuthRequired() {
  return process.env.VITE_ADMIN_REQUIRE_AUTH === 'true';
}

function localCatalogAdminToken() {
  if (process.env.CATALOG_ADMIN_TOKEN) return process.env.CATALOG_ADMIN_TOKEN;

  const tokenFile = resolve(repoRoot, '.context/catalog-admin-token.txt');
  if (!existsSync(tokenFile)) return '';
  return readFileSync(tokenFile, 'utf8').trim();
}

function localAdminApiToken() {
  if (process.env.ADMIN_API_TOKEN) return process.env.ADMIN_API_TOKEN;

  const tokenFile = resolve(repoRoot, '.context/admin-api-token.txt');
  if (!existsSync(tokenFile)) return '';
  return readFileSync(tokenFile, 'utf8').trim();
}

function catalogAdminProxy(): Plugin {
  return {
    name: 'catalog-admin-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/admin/catalog', (req: IncomingMessage, res: ServerResponse) => {
        if (localAdminAuthRequired()) {
          proxyRequest(req, res, adminPagesOrigin, `/api/admin/catalog${req.url ?? ''}`);
          return;
        }

        const token = localCatalogAdminToken();

        if (!token) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'CATALOG_ADMIN_TOKEN is not configured for local dev' }));
          return;
        }

        const requestUrl = new URL(req.url ?? '/', 'http://localhost');
        const workerPath = requestUrl.pathname === '/' ? '/admin/status' : `/admin${requestUrl.pathname}`;
        const target = new URL(`${workerPath}${requestUrl.search}`, catalogWorkerOrigin);
        const headers = new Headers();

        for (const [key, value] of Object.entries(req.headers)) {
          if (!value || key.toLowerCase() === 'host') continue;
          headers.set(key, Array.isArray(value) ? value.join(',') : String(value));
        }

        headers.set('authorization', `Bearer ${token}`);
        headers.set('accept', headers.get('accept') ?? 'application/json');

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
        req.on('end', async () => {
          try {
            const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
            const method = req.method ?? 'GET';
            const upstream = await fetch(target, {
              method,
              headers,
              body: method === 'GET' || method === 'HEAD' ? undefined : body,
            });

            res.statusCode = upstream.status;
            upstream.headers.forEach((value, key) => {
              if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key)) {
                res.setHeader(key, value);
              }
            });
            res.end(Buffer.from(await upstream.arrayBuffer()));
          } catch (error) {
            res.statusCode = 502;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Catalog proxy failed' }));
          }
        });
      });
    },
  };
}

function adminIdentityProxy(): Plugin {
  return {
    name: 'admin-identity-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/admin/me', (req: IncomingMessage, res: ServerResponse) => {
        if (localAdminAuthRequired()) {
          proxyRequest(req, res, adminPagesOrigin, `/api/admin/me${req.url ?? ''}`);
          return;
        }

        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({
          ok: true,
          identity: {
            sub: 'dev-admin-bypass',
            permissions: ['admin:access', 'catalog:manage'],
          },
        }));
      });

      server.middlewares.use('/api/admin/users', (req: IncomingMessage, res: ServerResponse) => {
        if (localAdminAuthRequired()) {
          proxyRequest(req, res, adminPagesOrigin, `/api/admin/users${req.url ?? ''}`);
          return;
        }

        res.statusCode = 501;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: 'Auth0 user lookup requires VITE_ADMIN_REQUIRE_AUTH=true in local dev' }));
      });
    },
  };
}

function galleryApiProxy(): Plugin {
  return {
    name: 'gallery-api-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/gallery', (req: IncomingMessage, res: ServerResponse) => {
        proxyRequest(req, res, galleryPagesOrigin, `/api/gallery${req.url ?? ''}`);
      });

      server.middlewares.use('/api/embed', (req: IncomingMessage, res: ServerResponse) => {
        proxyRequest(req, res, galleryPagesOrigin, `/api/embed${req.url ?? ''}`);
      });

      server.middlewares.use('/api/admin/gallery', (req: IncomingMessage, res: ServerResponse) => {
        if (localAdminAuthRequired()) {
          proxyRequest(req, res, adminPagesOrigin, `/api/admin/gallery${req.url ?? ''}`);
          return;
        }

        const token = localAdminApiToken();
        proxyRequest(req, res, galleryPagesOrigin, `/api/admin/gallery${req.url ?? ''}`, token);
      });

      server.middlewares.use('/api/admin/embed', (req: IncomingMessage, res: ServerResponse) => {
        if (localAdminAuthRequired()) {
          proxyRequest(req, res, adminPagesOrigin, `/api/admin/embed${req.url ?? ''}`);
          return;
        }

        const token = localAdminApiToken();
        proxyRequest(req, res, galleryPagesOrigin, `/api/admin/embed${req.url ?? ''}`, token);
      });
    },
  };
}

function accountApiProxy(): Plugin {
  return {
    name: 'account-api-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/account', (req: IncomingMessage, res: ServerResponse) => {
        proxyRequest(req, res, adminPagesOrigin, `/api/account${req.url ?? ''}`);
      });
    },
  };
}

function proxyRequest(
  req: IncomingMessage,
  res: ServerResponse,
  origin: string,
  path: string,
  bearerToken?: string,
) {
  const target = new URL(path, origin);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || key.toLowerCase() === 'host') continue;
    headers.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }

  if (bearerToken) headers.set('authorization', `Bearer ${bearerToken}`);

  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
  req.on('end', async () => {
    try {
      const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
      const method = req.method ?? 'GET';
      const upstream = await fetch(target, {
        method,
        headers,
        body: method === 'GET' || method === 'HEAD' ? undefined : body,
      });

      res.statusCode = upstream.status;
      upstream.headers.forEach((value, key) => {
        if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key)) {
          res.setHeader(key, value);
        }
      });
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
      res.statusCode = 502;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Proxy request failed' }));
    }
  });
}

// The optics engine lives in the sibling /engine directory and is shared
// (the legacy site + demos import it too), so we alias instead of copying.
export default defineConfig({
  plugins: [react(), tailwindcss(), adminIdentityProxy(), catalogAdminProxy(), galleryApiProxy(), accountApiProxy()],
  resolve: {
    alias: {
      '@engine': resolve(__dirname, '../engine/index.js'),
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    // Pinned: the app always binds 5174 (Conductor's run script targets it too).
    // strictPort means an occupied 5174 errors loudly instead of drifting.
    port: 5174,
    strictPort: true,
    host: true,
    fs: { allow: ['..'] }, // allow serving the sibling /engine dir
  },
});
