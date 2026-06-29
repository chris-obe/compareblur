import { adminAuthError, requireAuth0User } from '../../../_lib/admin';
import { json, type GalleryEnv } from '../../../_lib/gallery';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
};

interface ReactionRow {
  photo_id: string;
  reaction: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  let identity;
  try {
    identity = await requireAuth0User(request, env);
  } catch (error) {
    return adminAuthError(error);
  }

  const rows = await env.GALLERY_DB.prepare(
    `SELECT photo_id, reaction
     FROM gallery_reactions
     WHERE user_sub = ?
     ORDER BY updated_at DESC`,
  )
    .bind(identity.sub)
    .all<ReactionRow>();

  const reactions: Record<string, string> = {};
  for (const row of rows.results ?? []) reactions[row.photo_id] = row.reaction;

  return json({ reactions });
};
