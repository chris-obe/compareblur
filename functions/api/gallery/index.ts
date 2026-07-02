import {
  encodeCursor,
  json,
  pageParamsFromUrl,
  photoFromRow,
  type GalleryEnv,
  type GalleryRow,
} from '../../_lib/gallery';
import { reactionCountsForPhotos } from '../../_lib/reactions';

export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env, request }) => {
  const { limit, cursor } = pageParamsFromUrl(new URL(request.url));

  // Keyset on the display order; fetch one extra row to detect a next page.
  const binds: (string | number)[] = [];
  let where = `gallery_status = 'approved'`;
  if (cursor && cursor.length === 3) {
    where += ` AND (COALESCE(published_at, updated_at), created_at, id) < (?, ?, ?)`;
    binds.push(...cursor);
  }
  binds.push(limit + 1);

  const rows = await env.GALLERY_DB.prepare(
    `SELECT * FROM gallery_photos
     WHERE ${where}
     ORDER BY COALESCE(published_at, updated_at) DESC, created_at DESC, id DESC
     LIMIT ?`,
  )
    .bind(...binds)
    .all<GalleryRow>();

  const results = rows.results ?? [];
  const hasMore = results.length > limit;
  const photos = hasMore ? results.slice(0, limit) : results;
  const last = photos[photos.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor([last.published_at ?? last.updated_at, last.created_at, last.id])
    : null;

  const counts = await reactionCountsForPhotos(env, photos.map((row) => row.id));

  return json({
    photos: photos.map((row) => photoFromRow(row, false, counts.get(row.id))),
    nextCursor,
  });
};
