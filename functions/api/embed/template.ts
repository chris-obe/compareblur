import { type GalleryEnv } from '../../_lib/gallery';
import { getEmbedTemplate, publicJson } from '../../_lib/embed';

// Public read of the embed display template, so a non-admin album owner can size
// snippets. Returns display config only — nothing sensitive (already surfaced in
// every /api/embed/* response).
export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env }) => {
  return publicJson({ template: await getEmbedTemplate(env) });
};
