import { json } from './gallery';

interface AdminEnv {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
  ADMIN_API_OPEN?: string;
  ADMIN_API_TOKEN?: string;
  ADMIN_API_TOKEN_SHA256?: string;
}

interface JwtHeader {
  alg?: string;
  kid?: string;
}

interface JwtPayload {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iss?: string;
  name?: string;
  nbf?: number;
  permissions?: string[];
  sub?: string;
}

interface JwksResponse {
  keys?: JsonWebKey[];
}

export interface AdminIdentity {
  sub: string;
  email?: string;
  name?: string;
  permissions: string[];
}

const JWKS_CACHE = new Map<string, { expires: number; keys: JsonWebKey[] }>();
const JWKS_CACHE_MS = 10 * 60 * 1000;

export function requireAdminRequest(request: Request, env: AdminEnv): Response | null {
  if (env.ADMIN_API_OPEN === 'true') return null;

  // Cloudflare Access adds this only after an Access policy has admitted the request.
  if (request.headers.get('cf-access-authenticated-user-email')) return null;

  const token = env.ADMIN_API_TOKEN;
  const auth = request.headers.get('authorization') ?? '';
  if (token && auth === `Bearer ${token}`) return null;

  return json({ error: 'admin authorization required' }, { status: 401 });
}

export async function requireAuth0User(request: Request, env: AdminEnv): Promise<AdminIdentity> {
  const token = bearerToken(request);
  if (!token) throw httpError(401, 'missing bearer token');

  const payload = await verifyAuth0Jwt(token, env);
  return {
    sub: payload.sub ?? '',
    email: payload.email,
    name: payload.name,
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
  };
}

export async function requireAuth0Admin(
  request: Request,
  env: AdminEnv,
  requiredPermissions: string[] = ['admin:access'],
): Promise<AdminIdentity> {
  const identity = await requireAuth0User(request, env);
  const permissions = identity.permissions;
  const granted = new Set(permissions);
  if (!requiredPermissions.every((permission) => granted.has(permission))) {
    throw httpError(403, 'missing admin permission');
  }

  return identity;
}

export async function requireAdmin(
  request: Request,
  env: AdminEnv,
  requiredPermissions: string[] = ['admin:access'],
): Promise<AdminIdentity> {
  if (env.ADMIN_API_OPEN === 'true') {
    return { sub: 'dev-admin-bypass', permissions: requiredPermissions };
  }

  const accessEmail = request.headers.get('cf-access-authenticated-user-email');
  if (accessEmail) {
    return { sub: `cloudflare-access:${accessEmail}`, email: accessEmail, permissions: requiredPermissions };
  }

  const token = env.ADMIN_API_TOKEN;
  const auth = request.headers.get('authorization') ?? '';
  if (token && auth === `Bearer ${token}`) {
    return { sub: 'admin-api-token', permissions: requiredPermissions };
  }

  const hashedToken = env.ADMIN_API_TOKEN_SHA256;
  const bearer = bearerToken(request);
  if (hashedToken && bearer && await sha256(bearer) === hashedToken) {
    return { sub: 'admin-api-token-hash', permissions: requiredPermissions };
  }

  return requireAuth0Admin(request, env, requiredPermissions);
}

export function adminAuthError(error: unknown): Response {
  const status = typeof (error as { statusCode?: unknown })?.statusCode === 'number'
    ? (error as { statusCode: number }).statusCode
    : 500;
  const message = error instanceof Error ? error.message : 'admin authorization failed';
  return json({ error: message }, { status });
}

function bearerToken(request: Request): string | null {
  const auth = request.headers.get('authorization') ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyAuth0Jwt(token: string, env: AdminEnv): Promise<JwtPayload> {
  const domain = env.AUTH0_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const audience = env.AUTH0_AUDIENCE;
  if (!domain || !audience) throw httpError(500, 'Auth0 admin verification is not configured');

  const issuer = `https://${domain}/`;
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw httpError(401, 'invalid bearer token');

  const header = decodeJson<JwtHeader>(encodedHeader);
  const payload = decodeJson<JwtPayload>(encodedPayload);
  if (header.alg !== 'RS256' || !header.kid) throw httpError(401, 'unsupported token signature');
  if (!payload.sub || payload.iss !== issuer) throw httpError(401, 'invalid token issuer');
  if (!audienceMatches(payload.aud, audience)) throw httpError(401, 'invalid token audience');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp == null || payload.exp <= now) throw httpError(401, 'token expired');
  if (payload.nbf != null && payload.nbf > now) throw httpError(401, 'token is not active yet');

  const jwk = (await getJwks(issuer)).find((key) => key.kid === header.kid);
  if (!jwk) throw httpError(401, 'token signing key was not found');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlBytes(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!valid) throw httpError(401, 'invalid token signature');

  return payload;
}

async function getJwks(issuer: string): Promise<JsonWebKey[]> {
  const cached = JWKS_CACHE.get(issuer);
  if (cached && cached.expires > Date.now()) return cached.keys;

  const res = await fetch(`${issuer}.well-known/jwks.json`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw httpError(500, 'failed to load Auth0 signing keys');

  const body = (await res.json()) as JwksResponse;
  const keys = body.keys ?? [];
  JWKS_CACHE.set(issuer, { expires: Date.now() + JWKS_CACHE_MS, keys });
  return keys;
}

function audienceMatches(actual: string | string[] | undefined, expected: string): boolean {
  if (Array.isArray(actual)) return actual.includes(expected);
  return actual === expected;
}

function decodeJson<T>(encoded: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(encoded))) as T;
}

function base64UrlBytes(encoded: string): Uint8Array {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function httpError(statusCode: number, message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}
