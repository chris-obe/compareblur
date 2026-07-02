import { adminAuthError, requireAuth0User } from '../../../_lib/admin';
import { findPhoto, galleryStatusFromRow, json, type GalleryEnv } from '../../../_lib/gallery';
import { isGalleryReaction, reactionCountsForPhoto } from '../../../_lib/reactions';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
};

export const onRequestPut: PagesFunction<Env> = async ({ env, params, request }) => {
  let identity;
  try {
    identity = await requireAuth0User(request, env);
  } catch (error) {
    return adminAuthError(error);
  }

  const photoId = String(params.photoId);
  const photo = await findPhoto(env, photoId);
  if (!photo || galleryStatusFromRow(photo) !== 'approved') return json({ error: 'photo not found' }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { reaction?: unknown };
  if (!isGalleryReaction(body.reaction)) {
    return json({ error: 'invalid reaction' }, { status: 400 });
  }

  // Per-user write cap: reacting is bursty but human-paced; anything past
  // this in a minute is scripted table bloat. Uses idx_gallery_reactions_user_updated.
  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const recent = await env.GALLERY_DB.prepare(
    'SELECT COUNT(*) AS count FROM gallery_reactions WHERE user_sub = ? AND updated_at > ?',
  )
    .bind(identity.sub, windowStart)
    .first<{ count: number }>();
  if ((recent?.count ?? 0) >= 30) {
    return json({ error: 'too many reactions, slow down' }, { status: 429 });
  }

  const now = new Date().toISOString();
  await env.GALLERY_DB.prepare(
    `INSERT INTO gallery_reactions (
       photo_id, user_sub, user_email, user_name, reaction, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(photo_id, user_sub) DO UPDATE SET
       user_email = excluded.user_email,
       user_name = excluded.user_name,
       reaction = excluded.reaction,
       updated_at = excluded.updated_at`,
  )
    .bind(
      photoId,
      identity.sub,
      identity.email ?? null,
      identity.name ?? null,
      body.reaction,
      now,
      now,
    )
    .run();

  return json({
    photoId,
    reaction: body.reaction,
    reactionCounts: await reactionCountsForPhoto(env, photoId),
  });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  let identity;
  try {
    identity = await requireAuth0User(request, env);
  } catch (error) {
    return adminAuthError(error);
  }

  const photoId = String(params.photoId);
  await env.GALLERY_DB.prepare(
    `DELETE FROM gallery_reactions
     WHERE photo_id = ? AND user_sub = ?`,
  )
    .bind(photoId, identity.sub)
    .run();

  return json({
    photoId,
    reaction: null,
    reactionCounts: await reactionCountsForPhoto(env, photoId),
  });
};
