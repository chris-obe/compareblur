// engine/optics.js
// The physics. Generalised from the original howmuchblur engine (js/main.js),
// which baked in a 36×24 sensor and a single diagonal "crop factor". Here every
// quantity is derived from explicit sensor dimensions + lens, so panoramic and
// arbitrary-crop formats work without special-casing.
//
// Conventions: focal lengths in mm, distances in metres, sensor dims in mm,
// angles in degrees. A "system" is { format, focal, aperture }.

import { diagonal } from './formats.js';

const DEG = 180 / Math.PI;

/** @typedef {{ format: import('./formats.js').Format, focal: number, aperture: number }} System */
/** Which sensor edge defines "the framing". For panoramas you almost always care about 'h' (horizontal sweep). */
/** @typedef {'h' | 'v' | 'd'} Axis */

export function sensorDim(fmt, axis = 'd') {
  if (axis === 'h') return fmt.w;
  if (axis === 'v') return fmt.h;
  return diagonal(fmt);
}

/**
 * Angle of view for a focal length on a sensor edge.
 * @returns {{ h: number, v: number, d: number }} degrees
 */
export function fieldOfView(focal, fmt) {
  const ang = (edge) => 2 * Math.atan(edge / (2 * focal)) * DEG;
  return { h: ang(fmt.w), v: ang(fmt.h), d: ang(diagonal(fmt)) };
}

/** Focal length needed on `fmt` to achieve a given angle of view (deg) along `axis`. */
export function focalForFov(fovDeg, fmt, axis = 'h') {
  const edge = sensorDim(fmt, axis);
  return edge / (2 * Math.tan(fovDeg / DEG / 2));
}

/** Entrance pupil diameter (mm) = the thing that actually governs blur. */
export function entrancePupil(focal, aperture) {
  return focal / aperture;
}

/**
 * Subject distance (m) when a real-world width `subjectWidthM` exactly fills the
 * frame's chosen axis. Thin-lens: object distance = f·(1 + 1/m), m = sensorEdge/subjectWidth.
 */
export function focusDistanceForFraming(focal, fmt, subjectWidthM, axis = 'h') {
  const edgeM = sensorDim(fmt, axis) / 1000;
  const m = edgeM / subjectWidthM; // magnification
  const fM = focal / 1000;
  return fM * (1 + 1 / m);
}

/**
 * Background blur disc diameter as a FRACTION of the frame's width — the core
 * "how much blur" metric. Background at `bgDistM`, focused at `focusDistM`.
 *
 * b_sensor = (f²/N) · |D−s| / (D·(s−f));  returned value is b_sensor / frameWidth.
 * As D→∞ this collapses to the elegant identity (f/N)/subjectWidth.
 */
export function blurFraction(system, focusDistM, bgDistM) {
  const fM = system.focal / 1000;
  const N = system.aperture;
  const s = focusDistM;
  const D = bgDistM;
  const Wm = system.format.w / 1000;
  if (D <= 0 || s <= fM) return 0;
  const bSensor = (fM * fM / N) * Math.abs(D - s) / (D * (s - fM));
  return bSensor / Wm; // fraction of frame width
}

/**
 * A blur curve: background blur (% of frame width) sampled across distance.
 * Mirrors the original graph's purpose but format-agnostic.
 * @returns {{ distance: number, blurPct: number }[]}
 */
export function blurCurve(system, subjectWidthM, { axis = 'h', minM = 0.5, maxM = 1000, steps = 220 } = {}) {
  const s = focusDistanceForFraming(system.focal, system.format, subjectWidthM, axis);
  const out = [];
  const logMin = Math.log10(Math.max(minM, s * 1.01));
  const logMax = Math.log10(maxM);
  for (let i = 0; i <= steps; i++) {
    const d = 10 ** (logMin + (logMax - logMin) * (i / steps));
    out.push({ distance: d, blurPct: 100 * blurFraction(system, s, d) });
  }
  return out;
}

/**
 * THE solver. Given a source system, find the focal length + aperture on a
 * target format that reproduces the SAME field of view (along `axis`) and the
 * SAME background blur.
 *
 * The equivalence law, generalised: pick the scale ratio r = targetEdge/sourceEdge
 * along the matched axis, then  focal·r  and  aperture·r  are preserved.
 *   - axis 'd'  → r = 1/cropFactor → the classic full-frame-equivalent numbers.
 *   - axis 'h'  → matches horizontal sweep → the correct choice for panoramas.
 *
 * @param {System} source
 * @param {import('./formats.js').Format} targetFormat
 * @param {{ axis?: Axis }} [opts]
 */
export function matchSystem(source, targetFormat, { axis = 'h' } = {}) {
  const r = sensorDim(targetFormat, axis) / sensorDim(source.format, axis);
  const focal = source.focal * r;
  const aperture = source.aperture * r;
  const target = { format: targetFormat, focal, aperture };

  return {
    axis,
    scale: r,
    target: {
      format: targetFormat,
      focal: round(focal, 1),
      aperture: round(aperture, 2),
      apertureNearest: nearestFStop(aperture),
      fov: roundObj(fieldOfView(focal, targetFormat), 1),
    },
    source: {
      format: source.format,
      focal: source.focal,
      aperture: source.aperture,
      fov: roundObj(fieldOfView(source.focal, source.format), 1),
    },
    // shared physical truths that prove the match:
    entrancePupilMm: round(entrancePupil(source.focal, source.aperture), 2),
    fullFrameEquivalent: {
      focal: round(source.focal * (sensorDim({ w: 36, h: 24 }, axis) / sensorDim(source.format, axis)), 1),
      aperture: round(source.aperture * (sensorDim({ w: 36, h: 24 }, axis) / sensorDim(source.format, axis)), 2),
    },
  };
}

/** Standard f-stop ladder (third-stops) for snapping a computed aperture to something a lens actually has. */
const FSTOPS = [
  1.0, 1.1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.5, 2.8, 3.2, 3.5, 4.0, 4.5, 5.0, 5.6,
  6.3, 7.1, 8.0, 9.0, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32,
];
export function nearestFStop(n) {
  return FSTOPS.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
}

function round(x, n) {
  const p = 10 ** n;
  return Math.round(x * p) / p;
}
function roundObj(o, n) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, round(v, n)]));
}
