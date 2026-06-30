import { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  Download,
  HardDrive,
  ImagePlus,
  RefreshCw,
  Shield,
  SlidersHorizontal,
  ThumbsUp,
  UserCog,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { isDevAdminBypass } from '../auth/adminAccess';
import { useAdminAccess } from '../auth/AdminAccessProvider';
import { adminAuthorizationParams, adminTokenParams } from '../auth/config';
import {
  AdminApiError,
  getAdminIdentity,
  getAdminUsers,
  getCatalogAdminStatus,
  getCatalogLatestExport,
  triggerCatalogRefresh,
  updateCatalogAdminSettings,
  type AdminIdentity,
  type AdminUsersResponse,
  type CatalogAdminStatus,
  type CatalogExportRecord,
  type CatalogLatestExport,
} from '../lib/adminApi';
import {
  createAdminGalleryTag,
  getAdminGalleryReactionStats,
  listAdminGalleryPhotos,
  listAdminGalleryTags,
  type AdminGalleryReactionStats,
  type AdminGalleryPhoto,
  type GalleryTag,
} from '../lib/galleryApi';
import { useCatalog } from '../store/CatalogProvider';
import { GalleryAdmin } from '../components/admin/GalleryAdmin';

type AdminSection = 'overview' | 'catalog' | 'gallery' | 'reactions' | 'users' | 'storage';

interface AdminGateProps {
  children: React.ReactNode;
}

const SECTIONS: Array<{ id: AdminSection; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'reactions', label: 'Reactions' },
  { id: 'users', label: 'Users' },
  { id: 'storage', label: 'Storage' },
];

