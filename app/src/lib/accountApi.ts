export interface AccountRole {
  id: string;
  name: string;
  description?: string;
}

export interface AccountProfile {
  bio: string;
  displayName: string;
  website: string;
}

export interface AccountSummary {
  ok: true;
  identity: {
    sub: string;
    email?: string;
    emailVerified: boolean;
    name?: string;
    nickname?: string;
    picture?: string;
    createdAt?: string;
    updatedAt?: string;
    lastLogin?: string;
    loginsCount: number;
    providers: string[];
    connections: string[];
    permissions: string[];
    roles: AccountRole[];
  };
  profile: AccountProfile;
  stats: {
    uploads: {
      total: number;
      approved: number;
      pending: number;
      rejected: number;
      draft: number;
      adminOwnedUnattributed: number;
    };
    reactions: {
      total: number;
      dislike: number;
      like: number;
      love: number;
    };
  };
  uploads: Array<{
    id: string;
    title: string;
    status: string;
    ownership: 'uploaded' | 'admin-owned';
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
  }>;
  reactions: Array<{
    photoId: string;
    title: string;
    status: string;
    reaction: string;
    updatedAt: string;
  }>;
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.error === 'string' ? body.error : `Account API failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function authHeaders(accessToken: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set('accept', 'application/json');
  headers.set('authorization', `Bearer ${accessToken}`);
  return headers;
}

export async function getAccountSummary(accessToken: string): Promise<AccountSummary> {
  const res = await fetch('/api/account/me', { headers: authHeaders(accessToken) });
  return readJson<AccountSummary>(res);
}

export async function updateAccountProfile(
  accessToken: string,
  profile: Partial<AccountProfile>,
): Promise<AccountSummary> {
  const res = await fetch('/api/account/me', {
    method: 'PATCH',
    headers: authHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify({ profile }),
  });
  return readJson<AccountSummary>(res);
}
