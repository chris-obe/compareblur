import { buildFullCatalog } from '../../../catalog/src/full-catalog.mjs';
import { COMPACT_CAMERA_OVERRIDES } from '../../../catalog/src/overrides/compact-cameras.mjs';
import { BODY_CAMERAS, CURATED_LENSES } from '../../../catalog/src/overrides/curated-gear.mjs';

const CAMERA_DATABASE_URL =
  'https://raw.githubusercontent.com/leavestylecode/CameraDatabase/main/data/camera_data.json';
const LENSDB_URL = 'https://raw.githubusercontent.com/Luminoid/lens-db/main/data/lenses.json';
const EXPORT_KEY = 'exports/catalog.latest.json';
const EXPORT_VERSION_KEY = (runId) => `exports/catalog.${runId}.json`;
const REPORT_KEY = (runId) => `reports/${runId}.json`;
const DEFAULT_INTERVAL_DAYS = 30;

export default {
  async fetch(request, env) {
    await ensureSettings(env);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), env);

    try {
      if (url.pathname === '/health') {
        return json({ ok: true, service: 'compareblur-catalog-sync' }, env);
      }

      if (url.pathname === '/catalog/latest' && request.method === 'GET') {
        const object = await env.CATALOG_BUCKET.get(EXPORT_KEY);
        if (!object) return json({ error: 'catalog export not found' }, env, 404);
        return cors(
          new Response(object.body, {
            headers: {
              'content-type': object.httpMetadata?.contentType ?? 'application/json',
              etag: object.httpEtag,
              'cache-control': 'public, max-age=300',
            },
          }),
          env,
        );
      }

      if (url.pathname === '/admin/status' && request.method === 'GET') {
        await requireAdmin(request, env);
        return json(await status(env), env);
      }

      if (url.pathname === '/admin/settings' && request.method === 'PATCH') {
        await requireAdmin(request, env);
        const body = await request.json();
        const updates = await updateSettings(env, body);
        return json({ ok: true, settings: updates }, env);
      }

      if (url.pathname === '/admin/refresh' && request.method === 'POST') {
        await requireAdmin(request, env);
        const result = await refreshCatalog(env, 'manual');
        return json(result, env, result.ok ? 200 : 500);
      }

      return json({ error: 'not found' }, env, 404);
    } catch (error) {
      const statusCode = error.statusCode ?? 500;
      return json({ error: error.message ?? 'internal error' }, env, statusCode);
    }
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runIfDue(env));
  },
};

async function runIfDue(env) {
  await ensureSettings(env);
  const settings = await getSettings(env);
  if (settings.autoRefreshEnabled === false) return { ok: true, skipped: 'auto refresh disabled' };

  const last = await lastSuccessfulRun(env);
  if (last?.finished_at) {
    const ageMs = Date.now() - new Date(last.finished_at).getTime();
    const dueMs = settings.refreshIntervalDays * 24 * 60 * 60 * 1000;
    if (ageMs < dueMs) return { ok: true, skipped: 'not due' };
  }

  return refreshCatalog(env, 'scheduled');
}

async function refreshCatalog(env, trigger) {
  const startedAt = new Date().toISOString();
  const runId = `run-${startedAt.replace(/[:.]/g, '-')}`;
  await env.CATALOG_DB.prepare(
    `INSERT INTO catalog_runs (id, trigger, status, started_at) VALUES (?, ?, 'running', ?)`,
  ).bind(runId, trigger, startedAt).run();

  try {
    const [cameraDb, lensDb] = await Promise.all([
      fetchJsonSource('camera-database', CAMERA_DATABASE_URL),
      fetchJsonSource('lens-db', LENSDB_URL),
    ]);
    const sourceHash = await sha256(`${cameraDb.text}\n${lensDb.text}`);
    const cameraDbHash = await sha256(cameraDb.text);
    const lensDbHash = await sha256(lensDb.text);
    const catalog = buildFullCatalog({
      cameraDatabaseRecords: cameraDb.records,
      lensDbRecords: lensDb.records,
    });
    const generatedAt = new Date().toISOString();
    const exportBody = {
      generatedAt,
      runId,
      sources: [
        {
          id: 'camera-database',
          url: CAMERA_DATABASE_URL,
          fetchedAt: cameraDb.fetchedAt,
          sha256: cameraDbHash,
          license: 'MIT',
        },
        {
          id: 'lens-db',
          url: LENSDB_URL,
          fetchedAt: lensDb.fetchedAt,
          sha256: lensDbHash,
          license: 'CC BY-NC-SA 4.0',
        },
        {
          id: 'curated-compact-overrides',
          license: 'Project curated data',
          records: COMPACT_CAMERA_OVERRIDES.length,
        },
        {
          id: 'curated-body-cameras',
          license: 'Project curated data',
          records: BODY_CAMERAS.length,
        },
        {
          id: 'curated-lenses',
          license: 'Project curated data',
          records: CURATED_LENSES.length,
        },
      ],
      cameras: catalog.cameras,
      lenses: catalog.lenses,
      bindings: catalog.bindings,
      compact: catalog.compact,
      stats: catalog.stats,
    };

    const cameraDbKey = `sources/camera-database/${generatedAt.slice(0, 10)}/${cameraDbHash}.json`;
    const lensDbKey = `sources/lens-db/${generatedAt.slice(0, 10)}/${lensDbHash}.json`;
    await env.CATALOG_BUCKET.put(cameraDbKey, cameraDb.text, {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: { source: 'camera-database', sha256: cameraDbHash },
    });
    await env.CATALOG_BUCKET.put(lensDbKey, lensDb.text, {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: { source: 'lens-db', sha256: lensDbHash },
    });

    const jsonText = JSON.stringify(exportBody, null, 2);
    await env.CATALOG_BUCKET.put(EXPORT_KEY, jsonText, {
      httpMetadata: { contentType: 'application/json', cacheControl: 'public, max-age=300' },
      customMetadata: { runId, generatedAt, sha256: sourceHash },
    });
    await env.CATALOG_BUCKET.put(EXPORT_VERSION_KEY(runId), jsonText, {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: { runId, generatedAt, sha256: sourceHash },
    });
    await env.CATALOG_BUCKET.put(REPORT_KEY(runId), jsonText, {
      httpMetadata: { contentType: 'application/json' },
    });

    const finishedAt = new Date().toISOString();
    await env.CATALOG_DB.prepare(
      `UPDATE catalog_runs
       SET status = 'success', source_hash = ?, camera_count = ?, lens_count = ?,
           binding_count = ?, finished_at = ?
       WHERE id = ?`,
    )
      .bind(
        sourceHash,
        catalog.cameras.length,
        catalog.lenses.length,
        catalog.bindings.length,
        finishedAt,
        runId,
      )
      .run();

    return {
      ok: true,
      runId,
      generatedAt,
      exportKey: EXPORT_KEY,
      sourceKeys: [cameraDbKey, lensDbKey],
      counts: {
        cameras: catalog.cameras.length,
        lenses: catalog.lenses.length,
        bindings: catalog.bindings.length,
      },
    };
  } catch (error) {
    await env.CATALOG_DB.prepare(
      `UPDATE catalog_runs SET status = 'failed', error = ?, finished_at = ? WHERE id = ?`,
    )
      .bind(String(error?.stack ?? error?.message ?? error), new Date().toISOString(), runId)
      .run();
    return { ok: false, runId, error: error.message ?? String(error) };
  }
}

