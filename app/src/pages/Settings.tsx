import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Code2, FolderOpen, Heart, ImagePlus, Palette, RefreshCw, Save, Shield, User } from 'lucide-react';
import { useAdminAccess } from '../auth/AdminAccessProvider';
import { userTokenParams } from '../auth/config';
import { useTheme } from '../store/ThemeProvider';
import { AccountAlbumsManager } from '../components/albums/AccountAlbumsManager';
import { BlogEmbedManager } from '../components/settings/BlogEmbedManager';
import { GalleryTagsManager } from '../components/settings/GalleryTagsManager';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import {
  getAccountSummary,
  updateAccountProfile,
  type AccountProfile,
  type AccountSummary,
} from '../lib/accountApi';

type SettingsSection = 'profile' | 'albums' | 'embeds' | 'tags' | 'appearance';

const SECTIONS: Array<{ id: SettingsSection; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'albums', label: 'Albums' },
  { id: 'embeds', label: 'Blog embeds' },
  { id: 'tags', label: 'Tags' },
  { id: 'appearance', label: 'Appearance' },
];

export function Settings() {
  const { isAdmin } = useAdminAccess();
  const [section, setSection] = useState<SettingsSection>('profile');
  const sections = isAdmin ? SECTIONS : SECTIONS.filter((item) => item.id !== 'embeds');

  useEffect(() => {
    if (!isAdmin && section === 'embeds') setSection('profile');
  }, [isAdmin, section]);

  return (
    <div className="min-h-full">
      <div className="border-b border-line px-6 py-4">
        <div className="label mb-2">Preferences</div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      </div>

      <div className="grid min-h-[calc(100vh-9.5rem)] grid-cols-1 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav className="border-b border-line p-3 lg:border-b-0 lg:border-r">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {sections.map((item) => (
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
          {section === 'profile' && <ProfileSection />}
          {section === 'albums' && <AlbumsSection />}
          {section === 'embeds' && <EmbedsSection />}
          {section === 'tags' && <TagsSection />}
          {section === 'appearance' && <AppearanceSection />}
        </section>
      </div>
    </div>
  );
}

function AlbumsSection() {
  return (
    <>
      <SectionTitle icon={FolderOpen} title="Albums" />
      <AccountAlbumsManager mode="settings" />
    </>
  );
}

