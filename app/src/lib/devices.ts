// Last-resort device → sensor lookup, used ONLY when EXIF gives us no crop
// factor (no FocalLengthIn35mmFormat and no FocalPlaneResolution).
//
// Why so small? Modern phones report FocalLengthIn35mmFormat, which yields an
// exact, lens-aware crop factor with no table needed (see exif.ts). A static
// per-model table can't tell which of a phone's cameras took the shot, so it's
// a coarse fallback. For camera bodies, the right curated source is the
// open-source lensfun DB (maker/model/cropfactor); this stub can be regenerated
// from it (or GSMArena for phones) into a larger JSON later.

export interface DeviceSensor {
  /** physical sensor width × height in mm (main camera) */
  w: number;
  h: number;
  label: string;
}

/** EXIF `Make` values that indicate a phone (so we default to a tiny sensor, never MFT). */
const PHONE_MAKES = ['apple', 'samsung', 'google', 'xiaomi', 'oneplus', 'huawei', 'oppo', 'vivo'];

export function isPhoneMake(make?: string): boolean {
  if (!make) return false;
  const m = make.toLowerCase();
  return PHONE_MAKES.some((p) => m.includes(p));
}

// Keyed by a substring matched against `${make} ${model}` lowercased.
// Values are main-camera sensors — a reasonable default when the lens is unknown.
const TABLE: { match: string; sensor: DeviceSensor }[] = [
  // Apple — Pro main cameras moved to 1/1.28" from iPhone 14 Pro onward
  { match: 'iphone 16 pro', sensor: { w: 9.8, h: 7.35, label: 'iPhone Pro main (1/1.28″)' } },
  { match: 'iphone 15 pro', sensor: { w: 9.8, h: 7.35, label: 'iPhone Pro main (1/1.28″)' } },
  { match: 'iphone 14 pro', sensor: { w: 9.8, h: 7.35, label: 'iPhone Pro main (1/1.28″)' } },
  // Older / non-Pro main cameras ~1/1.7"–1/2.55"
  { match: 'iphone 13', sensor: { w: 7.6, h: 5.7, label: 'iPhone main (1/1.7″)' } },
  { match: 'iphone 12', sensor: { w: 5.6, h: 4.2, label: 'iPhone main (1/2.55″)' } },
  { match: 'iphone 11', sensor: { w: 5.6, h: 4.2, label: 'iPhone main (1/2.55″)' } },
  { match: 'iphone', sensor: { w: 5.6, h: 4.2, label: 'iPhone main (1/2.55″)' } }, // generic Apple fallback
  // Google Pixel main (1/1.31"–1/1.7")
  { match: 'pixel 8 pro', sensor: { w: 9.6, h: 7.2, label: 'Pixel Pro main (1/1.31″)' } },
  { match: 'pixel', sensor: { w: 7.4, h: 5.6, label: 'Pixel main (~1/1.7″)' } },
  // Samsung Galaxy S Ultra (very large / variable; coarse)
  { match: 'sm-s9', sensor: { w: 9.8, h: 7.35, label: 'Galaxy S Ultra main' } },
];

export function lookupDeviceSensor(make?: string, model?: string): DeviceSensor | undefined {
  const key = `${make ?? ''} ${model ?? ''}`.toLowerCase().trim();
  if (!key) return undefined;
  return TABLE.find((row) => key.includes(row.match))?.sensor;
}
