export const FEATURE_FLAG_DEFINITIONS = [
  {
    key: 'gallery',
    label: 'Gallery',
    routeSummary: '/, /gallery/photo/*, /g/*',
  },
  {
    key: 'albums',
    label: 'Albums',
    routeSummary: '/albums, /albums/*',
  },
  {
    key: 'compare',
    label: 'Compare',
    routeSummary: '/compare',
  },
  {
    key: 'kit',
    label: 'My Kit',
    routeSummary: '/kit',
  },
  {
    key: 'suggestions',
    label: 'Suggestions',
    routeSummary: '/suggestions',
  },
  {
    key: 'settings',
    label: 'Settings',
    routeSummary: '/settings',
  },
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_DEFINITIONS)[number]['key'];
export type FeatureFlagMap = Record<FeatureFlagKey, boolean>;

export interface FeatureFlagRecord {
  key: FeatureFlagKey;
  label: string;
  routeSummary: string;
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface PublicFeatureFlagsResponse {
  flags?: Partial<Record<FeatureFlagKey, boolean>>;
}

interface AdminFeatureFlagsResponse {
  ok?: true;
  flags?: FeatureFlagRecord[];
  publicFlags?: Partial<Record<FeatureFlagKey, boolean>>;
}

export const DEFAULT_FEATURE_FLAGS = FEATURE_FLAG_DEFINITIONS.reduce((flags, definition) => {
  flags[definition.key] = true;
  return flags;
}, {} as FeatureFlagMap);

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return FEATURE_FLAG_DEFINITIONS.some((definition) => definition.key === value);
}

export function normalizeFeatureFlags(flags?: Partial<Record<FeatureFlagKey, boolean>>): FeatureFlagMap {
  const normalized: FeatureFlagMap = { ...DEFAULT_FEATURE_FLAGS };

  for (const definition of FEATURE_FLAG_DEFINITIONS) {
    const value = flags?.[definition.key];
    if (typeof value === 'boolean') normalized[definition.key] = value;
  }

  return normalized;
}

async function readJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Feature flags request failed with ${res.status}`;
    throw new Error(message);
  }

  return body as T;
}

function adminHeaders(accessToken?: string, body = false): Headers {
  const headers = new Headers();
  headers.set('accept', 'application/json');
  if (body) headers.set('content-type', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  return headers;
}

export async function getPublicFeatureFlags(): Promise<FeatureFlagMap> {
  const response = await fetch('/api/feature-flags', {
    headers: { accept: 'application/json' },
  });
  const data = await readJson<PublicFeatureFlagsResponse>(response);
  return normalizeFeatureFlags(data.flags);
}

export async function getAdminFeatureFlags(accessToken?: string): Promise<FeatureFlagRecord[]> {
  const response = await fetch('/api/admin/feature-flags', {
    headers: adminHeaders(accessToken),
  });
  const data = await readJson<AdminFeatureFlagsResponse>(response);
  return data.flags ?? [];
}

export async function updateAdminFeatureFlags(
  flags: Partial<FeatureFlagMap>,
  accessToken?: string,
): Promise<FeatureFlagRecord[]> {
  const response = await fetch('/api/admin/feature-flags', {
    method: 'PATCH',
    headers: adminHeaders(accessToken, true),
    body: JSON.stringify({ flags }),
  });
  const data = await readJson<AdminFeatureFlagsResponse>(response);
  return data.flags ?? [];
}
