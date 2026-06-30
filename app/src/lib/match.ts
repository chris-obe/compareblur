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
// UI shows: selected-format equivalent, field of view, a background-blur figure,
// and the kit verdict. Used by the lightbox info panel.
export function computeMatch(
  format: Format,
  focal: number,
  aperture: number,
  kit: Kit,
  targetFormat = getFormat('ff'),
  subjectWidthM = 2,
) {
  const source: System = { format, focal, aperture };
  const equivalent = matchSystem(source, targetFormat, { axis: 'h' });
  const fov = fieldOfView(focal, source.format);
  const s = focusDistanceForFraming(focal, source.format, subjectWidthM, 'h');
  const blurFar = blurFraction(source, s, 50) * 100; // % of frame width at 50 m
  const kitEval = evaluateKit(source, kit);
  return { source, equivalent, ff: equivalent, fov, blurFar, kitEval };
}

export type MatchComputed = ReturnType<typeof computeMatch>;
