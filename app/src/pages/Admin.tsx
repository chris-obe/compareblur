import { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  AlertTriangle,
  Database,
  HardDrive,
  ImagePlus,
  RefreshCw,
  Shield,
  SlidersHorizontal,
  ThumbsUp,
  UserCog,
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
  triggerCatalogRefresh,
  updateCatalogAdminSettings,
  type AdminIdentity,
  type AdminUsersResponse,
  type CatalogAdminStatus,
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
              generatedAt={catalog.generatedAt}
              loading={loading}
              saving={saving}
              status={status}
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
  generatedAt,
  loading,
  saving,
  status,
  onRefreshNow,
  onToggleAutoRefresh,
  onUpdateInterval,
}: {
  appCatalogStatus: string;
  appCatalogSource: string;
  generatedAt?: string;
  loading: boolean;
  saving: boolean;
  status: CatalogAdminStatus | null;
  onRefreshNow: () => void;
  onToggleAutoRefresh: () => void;
  onUpdateInterval: (days: number) => void;
}) {
  const [draftDays, setDraftDays] = useState(status?.settings.refreshIntervalDays ?? 30);

  useEffect(() => {
    if (status?.settings.refreshIntervalDays) setDraftDays(status.settings.refreshIntervalDays);
  }, [status?.settings.refreshIntervalDays]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Panel title="Catalog worker" icon={Database}>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <SmallStat label="App source" value={appCatalogStatus} detail={appCatalogSource} />
          <SmallStat label="Generated" value={formatDate(generatedAt)} detail="Frontend catalog export" />
          <SmallStat
            label="Export object"
            value={status?.export ? formatBytes(status.export.size) : 'Unavailable'}
            detail={status?.export?.key ?? 'Admin endpoint not connected'}
          />
        </div>
        <RunTable status={status} />
      </Panel>

      <Panel title="Refresh controls" icon={RefreshCw}>
        <div className="space-y-4">
          <div className="border border-line p-3">
            <div className="label mb-2">Auto refresh</div>
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
            <span className="label mb-2 block">Interval days</span>
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
              Save interval
            </Button>
          </label>

          <Button variant="solid" onClick={onRefreshNow} disabled={loading || saving}>
            <RefreshCw size={14} strokeWidth={1.5} />
            Refresh now
          </Button>
        </div>
      </Panel>
    </div>
  );
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
