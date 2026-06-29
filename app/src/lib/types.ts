// App-level data shapes (engine optical types come from lib/engine.ts).
import type { Format } from './engine';
import type { ReactionCounts } from './reactions';

export type LensType = 'prime' | 'zoom';

// ---- Owned kit (bodies + lenses), grouped by mount in the UI ----

export interface OwnedCamera {
  id: string; // instance id
  catalogId: string; // source catalog camera id (for dedupe)
  name: string;
  maker: string;
  mount: string;
  formatId: string;
}

export interface OwnedLens {
  id: string; // instance id
  catalogId?: string; // source catalog lens id (dedupe); undefined when manual
  name: string;
  maker?: string;
  type: LensType;
  focalMin: number;
  focalMax: number; // == focalMin for primes
  apMax: number; // widest aperture (smaller number)
  apMin: number;
  aperturePoints?: { focal: number; maxAperture: number }[];
  mount: string;
  coversFormatIds: string[]; // sensor formats the image circle covers
  af?: boolean;
}

export interface Kit {
  cameras: OwnedCamera[];
  lenses: OwnedLens[];
}

export interface GalleryItem {
  id: string;
  title: string;
  author: string;
  src: string;
  formatId: string; // engine format id
  camera: string;
  lens: string;
  focal: number; // mm (actual on the format)
  aperture: number; // f-number
  tags: string[];
  reactionCounts?: ReactionCounts;
}

export interface ExtractedExif {
  focal?: number; // FocalLength (actual)
  focal35?: number; // FocalLengthIn35mmFormat
  aperture?: number; // FNumber
  make?: string;
  model?: string;
  lensModel?: string;
  width?: number;
  height?: number;
  /** true when we had to fall back to a guess rather than read it cleanly */
  guessedFormat: boolean;
  format: Format; // resolved capture format (may be synthesized from crop factor)
}

// A single viewable thing in the lightbox — built from either a gallery item or
// an uploaded image. `morph` controls whether it animates from a grid thumbnail.
export interface ViewEntry {
  id: string; // layoutId key = `photo-${id}`
  title: string;
  metaLine: string;
  src: string;
  format: Format;
  focal: number;
  aperture: number;
  guessed: boolean;
  morph: boolean;
}

export type KitVerdict =
  | { status: 'covered'; note: string }
  | { status: 'partial'; note: string }
  | { status: 'missing'; note: string };
