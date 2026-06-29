import type { GalleryEnv } from './gallery';

export type GalleryReaction = 'dislike' | 'like' | 'love';

export interface ReactionCounts {
  dislike: number;
  like: number;
  love: number;
  total: number;
}

interface ReactionCountRow {
  photo_id: string;
  reaction: GalleryReaction;
  count: number;
}

export function emptyReactionCounts(): ReactionCounts {
  return { dislike: 0, like: 0, love: 0, total: 0 };
}

export function isGalleryReaction(value: unknown): value is GalleryReaction {
  return value === 'dislike' || value === 'like' || value === 'love';
}

export async function reactionCountsForPhotos(env: GalleryEnv, photoIds: string[]): Promise<Map<string, ReactionCounts>> {
  const ids = [...new Set(photoIds.filter(Boolean))];
  const counts = new Map<string, ReactionCounts>();
  for (const id of ids) counts.set(id, emptyReactionCounts());
  if (ids.length === 0) return counts;

  const placeholders = ids.map(() => '?').join(', ');
  const rows = await env.GALLERY_DB.prepare(
    `SELECT photo_id, reaction, COUNT(*) AS count
     FROM gallery_reactions
     WHERE photo_id IN (${placeholders})
     GROUP BY photo_id, reaction`,
  )
    .bind(...ids)
    .all<ReactionCountRow>();

  for (const row of rows.results ?? []) {
    const current = counts.get(row.photo_id) ?? emptyReactionCounts();
    const value = Number(row.count) || 0;
    current[row.reaction] = value;
    current.total += value;
    counts.set(row.photo_id, current);
  }

  return counts;
}

export async function reactionCountsForPhoto(env: GalleryEnv, photoId: string): Promise<ReactionCounts> {
  const counts = await reactionCountsForPhotos(env, [photoId]);
  return counts.get(photoId) ?? emptyReactionCounts();
}