async function fetchJsonSource(source, url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${source} fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  return {
    source,
    url,
    fetchedAt: new Date().toISOString(),
    text,
    records: JSON.parse(text),
  };
}

async function status(env) {
  const settings = await getSettings(env);
  const lastRun = await env.CATALOG_DB.prepare(
    `SELECT * FROM catalog_runs ORDER BY started_at DESC LIMIT 1`,
  ).first();
  const lastSuccess = await lastSuccessfulRun(env);
  const object = await env.CATALOG_BUCKET.head(EXPORT_KEY);
  return {
    settings,
    lastRun,
    lastSuccess,
    export: object
      ? {
          key: EXPORT_KEY,
          uploaded: object.uploaded?.toISOString?.() ?? null,
          size: object.size,
          etag: object.httpEtag,
          metadata: object.customMetadata ?? {},
        }
      : null,
  };
}

async function updateSettings(env, body) {
  const now = new Date().toISOString();
  const next = {};
  if (body.refreshIntervalDays != null) {
    const days = Number(body.refreshIntervalDays);
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      throw httpError(400, 'refreshIntervalDays must be between 1 and 365');
    }
    await setSetting(env, 'refresh_interval_days', String(Math.round(days)), now);
    next.refreshIntervalDays = Math.round(days);
  }
  if (body.autoRefreshEnabled != null) {
    const enabled = Boolean(body.autoRefreshEnabled);
    await setSetting(env, 'auto_refresh_enabled', String(enabled), now);
    next.autoRefreshEnabled = enabled;
  }
  return { ...(await getSettings(env)), ...next };
}

async function ensureSettings(env) {
  const now = new Date().toISOString();
  await env.CATALOG_DB.prepare(
    `INSERT OR IGNORE INTO catalog_settings (key, value, updated_at) VALUES (?, ?, ?)`,
  ).bind('refresh_interval_days', String(DEFAULT_INTERVAL_DAYS), now).run();
  await env.CATALOG_DB.prepare(
    `INSERT OR IGNORE INTO catalog_settings (key, value, updated_at) VALUES (?, ?, ?)`,
  ).bind('auto_refresh_enabled', 'true', now).run();
}

async function getSettings(env) {
  const rows = await env.CATALOG_DB.prepare(`SELECT key, value FROM catalog_settings`).all();
  const map = Object.fromEntries((rows.results ?? []).map((row) => [row.key, row.value]));
  return {
    refreshIntervalDays: Number(map.refresh_interval_days ?? DEFAULT_INTERVAL_DAYS),
    autoRefreshEnabled: map.auto_refresh_enabled !== 'false',
  };
}

async function setSetting(env, key, value, updatedAt) {
  await env.CATALOG_DB.prepare(
    `INSERT INTO catalog_settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).bind(key, value, updatedAt).run();
}

async function lastSuccessfulRun(env) {
  return env.CATALOG_DB.prepare(
    `SELECT * FROM catalog_runs WHERE status = 'success' ORDER BY finished_at DESC LIMIT 1`,
  ).first();
}

async function requireAdmin(request, env) {
  if (!env.CATALOG_ADMIN_TOKEN) {
    throw httpError(500, 'CATALOG_ADMIN_TOKEN secret is not configured');
  }
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== env.CATALOG_ADMIN_TOKEN) throw httpError(401, 'unauthorized');
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(body, env, statusCode = 200) {
  return cors(
    Response.json(body, {
      status: statusCode,
      headers: { 'cache-control': 'no-store' },
    }),
    env,
  );
}

function cors(response, env) {
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', env.CATALOG_ADMIN_ORIGIN ?? '*');
  headers.set('access-control-allow-methods', 'GET,POST,PATCH,OPTIONS');
  headers.set('access-control-allow-headers', 'authorization,content-type');
  return new Response(response.body, { status: response.status, headers });
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
