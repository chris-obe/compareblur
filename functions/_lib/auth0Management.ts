export interface Auth0ManagementEnv {
  AUTH0_DOMAIN?: string;
  AUTH0_MGMT_AUDIENCE?: string;
  AUTH0_MGMT_CLIENT_ID?: string;
  AUTH0_MGMT_CLIENT_SECRET?: string;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

export async function auth0ManagementRequest<T>(
  env: Auth0ManagementEnv,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const domain = auth0Domain(env);
  const token = await auth0ManagementToken(env);
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  headers.set('authorization', `Bearer ${token}`);

  const res = await fetch(`https://${domain}/api/v2/${path.replace(/^\//, '')}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = typeof body?.message === 'string' ? body.message : 'Auth0 Management API request failed';
    throw httpError(res.status, message);
  }

  return res.json() as Promise<T>;
}

function auth0Domain(env: Auth0ManagementEnv): string {
  const domain = env.AUTH0_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!domain) throw httpError(500, 'Auth0 Management API domain is not configured');
  return domain;
}

async function auth0ManagementToken(env: Auth0ManagementEnv): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.accessToken;

  const domain = auth0Domain(env);
  const audience = env.AUTH0_MGMT_AUDIENCE ?? `https://${domain}/api/v2/`;
  const clientId = env.AUTH0_MGMT_CLIENT_ID;
  const clientSecret = env.AUTH0_MGMT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw httpError(500, 'Auth0 Management API credentials are not configured');

  const res = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience,
    }),
  });

  const body = (await res.json().catch(() => null)) as TokenResponse | null;
  if (!res.ok || !body?.access_token) {
    throw httpError(res.status || 500, 'Failed to obtain Auth0 Management API token');
  }

  cachedToken = {
    accessToken: body.access_token,
    expiresAt: Date.now() + Math.max(60, body.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

function httpError(statusCode: number, message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}
