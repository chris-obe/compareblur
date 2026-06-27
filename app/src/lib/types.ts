// App-level data shapes (engine optical types come from lib/engine.ts).
import type { Format } from './engine';

export type LensType = 'prime' | 'zoom';

export interface Lens {
  id: string;
  name: string;
  type: LensType;
  focalMin: number; // mm (== focalMax for primes)
  focalMax: number;
  apMax: number; // widest aperture, e.g. 1.8 (smaller number)
  apMin: number; // narrowest aperture, e.g. 22
  mount?: string;
  formatId?: string; // native format the lens is designed for
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
  | { status: 'covered'; lens: Lens; note: string }
  | { status: 'partial'; lens: Lens; note: string }
  | { status: 'missing'; note: string };
