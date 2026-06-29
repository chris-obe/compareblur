import { adminAuthError, requireAdmin } from '../../_lib/admin';
import { auth0ManagementRequest, type Auth0ManagementEnv } from '../../_lib/auth0Management';
import { json } from '../../_lib/gallery';

type Env = Auth0ManagementEnv & {
  AUTH0_AUDIENCE?: string;
  ADMIN_API_OPEN?: string;
};

interface Auth0Identity {
  connection?: string;
  provider?: string;
  user_id?: string;
  isSocial?: boolean;
}

interface Auth0User {
  blocked?: boolean;
  created_at?: string;
  email?: string;
  email_verified?: boolean;
  identities?: Auth0Identity[];
  last_ip?: string;
  last_login?: string;
  logins_count?: number;
  name?: string;
  nickname?: string;
  picture?: string;
  updated_at?: string;
  user_id: string;
}

interface Auth0UsersResponse {
  limit?: number;
  length?: number;
  start?: number;
  total?: number;
  users?: Auth0User[];
}

interface AdminUserSummary {
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

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);

    const url = new URL(request.url);
    const page = clampInteger(url.searchParams.get('page'), 0, 1000, 0);
    const perPage = clampInteger(url.searchParams.get('perPage'), 1, 100, 50);
    const query = url.searchParams.get('q')?.trim();

    const params = new URLSearchParams({
      include_totals: 'true',
      search_engine: 'v3',
      page: String(page),
      per_page: String(perPage),
      sort: 'created_at:-1',
      include_fields: 'true',
      fields: [
        'user_id',
        'email',
        'email_verified',
        'name',
        'nickname',
        'picture',
        'created_at',
        'updated_at',
        'last_login',
        'last_ip',
        'logins_count',
        'blocked',
        'identities',
      ].join(','),
    });

    if (query) params.set('q', query);

    const body = await auth0ManagementRequest<Auth0UsersResponse>(env, `users?${params.toString()}`);
    const users = (body.users ?? []).map(toAdminUserSummary);

    return json({
      ok: true,
      page,
      perPage,
      total: body.total ?? users.length,
      returned: users.length,
      query: query ?? '',
      stats: buildStats(users, body.total ?? users.length),
      users,
    });
  } catch (error) {
    return adminAuthError(error);
  }
};

function toAdminUserSummary(user: Auth0User): AdminUserSummary {
  const identities = user.identities ?? [];
  const providers = unique(identities.map((identity) => identity.provider).filter(Boolean).map(String));
  const connections = unique(identities.map((identity) => identity.connection).filter(Boolean).map(String));

  return {
    blocked: user.blocked === true,
    connections,
    createdAt: user.created_at,
    email: user.email,
    emailVerified: user.email_verified === true,
    id: user.user_id,
    lastIp: user.last_ip,
    lastLogin: user.last_login,
    loginsCount: user.logins_count ?? 0,
    name: user.name ?? user.nickname,
    picture: user.picture,
    providers,
    updatedAt: user.updated_at,
  };
}

function buildStats(users: AdminUserSummary[], total: number) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const providerCounts: Record<string, number> = {};

  for (const user of users) {
    for (const provider of user.providers.length ? user.providers : ['unknown']) {
      providerCounts[provider] = (providerCounts[provider] ?? 0) + 1;
    }
  }

  return {
    total,
    visible: users.length,
    verifiedEmail: users.filter((user) => user.email && user.emailVerified).length,
    unverifiedEmail: users.filter((user) => user.email && !user.emailVerified).length,
    blocked: users.filter((user) => user.blocked).length,
    socialLoginUsers: users.filter((user) => user.providers.some((provider) => provider !== 'auth0')).length,
    databaseUsers: users.filter((user) => user.providers.includes('auth0')).length,
    createdLast7Days: users.filter((user) => dateAfter(user.createdAt, sevenDaysAgo)).length,
    activeLast30Days: users.filter((user) => dateAfter(user.lastLogin, thirtyDaysAgo)).length,
    providerCounts,
  };
}

function dateAfter(value: string | undefined, threshold: number): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= threshold;
}

function clampInteger(value: string | null, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}
