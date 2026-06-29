import { matchSystem, getFormat, type System } from './engine';
import { maxApertureAtFocal } from './gear';
import type { Kit, KitVerdict, OwnedLens } from './types';

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Can the user reproduce this look with owned gear? We pair each owned body with
 * each compatible owned lens (same mount, image circle covers the body format),
 * translate the source look onto that body, and check the lens reaches the
 * required focal length and opens wide enough for the blur.
 *
 * - covered  → some body+lens reaches the focal length AND the aperture
 * - partial  → a body+lens reaches the focal length but can't open wide enough
 * - missing  → nothing covers it (or no gear)
 */
export function evaluateKit(source: System, kit: Kit): { verdict: KitVerdict } {
  // candidate (body format, lens) pairs
  const pairs: { formatId: string; bodyName: string; lens: OwnedLens }[] = [];
  for (const cam of kit.cameras) {
    for (const lens of kit.lenses) {
      if (lens.mount === cam.mount && lens.coversFormatIds.includes(cam.formatId)) {
        pairs.push({ formatId: cam.formatId, bodyName: cam.name, lens });
      }
    }
  }
  // lenses with no matching body still count, on their native (largest) format
  if (kit.cameras.length === 0) {
    for (const lens of kit.lenses) {
      pairs.push({ formatId: lens.coversFormatIds[0] ?? 'ff', bodyName: 'your body', lens });
    }
  }

  if (pairs.length === 0) {
    return { verdict: { status: 'missing', note: 'Add a camera and lens to your kit to check this.' } };
  }

  let best: KitVerdict = { status: 'missing', note: '' };
  let bestRank = -1;
  let nearestReq = '';

  for (const { formatId, bodyName, lens } of pairs) {
    const m = matchSystem(source, getFormat(formatId), { axis: 'h' });
    const reqFocal = m.target.focal;
    const reqAp = m.target.aperture;
    nearestReq = `~${r1(reqFocal)}mm at ƒ/${r1(reqAp)}`;

    const focalOk = reqFocal >= lens.focalMin - 0.5 && reqFocal <= lens.focalMax + 0.5;
    if (!focalOk) continue;
    const lensMaxAp = maxApertureAtFocal(lens, reqFocal);
    const apOk = lensMaxAp <= reqAp * 1.05;

    if (apOk && bestRank < 2) {
      best = { status: 'covered', note: `Your ${lens.name} on the ${bodyName} covers ${nearestReq}.` };
      bestRank = 2;
    } else if (!apOk && bestRank < 1) {
      best = {
        status: 'partial',
        note: `Your ${lens.name} reaches ${r1(reqFocal)}mm but only opens to ƒ/${lensMaxAp} — short of ƒ/${r1(reqAp)}.`,
      };
      bestRank = 1;
    }
  }

  if (bestRank < 0) best = { status: 'missing', note: `Need ${nearestReq} — nothing in your kit reaches it.` };
  return { verdict: best };
}
