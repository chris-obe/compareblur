import { adminAuthError, requireAuth0User } from '../../_lib/admin';
import { auth0ManagementRequest, type Auth0ManagementEnv } from '../../_lib/auth0Management';
import { galleryStatusFromRow, json, type GalleryEnv } from '../../_lib/gallery';

type Env = Auth0ManagementEnv & GalleryEnv & {
  AUTH0_AUDIENCE?: string;
};

interface Auth0Role {
  id: string;
  name: string;
  description?: string;
}

interface Auth0UserProfile {
  created_at?: string;
  email?: string;
  email_verified?: boolean;
  identities?: Array<{ connection?: string; provider?: string }>;
  last_login?: string;
  logins_count?: number;
  name?: string;
  nickname?: string;
  picture?: string;
  updated_at?: string;
  user_id: string;
  user_metadata?: {
    blur?: AppProfile;
    [key: string]: unknown;
  };
}

interface AppProfile {
  bio?: string;
  displayName?: string;
  website?: string;
}

interface UploadRow {
  id: string;
  title: string;
  status: string;
  gallery_status: string | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface UploadStatsRow {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  not_submitted: number;
  admin_owned_unattributed: number;
}

interface ReactionStatsRow {
  total: number;
  dislike: number;
  like: number;
  love: number;
}

interface ReactionRow {
  photo_id: string;
  title: string;
  status: string;
  gallery_status: string | null;
  reaction: string;
  updated_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const identity = await requireAuth0User(request, env);
    return json(await accountSummary(env, identity));
  } catch (error) {
    return adminAuthError(error);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const identity = await requireAuth0User(request, env);
    const body = (await request.json().catch(() => ({}))) as { profile?: Partial<AppProfile> };
    const current = await auth0User(env, identity.sub);
    const currentMetadata = current.user_metadata ?? {};
    const profile = sanitizeProfile(body.profile ?? {});

    await auth0ManagementRequest<Auth0UserProfile>(env, `users/${encodeURIComponent(identity.sub)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_metadata: {
          ...currentMetadata,
          blur: {
            ...(currentMetadata.blur ?? {}),
            ...profile,
          },
        },
      }),
    });

    return json(await accountSummary(env, identity));
  } catch (error) {
    return adminAuthError(error);
  }
};

async function accountSummary(env: Env, identity: { sub: string; email?: string; name?: string; permissions: string[] }) {
  const [profile, roles] = await Promise.all([
    auth0User(env, identity.sub),
    auth0Roles(env, identity.sub),
  ]);
  const roleNames = roles.map((role) => role.name);
  const isAdmin = roleNames.includes('admin') || identity.permissions.includes('admin:access');
  const [uploadStats, uploads, reactionStats, reactions] = await Promise.all([
    loadUploadStats(env, identity.sub, isAdmin),
    loadUploads(env, identity.sub, isAdmin),
    loadReactionStats(env, identity.sub),
    loadReactions(env, identity.sub),
  ]);

  return {
    ok: true,
    identity: {
      sub: identity.sub,
      email: profile.email ?? identity.email,
      emailVerified: profile.email_verified === true,
      name: profile.name ?? identity.name,
      nickname: profile.nickname,
      picture: profile.picture,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      lastLogin: profile.last_login,
      loginsCount: profile.logins_count ?? 0,
      providers: [...new Set((profile.identities ?? []).map((item) => item.provider).filter(Boolean))],
      connections: [...new Set((profile.identities ?? []).map((item) => item.connection).filter(Boolean))],
      permissions: identity.permissions,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      })),
    },
    profile: {
      displayName: profile.user_metadata?.blur?.displayName ?? '',
      bio: profile.user_metadata?.blur?.bio ?? '',
      website: profile.user_metadata?.blur?.website ?? '',
    },
    stats: {
      uploads: uploadStats,
      reactions: reactionStats,
    },
    uploads,
    reactions,
  };
}

async function auth0User(env: Auth0ManagementEnv, sub: string): Promise<Auth0UserProfile> {
  const fields = [
    'user_id',
    'email',
    'email_verified',
    'name',
    'nickname',
    'picture',
    'created_at',
    'updated_at',
    'last_login',
    'logins_count',
    'identities',
    'user_metadata',
  ].join(',');
  return auth0ManagementRequest<Auth0UserProfile>(
    env,
    `users/${encodeURIComponent(sub)}?fields=${encodeURIComponent(fields)}&include_fields=true`,
  );
}

async function auth0Roles(env: Auth0ManagementEnv, sub: string): Promise<Auth0Role[]> {
  return auth0ManagementRequest<Auth0Role[]>(env, `users/${encodeURIComponent(sub)}/roles`);
}

async function loadUploadStats(env: GalleryEnv, sub: string, isAdmin: boolean) {
  const where = isAdmin ? `(submitted_by = ? OR submitted_by IS NULL OR submitted_by = '')` : `submitted_by = ?`;
  const row = await env.GALLERY_DB.prepare(
    `SELECT
      COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN gallery_status = 'approved' THEN 1 ELSE 0 END), 0) AS approved,
       COALESCE(SUM(CASE WHEN gallery_status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
       COALESCE(SUM(CASE WHEN gallery_status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected,
       COALESCE(SUM(CASE WHEN gallery_status = 'not_submitted' THEN 1 ELSE 0 END), 0) AS not_submitted,
       COALESCE(SUM(CASE WHEN submitted_by IS NULL OR submitted_by = '' THEN 1 ELSE 0 END), 0) AS admin_owned_unattributed
     FROM gallery_photos
     WHERE ${where}`,
  )
    .bind(sub)
    .first<UploadStatsRow>();

  return {
    total: Number(row?.total ?? 0),
    approved: Number(row?.approved ?? 0),
    pending: Number(row?.pending ?? 0),
    rejected: Number(row?.rejected ?? 0),
    draft: Number(row?.not_submitted ?? 0),
    adminOwnedUnattributed: Number(row?.admin_owned_unattributed ?? 0),
  };
}

async function loadUploads(env: GalleryEnv, sub: string, isAdmin: boolean) {
  const where = isAdmin ? `(submitted_by = ? OR submitted_by IS NULL OR submitted_by = '')` : `submitted_by = ?`;
  const rows = await env.GALLERY_DB.prepare(
    `SELECT id, title, status, gallery_status, submitted_by, created_at, updated_at, published_at
     FROM gallery_photos
     WHERE ${where}
     ORDER BY updated_at DESC
     LIMIT 50`,
  )
    .bind(sub)
    .all<UploadRow>();

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: galleryStatusLabel(row.status, row.gallery_status),
    ownership: row.submitted_by ? 'uploaded' : 'admin-owned',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  }));
}

async function loadReactionStats(env: GalleryEnv, sub: string) {
  const row = await env.GALLERY_DB.prepare(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN reaction = 'dislike' THEN 1 ELSE 0 END), 0) AS dislike,
       COALESCE(SUM(CASE WHEN reaction = 'like' THEN 1 ELSE 0 END), 0) AS like,
       COALESCE(SUM(CASE WHEN reaction = 'love' THEN 1 ELSE 0 END), 0) AS love
     FROM gallery_reactions
     WHERE user_sub = ?`,
  )
    .bind(sub)
    .first<ReactionStatsRow>();

  return {
    total: Number(row?.total ?? 0),
    dislike: Number(row?.dislike ?? 0),
    like: Number(row?.like ?? 0),
    love: Number(row?.love ?? 0),
  };
}

async function loadReactions(env: GalleryEnv, sub: string) {
  const rows = await env.GALLERY_DB.prepare(
    `SELECT r.photo_id, p.title, p.status, p.gallery_status, r.reaction, r.updated_at
     FROM gallery_reactions r
     JOIN gallery_photos p ON p.id = r.photo_id
     WHERE r.user_sub = ?
     ORDER BY r.updated_at DESC
     LIMIT 50`,
  )
    .bind(sub)
    .all<ReactionRow>();

  return (rows.results ?? []).map((row) => ({
    photoId: row.photo_id,
    title: row.title,
    status: galleryStatusLabel(row.status, row.gallery_status),
    reaction: row.reaction,
    updatedAt: row.updated_at,
  }));
}

function galleryStatusLabel(status: string, galleryStatus: string | null) {
  switch (galleryStatusFromRow({ status, gallery_status: galleryStatus })) {
    case 'approved':
      return 'public gallery';
    case 'pending':
      return 'pending review';
    case 'rejected':
      return 'rejected';
    case 'not_submitted':
      return 'library only';
  }
}

function sanitizeProfile(profile: Partial<AppProfile>): AppProfile {
  return {
    displayName: cleanText(profile.displayName, 80),
    bio: cleanText(profile.bio, 280),
    website: cleanText(profile.website, 160),
  };
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
