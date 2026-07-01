import { loadFeatureFlags, publicFlags } from '../_lib/featureFlags';
import { json, type GalleryEnv } from '../_lib/gallery';

export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env }) => {
  const flags = await loadFeatureFlags(env);
  return json({ flags: publicFlags(flags) });
};