function formatDate(value?: string | null): string {
  if (!value) return 'None';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatBytes(value?: number): string {
  if (!value) return 'Unknown';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}

function statusTone(status?: string | null): string {
  if (status === 'success') return 'bg-fg text-bg border-fg';
  if (status === 'failed') return 'border-line-strong text-fg';
  if (status === 'running') return 'bg-faint text-fg border-line';
  return 'text-muted border-line';
}

function AdminGate({ children }: AdminGateProps) {
  const { loginWithRedirect } = useAuth0();
  const { status, error } = useAdminAccess();

  if (status === 'loading' || status === 'checking') {
    return <AdminNotice title="Checking access" detail="Verifying your Auth0 admin permissions." />;
  }

  if (status === 'anonymous') {
    return (
      <AdminNotice
        title="Admin sign in required"
        detail="Use the account with the Auth0 admin role to continue."
        action={
          <Button
            variant="solid"
            onClick={() =>
              loginWithRedirect({
                appState: { returnTo: '/admin' },
                authorizationParams: adminAuthorizationParams,
              })
            }
          >
            Sign in
          </Button>
        }
      />
    );
  }

  if (status === 'denied') {
    return <AdminNotice title="Not authorized" detail={error ?? 'Your account lacks the admin role.'} />;
  }

  return <>{children}</>;
}

function AdminNotice({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
      <div className="w-full max-w-md border border-line p-5">
        <div className="mb-4 flex items-center gap-3">
          <Shield size={18} strokeWidth={1.5} />
          <div>
            <div className="text-sm font-bold tracking-tight">{title}</div>
            <div className="mt-1 text-xs text-muted">{detail}</div>
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

export function Admin() {
  return (
    <AdminGate>
      <AdminConsole />
    </AdminGate>
  );
}

function AdminConsole() {
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const catalog = useCatalog();
  const [section, setSection] = useState<AdminSection>('overview');
  const [adminIdentity, setAdminIdentity] = useState<AdminIdentity | null>(null);
  const [adminToken, setAdminToken] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<CatalogAdminStatus | null>(null);
  const [cloudCatalogExport, setCloudCatalogExport] = useState<CatalogLatestExport | null>(null);
  const [cloudCatalogLoading, setCloudCatalogLoading] = useState(false);
  const [cloudCatalogError, setCloudCatalogError] = useState<string | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<AdminGalleryPhoto[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryTags, setGalleryTags] = useState<GalleryTag[]>([]);
  const [reactionStats, setReactionStats] = useState<AdminGalleryReactionStats | null>(null);
  const [reactionStatsLoading, setReactionStatsLoading] = useState(false);
  const [reactionStatsError, setReactionStatsError] = useState<string | null>(null);
  const [usersResponse, setUsersResponse] = useState<AdminUsersResponse | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersQuery, setUsersQuery] = useState('');
  const [usersError, setUsersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const devBypass = isDevAdminBypass();
  // Human-readable, low-maintenance: prefer a real name/email from the admin
  // identity or the Auth0 ID-token claims; never surface the raw `auth0|…` sub.
  const accessLabel = devBypass
    ? 'Development bypass'
    : adminIdentity?.name ??
      adminIdentity?.email ??
      user?.name ??
      user?.email ??
      user?.nickname ??
      'Admin user';

  const getToken = async () => {
    if (!isAuthenticated) return undefined;
    const token = await getAccessTokenSilently({ authorizationParams: adminTokenParams });
    setAdminToken(token);
    return token;
  };

  const loadIdentity = async () => {
    if (devBypass) {
      setAdminIdentity({ sub: 'dev-admin-bypass', permissions: ['admin:access', 'catalog:manage'] });
      return;
    }
    const token = await getToken();
    if (!token) return;
    const result = await getAdminIdentity(token);
    setAdminIdentity(result.identity);
  };

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      setStatus(await getCatalogAdminStatus(token));
    } catch (err) {
      setError(describeAdminError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadCloudCatalogExport = async () => {
    setCloudCatalogLoading(true);
    setCloudCatalogError(null);
    try {
      const token = await getToken();
      setCloudCatalogExport(await getCatalogLatestExport(token));
    } catch (err) {
      const message = describeAdminError(err);
      setCloudCatalogError(message);
      setError(message);
    } finally {
      setCloudCatalogLoading(false);
    }
  };

  const loadGallery = async () => {
    setGalleryLoading(true);
    setGalleryError(null);
    try {
      const token = await getToken();
      setGalleryPhotos(await listAdminGalleryPhotos(token));
      setGalleryLoaded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gallery API failed';
      setGalleryError(message);
      setError(message);
    }
    finally {
      setGalleryLoading(false);
    }
  };

  const loadGalleryTags = async () => {
    try {
      const token = await getToken();
      setGalleryTags(await listAdminGalleryTags(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gallery tags API failed');
    }
  };

  const createGalleryTag = async (label: string) => {
    const token = await getToken();
    const tag = await createAdminGalleryTag(label, token);
    await loadGalleryTags();
    return tag;
  };

  const loadReactionStats = async () => {
    setReactionStatsLoading(true);
    setReactionStatsError(null);
    try {
      const token = await getToken();
      setReactionStats(await getAdminGalleryReactionStats(token));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reaction analytics API failed';
      setReactionStatsError(message);
      setError(message);
    } finally {
      setReactionStatsLoading(false);
    }
  };

  const loadUsers = async (query = usersQuery) => {
    if (devBypass && !isAuthenticated) {
      setUsersError('Sign in with Auth0 to inspect registered users.');
      return;
    }

    setUsersLoading(true);
    setUsersError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Auth0 access token is unavailable.');
      setUsersResponse(await getAdminUsers(token, { q: query, perPage: 50 }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Users API failed';
      setUsersError(message);
      setError(message);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    void loadIdentity();
    void loadStatus();
    void loadGallery();
    void loadGalleryTags();
    void loadReactionStats();
    if (isAuthenticated) void loadUsers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const summary = useMemo(
    () => [
      {
        label: 'Catalog',
        value: status?.lastRun?.status ?? catalog.status,
        detail: status?.lastSuccess ? `Last success ${formatDate(status.lastSuccess.finished_at)}` : catalog.source,
      },
      {
        label: 'Users',
        value: usersResponse ? `${usersResponse.total} registered` : usersLoading ? 'Loading' : 'Unavailable',
        detail: usersError ?? `${usersResponse?.stats.activeLast30Days ?? 0} active in 30 days`,
      },
      {
        label: 'Gallery',
        value: galleryLoaded ? `${galleryPhotos.length} photos` : 'Loading',
        detail: galleryError ?? `${galleryPhotos.filter((photo) => photo.status === 'pending').length} pending approval`,
      },
      {
        label: 'Reactions',
        value: reactionStats ? `${reactionStats.totals.total} total` : reactionStatsLoading ? 'Loading' : 'Unavailable',
        detail: reactionStatsError ?? `${reactionStats?.totals.reactingUsers ?? 0} reacting users`,
      },
      {
        label: 'Storage',
        value: status?.export?.size ? formatBytes(status.export.size) : 'Unavailable',
        detail: status?.export?.key ?? 'R2 media and catalog objects',
      },
    ],
    [catalog.source, catalog.status, galleryError, galleryLoaded, galleryPhotos, reactionStats, reactionStatsError, reactionStatsLoading, status, usersError, usersLoading, usersResponse],
  );

  // Master refresh: reload every section's data at once.
  const refreshAll = async () => {
    await Promise.allSettled([
      loadIdentity(),
      loadStatus(),
      loadGallery(),
      loadGalleryTags(),
      loadReactionStats(),
      isAuthenticated ? loadUsers(usersQuery) : Promise.resolve(),
      cloudCatalogExport ? loadCloudCatalogExport() : Promise.resolve(),
    ]);
  };

  const refreshNow = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      await triggerCatalogRefresh(token);
      await loadStatus();
      await catalog.refresh();
    } catch (err) {
      setError(describeAdminError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleAutoRefresh = async () => {
    if (!status) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await updateCatalogAdminSettings(
        { autoRefreshEnabled: !status.settings.autoRefreshEnabled },
        token,
      );
      setStatus((current) => (current ? { ...current, settings: result.settings } : current));
    } catch (err) {
      setError(describeAdminError(err));
    } finally {
      setSaving(false);
    }
  };

  const updateInterval = async (days: number) => {
    if (!status) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await updateCatalogAdminSettings({ refreshIntervalDays: days }, token);
      setStatus((current) => (current ? { ...current, settings: result.settings } : current));
    } catch (err) {
      setError(describeAdminError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full">
      <div className="border-b border-line px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="label mb-2">Admin surface</div>
            <h2 className="text-2xl font-bold tracking-tight">Operations</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 border border-line px-2.5 py-1.5 text-xs">
              <Shield size={14} strokeWidth={1.5} />
              {accessLabel}
            </span>
            {devBypass && <Chip active>Dev open</Chip>}
            <Button
              onClick={refreshAll}
              disabled={loading || saving || galleryLoading || usersLoading}
              title="Reload catalog status, gallery and users"
            >
              <RefreshCw size={14} strokeWidth={1.5} />
              Refresh all
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="border-b border-line bg-faint px-6 py-3 text-xs">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={1.5} />
            {error}
          </span>
        </div>
      )}

      <div className="grid min-h-[calc(100vh-9.5rem)] grid-cols-1 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav className="border-b border-line p-3 lg:border-b-0 lg:border-r">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={[
                  'shrink-0 border px-3 py-2 text-left text-xs uppercase tracking-wide transition-colors',
                  section === item.id
                    ? 'border-fg bg-fg text-bg'
                    : 'border-line text-muted hover:border-line-strong hover:text-fg',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <section className="min-w-0 p-6">
          {section === 'overview' && <OverviewSection summary={summary} status={status} galleryLoaded={galleryLoaded} />}
          {section === 'catalog' && (
            <CatalogSection
              appCatalogStatus={catalog.status}
              appCatalogSource={catalog.source}
              appCatalogRaw={catalog.raw as CatalogLatestExport | null}
              generatedAt={catalog.generatedAt}
              cloudCatalogExport={cloudCatalogExport}
              cloudCatalogLoading={cloudCatalogLoading}
              cloudCatalogError={cloudCatalogError}
              loading={loading}
              saving={saving}
              status={status}
              onLoadCloudCatalog={loadCloudCatalogExport}
              onRefreshNow={refreshNow}
              onToggleAutoRefresh={toggleAutoRefresh}
              onUpdateInterval={updateInterval}
            />
          )}
          {section === 'gallery' && (
            <GalleryModerationSection
              accessToken={adminToken}
              photos={galleryPhotos}
              tags={galleryTags}
              loading={galleryLoading}
              loaded={galleryLoaded}
              error={galleryError}
              onReload={loadGallery}
              onCreateTag={createGalleryTag}
              onError={setError}
            />
          )}
          {section === 'reactions' && (
            <ReactionsSection
              stats={reactionStats}
              loading={reactionStatsLoading}
              error={reactionStatsError}
              onReload={loadReactionStats}
            />
          )}
          {section === 'users' && (
            <UsersSection
              response={usersResponse}
              query={usersQuery}
              loading={usersLoading}
              error={usersError}
              onQueryChange={setUsersQuery}
              onReload={() => loadUsers(usersQuery)}
            />
          )}
          {section === 'storage' && <StorageSection exportStatus={status?.export ?? null} />}
        </section>
      </div>
    </div>
  );
}

function OverviewSection({
  summary,
  status,
  galleryLoaded,
}: {
  summary: Array<{ label: string; value: string; detail: string }>;
  status: CatalogAdminStatus | null;
  galleryLoaded: boolean;
}) {
  return (
    <div className="space-y-6">
      <MetricGrid items={summary} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <Panel title="Recent catalog run" icon={Database}>
          <RunTable status={status} />
        </Panel>
          <Panel title="Backend coverage" icon={SlidersHorizontal}>
            <div className="divide-y divide-line border border-line">
              {[
                ['Catalog status', 'Live'],
                ['Catalog refresh', 'Live'],
                ['Gallery approvals', galleryLoaded ? 'Live' : 'Checking'],
                ['Auth0 user lookup', 'Live'],
                ['User role assignment', 'Read-only'],
                ['R2 media browser', galleryLoaded ? 'Live' : 'Checking'],
                ['Audit history', 'API needed'],
              ].map(([item, state]) => (
                <div key={item} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                  <span>{item}</span>
                  <span className={state === 'Live' ? 'font-bold text-fg' : 'text-muted'}>{state}</span>
                </div>
              ))}
            </div>
          </Panel>
      </div>
    </div>
  );
}

function CatalogSection({
  appCatalogStatus,
  appCatalogSource,
  appCatalogRaw,
  generatedAt,
  cloudCatalogExport,
  cloudCatalogLoading,
  cloudCatalogError,
  loading,
  saving,
  status,
  onLoadCloudCatalog,
  onRefreshNow,
  onToggleAutoRefresh,
  onUpdateInterval,
}: {
  appCatalogStatus: string;
  appCatalogSource: string;
  appCatalogRaw: CatalogLatestExport | null;
  generatedAt?: string;
  cloudCatalogExport: CatalogLatestExport | null;
  cloudCatalogLoading: boolean;
  cloudCatalogError?: string | null;
  loading: boolean;
  saving: boolean;
  status: CatalogAdminStatus | null;
  onLoadCloudCatalog: () => Promise<void>;
  onRefreshNow: () => void;
  onToggleAutoRefresh: () => void;
  onUpdateInterval: (days: number) => void;
}) {
  const [draftDays, setDraftDays] = useState(status?.settings.refreshIntervalDays ?? 30);

  useEffect(() => {
    if (status?.settings.refreshIntervalDays) setDraftDays(status.settings.refreshIntervalDays);
  }, [status?.settings.refreshIntervalDays]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="Catalog build status" icon={Database}>
          <CatalogWorkerSummary
            appCatalogStatus={appCatalogStatus}
            appCatalogSource={appCatalogSource}
            generatedAt={generatedAt}
            status={status}
          />
        </Panel>

        <Panel title="Build controls" icon={RefreshCw}>
          <div className="space-y-4">
            <div className="border border-line p-3">
              <div className="label mb-2">Auto-rebuild</div>
              <button
                type="button"
                role="switch"
                aria-checked={!!status?.settings.autoRefreshEnabled}
                onClick={onToggleAutoRefresh}
                disabled={!status || loading || saving}
                className="flex w-full items-center justify-between gap-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>{status?.settings.autoRefreshEnabled ? 'Enabled' : 'Disabled'}</span>
                <span
                  className={[
                    'inline-flex h-6 w-10 items-center border transition-colors',
                    status?.settings.autoRefreshEnabled
                      ? 'justify-end border-fg bg-fg'
                      : 'justify-start border-line bg-transparent',
                  ].join(' ')}
                >
                  <span className={['m-1 h-3.5 w-3.5', status?.settings.autoRefreshEnabled ? 'bg-bg' : 'bg-fg'].join(' ')} />
                </span>
              </button>
            </div>

            <label className="block border border-line p-3">
              <span className="label mb-2 block">Rebuild interval</span>
              <input
                type="number"
                min={1}
                max={365}
                value={draftDays}
                onChange={(event) => setDraftDays(Number(event.target.value))}
                className="mb-3 h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong"
              />
              <Button
                onClick={() => onUpdateInterval(draftDays)}
                disabled={!status || loading || saving || draftDays < 1 || draftDays > 365}
              >
                Save days
              </Button>
            </label>

            <Button variant="solid" onClick={onRefreshNow} disabled={loading || saving}>
              <RefreshCw size={14} strokeWidth={1.5} />
              Rebuild catalog
            </Button>
          </div>
        </Panel>
      </div>

      <CatalogDatasetViewer
        appCatalogRaw={appCatalogRaw}
        appCatalogSource={appCatalogSource}
        cloudCatalogExport={cloudCatalogExport}
        cloudCatalogLoading={cloudCatalogLoading}
        cloudCatalogError={cloudCatalogError}
        status={status}
        onLoadCloudCatalog={onLoadCloudCatalog}
      />
    </div>
  );
}

type CatalogDatasetSource = 'app' | 'cloudflare';
type CatalogDatasetScope = 'full' | 'sources' | 'reconReport' | 'stats' | 'cameras' | 'lenses' | 'bindings' | 'compact';
type CatalogDatasetView = 'overview' | 'cameras' | 'lenses' | 'sources' | 'bindings' | 'raw';
type CatalogSortDirection = 'asc' | 'desc';
type CatalogSourceType = 'external' | 'curated' | 'derived';
type CatalogFlagFilter = 'all' | 'curated' | 'derived' | 'fixed' | 'af' | 'manual' | 'thirdParty';

interface CatalogInspectorRow {
  key: string;
  label: string;
  record: Record<string, unknown>;
  searchText: string;
  sourceType?: string;
  primarySource?: string;
  mounts: string[];
  formats: string[];
  fixed?: boolean;
  af?: boolean;
  thirdParty?: boolean;
}

interface CatalogColumn {
  id: string;
  label: string;
  className?: string;
  render: (row: CatalogInspectorRow) => React.ReactNode;
  sortValue?: (row: CatalogInspectorRow) => string | number;
}

interface CatalogTableFilters {
  query: string;
  sourceType: 'all' | CatalogSourceType;
  primarySource: string;
  mount: string;
  format: string;
  flag: CatalogFlagFilter;
}

function CatalogDatasetViewer({
  appCatalogRaw,
  appCatalogSource,
  cloudCatalogExport,
  cloudCatalogLoading,
  cloudCatalogError,
  status,
  onLoadCloudCatalog,
}: {
  appCatalogRaw: CatalogLatestExport | null;
  appCatalogSource: string;
  cloudCatalogExport: CatalogLatestExport | null;
  cloudCatalogLoading: boolean;
  cloudCatalogError?: string | null;
  status: CatalogAdminStatus | null;
  onLoadCloudCatalog: () => Promise<void>;
}) {
  const [source, setSource] = useState<CatalogDatasetSource>('cloudflare');
  const [view, setView] = useState<CatalogDatasetView>('cameras');
  const [scope, setScope] = useState<CatalogDatasetScope>('full');
  const [filters, setFilters] = useState<CatalogTableFilters>({
    query: '',
    sourceType: 'all',
    primarySource: '',
    mount: '',
    format: '',
    flag: 'all',
  });
  const [sortBy, setSortBy] = useState('label');
  const [sortDirection, setSortDirection] = useState<CatalogSortDirection>('asc');
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(0);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rowCopied, setRowCopied] = useState(false);
  const [cloudAutoLoadRequested, setCloudAutoLoadRequested] = useState(false);

  const selected = source === 'cloudflare' ? cloudCatalogExport : appCatalogRaw;
  const selectedLabel = source === 'cloudflare' ? 'Worker/R2 latest export' : 'App-loaded export';
  const scopedValue = useMemo(() => catalogScopeValue(selected, scope), [scope, selected]);
  const jsonText = selected ? JSON.stringify(scopedValue, null, 2) : '';
  const summary = catalogExportSummary(selected);
  const appSummary = catalogExportSummary(appCatalogRaw);
  const cloudSummary = catalogExportSummary(cloudCatalogExport);
  const tableData = useMemo(() => createCatalogInspectorRows(selected), [selected]);
  const sourceOptions = useMemo(() => uniqueSorted([...tableData.cameras, ...tableData.lenses].map((row) => row.primarySource)), [tableData]);
  const mountOptions = useMemo(() => uniqueSorted([...tableData.cameras, ...tableData.lenses].flatMap((row) => row.mounts)), [tableData]);
  const formatOptions = useMemo(() => uniqueSorted([...tableData.cameras, ...tableData.lenses].flatMap((row) => row.formats)), [tableData]);
  const activeRows = catalogRowsForView(tableData, view);
  const activeColumns = catalogColumnsForView(view);
  const filteredRows = useMemo(
    () => filterCatalogRows(activeRows, filters, view),
    [activeRows, filters, view],
  );
  const sortedRows = useMemo(
    () => sortCatalogRows(filteredRows, activeColumns, sortBy, sortDirection),
    [activeColumns, filteredRows, sortBy, sortDirection],
  );
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sortedRows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const selectedRow = selectedRowKey ? sortedRows.find((row) => row.key === selectedRowKey) ?? null : null;
  const canShowTable = view !== 'overview' && view !== 'raw';

  useEffect(() => {
    setPage(0);
  }, [filters, source, view, pageSize]);

  useEffect(() => {
    setSelectedRowKey(null);
  }, [source, view]);

  useEffect(() => {
    if (source === 'cloudflare' && !cloudCatalogExport && !cloudCatalogLoading && !cloudAutoLoadRequested) {
      setCloudAutoLoadRequested(true);
      void onLoadCloudCatalog();
    }
  }, [cloudAutoLoadRequested, cloudCatalogExport, cloudCatalogLoading, onLoadCloudCatalog, source]);

  const copyJson = async () => {
    if (!jsonText) return;
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const copyRowJson = async () => {
    if (!selectedRow) return;
    await navigator.clipboard.writeText(JSON.stringify(selectedRow.record, null, 2));
    setRowCopied(true);
    window.setTimeout(() => setRowCopied(false), 1400);
  };

  const downloadJson = () => {
    if (!jsonText) return;
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blur-catalog-${source}-${scope}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadRowsCsv = () => {
    if (!canShowTable || sortedRows.length === 0) return;
    const csv = catalogRowsToCsv(sortedRows, activeColumns);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blur-catalog-${source}-${view}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateFilter = <K extends keyof CatalogTableFilters>(key: K, value: CatalogTableFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleSort = (columnId: string) => {
    setSortBy((current) => {
      if (current === columnId) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
        return current;
      }
      setSortDirection('asc');
      return columnId;
    });
  };

  return (
    <Panel title="Joined dataset viewer" icon={Database}>
      <div className="space-y-4">
        <div className="grid gap-3 border border-line p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(13rem,0.6fr)_minmax(0,1fr)]">
            <label className="block">
              <span className="label mb-2 block">Diagnostic source</span>
              <select
                value={source}
                onChange={(event) => setSource(event.target.value as CatalogDatasetSource)}
                className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong"
              >
                <option value="cloudflare">Canonical Worker/R2 export</option>
                <option value="app">App-loaded fallback/runtime export</option>
              </select>
              <span className="mt-1 block text-[11px] text-muted">
                Compare deployed data against the app-loaded copy.
              </span>
            </label>
            <div>
              <span className="label mb-2 block">Dataset table</span>
              <div className="flex flex-wrap gap-2">
                {catalogViewTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setView(tab.id)}
                    className={[
                      'border px-3 py-2 text-xs uppercase tracking-wide',
                      view === tab.id ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong hover:text-fg',
                    ].join(' ')}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onLoadCloudCatalog} disabled={cloudCatalogLoading}>
              <RefreshCw size={14} strokeWidth={1.5} />
              {cloudCatalogLoading ? 'Loading' : 'Load latest export'}
            </Button>
            {canShowTable && (
              <Button onClick={downloadRowsCsv} disabled={sortedRows.length === 0}>
                <Download size={14} strokeWidth={1.5} />
                CSV
              </Button>
            )}
            <Button onClick={copyJson} disabled={!jsonText}>
              <Copy size={14} strokeWidth={1.5} />
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
            <Button onClick={downloadJson} disabled={!jsonText}>
              <Download size={14} strokeWidth={1.5} />
              JSON
            </Button>
          </div>
        </div>

        {cloudCatalogError && (
          <div className="border border-line bg-faint p-3 text-xs">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={14} strokeWidth={1.5} />
              {cloudCatalogError}
            </span>
          </div>
        )}

        <CatalogIntegrityStrip
          selected={selected}
          selectedLabel={selectedLabel}
          appCatalogSource={appCatalogSource}
          appSummary={appSummary}
          cloudSummary={cloudSummary}
          status={status}
          source={source}
          summary={summary}
        />

        {!selected && (
          <div className="border border-line bg-faint p-4 text-sm text-muted">
            {source === 'cloudflare' ? 'Click Fetch Cloudflare to load the Worker/R2 export.' : 'The app-loaded catalog has not finished loading.'}
          </div>
        )}

        {selected && view === 'overview' && (
          <CatalogOverview
            exportData={selected}
            summary={summary}
            onShowCurated={() => {
              setView('lenses');
              setFilters((current) => ({ ...current, flag: 'curated', query: '', sourceType: 'all' }));
            }}
            onShowSources={() => {
              setView('sources');
              setFilters((current) => ({ ...current, query: '', sourceType: 'all', primarySource: '', mount: '', format: '', flag: 'all' }));
            }}
          />
        )}

        {selected && canShowTable && (
          <div className="space-y-3">
            <CatalogTableControls
              filters={filters}
              sourceOptions={sourceOptions}
              mountOptions={mountOptions}
              formatOptions={formatOptions}
              pageSize={pageSize}
              onFilterChange={updateFilter}
              onPageSizeChange={setPageSize}
              structuredFilters={view === 'cameras' || view === 'lenses'}
            />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.45fr)]">
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
                  <span>
                    Showing {pageRows.length} of {sortedRows.length} rows
                    {activeRows.length !== sortedRows.length ? ` from ${activeRows.length}` : ''}
                  </span>
                  <span>
                    Page {safePage + 1} of {pageCount}
                  </span>
                </div>
                <CatalogDataTable
                  rows={pageRows}
                  columns={activeColumns}
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  selectedRowKey={selectedRowKey}
                  onSort={toggleSort}
                  onSelect={setSelectedRowKey}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={safePage === 0}>
                    Previous
                  </Button>
                  <span className="text-xs text-muted">
                    Rows {sortedRows.length === 0 ? 0 : safePage * pageSize + 1}-{Math.min(sortedRows.length, safePage * pageSize + pageRows.length)}
                  </span>
                  <Button onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={safePage >= pageCount - 1}>
                    Next
                  </Button>
                </div>
              </div>
              <CatalogRowDetails row={selectedRow} onCopy={copyRowJson} copied={rowCopied} />
            </div>
          </div>
        )}

        {selected && view === 'raw' && (
          <div className="space-y-3">
            <label className="block max-w-sm">
              <span className="label mb-2 block">JSON scope</span>
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as CatalogDatasetScope)}
                className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong"
              >
                <option value="full">Full export</option>
                <option value="sources">Sources</option>
                <option value="reconReport">Recon report</option>
                <option value="stats">Stats</option>
                <option value="cameras">Cameras</option>
                <option value="lenses">Lenses</option>
                <option value="bindings">Bindings</option>
                <option value="compact">Compact data</option>
              </select>
            </label>
            <textarea
              readOnly
              spellCheck={false}
              value={jsonText}
              className="h-[34rem] w-full resize-y border border-line bg-faint p-3 font-mono text-[11px] leading-relaxed outline-none"
            />
          </div>
        )}
      </div>
    </Panel>
  );
}

const catalogViewTabs: Array<{ id: CatalogDatasetView; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'cameras', label: 'Cameras' },
  { id: 'lenses', label: 'Lenses' },
  { id: 'sources', label: 'Sources' },
  { id: 'bindings', label: 'Bindings' },
  { id: 'raw', label: 'Raw JSON' },
];

function CatalogWorkerSummary({
  appCatalogStatus,
  appCatalogSource,
  generatedAt,
  status,
}: {
  appCatalogStatus: string;
  appCatalogSource: string;
  generatedAt?: string;
  status: CatalogAdminStatus | null;
}) {
  const run = status?.lastSuccess ?? status?.lastRun ?? null;
  const duration = run?.started_at && run.finished_at ? formatDuration(run.started_at, run.finished_at) : null;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <IntegrityMetric
          label="Last build"
          value={run?.status ?? 'Unknown'}
          detail={run?.finished_at ? `${formatDate(run.finished_at)}${duration ? ` · ${duration}` : ''}` : 'No completed run'}
          tone={run?.status === 'success' ? 'ok' : run?.status === 'failed' ? 'bad' : 'neutral'}
        />
        <IntegrityMetric
          label="Published object"
          value={status?.export ? formatBytes(status.export.size) : 'Unavailable'}
          detail={status?.export?.key ?? 'Admin endpoint not connected'}
          tone={status?.export ? 'ok' : 'neutral'}
        />
        <IntegrityMetric
          label="App runtime"
          value={appCatalogStatus}
          detail={`${formatDate(generatedAt)} · ${appCatalogSource}`}
          tone={appCatalogStatus === 'ready' || appCatalogStatus === 'fallback' ? 'ok' : 'neutral'}
        />
      </div>
      {run?.id && <div className="truncate text-xs text-muted">Run id: {run.id}</div>}
    </div>
  );
}

function CatalogIntegrityStrip({
  selected,
  selectedLabel,
  appCatalogSource,
  appSummary,
  cloudSummary,
  status,
  source,
  summary,
}: {
  selected: CatalogLatestExport | null;
  selectedLabel: string;
  appCatalogSource: string;
  appSummary: ReturnType<typeof catalogExportSummary>;
  cloudSummary: ReturnType<typeof catalogExportSummary>;
  status: CatalogAdminStatus | null;
  source: CatalogDatasetSource;
  summary: ReturnType<typeof catalogExportSummary>;
}) {
  const run = status?.lastSuccess ?? status?.lastRun ?? null;
  const sourceDetail = source === 'cloudflare' ? 'Canonical published export' : appCatalogSource;
  const drift = compareExportSummaries(appSummary, cloudSummary);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <IntegrityMetric
          label="Viewing"
          value={selected ? selectedLabel : 'No export'}
          detail={selected?.generatedAt ? `${formatDate(selected.generatedAt)} · ${sourceDetail}` : sourceDetail}
          tone={selected ? 'ok' : 'neutral'}
        />
        <IntegrityMetric
          label="Cameras"
          value={String(summary.cameras)}
          detail={runCountDetail(run?.camera_count, summary.cameras)}
          tone={countTone(summary.cameras, run?.camera_count)}
        />
        <IntegrityMetric
          label="Lenses"
          value={String(summary.lenses)}
          detail={runCountDetail(run?.lens_count, summary.lenses)}
          tone={countTone(summary.lenses, run?.lens_count)}
        />
        <IntegrityMetric
          label="Bindings"
          value={String(summary.bindings)}
          detail={runCountDetail(run?.binding_count, summary.bindings)}
          tone={countTone(summary.bindings, run?.binding_count)}
        />
        <IntegrityMetric
          label="Source drift"
          value={drift.ok ? 'Aligned' : 'Mismatch'}
          detail={drift.detail}
          tone={drift.ok ? 'ok' : 'bad'}
        />
      </div>
      <SourceTypeMatrix summary={summary} />
    </div>
  );
}

function IntegrityMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'ok' | 'bad' | 'neutral';
}) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'bad' ? XCircle : AlertTriangle;
  return (
    <div className={['border p-3', tone === 'bad' ? 'border-line-strong bg-faint' : 'border-line'].join(' ')}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="label">{label}</div>
        <Icon size={14} strokeWidth={1.5} className={tone === 'bad' ? 'text-fg' : 'text-muted'} />
      </div>
      <div className="truncate text-lg font-bold tracking-tight">{value}</div>
      <div className="mt-1 truncate text-xs text-muted">{detail}</div>
    </div>
  );
}

