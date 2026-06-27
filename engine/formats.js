// engine/formats.js
// Sensor / film format database. All physical dimensions in millimetres.
// `w` = capture width, `h` = capture height (long edge is `w` by convention).
// `mp` is the typical/native resolution used for crop-resolution guidance (optional).
//
// A "format" is just a rectangle on the focal plane. Everything the engine does
// (field of view, blur, equivalence) is derived from that rectangle plus the
// lens, so adding an oddball (panoramic, large format, a phone) is one line here.

/** @typedef {{ id: string, name: string, w: number, h: number, mp?: number, family?: string }} Format */

/** Reference format the classic "crop factor" is measured against. */
export const FULL_FRAME = { id: 'ff', name: 'Full frame (35mm)', w: 36, h: 24, mp: 45, family: 'digital' };

/** @type {Format[]} */
export const FORMATS = [
  // --- Digital ---
  { id: 'mft',        name: 'Micro Four Thirds',     w: 17.3, h: 13,   mp: 25,  family: 'digital' },
  { id: 'apsc',       name: 'APS-C (Sony/Nikon/Fuji)', w: 23.5, h: 15.6, mp: 40,  family: 'digital' },
  { id: 'apsc-canon', name: 'APS-C (Canon)',         w: 22.3, h: 14.9, mp: 33,  family: 'digital' },
  FULL_FRAME,
  { id: 'gfx',        name: 'Fujifilm GFX (44×33)',  w: 44,   h: 33,   mp: 102, family: 'digital' },
  { id: 'phase-iq4',  name: 'Phase One IQ4 (53.4×40)', w: 53.4, h: 40,  mp: 151, family: 'digital' },

  // --- Film: standard ---
  { id: 'film-135',   name: '35mm film',             w: 36,   h: 24,   family: 'film' },
  { id: 'film-645',   name: '6×4.5 (645)',           w: 56,   h: 41.5, family: 'film' },
  { id: 'film-66',    name: '6×6',                   w: 56,   h: 56,   family: 'film' },
  { id: 'film-67',    name: '6×7',                   w: 70,   h: 56,   family: 'film' },
  { id: 'film-45',    name: '4×5 large format',      w: 121,  h: 97,   family: 'film' },

  // --- Panoramic oddballs (the interesting ones) ---
  { id: 'xpan',       name: 'Hasselblad XPan / Fuji TX (24×65)', w: 65,  h: 24, family: 'pano' },
  { id: 'film-617',   name: 'Fuji GX617 (6×17)',     w: 168,  h: 56,  family: 'pano' },
  { id: 'film-612',   name: '6×12',                  w: 112,  h: 56,  family: 'pano' },
];

const BY_ID = new Map(FORMATS.map((f) => [f.id, f]));

/** @returns {Format} */
export function getFormat(id) {
  const f = BY_ID.get(id);
  if (!f) throw new Error(`Unknown format: ${id}`);
  return f;
}

export function diagonal(fmt) {
  return Math.hypot(fmt.w, fmt.h);
}

/** Classic crop factor: diagonal of full frame ÷ diagonal of this format. */
export function cropFactor(fmt) {
  return diagonal(FULL_FRAME) / diagonal(fmt);
}

export function aspectRatio(fmt) {
  return fmt.w / fmt.h;
}

/**
 * Derive a new format by cropping a base sensor to a target aspect ratio
 * (the long edge of the crop is pinned to the base's long edge, exactly like
 * cropping in Lightroom). Returns the cropped rectangle plus the resolution
 * that survives the crop — this is what powers "crop your 45MP full frame to
 * the XPan shape and you keep ~25MP".
 *
 * @param {Format} base
 * @param {number} aspectW  aspect ratio width term  (e.g. 65)
 * @param {number} aspectH  aspect ratio height term (e.g. 24)
 * @returns {Format & { croppedFrom: string, mpRetained?: number }}
 */
export function cropToAspect(base, aspectW, aspectH) {
  const targetAR = aspectW / aspectH;
  let w = base.w;
  let h = base.h;
  if (targetAR >= base.w / base.h) {
    // wider than the sensor -> full width, trim height
    h = base.w / targetAR;
  } else {
    // taller than the sensor -> full height, trim width
    w = base.h * targetAR;
  }
  const areaRatio = (w * h) / (base.w * base.h);
  return {
    id: `${base.id}-crop-${aspectW}x${aspectH}`,
    name: `${base.name} cropped to ${aspectW}:${aspectH}`,
    w: round(w, 2),
    h: round(h, 2),
    croppedFrom: base.id,
    family: 'crop',
    mp: base.mp ? round(base.mp * areaRatio, 1) : undefined,
    mpRetained: base.mp ? round(base.mp * areaRatio, 1) : undefined,
  };
}

function round(x, n) {
  const p = 10 ** n;
  return Math.round(x * p) / p;
}
