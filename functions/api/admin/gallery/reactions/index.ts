import { adminAuthError, requireAdmin } from '../../../../_lib/admin';
import { galleryStatusFromRow, json, type GalleryEnv } from '../../../../_lib/gallery';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
  ADMIN_API_OPEN?: string;
  ADMIN_API_TOKEN?: string;
  ADMIN_API_TOKEN_SHA256?: string;
};

interface TotalsRow {
  total: number;
  reacting_users: number;
  dislike_count: number;
  like_count: number;
  love_count: number;
}

interface PhotoReactionRow {
  photo_id: string;
  title: string;
  status: string;
  gallery_status: string | null;
  total: number;
  dislike_count: number;
  like_count: number;
  love_count: number;
  reacting_users: number;
}

interface RecentReactionRow {
  photo_id: string;
  title: string;
  user_sub: string;
  user_email: string | null;
  user_name: string | null;
  reaction: string;
  updated_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
  } catch (error) {
    return adminAuthError(error);
  }

  const totals = await env.GALLERY_DB.prepare(
    `SELECT
       COUNT(*) AS total,
       COUNT(DISTINCT user_sub) AS reacting_users,
       COALESCE(SUM(CASE WHEN reaction = 'dislike' THEN 1 ELSE 0 END), 0) AS dislike_count,
       COALESCE(SUM(CASE WHEN reaction = 'like' THEN 1 ELSE 0 END), 0) AS like_count,
       COALESCE(SUM(CASE WHEN reaction = 'love' THEN 1 ELSE 0 END), 0) AS love_count
     FROM gallery_reactions`,
  ).first<TotalsRow>();

  const byPhoto = await env.GALLERY_DB.prepare(
    `SELECT
       p.id AS photo_id,
       p.title,
       p.status,
       p.gallery_status,
       COUNT(r.reaction) AS total,
       COALESCE(SUM(CASE WHEN r.reaction = 'dislike' THEN 1 ELSE 0 END), 0) AS dislike_count,
       COALESCE(SUM(CASE WHEN r.reaction = 'like' THEN 1 ELSE 0 END), 0) AS like_count,
       COALESCE(SUM(CASE WHEN r.reaction = 'love' THEN 1 ELSE 0 END), 0) AS love_count,
       COUNT(DISTINCT r.user_sub) AS reacting_users
     FROM gallery_photos p
     LEFT JOIN gallery_reactions r ON r.photo_id = p.id
     GROUP BY p.id
     ORDER BY love_count DESC, like_count DESC, total DESC, p.updated_at DESC
     LIMIT 100`,
  ).all<PhotoReactionRow>();

  const recent = await env.GALLERY_DB.prepare(
    `SELECT
       r.photo_id,
       p.title,
       r.user_sub,
       r.user_email,
       r.user_name,
       r.reaction,
       r.updated_at
     FROM gallery_reactions r
     JOIN gallery_photos p ON p.id = r.photo_id
     ORDER BY r.updated_at DESC
     LIMIT 100`,
  ).all<RecentReactionRow>();

  return json({
    totals: {
      total: Number(totals?.total ?? 0),
      reactingUsers: Number(totals?.reacting_users ?? 0),
      dislike: Number(totals?.dislike_count ?? 0),
      like: Number(totals?.like_count ?? 0),
      love: Number(totals?.love_count ?? 0),
    },
    byPhoto: (byPhoto.results ?? []).map((row) => ({
      photoId: row.photo_id,
      title: row.title,
      status: adminReactionStatusLabel(row.status, row.gallery_status),
      total: Number(row.total ?? 0),
      dislike: Number(row.dislike_count ?? 0),
      like: Number(row.like_count ?? 0),
      love: Number(row.love_count ?? 0),
      reactingUsers: Number(row.reacting_users ?? 0),
    })),
    recent: (recent.results ?? []).map((row) => ({
      photoId: row.photo_id,
      title: row.title,
      userSub: row.user_sub,
      userEmail: row.user_email ?? undefined,
      userName: row.user_name ?? undefined,
      reaction: row.reaction,
      updatedAt: row.updated_at,
    })),
  });
};

function adminReactionStatusLabel(status: string, galleryStatus: string | null) {
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