function SourceTypeMatrix({ summary }: { summary: ReturnType<typeof catalogExportSummary> }) {
  const rows = [
    ['Cameras', summary.cameraSourceTypes],
    ['Lenses', summary.lensSourceTypes],
  ] as const;
  return (
    <div className="grid gap-3 border border-line p-3 lg:grid-cols-[9rem_minmax(0,1fr)]">
      <div>
        <div className="label mb-1">Provenance mix</div>
        <div className="text-xs text-muted">Per entity, not combined totals.</div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map(([label, counts]) => (
          <div key={label} className="grid grid-cols-[5rem_repeat(3,minmax(0,1fr))] items-center gap-2 text-xs">
            <div className="font-bold">{label}</div>
            <SourceTypePill label="External" value={counts.external} />
            <SourceTypePill label="Derived" value={counts.derived} />
            <SourceTypePill label="Curated" value={counts.curated} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceTypePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 border border-line px-2 py-1">
      <span className="text-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function CatalogOverview({
  exportData,
  summary,
  onShowCurated,
  onShowSources,
}: {
  exportData: CatalogLatestExport;
  summary: ReturnType<typeof catalogExportSummary>;
  onShowCurated: () => void;
  onShowSources: () => void;
}) {
  const recon = asRecord(exportData.reconReport);
  const bakeoffRows = Array.isArray(recon.sourceBakeoff) ? recon.sourceBakeoff.map(asRecord) : [];
  const primarySources = entriesFromRecord(asRecord(recon.countsByPrimarySource));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.55fr)]">
      <div className="space-y-4">
        <div className="overflow-x-auto border border-line">
          <div className="border-b border-line bg-faint px-3 py-2 text-xs uppercase tracking-wide text-muted">
            Source coverage
          </div>
          <table className="w-full min-w-[48rem] text-left text-xs">
            <thead className="border-b border-line bg-faint text-muted">
              <tr>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">Source</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">Role</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">Status</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">Records</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">License</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bakeoffRows.map((row) => (
                <tr key={String(row.id ?? row.url ?? row.role)}>
                  <td className="px-3 py-2 font-bold">{textValue(row.id)}</td>
                  <td className="px-3 py-2">{textValue(row.role)}</td>
                  <td className="px-3 py-2">{textValue(row.status)}</td>
                  <td className="px-3 py-2">{textValue(row.records)}</td>
                  <td className="px-3 py-2">{textValue(row.license)}</td>
                </tr>
              ))}
              {bakeoffRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    No source bakeoff rows in this export.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <CatalogBuildReport
          exportData={exportData}
          summary={summary}
          onShowCurated={onShowCurated}
          onShowSources={onShowSources}
        />
        <div className="border border-line">
          <div className="border-b border-line bg-faint px-3 py-2 text-xs uppercase tracking-wide text-muted">
            Primary source totals
          </div>
          <div className="divide-y divide-line">
            {primarySources.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <span>{key}</span>
                <span className="font-bold">{textValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CatalogBuildReport({
  exportData,
  summary,
  onShowCurated,
  onShowSources,
}: {
  exportData: CatalogLatestExport;
  summary: ReturnType<typeof catalogExportSummary>;
  onShowCurated: () => void;
  onShowSources: () => void;
}) {
  const recon = asRecord(exportData.reconReport);
  const curatedGaps = asRecord(recon.curatedGaps);
  const duplicatesMerged = asRecord(recon.duplicatesMerged);
  const rejectedRecords = asRecord(recon.rejectedRecords);
  const coverageDeltas = asRecord(recon.coverageDeltas);
  const rejectedTotal = totalRejectedRecords(rejectedRecords);
  const curatedTotal = numberValue(curatedGaps.cameras) + numberValue(curatedGaps.lenses);
  const duplicateTotal = numberValue(duplicatesMerged.cameras) + numberValue(duplicatesMerged.lenses);

  return (
    <details className="border border-line">
      <summary className="cursor-pointer border-b border-line bg-faint px-3 py-2 text-xs uppercase tracking-wide text-muted">
        Build report
      </summary>
      <div className="divide-y divide-line">
        <ReportLine
          label="Curated gaps"
          value={String(curatedTotal)}
          detail={`${textValue(curatedGaps.cameras) || 0} cameras · ${textValue(curatedGaps.lenses) || 0} lenses`}
          actionLabel="View curated"
          onAction={onShowCurated}
        />
        <ReportLine
          label="Duplicates merged"
          value={String(duplicateTotal)}
          detail={`${textValue(duplicatesMerged.cameras) || 0} cameras · ${textValue(duplicatesMerged.lenses) || 0} lenses`}
        />
        <ReportLine
          label="Rejected records"
          value={String(rejectedTotal)}
          detail={rejectedTotal === 0 ? 'No rejected source rows' : 'Review source adapter output'}
        />
        <ReportLine
          label="Fixed bindings"
          value={String(summary.bindings)}
          detail={`${textValue(coverageDeltas.fixedLensBindings) || summary.bindings} fixed-lens compact links`}
        />
        <ReportLine
          label="Sources"
          value={String(summary.sources)}
          detail="Fetch snapshots and bakeoff metadata"
          actionLabel="View sources"
          onAction={onShowSources}
        />
      </div>
    </details>
  );
}

function ReportLine({
  label,
  value,
  detail,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-xs">
      <div className="min-w-0">
        <div className="font-bold">{label}</div>
        <div className="truncate text-muted">{detail}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold">{value}</span>
        {actionLabel && onAction && (
          <button type="button" onClick={onAction} className="border border-line px-2 py-1 uppercase tracking-wide text-muted hover:border-line-strong hover:text-fg">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function CatalogTableControls({
  filters,
  sourceOptions,
  mountOptions,
  formatOptions,
  pageSize,
  structuredFilters,
  onFilterChange,
  onPageSizeChange,
}: {
  filters: CatalogTableFilters;
  sourceOptions: string[];
  mountOptions: string[];
  formatOptions: string[];
  pageSize: number;
  structuredFilters: boolean;
  onFilterChange: <K extends keyof CatalogTableFilters>(key: K, value: CatalogTableFilters[K]) => void;
  onPageSizeChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-3 border border-line p-3 lg:grid-cols-[minmax(14rem,1fr)_repeat(6,minmax(8rem,0.5fr))]">
      <label className="block">
        <span className="label mb-2 block">Search rows</span>
        <input
          value={filters.query}
          onChange={(event) => onFilterChange('query', event.target.value)}
          placeholder="id, maker, name, source, mount"
          className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong"
        />
      </label>

      <label className="block">
        <span className="label mb-2 block">Source type</span>
        <select
          value={filters.sourceType}
          onChange={(event) => onFilterChange('sourceType', event.target.value as CatalogTableFilters['sourceType'])}
          disabled={!structuredFilters}
          className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong disabled:opacity-40"
        >
          <option value="all">All</option>
          <option value="external">External</option>
          <option value="derived">Derived</option>
          <option value="curated">Curated</option>
        </select>
      </label>

      <label className="block">
        <span className="label mb-2 block">Source</span>
        <select
          value={filters.primarySource}
          onChange={(event) => onFilterChange('primarySource', event.target.value)}
          disabled={!structuredFilters}
          className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong disabled:opacity-40"
        >
          <option value="">All</option>
          {sourceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="label mb-2 block">Mount</span>
        <select
          value={filters.mount}
          onChange={(event) => onFilterChange('mount', event.target.value)}
          disabled={!structuredFilters}
          className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong disabled:opacity-40"
        >
          <option value="">All</option>
          {mountOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="label mb-2 block">Format</span>
        <select
          value={filters.format}
          onChange={(event) => onFilterChange('format', event.target.value)}
          disabled={!structuredFilters}
          className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong disabled:opacity-40"
        >
          <option value="">All</option>
          {formatOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="label mb-2 block">Flag</span>
        <select
          value={filters.flag}
          onChange={(event) => onFilterChange('flag', event.target.value as CatalogFlagFilter)}
          disabled={!structuredFilters}
          className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong disabled:opacity-40"
        >
          <option value="all">All</option>
          <option value="curated">Curated</option>
          <option value="derived">Derived</option>
          <option value="fixed">Fixed lens</option>
          <option value="af">AF</option>
          <option value="manual">Manual</option>
          <option value="thirdParty">Third-party</option>
        </select>
      </label>

      <label className="block">
        <span className="label mb-2 block">Page size</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong"
        >
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={250}>250</option>
        </select>
      </label>
    </div>
  );
}

function CatalogDataTable({
  rows,
  columns,
  sortBy,
  sortDirection,
  selectedRowKey,
  onSort,
  onSelect,
}: {
  rows: CatalogInspectorRow[];
  columns: CatalogColumn[];
  sortBy: string;
  sortDirection: CatalogSortDirection;
  selectedRowKey: string | null;
  onSort: (columnId: string) => void;
  onSelect: (rowKey: string) => void;
}) {
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[70rem] text-left text-xs">
        <thead className="border-b border-line bg-faint text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.id} className={['px-3 py-2 font-normal uppercase tracking-wide', column.className ?? ''].join(' ')}>
                <button type="button" onClick={() => onSort(column.id)} className="inline-flex items-center gap-1 hover:text-fg">
                  {column.label}
                  {sortBy === column.id && <span>{sortDirection === 'asc' ? 'Up' : 'Down'}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr
              key={row.key}
              onClick={() => onSelect(row.key)}
              className={[
                'cursor-pointer align-top hover:bg-faint',
                selectedRowKey === row.key ? 'bg-faint' : '',
              ].join(' ')}
            >
              {columns.map((column) => (
                <td key={column.id} className={['px-3 py-2', column.className ?? ''].join(' ')}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted">
                No rows match the current search and filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CatalogRowDetails({
  row,
  copied,
  onCopy,
}: {
  row: CatalogInspectorRow | null;
  copied: boolean;
  onCopy: () => void;
}) {
  if (!row) {
    return (
      <div className="border border-line bg-faint p-4 text-sm text-muted">
        Select a row to inspect its exact JSON, provenance chain, and source fields.
      </div>
    );
  }

  const sources = Array.isArray(row.record.sources) ? row.record.sources.map(asRecord) : [];

  return (
    <aside className="min-w-0 border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-faint px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-bold">{row.label}</div>
          <div className="truncate text-[11px] text-muted">{textValue(row.record.id)}</div>
        </div>
        <Button onClick={onCopy}>
          <Copy size={14} strokeWidth={1.5} />
          {copied ? 'Copied' : 'Copy row'}
        </Button>
      </div>
      <div className="max-h-[40rem] overflow-auto p-3">
        <div className="mb-3 grid gap-2 text-xs">
          <DetailLine label="Source type" value={row.sourceType ?? 'None'} />
          <DetailLine label="Primary source" value={row.primarySource ?? 'None'} />
          <DetailLine label="Mounts" value={row.mounts.join(', ') || 'None'} />
          <DetailLine label="Formats" value={row.formats.join(', ') || 'None'} />
        </div>
        {sources.length > 0 && (
          <div className="mb-3 border border-line">
            <div className="border-b border-line bg-faint px-2 py-1 text-[11px] uppercase tracking-wide text-muted">
              Provenance
            </div>
            <div className="divide-y divide-line">
              {sources.map((sourceRef, index) => (
                <div key={`${sourceRef.id}-${sourceRef.recordId}-${index}`} className="p-2 text-xs">
                  <div className="font-bold">{textValue(sourceRef.id)}</div>
                  <div className="break-words text-muted">{textValue(sourceRef.recordId)}</div>
                  <div className="mt-1 text-muted">
                    {textValue(sourceRef.license)}
                    {sourceRef.confidence != null ? ` · confidence ${textValue(sourceRef.confidence)}` : ''}
                  </div>
                  {Array.isArray(sourceRef.fields) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {sourceRef.fields.map((field) => (
                        <span key={String(field)} className="border border-line px-1 py-0.5 text-[11px]">
                          {String(field)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <pre className="whitespace-pre-wrap break-words border border-line bg-bg p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(row.record, null, 2)}
        </pre>
      </div>
    </aside>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
      <div className="uppercase tracking-wide text-muted">{label}</div>
      <div className="min-w-0 break-words">{value}</div>
    </div>
  );
}

function catalogScopeValue(exportData: CatalogLatestExport | null, scope: CatalogDatasetScope): unknown {
  if (!exportData) return null;
  if (scope === 'full') return exportData;
  return exportData[scope] ?? null;
}

function runCountDetail(runCount: number | null | undefined, exportCount: number): string {
  if (runCount == null) return 'No Worker run count';
  if (Number(runCount) === exportCount) return `Matches last successful run (${runCount})`;
  return `Last successful run: ${runCount}`;
}

function countTone(exportCount: number, runCount: number | null | undefined): 'ok' | 'bad' | 'neutral' {
  if (runCount == null) return exportCount > 0 ? 'ok' : 'neutral';
  return Number(runCount) === exportCount ? 'ok' : 'bad';
}

function compareExportSummaries(
  appSummary: ReturnType<typeof catalogExportSummary>,
  cloudSummary: ReturnType<typeof catalogExportSummary>,
) {
  if (!appSummary.cameras && !appSummary.lenses) return { ok: false, detail: 'App export not loaded' };
  if (!cloudSummary.cameras && !cloudSummary.lenses) return { ok: false, detail: 'Worker export not loaded' };
  const keys = ['cameras', 'lenses', 'bindings'] as const;
  const mismatches = keys.filter((key) => appSummary[key] !== cloudSummary[key]);
  if (mismatches.length === 0) {
    return { ok: true, detail: `${appSummary.cameras}/${appSummary.lenses}/${appSummary.bindings} in app and Worker` };
  }
  return {
    ok: false,
    detail: mismatches.map((key) => `${key}: app ${appSummary[key]} vs Worker ${cloudSummary[key]}`).join(' · '),
  };
}

function formatDuration(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return null;
  const seconds = Math.round((endTime - startTime) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function totalRejectedRecords(rejectedRecords: Record<string, unknown>): number {
  return Object.values(rejectedRecords).reduce<number>((total, value) => {
    if (Array.isArray(value)) return total + value.length;
    if (typeof value === 'number') return total + value;
    return total;
  }, 0);
}

function catalogExportSummary(exportData: CatalogLatestExport | null) {
  const cameras = exportData?.cameras ?? [];
  const lenses = exportData?.lenses ?? [];
  const records = [...cameras, ...lenses];
  return {
    cameras: cameras.length,
    lenses: lenses.length,
    bindings: exportData?.bindings?.length ?? 0,
    sources: exportData?.sources?.length ?? 0,
    external: records.filter((record) => record.sourceType === 'external').length,
    derived: records.filter((record) => record.sourceType === 'derived').length,
    curated: records.filter((record) => record.sourceType === 'curated').length,
    cameraSourceTypes: sourceTypeCounts(cameras),
    lensSourceTypes: sourceTypeCounts(lenses),
  };
}

function sourceTypeCounts(records: CatalogExportRecord[]) {
  return {
    external: records.filter((record) => record.sourceType === 'external').length,
    derived: records.filter((record) => record.sourceType === 'derived').length,
    curated: records.filter((record) => record.sourceType === 'curated').length,
  };
}

function createCatalogInspectorRows(exportData: CatalogLatestExport | null) {
  const cameraNames = new Map((exportData?.cameras ?? []).map((camera) => [camera.id, displayName(camera)]));
  const lensNames = new Map((exportData?.lenses ?? []).map((lens) => [lens.id, displayName(lens)]));
  const recon = asRecord(exportData?.reconReport);
  const bakeoffById = new Map(
    (Array.isArray(recon.sourceBakeoff) ? recon.sourceBakeoff : [])
      .map(asRecord)
      .map((row) => [String(row.id ?? ''), row] as const)
      .filter(([id]) => id.length > 0),
  );
  const sourceRowsById = new Map<string, CatalogInspectorRow>();
  for (const source of exportData?.sources ?? []) {
    const sourceRecord = asRecord(source);
    const id = textValue(sourceRecord.id || sourceRecord.url || 'source');
    const bakeoff = bakeoffById.get(id);
    const merged = bakeoff ? { ...bakeoff, ...sourceRecord } : sourceRecord;
    sourceRowsById.set(
      id,
      createGenericRow(`source:${id}`, textValue(merged.id || id), merged, {
        primarySource: textValue(merged.id || id),
      }),
    );
  }
  for (const [id, bakeoff] of bakeoffById) {
    if (!sourceRowsById.has(id)) {
      sourceRowsById.set(
        id,
        createGenericRow(`source:${id}`, textValue(bakeoff.id || id), bakeoff, {
          primarySource: textValue(bakeoff.id || id),
        }),
      );
    }
  }

  return {
    cameras: (exportData?.cameras ?? []).map((camera) => createCameraRow(camera)),
    lenses: (exportData?.lenses ?? []).map((lens) => createLensRow(lens)),
    sources: Array.from(sourceRowsById.values()),
    bindings: (exportData?.bindings ?? []).map((binding, index) => {
      const record = asRecord(binding);
      const cameraId = textValue(record.cameraId);
      const lensId = textValue(record.lensId);
      return createGenericRow(
        `binding:${cameraId}:${lensId}:${index}`,
        `${cameraNames.get(cameraId) ?? (cameraId || 'Unknown camera')} -> ${lensNames.get(lensId) ?? (lensId || 'Unknown lens')}`,
        {
          ...record,
          cameraName: cameraNames.get(cameraId),
          lensName: lensNames.get(lensId),
        },
      );
    }),
  };
}

function createCameraRow(camera: CatalogExportRecord): CatalogInspectorRow {
  return createGenericRow(`camera:${camera.id}`, displayName(camera), camera, {
    sourceType: camera.sourceType,
    primarySource: textValue(camera.source),
    mounts: [textValue(camera.mount)].filter(Boolean),
    formats: [textValue(camera.formatId)].filter(Boolean),
    fixed: Boolean(camera.fixedLensId),
  });
}

function createLensRow(lens: CatalogExportRecord): CatalogInspectorRow {
  const record = lens as Record<string, unknown>;
  return createGenericRow(`lens:${lens.id}`, displayName(lens), record, {
    sourceType: lens.sourceType,
    primarySource: textValue(lens.source),
    mounts: stringArray(record.mounts),
    formats: stringArray(record.coversFormatIds),
    fixed: Boolean(record.fixed),
    af: typeof record.af === 'boolean' ? record.af : undefined,
    thirdParty: typeof record.thirdParty === 'boolean' ? record.thirdParty : undefined,
  });
}

function createGenericRow(
  key: string,
  label: string,
  record: Record<string, unknown>,
  overrides: Partial<CatalogInspectorRow> = {},
): CatalogInspectorRow {
  return {
    key,
    label,
    record,
    searchText: [label, JSON.stringify(record)].join(' ').toLowerCase(),
    sourceType: overrides.sourceType ?? textValue(record.sourceType),
    primarySource: overrides.primarySource ?? textValue(record.source),
    mounts: overrides.mounts ?? [],
    formats: overrides.formats ?? [],
    fixed: overrides.fixed,
    af: overrides.af,
    thirdParty: overrides.thirdParty,
  };
}

function catalogRowsForView(
  rows: ReturnType<typeof createCatalogInspectorRows>,
  view: CatalogDatasetView,
): CatalogInspectorRow[] {
  if (view === 'cameras') return rows.cameras;
  if (view === 'lenses') return rows.lenses;
  if (view === 'sources') return rows.sources;
  if (view === 'bindings') return rows.bindings;
  return [];
}

function catalogColumnsForView(view: CatalogDatasetView): CatalogColumn[] {
  if (view === 'cameras') return cameraColumns;
  if (view === 'lenses') return lensColumns;
  if (view === 'sources') return sourceColumns;
  if (view === 'bindings') return bindingColumns;
  return [];
}

const cameraColumns: CatalogColumn[] = [
  { id: 'label', label: 'Camera', render: (row) => <PrimaryCell title={row.label} detail={textValue(row.record.id)} />, sortValue: (row) => row.label },
  { id: 'maker', label: 'Maker', render: (row) => textValue(row.record.maker), sortValue: (row) => textValue(row.record.maker) },
  { id: 'mount', label: 'Mount', render: (row) => chipList(row.mounts), sortValue: (row) => row.mounts.join(', ') },
  { id: 'format', label: 'Format', render: (row) => chipList(row.formats), sortValue: (row) => row.formats.join(', ') },
  { id: 'year', label: 'Year', render: (row) => textValue(row.record.year), sortValue: (row) => numberValue(row.record.year) },
  { id: 'sourceType', label: 'Source type', render: (row) => badge(row.sourceType), sortValue: (row) => row.sourceType ?? '' },
  { id: 'source', label: 'Primary source', render: (row) => row.primarySource || 'None', sortValue: (row) => row.primarySource ?? '' },
  { id: 'sourceCount', label: 'Sources', render: (row) => sourceCount(row), sortValue: sourceCount },
  { id: 'derivedFrom', label: 'Derived from', render: (row) => chipList(stringArray(row.record.derivedFrom)), sortValue: (row) => stringArray(row.record.derivedFrom).join(', ') },
  { id: 'curatedReason', label: 'Curated reason', render: (row) => textValue(row.record.curatedReason), sortValue: (row) => textValue(row.record.curatedReason) },
  { id: 'fixedLensId', label: 'Fixed lens', render: (row) => textValue(row.record.fixedLensId), sortValue: (row) => textValue(row.record.fixedLensId) },
];

const lensColumns: CatalogColumn[] = [
  { id: 'label', label: 'Lens', render: (row) => <PrimaryCell title={row.label} detail={textValue(row.record.id)} />, sortValue: (row) => row.label },
  { id: 'maker', label: 'Maker', render: (row) => textValue(row.record.maker), sortValue: (row) => textValue(row.record.maker) },
  { id: 'type', label: 'Type', render: (row) => textValue(row.record.type), sortValue: (row) => textValue(row.record.type) },
  { id: 'focalRange', label: 'Focal', render: (row) => focalRange(row.record), sortValue: (row) => numberValue(row.record.focalMin) },
  { id: 'apertureRange', label: 'Aperture', render: (row) => apertureRange(row.record), sortValue: (row) => numberValue(row.record.apMax) },
  { id: 'mounts', label: 'Mounts', render: (row) => chipList(row.mounts), sortValue: (row) => row.mounts.join(', ') },
  { id: 'coverage', label: 'Coverage', render: (row) => chipList(row.formats), sortValue: (row) => row.formats.join(', ') },
  { id: 'af', label: 'Focus', render: (row) => (row.af ? 'AF' : 'Manual'), sortValue: (row) => (row.af ? 'AF' : 'Manual') },
  { id: 'thirdParty', label: 'Third-party', render: (row) => yesNo(row.thirdParty), sortValue: (row) => (row.thirdParty ? 1 : 0) },
  { id: 'fixed', label: 'Fixed', render: (row) => yesNo(row.fixed), sortValue: (row) => (row.fixed ? 1 : 0) },
  { id: 'sourceType', label: 'Source type', render: (row) => badge(row.sourceType), sortValue: (row) => row.sourceType ?? '' },
  { id: 'source', label: 'Primary source', render: (row) => row.primarySource || 'None', sortValue: (row) => row.primarySource ?? '' },
  { id: 'sourceCount', label: 'Sources', render: (row) => sourceCount(row), sortValue: sourceCount },
  { id: 'curatedReason', label: 'Curated reason', render: (row) => textValue(row.record.curatedReason), sortValue: (row) => textValue(row.record.curatedReason) },
];

const sourceColumns: CatalogColumn[] = [
  { id: 'label', label: 'Source', render: (row) => <PrimaryCell title={row.label} detail={textValue(row.record.url)} />, sortValue: (row) => row.label },
  { id: 'role', label: 'Role', render: (row) => textValue(row.record.role), sortValue: (row) => textValue(row.record.role) },
  { id: 'status', label: 'Status', render: (row) => textValue(row.record.status), sortValue: (row) => textValue(row.record.status) },
  { id: 'records', label: 'Records', render: (row) => textValue(row.record.records), sortValue: (row) => numberValue(row.record.records) },
  { id: 'license', label: 'License', render: (row) => textValue(row.record.license), sortValue: (row) => textValue(row.record.license) },
  { id: 'fetchedAt', label: 'Fetched', render: (row) => formatDate(textValue(row.record.fetchedAt)), sortValue: (row) => textValue(row.record.fetchedAt) },
  { id: 'sha', label: 'SHA', render: (row) => truncateMiddle(textValue(row.record.sha256), 18), sortValue: (row) => textValue(row.record.sha256) },
];

const bindingColumns: CatalogColumn[] = [
  { id: 'camera', label: 'Camera', render: (row) => <PrimaryCell title={textValue(row.record.cameraName) || textValue(row.record.cameraId)} detail={textValue(row.record.cameraId)} />, sortValue: (row) => textValue(row.record.cameraName) || textValue(row.record.cameraId) },
  { id: 'lens', label: 'Lens', render: (row) => <PrimaryCell title={textValue(row.record.lensName) || textValue(row.record.lensId)} detail={textValue(row.record.lensId)} />, sortValue: (row) => textValue(row.record.lensName) || textValue(row.record.lensId) },
  { id: 'type', label: 'Type', render: (row) => textValue(row.record.type), sortValue: (row) => textValue(row.record.type) },
];

function filterCatalogRows(
  rows: CatalogInspectorRow[],
  filters: CatalogTableFilters,
  view: CatalogDatasetView,
): CatalogInspectorRow[] {
  const query = filters.query.trim().toLowerCase();
  const structured = view === 'cameras' || view === 'lenses';
  return rows.filter((row) => {
    if (query && !row.searchText.includes(query)) return false;
    if (!structured) return true;
    if (filters.sourceType !== 'all' && row.sourceType !== filters.sourceType) return false;
    if (filters.primarySource && row.primarySource !== filters.primarySource) return false;
    if (filters.mount && !row.mounts.includes(filters.mount)) return false;
    if (filters.format && !row.formats.includes(filters.format)) return false;
    if (filters.flag === 'curated' && row.sourceType !== 'curated') return false;
    if (filters.flag === 'derived' && row.sourceType !== 'derived') return false;
    if (filters.flag === 'fixed' && !row.fixed) return false;
    if (filters.flag === 'af' && row.af !== true) return false;
    if (filters.flag === 'manual' && row.af !== false) return false;
    if (filters.flag === 'thirdParty' && !row.thirdParty) return false;
    return true;
  });
}

function sortCatalogRows(
  rows: CatalogInspectorRow[],
  columns: CatalogColumn[],
  sortBy: string,
  direction: CatalogSortDirection,
): CatalogInspectorRow[] {
  const column = columns.find((candidate) => candidate.id === sortBy) ?? columns[0];
  if (!column) return rows;
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const aValue = column.sortValue?.(a) ?? a.label;
    const bValue = column.sortValue?.(b) ?? b.label;
    if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * multiplier;
    return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
  });
}

function catalogRowsToCsv(rows: CatalogInspectorRow[], columns: CatalogColumn[]): string {
  const header = columns.map((column) => csvEscape(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => {
    const value = column.sortValue?.(row) ?? textValue(row.record[column.id]) ?? row.label;
    return csvEscape(textValue(value));
  }).join(','));
  return [header, ...body].join('\n');
}

function PrimaryCell({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="min-w-[12rem]">
      <div className="font-bold">{title || 'Unnamed'}</div>
      <div className="break-all text-muted">{detail}</div>
    </div>
  );
}

function badge(value?: string) {
  if (!value) return 'None';
  return <span className="inline-flex border border-line px-1.5 py-0.5 uppercase tracking-wide">{value}</span>;
}

function chipList(values: string[]) {
  if (values.length === 0) return <span className="text-muted">None</span>;
  return (
    <div className="flex min-w-[8rem] flex-wrap gap-1">
      {values.map((value) => (
        <span key={value} className="border border-line px-1.5 py-0.5">
          {value}
        </span>
      ))}
    </div>
  );
}

function yesNo(value?: boolean) {
  if (value == null) return 'Unknown';
  return value ? 'Yes' : 'No';
}

function sourceCount(row: CatalogInspectorRow): number {
  return Array.isArray(row.record.sources) ? row.record.sources.length : 0;
}

function focalRange(record: Record<string, unknown>): string {
  const min = textValue(record.focalMin);
  const max = textValue(record.focalMax);
  if (!min && !max) return 'None';
  if (!max || min === max) return `${min}mm`;
  return `${min}-${max}mm`;
}

function apertureRange(record: Record<string, unknown>): string {
  const max = textValue(record.apMax);
  const min = textValue(record.apMin);
  if (!max && !min) return 'None';
  if (!min) return `f/${max}`;
  return `f/${max}-${min}`;
}

function displayName(record: CatalogExportRecord): string {
  return [record.maker, record.name].map(textValue).filter(Boolean).join(' ') || record.id;
}

function textValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(textValue).filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function entriesFromRecord(record: Record<string, unknown>): Array<[string, unknown]> {
  return Object.entries(record).sort(([a], [b]) => a.localeCompare(b));
}

function uniqueSorted(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

function truncateMiddle(value: string, length: number): string {
  if (!value || value.length <= length) return value || 'None';
  const edge = Math.floor((length - 3) / 2);
  return `${value.slice(0, edge)}...${value.slice(-edge)}`;
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function GalleryModerationSection({
  accessToken,
  photos,
  tags,
  loading,
  loaded,
  error,
  onReload,
  onCreateTag,
  onError,
}: {
  accessToken?: string;
  photos: AdminGalleryPhoto[];
  tags: GalleryTag[];
  loading: boolean;
  loaded: boolean;
  error?: string | null;
  onReload: () => Promise<void>;
  onCreateTag: (label: string) => Promise<GalleryTag>;
  onError: (message: string) => void;
}) {
  return (
    <Panel title="Gallery moderation" icon={ImagePlus}>
      <GalleryAdmin
        accessToken={accessToken}
        photos={photos}
        tags={tags}
        loading={loading}
        loaded={loaded}
        error={error}
        onReload={onReload}
        onCreateTag={onCreateTag}
        onError={onError}
      />
    </Panel>
  );
}

function ReactionsSection({
  stats,
  loading,
  error,
  onReload,
}: {
  stats: AdminGalleryReactionStats | null;
  loading: boolean;
  error?: string | null;
  onReload: () => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      <Panel title="Gallery reactions" icon={ThumbsUp}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="label mb-1">Taste signals</div>
            <div className="text-sm text-muted">Signed-in user reactions are scoped by Auth0 user ID and aggregated per photo.</div>
          </div>
          <Button onClick={onReload} disabled={loading}>
            <RefreshCw size={14} strokeWidth={1.5} />
            {loading ? 'Loading' : 'Reload'}
          </Button>
        </div>

        {error && (
          <div className="mb-4 border border-line bg-faint p-3 text-xs">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={14} strokeWidth={1.5} />
              {error}
            </span>
          </div>
        )}

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SmallStat label="Total" value={String(stats?.totals.total ?? 0)} detail="All stored reactions" />
          <SmallStat label="Users" value={String(stats?.totals.reactingUsers ?? 0)} detail="Distinct Auth0 users" />
          <SmallStat label="Not for me" value={String(stats?.totals.dislike ?? 0)} detail="Dislikes" />
          <SmallStat label="Likes" value={String(stats?.totals.like ?? 0)} detail="Liked photos" />
          <SmallStat label="Loves" value={String(stats?.totals.love ?? 0)} detail="Strongest taste signal" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[46rem] text-left text-xs">
              <thead className="border-b border-line bg-faint text-muted">
                <tr>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Photo</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">State</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Users</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Not for me</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Like</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Love</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(stats?.byPhoto ?? []).map((row) => (
                  <tr key={row.photoId}>
                    <td className="px-3 py-2">
                      <div className="font-bold">{row.title}</div>
                      <div className="text-muted">{row.photoId}</div>
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.reactingUsers}</td>
                    <td className="px-3 py-2">{row.dislike}</td>
                    <td className="px-3 py-2">{row.like}</td>
                    <td className="px-3 py-2">{row.love}</td>
                    <td className="px-3 py-2 font-bold">{row.total}</td>
                  </tr>
                ))}
                {!stats && !loading && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted">
                      No reaction data loaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border border-line">
            <div className="border-b border-line bg-faint px-3 py-2 text-xs uppercase tracking-wide text-muted">
              Recent user reactions
            </div>
            <div className="max-h-[32rem] divide-y divide-line overflow-auto">
              {(stats?.recent ?? []).map((row) => (
                <div key={`${row.photoId}-${row.userSub}-${row.updatedAt}`} className="p-3 text-xs">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="font-bold">{row.reaction}</span>
                    <span className="text-muted">{formatDate(row.updatedAt)}</span>
                  </div>
                  <div className="truncate">{row.title}</div>
                  <div className="truncate text-muted">{row.userName ?? row.userEmail ?? row.userSub}</div>
                </div>
              ))}
              {stats && stats.recent.length === 0 && (
                <div className="p-3 text-xs text-muted">No reactions stored yet.</div>
              )}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}


function UsersSection({
  response,
  query,
  loading,
  error,
  onQueryChange,
  onReload,
}: {
  response: AdminUsersResponse | null;
  query: string;
  loading: boolean;
  error?: string | null;
  onQueryChange: (query: string) => void;
  onReload: () => void;
}) {
  const stats = response?.stats;
  const providerRows = stats ? Object.entries(stats.providerCounts).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="space-y-5">
      <Panel title="Users and sign-ins" icon={UserCog}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="block min-w-0 flex-1">
            <span className="label mb-2 block">Search Auth0 users</span>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onReload();
              }}
              placeholder="email, name, provider, or Auth0 query"
              className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong"
            />
          </label>
          <Button onClick={onReload} disabled={loading} className="h-9 shrink-0">
            <RefreshCw size={14} strokeWidth={1.5} />
            {loading ? 'Loading' : 'Reload users'}
          </Button>
        </div>

        {error && (
          <div className="mb-4 border border-line bg-faint p-3 text-xs">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={14} strokeWidth={1.5} />
              {error}
            </span>
          </div>
        )}

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SmallStat label="Registered" value={String(response?.total ?? 'Unknown')} detail={`${response?.returned ?? 0} visible`} />
          <SmallStat label="Active" value={String(stats?.activeLast30Days ?? 0)} detail="Last 30 days" />
          <SmallStat label="New" value={String(stats?.createdLast7Days ?? 0)} detail="Last 7 days" />
          <SmallStat label="Verified" value={String(stats?.verifiedEmail ?? 0)} detail={`${stats?.unverifiedEmail ?? 0} unverified`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[48rem] text-left text-xs">
              <thead className="border-b border-line bg-faint text-muted">
                <tr>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">User</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Provider</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Logins</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Last login</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Created</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(response?.users ?? []).map((user) => (
                  <tr key={user.id}>
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {user.picture ? (
                          <img src={user.picture} alt="" className="h-8 w-8 border border-line object-cover" />
                        ) : (
                          <div className="h-8 w-8 border border-line bg-faint" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-bold">{user.name ?? user.email ?? user.id}</div>
                          <div className="truncate text-muted">{user.email ?? user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(user.providers.length ? user.providers : ['unknown']).map((provider) => (
                          <span key={provider} className="border border-line px-1.5 py-0.5 uppercase tracking-wide">
                            {provider}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">{user.loginsCount}</td>
                    <td className="px-3 py-3">{formatDate(user.lastLogin)}</td>
                    <td className="px-3 py-3">{formatDate(user.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className={user.emailVerified ? 'border border-fg px-1.5 py-0.5' : 'border border-line px-1.5 py-0.5 text-muted'}>
                          {user.emailVerified ? 'Verified' : 'Unverified'}
                        </span>
                        {user.blocked && <span className="border border-line-strong px-1.5 py-0.5">Blocked</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {response && response.users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted">
                      No users match this search.
                    </td>
                  </tr>
                )}
                {!response && !loading && !error && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted">
                      No user data loaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <div className="border border-line p-3">
              <div className="label mb-3">Providers</div>
              <div className="divide-y divide-line border border-line">
                {providerRows.map(([provider, count]) => (
                  <div key={provider} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <span>{provider}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
                {providerRows.length === 0 && <div className="px-3 py-2 text-xs text-muted">No provider data</div>}
              </div>
            </div>

            <div className="border border-line p-3">
              <div className="label mb-3">Access model</div>
              <div className="space-y-2 text-xs text-muted">
                <p>Auth0 is the identity source for this portfolio.</p>
                <p>App-local profiles and entitlements should still be created lazily when a product needs them.</p>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function StorageSection({ exportStatus }: { exportStatus: CatalogAdminStatus['export'] }) {
  const storageRows = [
    { id: 'catalog', label: 'Catalog export', value: exportStatus?.size ? formatBytes(exportStatus.size) : 'Unavailable', detail: exportStatus?.key ?? 'Worker export object' },
    { id: 'etag', label: 'Export etag', value: exportStatus?.etag ?? 'Unavailable', detail: 'R2 object metadata' },
    { id: 'uploaded', label: 'Uploaded', value: formatDate(exportStatus?.uploaded), detail: 'Latest catalog object timestamp' },
    { id: 'media', label: 'Media objects', value: 'API needed', detail: 'Gallery originals and generated variants' },
  ];

  return (
    <Panel title="Storage" icon={HardDrive}>
      <div className="grid gap-3 md:grid-cols-2">
        {storageRows.map((row) => (
          <div key={row.id} className="border border-line p-3">
            <div className="label mb-2">{row.label}</div>
            <div className="break-words text-sm font-bold tracking-tight">{row.value}</div>
            <div className="mt-2 text-xs text-muted">{row.detail}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function MetricGrid({ items }: { items: Array<{ label: string; value: string; detail: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="border border-line p-4">
          <div className="label mb-3">{item.label}</div>
          <div className="truncate text-xl font-bold tracking-tight">{item.value}</div>
          <div className="mt-2 truncate text-xs text-muted">{item.detail}</div>
        </div>
      ))}
    </div>
  );
}

function RunTable({ status }: { status: CatalogAdminStatus | null }) {
  const rows = [
    ['Last run', status?.lastRun?.id ?? 'Unavailable'],
    ['Status', status?.lastRun?.status ?? 'Unknown'],
    ['Started', formatDate(status?.lastRun?.started_at)],
    ['Finished', formatDate(status?.lastRun?.finished_at)],
    ['Cameras', String(status?.lastRun?.camera_count ?? 'Unknown')],
    ['Lenses', String(status?.lastRun?.lens_count ?? 'Unknown')],
    ['Bindings', String(status?.lastRun?.binding_count ?? 'Unknown')],
  ];

  return (
    <div className="border border-line">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[9rem_minmax(0,1fr)] border-b border-line last:border-b-0">
          <div className="bg-faint px-3 py-2 text-xs uppercase tracking-wide text-muted">{label}</div>
          <div className="min-w-0 px-3 py-2 text-xs">
            {label === 'Status' ? (
              <span className={`inline-flex border px-2 py-0.5 uppercase tracking-wide ${statusTone(value)}`}>{value}</span>
            ) : (
              <span className="break-words">{value}</span>
            )}
          </div>
        </div>
      ))}
      {status?.lastRun?.error && <div className="border-t border-line px-3 py-2 text-xs">{status.lastRun.error}</div>}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Database;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} strokeWidth={1.5} />
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SmallStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-line p-3">
      <div className="label mb-2">{label}</div>
      <div className="truncate text-sm font-bold tracking-tight">{value}</div>
      <div className="mt-1 truncate text-xs text-muted">{detail}</div>
    </div>
  );
}

function describeAdminError(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Admin API denied the request. Check the Pages Function secret or Auth0/Cloudflare Access policy.';
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Admin API request failed.';
}
