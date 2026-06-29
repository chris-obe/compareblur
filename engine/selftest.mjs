// Quick sanity checks. Run: node engine/selftest.mjs
import { getFormat, cropToAspect, FULL_FRAME, cropFactor } from './formats.js';
import { matchSystem, fieldOfView, blurFraction, focusDistanceForFraming } from './optics.js';

const log = (...a) => console.log(...a);

// 1) Classic equivalence: MFT 25/1.4 should read as ~50/2.8 full-frame equivalent (diagonal).
const mft = { format: getFormat('mft'), focal: 25, aperture: 1.4 };
const toFF = matchSystem(mft, FULL_FRAME, { axis: 'd' });
log('\n[1] MFT 25mm f/1.4  ->  full frame equivalent (diagonal axis)');
log('    focal', toFF.target.focal, 'mm   aperture f/', toFF.target.aperture,
    '   crop factor', cropFactor(mft.format).toFixed(2));

// 2) XPan example from the brief: 90mm on XPan, matched horizontally to a FF crop.
const xpan = { format: getFormat('xpan'), focal: 90, aperture: 4 };
const ffPanoCrop = cropToAspect(FULL_FRAME, 65, 24); // crop a 45MP FF to the XPan shape
const match = matchSystem(xpan, ffPanoCrop, { axis: 'h' });
log('\n[2] XPan 90mm f/4  ->  full-frame body cropped to 24:65');
log('    crop keeps ~', ffPanoCrop.mpRetained, 'MP   (', ffPanoCrop.w, '×', ffPanoCrop.h, 'mm )');
log('    use', match.target.focal, 'mm at f/', match.target.aperture,
    '(nearest stop f/', match.target.apertureNearest, ')');
log('    XPan horizontal FOV', match.source.fov.h, '°   vs crop', match.target.fov.h, '°');

// 3) Prove the blur actually matches: blur % at a far background for both systems,
//    framing a 3 m wide subject.
const subj = 3;
const sX = focusDistanceForFraming(xpan.focal, xpan.format, subj, 'h');
const tgt = { format: ffPanoCrop, focal: match.target.focal, aperture: match.target.aperture };
const sT = focusDistanceForFraming(tgt.focal, tgt.format, subj, 'h');
log('\n[3] Background blur at 50 m (3 m subject) — should be ~equal:');
log('    XPan       ', (100 * blurFraction(xpan, sX, 50)).toFixed(2), '% of frame width');
log('    FF 24:65   ', (100 * blurFraction(tgt, sT, 50)).toFixed(2), '% of frame width');