function EmbedsSection() {
  const { isAdmin, status } = useAdminAccess();
  if (!isAdmin) {
    return (
      <div className="w-full max-w-md border border-line p-5">
        <div className="flex items-center gap-3">
          <Shield size={18} strokeWidth={1.5} />
          <div>
            <div className="text-sm font-bold tracking-tight">Admins only</div>
            <div className="mt-1 text-xs text-muted">
              {status === 'anonymous'
                ? 'Sign in with an admin account to manage blog embeds.'
                : 'Your account does not have permission to manage blog embeds.'}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      <SectionTitle icon={Code2} title="Blog embeds" />
      <BlogEmbedManager />
    </>
  );
}

function ProfileSection() {
  const { getAccessTokenSilently, isAuthenticated, isLoading, loginWithRedirect, user } = useAuth0();
  const { isAdmin } = useAdminAccess();
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [draft, setDraft] = useState<AccountProfile>({ displayName: '', bio: '', website: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently({ authorizationParams: userTokenParams });
      const next = await getAccountSummary(token);
      setAccount(next);
      setDraft(next.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account lookup failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently({ authorizationParams: userTokenParams });
      const next = await updateAccountProfile(token, draft);
      setAccount(next);
      setDraft(next.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="max-w-md">
        <SectionTitle icon={User} title="Profile" />
        <div className="border border-line p-4">
          <div className="mb-3 text-sm font-bold tracking-tight">Signed out</div>
          <Button onClick={() => loginWithRedirect({ appState: { returnTo: '/settings' } })}>Sign in</Button>
        </div>
      </section>
    );
  }

  const identity = account?.identity;
  const roles = identity?.roles ?? [];
  const permissions = identity?.permissions ?? [];
  const displayName = draft.displayName || identity?.name || user?.name || user?.email || 'Signed in';

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionTitle icon={User} title="Profile" />
        <Button onClick={load} disabled={loading || saving}>
          <RefreshCw size={14} strokeWidth={1.5} />
          Reload
        </Button>
      </div>

      {error && <div className="border border-line bg-faint p-3 text-xs">{error}</div>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="border border-line p-4">
          <div className="mb-5 flex items-center gap-3">
            {identity?.picture || user?.picture ? (
              <img src={identity?.picture ?? user?.picture} alt="" className="h-12 w-12 border border-line object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center border border-line">
                <User size={18} strokeWidth={1.5} />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-base font-bold tracking-tight">{displayName}</div>
              <div className="truncate text-xs text-muted">{identity?.email ?? user?.email ?? identity?.sub}</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="label mb-2 block">Display name</span>
              <input
                value={draft.displayName}
                onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                className="w-full border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-line-strong"
              />
            </label>
            <label className="block">
              <span className="label mb-2 block">Website</span>
              <input
                value={draft.website}
                onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))}
                className="w-full border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-line-strong"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="label mb-2 block">Bio</span>
              <textarea
                value={draft.bio}
                onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
                rows={3}
                className="w-full resize-none border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-line-strong"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="solid" onClick={save} disabled={saving || loading}>
              <Save size={14} strokeWidth={1.5} />
              Save
            </Button>
            {identity?.emailVerified ? <Chip active>Email verified</Chip> : <Chip>Email unverified</Chip>}
            {isAdmin && <Chip active>Admin</Chip>}
          </div>
        </div>

        <div className="space-y-4">
          <InfoBlock
            title="Auth0"
            rows={[
              ['User id', identity?.sub ?? user?.sub ?? 'Unknown'],
              ['Provider', (identity?.providers ?? []).join(', ') || 'Unknown'],
              ['Logins', String(identity?.loginsCount ?? 0)],
              ['Last login', formatDate(identity?.lastLogin)],
            ]}
          />
          <div className="border border-line p-3">
            <div className="label mb-3">Roles</div>
            <div className="flex flex-wrap gap-2">
              {roles.length > 0 ? roles.map((role) => <Chip key={role.id} active={role.name === 'admin'}>{role.name}</Chip>) : <Chip>none</Chip>}
            </div>
          </div>
          <div className="border border-line p-3">
            <div className="label mb-3">Permissions</div>
            <div className="flex flex-wrap gap-2">
              {permissions.length > 0 ? permissions.map((permission) => <Chip key={permission}>{permission}</Chip>) : <Chip>none</Chip>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ActivityPanel
          icon={ImagePlus}
          title="Uploads"
          stats={[
            ['Total', String(account?.stats.uploads.total ?? 0)],
            ['Approved', String(account?.stats.uploads.approved ?? 0)],
            ['Pending', String(account?.stats.uploads.pending ?? 0)],
            ['Admin-owned', String(account?.stats.uploads.adminOwnedUnattributed ?? 0)],
          ]}
          rows={(account?.uploads ?? []).map((item) => [
            item.title,
            `${item.status} · ${item.ownership}`,
            formatDate(item.updatedAt),
          ])}
          empty="No uploads yet"
        />
        <ActivityPanel
          icon={Heart}
          title="Likes"
          stats={[
            ['Total', String(account?.stats.reactions.total ?? 0)],
            ['Love', String(account?.stats.reactions.love ?? 0)],
            ['Like', String(account?.stats.reactions.like ?? 0)],
            ['Dislike', String(account?.stats.reactions.dislike ?? 0)],
          ]}
          rows={(account?.reactions ?? []).map((item) => [
            item.title,
            `${item.reaction} · ${item.status}`,
            formatDate(item.updatedAt),
          ])}
          empty="No reactions yet"
        />
      </div>
    </section>
  );
}

// Tag management is an admin capability (it edits global gallery tags).
function TagsSection() {
  const { isAdmin, status } = useAdminAccess();
  if (!isAdmin) {
    return (
      <div className="w-full max-w-md border border-line p-5">
        <div className="flex items-center gap-3">
          <Shield size={18} strokeWidth={1.5} />
          <div>
            <div className="text-sm font-bold tracking-tight">Admins only</div>
            <div className="mt-1 text-xs text-muted">
              {status === 'anonymous'
                ? 'Sign in with an admin account to manage gallery tags.'
                : 'Your account does not have permission to manage gallery tags.'}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return <GalleryTagsManager />;
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  return (
    <section className="max-w-md">
      <SectionTitle icon={Palette} title="Appearance" />
      <div className="border border-line p-4">
        <div className="label mb-3">Theme</div>
        <div className="inline-flex border border-line">
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={[
                'px-4 py-1.5 text-xs uppercase tracking-wide transition-colors',
                theme === t ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon size={16} strokeWidth={1.5} />
      <h3 className="text-sm font-bold tracking-tight">{title}</h3>
    </div>
  );
}

function InfoBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="border border-line p-3">
      <div className="label mb-3">{title}</div>
      <div className="divide-y divide-line border border-line">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 px-3 py-2 text-xs">
            <span className="text-muted">{label}</span>
            <span className="break-words">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityPanel({
  icon: Icon,
  title,
  stats,
  rows,
  empty,
}: {
  icon: typeof User;
  title: string;
  stats: Array<[string, string]>;
  rows: Array<[string, string, string]>;
  empty: string;
}) {
  return (
    <div>
      <SectionTitle icon={Icon} title={title} />
      <div className="border border-line p-4">
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="border border-line p-2">
              <div className="label mb-1">{label}</div>
              <div className="text-sm font-bold">{value}</div>
            </div>
          ))}
        </div>
        <div className="divide-y divide-line border border-line">
          {rows.map(([label, detail, date]) => (
            <div key={`${label}-${date}`} className="grid gap-1 px-3 py-2 text-xs md:grid-cols-[minmax(0,1fr)_8rem]">
              <div className="min-w-0">
                <div className="truncate font-bold">{label}</div>
                <div className="truncate text-muted">{detail}</div>
              </div>
              <div className="text-muted md:text-right">{date}</div>
            </div>
          ))}
          {rows.length === 0 && <div className="px-3 py-4 text-center text-xs text-muted">{empty}</div>}
        </div>
      </div>
    </div>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return 'None';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
