import { matchSystem, getFormat, type System } from './engine';
import type { Lens, KitVerdict } from './types';

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Can the user reproduce this look with gear they own? We translate the source
 * look onto a chosen target format (default full frame — the user's most likely
 * body), then test each owned lens for focal coverage + enough aperture speed.
 *
 * - covered  → a lens reaches the focal length AND opens wide enough for the blur
 * - partial  → a lens reaches the focal length but can't open wide enough
 * - missing  → nothing covers the focal length
 */
export function evaluateKit(
  source: System,
  kit: Lens[],
  targetFormatId = 'ff',
): { verdict: KitVerdict; requiredFocal: number; requiredAperture: number } {
  const target = getFormat(targetFormatId);
  const m = matchSystem(source, target, { axis: 'h' });
  const reqFocal = m.target.focal;
  const reqAp = m.target.aperture;

  let best: KitVerdict = {
    status: 'missing',
    note: `Need ~${r1(reqFocal)}mm at ƒ/${r1(reqAp)} on ${target.name} — nothing in your kit reaches it.`,
  };
  let bestRank = -1;

  for (const lens of kit) {
    const focalOk = reqFocal >= lens.focalMin - 0.5 && reqFocal <= lens.focalMax + 0.5;
    if (!focalOk) continue;
    const apOk = lens.apMax <= reqAp * 1.05;

    if (apOk && bestRank < 2) {
      best = {
        status: 'covered',
        lens,
        note: `Your ${lens.name} covers ~${r1(reqFocal)}mm at ƒ/${r1(reqAp)}.`,
      };
      bestRank = 2;
    } else if (!apOk && bestRank < 1) {
      best = {
        status: 'partial',
        lens,
        note: `Your ${lens.name} reaches ${r1(reqFocal)}mm but only opens to ƒ/${lens.apMax} — not enough blur for ƒ/${r1(reqAp)}.`,
      };
      bestRank = 1;
    }
  }

  return { verdict: best, requiredFocal: reqFocal, requiredAperture: reqAp };
}
