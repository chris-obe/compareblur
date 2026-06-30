const DEFAULT_ADMIN_API_BASE = '/api/admin/catalog';
const DEFAULT_ADMIN_ROOT = '/api/admin';

export interface AdminIdentity {
  sub: string;
  email?: string;
  name?: string;
  permissions: string[];
}

export interface CatalogAdminSettings {
  refreshIntervalDays: number;
  autoRefreshEnabled: boolean;
}

export interface CatalogRun {
  id: string;
  trigger: string;
  status: 'running' | 'success' | 'failed' | string;
  source_hash?: string | null;
  camera_count?: number;
  lens_count?: number;
  binding_count?: number;
  error?: string | null;
  started_at: string;
  finished_at?: string | null;
}

export interface CatalogExportStatus {
  key: string;
  uploaded?: string | null;
  size?: number;
  etag?: string;
  metadata?: Record<string, string>;
}

export interface CatalogAdminStatus {
  settings: CatalogAdminSettings;
  lastRun?: CatalogRun | null;
  lastSuccess?: CatalogRun | null;
  export?: CatalogExportStatus | null;
}

export interface CatalogSourceRef {
  id: string;
  recordId?: string;
  url?: string;
  license?: string;
  fetchedAt?: string;
  confidence?: number;
  fields?: string[];
}

export interface CatalogExportRecord {
  id: string;
  maker?: string;
  name?: string;
  source?: string;
  sourceType?: 'external' | 'curated' | 'derived';
  sources?: CatalogSourceRef[];
  [key: string]: unknown;
}

export interface CatalogLatestExport {
  generatedAt?: string;
  runId?: string;
  sources?: Array<Record<string, unknown>>;
  cameras?: CatalogExportRecord[];
  lenses?: CatalogExportRecord[];
  bindings?: Array<Record<string, unknown>>;
  compact?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  reconReport?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CatalogRefreshResult {
  ok: boolean;
  runId?: string;
  generatedAt?: string;
  exportKey?: string;
  sourceKey?: string;
  counts?: {
    cameras: number;
    lenses: number;
    bindings: number;
  };
  error?: string;
}

export interface AdminUserSummary {
  blocked: boolean;
  connections: string[];
  createdAt?: string;
  email?: string;
  emailVerified: boolean;
  id: string;
  lastIp?: string;
  lastLogin?: string;
  loginsCount: number;
  name?: string;
  picture?: string;
  providers: string[];
  updatedAt?: string;
}

export interface AdminUsersStats {
  activeLast30Days: number;
  blocked: number;
  createdLast7Days: number;
  databaseUsers: number;
  providerCounts: Record<string, number>;
  socialLoginUsers: number;
  total: number;
  unverifiedEmail: number;
  verifiedEmail: number;
  visible: number;
}

export interface AdminUsersResponse {
  ok: true;
  page: number;
  perPage: number;
  query: string;
  returned: number;
  stats: AdminUsersStats;
  total: number;
  users: AdminUserSummary[];
}

export class AdminApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

function adminApiBase(): string {
  return (
    import.meta.env.VITE_CATALOG_ADMIN_API_BASE ||
    import.meta.env.VITE_ADMIN_API_BASE ||
    DEFAULT_ADMIN_API_BASE
  ).replace(/\/$/, '');
}

function adminRoot(): string {
  return (import.meta.env.VITE_ADMIN_API_ROOT || DEFAULT_ADMIN_ROOT).replace(/\/$/, '');
}

async function adminFetch<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${adminApiBase()}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      typeof body?.error === 'string' ? body.error : `Admin API request failed with ${res.status}`;
    throw new AdminApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export function getAdminIdentity(accessToken: string): Promise<{ ok: true; identity: AdminIdentity }> {
  return adminFetchFrom<{ ok: true; identity: AdminIdentity }>(`${adminRoot()}/me`, {}, accessToken);
}

export function getAdminUsers(
  accessToken: string,
  options: { page?: number; perPage?: number; q?: string } = {},
): Promise<AdminUsersResponse> {
  const params = new URLSearchParams({
    page: String(options.page ?? 0),
    perPage: String(options.perPage ?? 50),
  });
  if (options.q?.trim()) params.set('q', options.q.trim());
  return adminFetchFrom<AdminUsersResponse>(`${adminRoot()}/users?${params.toString()}`, {}, accessToken);
}

async function adminFetchFrom<T>(url: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      typeof body?.error === 'string' ? body.error : `Admin API request failed with ${res.status}`;
    throw new AdminApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export function getCatalogAdminStatus(accessToken?: string): Promise<CatalogAdminStatus> {
  return adminFetch<CatalogAdminStatus>('/status', undefined, accessToken);
}

export function getCatalogLatestExport(accessToken?: string): Promise<CatalogLatestExport> {
  return adminFetch<CatalogLatestExport>('/latest', undefined, accessToken);
}

export function updateCatalogAdminSettings(
  settings: Partial<CatalogAdminSettings>,
  accessToken?: string,
): Promise<{ ok: true; settings: CatalogAdminSettings }> {
  return adminFetch<{ ok: true; settings: CatalogAdminSettings }>(
    '/settings',
    {
      method: 'PATCH',
      body: JSON.stringify(settings),
    },
    accessToken,
  );
}

export function triggerCatalogRefresh(accessToken?: string): Promise<CatalogRefreshResult> {
  return adminFetch<CatalogRefreshResult>('/refresh', { method: 'POST' }, accessToken);
}
