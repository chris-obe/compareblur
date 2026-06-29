import { json } from './gallery';

export interface GalleryTagRow {
  slug: string;
  label: string;
  archived: number;
  created_at: string;
  updated_at: string;
}

export interface GalleryTag {
  slug: string;
  label: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryTagEnv {
  GALLERY_DB: D1Database;
}

export function normalizeTagLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function tagSlug(value: string): string {
  return normalizeTagLabel(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function tagFromRow(row: GalleryTagRow): GalleryTag {
  return {
    slug: row.slug,
    label: row.label,
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findMissingGalleryTags(env: GalleryTagEnv, labels: string[]) {
  const normalized = [...new Set(labels.map(normalizeTagLabel).filter(Boolean))];
  if (normalized.length === 0) return [];

  const slugs = normalized.map(tagSlug);
  const placeholders = slugs.map(() => '?').join(', ');
  const rows = await env.GALLERY_DB.prepare(
    `SELECT slug FROM gallery_tags WHERE slug IN (${placeholders})`,
  )
    .bind(...slugs)
    .all<{ slug: string }>();
  const found = new Set((rows.results ?? []).map((row) => row.slug));
  return normalized.filter((label) => !found.has(tagSlug(label)));
}

export function tagError(error: unknown) {
  if (error instanceof Response) return error;
  if (error instanceof Error) {
    const status = typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;
    return json({ error: error.message }, { status });
  }
  return json({ error: 'Gallery tag request failed' }, { status: 500 });
}
