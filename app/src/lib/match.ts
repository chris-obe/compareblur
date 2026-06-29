import {
  getFormat,
  matchSystem,
  fieldOfView,
  blurFraction,
  focusDistanceForFraming,
  type Format,
  type System,
} from './engine';
import { evaluateKit } from './kit';
import type { Kit } from './types';

// One place that turns a (format, focal, aperture) + kit into everything the
// UI shows: full-frame equivalent, field of view, a background-blur figure, and
// the kit verdict. Used by the lightbox info panel.
export function computeMatch(format: Format, focal: number, aperture: number, kit: Kit) {
  const source: System = { format, focal, aperture };
  const ff = matchSystem(source, getFormat('ff'), { axis: 'h' });
  const fov = fieldOfView(focal, source.format);
  const s = focusDistanceForFraming(focal, source.format, 2, 'h');
  const blurFar = blurFraction(source, s, 50) * 100; // % of frame width at 50 m
  const kitEval = evaluateKit(source, kit);
  return { source, ff, fov, blurFar, kitEval };
}

export type MatchComputed = ReturnType<typeof computeMatch>;
