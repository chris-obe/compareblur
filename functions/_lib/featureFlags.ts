import type { GalleryEnv } from './gallery';

export const FEATURE_FLAGS = [
  { key: 'gallery', label: 'Gallery', routeSummary: '/, /gallery/photo/*, /g/*' },
  { key: 'albums', label: 'Albums', routeSummary: '/albums, /albums/*' },
  { key: 'compare', label: 'Compare', routeSummary: '/compare' },
  { key: 'kit', label: 'My Kit', routeSummary: '/kit' },
  { key: 'suggestions', label: 'Suggestions', routeSummary: '/suggestions' },
  { key: 'settings', label: 'Settings', routeSummary: '/settings' },
] as const;

export type FeatureFlagKey = typeof FEATURE_FLAGS[number]['key'];

export interface FeatureFlagRow {
  key: string;
  enabled: number;
  updated_at: string;
  updated_by: string | null;
}

export interface FeatureFlagRecord {
  key: FeatureFlagKey;
  label: string;
  routeSummary: string;
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

const FLAG_KEYS = new Set<string>(FEATURE_FLAGS.map((flag) => flag.key));

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return FLAG_KEYS.has(value);
}

export async function loadFeatureFlags(env: Pick<GalleryEnv, 'GALLERY_DB'>): Promise<FeatureFlagRecord[]> {
  await ensureFeatureFlags(env);
  const rows = await env.GALLERY_DB.prepare('SELECT key, enabled, updated_at, updated_by FROM app_feature_flags').all<FeatureFlagRow>();
  const byKey = new Map((rows.results ?? []).map((row) => [row.key, row]));

  return FEATURE_FLAGS.map((flag) => {
    const row = byKey.get(flag.key);
    return {
      ...flag,
      enabled: row ? row.enabled === 1 : true,
      updatedAt: row?.updated_at ?? null,
      updatedBy: row?.updated_by ?? null,
    };
  });
}

export function publicFlags(records: FeatureFlagRecord[]): Record<FeatureFlagKey, boolean> {
  return Object.fromEntries(records.map((flag) => [flag.key, flag.enabled])) as Record<FeatureFlagKey, boolean>;
}

export async function updateFeatureFlags(
  env: Pick<GalleryEnv, 'GALLERY_DB'>,
  updates: Partial<Record<FeatureFlagKey, boolean>>,
  updatedBy: string,
): Promise<FeatureFlagRecord[]> {
  await ensureFeatureFlags(env);
  const now = new Date().toISOString();
  for (const [key, enabled] of Object.entries(updates)) {
    if (!isFeatureFlagKey(key) || typeof enabled !== 'boolean') continue;
    await env.GALLERY_DB.prepare(
      `INSERT INTO app_feature_flags (key, enabled, updated_at, updated_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    )
      .bind(key, enabled ? 1 : 0, now, updatedBy)
      .run();
  }

  return loadFeatureFlags(env);
}

async function ensureFeatureFlags(env: Pick<GalleryEnv, 'GALLERY_DB'>) {
  await env.GALLERY_DB.prepare(
    `CREATE TABLE IF NOT EXISTS app_feature_flags (
      key TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
      updated_at TEXT NOT NULL,
      updated_by TEXT
    )`,
  ).run();

  const now = new Date().toISOString();
  for (const flag of FEATURE_FLAGS) {
    await env.GALLERY_DB.prepare(
      'INSERT OR IGNORE INTO app_feature_flags (key, enabled, updated_at, updated_by) VALUES (?, 1, ?, ?)',
    )
      .bind(flag.key, now, 'default')
      .run();
  }
}
