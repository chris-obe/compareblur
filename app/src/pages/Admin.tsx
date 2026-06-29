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
  UserCog,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { isDevAdminBypass } from '../auth/adminAccess';
import { adminAuthorizationParams, adminTokenParams } from '../auth/config';
import {
  AdminApiError,
  getAdminIdentity,
  getCatalogAdminStatus,
  triggerCatalogRefresh,
  updateCatalogAdminSettings,
  type AdminIdentity,
  type CatalogAdminStatus,
} from '../lib/adminApi';
import { listAdminGalleryPhotos, type AdminGalleryPhoto } from '../lib/galleryApi';
import { useCatalog } from '../store/CatalogProvider';
import { GalleryAdmin } from '../components/admin/GalleryAdmin';

type AdminSection = 'overview' | 'catalog' | 'gallery' | 'users' | 'storage';

interface AdminGateProps {
  children: React.ReactNode;
}

const SECTIONS: Array<{ id: AdminSection; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'gallery', label: 'Gallery' },
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
  const { getAccessTokenSilently, isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const [checking, setChecking] = useState(false);
  const [denied, setDenied] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const devBypass = isDevAdminBypass();

  useEffect(() => {
    if (devBypass || !isAuthenticated) return;

    let cancelled = false;
    setChecking(true);
    setDenied(null);
    setVerified(false);

    getAccessTokenSilently({ authorizationParams: adminTokenParams })
      .then((token) => getAdminIdentity(token))
      .then(() => {
        if (!cancelled) setVerified(true);
      })
      .catch((error) => {
        if (!cancelled) setDenied(error instanceof Error ? error.message : 'Admin authorization failed');
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [devBypass, getAccessTokenSilently, isAuthenticated]);

  if (isLoading && !devBypass) {
    return <AdminNotice title="Checking access" detail="Confirming your session before loading admin controls." />;
  }

  if (!devBypass && !isAuthenticated) {
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

  if (checking) {
    return <AdminNotice title="Checking access" detail="Verifying your Auth0 admin permissions." />;
  }

  if (denied) {
    return <AdminNotice title="Not authorized" detail={denied} />;
  }

  if (!devBypass && !verified) {
    return <AdminNotice title="Checking access" detail="Waiting for admin authorization." />;
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
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const catalog = useCatalog();
  const [section, setSection] = useState<AdminSection>('overview');
  const [adminIdentity, setAdminIdentity] = useState<AdminIdentity | null>(null);
  const [adminToken, setAdminToken] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<CatalogAdminStatus | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<AdminGalleryPhoto[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const devBypass = isDevAdminBypass();
  const accessLabel = devBypass
    ? 'Development bypass'
    : adminIdentity?.email ?? adminIdentity?.name ?? adminIdentity?.sub ?? 'Authorized';

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

  useEffect(() => {
    void loadIdentity();
    void loadStatus();
    void loadGallery();
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
        value: 'Not connected',
        detail: 'Waiting for user/profile API',
      },
      {
        label: 'Gallery',
        value: galleryLoaded ? `${galleryPhotos.length} photos` : 'Loading',
        detail: galleryError ?? `${galleryPhotos.filter((photo) => photo.status === 'pending').length} pending approval`,
      },
      {
        label: 'Storage',
        value: status?.export?.size ? formatBytes(status.export.size) : 'Unavailable',
        detail: status?.export?.key ?? 'R2 media and catalog objects',
      },
    ],
    [catalog.source, catalog.status, galleryError, galleryLoaded, galleryPhotos, status],
  );

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
            <Button onClick={loadStatus} disabled={loading || saving}>
              <RefreshCw size={14} strokeWidth={1.5} />
              Reload
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
              loading={galleryLoading}
              loaded={galleryLoaded}
              error={galleryError}
              onReload={loadGallery}
              onError={setError}
            />
          )}
          {section === 'users' && <UsersSection />}
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
                ['User role assignment', 'API needed'],
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
            <div className="mb-3 flex items-center justify-between gap-3 text-sm">
              <span>{status?.settings.autoRefreshEnabled ? 'Enabled' : 'Disabled'}</span>
              <span
                className={[
                  'inline-flex h-6 w-10 items-center border transition-colors',
                  status?.settings.autoRefreshEnabled ? 'justify-end bg-fg' : 'justify-start bg-transparent',
                ].join(' ')}
              >
                <span className="m-1 h-3.5 w-3.5 bg-bg" />
              </span>
            </div>
            <Button onClick={onToggleAutoRefresh} disabled={!status || loading || saving}>
              Toggle
            </Button>
          </div>

          <label className="block border border-line p-3">
            <span className="label mb-2 block">Interval days</span>
            <input
              type="number"
              min={1}
              max={365}
              value={draftDays}
              onChange={(event) => setDraftDays(Number(event.target.value))}
              className="mb-3 w-full border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-line-strong"
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
  loading,
  loaded,
  error,
  onReload,
  onError,
}: {
  accessToken?: string;
  photos: AdminGalleryPhoto[];
  loading: boolean;
  loaded: boolean;
  error?: string | null;
  onReload: () => Promise<void>;
  onError: (message: string) => void;
}) {
  return (
    <Panel title="Gallery moderation" icon={ImagePlus}>
      <GalleryAdmin
        accessToken={accessToken}
        photos={photos}
        loading={loading}
        loaded={loaded}
        error={error}
        onReload={onReload}
        onError={onError}
      />
    </Panel>
  );
}

function UsersSection() {
  return (
    <Panel title="Users and roles" icon={UserCog}>
      <div className="border border-line p-4 text-xs">
        <div className="mb-2 font-bold">No app-local users endpoint is present in this workspace yet.</div>
        <div className="text-muted">
          This should not call the Auth0 Management API from the browser. Add a server-side admin endpoint for app-local
          profiles, saved kits, uploads, and role changes.
        </div>
      </div>
    </Panel>
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
