import {
  blurFraction,
  entrancePupil,
  fieldOfView,
  focalForFov,
  focusDistanceForFraming,
  getFormat,
  matchSystem,
  type Format,
  type System,
} from './engine';
import { maxApertureAtFocal, type AperturePoint } from './gear';

export type LookSource =
  | { type: 'kit'; cameraId?: string; lensId?: string; cameraCatalogId?: string; lensCatalogId?: string; mount?: string }
  | { type: 'catalog'; cameraId?: string; lensId?: string; mount?: string }
  | { type: 'gallery'; photoId: string }
  | { type: 'taste'; photoIds: string[] }
  | { type: 'manual' };

export interface ReferenceLook {
  id: string;
  label: string;
  detail?: string;
  format: Format;
  focal: number;
  aperture: number;
  subjectWidthM: number;
  focusDistanceM?: number | null;
  source: LookSource;
}

export interface LookCandidate {
  id: string;
  label: string;
  detail?: string;
  bodyName: string;
  lensName: string;
  format: Format;
  focalMin: number;
  focalMax: number;
  apMax: number;
  apMin: number;
  aperturePoints?: AperturePoint[];
  type: 'prime' | 'zoom';
  group: 'kit' | 'mount';
  source: Extract<LookSource, { type: 'kit' | 'catalog' }>;
}

export interface LookMetrics {
  fovDeg: number;
  blurPct: number;
  focusDistanceM: number;
  entrancePupilMm: number;
  ffEquivalentFocal: number;
  ffEquivalentAperture: number;
}

export interface LookMatchAxis {
  score: number;
  fovDeltaPct: number;
  blurDeltaStops: number;
  blurDeltaPctPoints: number;
  blurPct: number;
  focusDistanceM: number;
}

export type LookMatchVerdict = 'close' | 'usable' | 'different' | 'impossible';

export interface LookMatchResult {
  candidate: LookCandidate;
  score: number;
  verdict: LookMatchVerdict;
  note: string;
  recommendedFocal: number;
  recommendedAperture: number;
  requiredAperture: number;
  apertureShortfallStops: number;
  reference: LookMetrics;
  sameFraming: LookMatchAxis;
  samePosition: LookMatchAxis;
}

export interface LookMapPoint {
  id: string;
  label: string;
  detail?: string;
  fovDeg: number;
  blurPct: number;
  score?: number;
  group?: 'reference' | 'kit' | 'mount' | 'compare';
}

export const LOOK_BACKGROUND_DISTANCE_M = 50;

const SCORE_MAX = 100;

export function referenceFromSystem(
  system: System & { id?: string; context?: string; subjectWidthM?: number; focusDistanceM?: number | null; source?: LookSource },
): ReferenceLook {
  return {
    id: system.id ?? 'reference',
    label: system.context ?? `${round(system.focal, 0)}mm ƒ/${round(system.aperture, 1)}`,
    format: system.format,
    focal: system.focal,
    aperture: system.aperture,
    subjectWidthM: system.subjectWidthM ?? 2,
    focusDistanceM: system.focusDistanceM ?? null,
    source: system.source ?? { type: 'manual' },
  };
}

export function lookSystem(look: Pick<ReferenceLook, 'format' | 'focal' | 'aperture'>): System {
  return { format: look.format, focal: look.focal, aperture: look.aperture };
}

export function lookMetrics(look: Pick<ReferenceLook, 'format' | 'focal' | 'aperture' | 'subjectWidthM' | 'focusDistanceM'>): LookMetrics {
  const system = lookSystem(look);
  const focusDistanceM = look.focusDistanceM ?? focusDistanceForFraming(look.focal, look.format, look.subjectWidthM, 'h');
  const equivalent = matchSystem(system, getFormat('ff'), { axis: 'h' }).target;
  return {
    fovDeg: fieldOfView(look.focal, look.format).h,
    blurPct: blurPct(system, focusDistanceM),
    focusDistanceM,
    entrancePupilMm: entrancePupil(look.focal, look.aperture),
    ffEquivalentFocal: equivalent.focal,
    ffEquivalentAperture: equivalent.aperture,
  };
}

export function matchLook(reference: ReferenceLook, candidate: LookCandidate): LookMatchResult {
  const refSystem = lookSystem(reference);
  const refMetrics = lookMetrics(reference);
  const targetFocal = focalForFov(refMetrics.fovDeg, candidate.format, 'h');
  const recommendedFocal = clamp(targetFocal, candidate.focalMin, candidate.focalMax);
  const requiredAperture = recommendedFocal / refMetrics.entrancePupilMm;
  const widestAtFocal = maxApertureAtFocal(candidate, recommendedFocal);
  const recommendedAperture = clamp(requiredAperture, widestAtFocal, candidate.apMin);
  const candidateSystem: System = {
    format: candidate.format,
    focal: recommendedFocal,
    aperture: recommendedAperture,
  };
  const sameFramingFocusM = focusDistanceForFraming(recommendedFocal, candidate.format, reference.subjectWidthM, 'h');
  const samePositionFocusM = reference.focusDistanceM ?? refMetrics.focusDistanceM;
  const sameFraming = scoreAxis(refMetrics, candidateSystem, sameFramingFocusM);
  const samePosition = scoreAxis(refMetrics, candidateSystem, samePositionFocusM);
  const apertureShortfallStops = Math.max(0, stopsBetween(requiredAperture, recommendedAperture));
  const focalReachPenalty = Math.abs(recommendedFocal - targetFocal) / Math.max(1, targetFocal);
  const score = clampScore(sameFraming.score - Math.min(30, focalReachPenalty * 100) - Math.min(20, apertureShortfallStops * 8));
  const verdict = verdictForScore(score);

  return {
    candidate,
    score,
    verdict,
    note: matchNote(score, refSystem, candidate, recommendedFocal, recommendedAperture, apertureShortfallStops, samePosition),
    recommendedFocal: round(recommendedFocal, 1),
    recommendedAperture: round(recommendedAperture, 1),
    requiredAperture: round(requiredAperture, 2),
    apertureShortfallStops: round(apertureShortfallStops, 1),
    reference: refMetrics,
    sameFraming,
    samePosition,
  };
}

export function rankLookCandidates(reference: ReferenceLook, candidates: LookCandidate[], limit = 12): LookMatchResult[] {
  return candidates
    .map((candidate) => matchLook(reference, candidate))
    .sort((a, b) => b.score - a.score || a.candidate.label.localeCompare(b.candidate.label))
    .slice(0, limit);
}

export function referenceMapPoint(reference: ReferenceLook, label = 'Reference'): LookMapPoint {
  const metrics = lookMetrics(reference);
  return {
    id: reference.id,
    label,
    detail: reference.label,
    fovDeg: metrics.fovDeg,
    blurPct: metrics.blurPct,
    group: 'reference',
  };
}

export function matchMapPoint(result: LookMatchResult): LookMapPoint {
  return {
    id: result.candidate.id,
    label: result.candidate.lensName,
    detail: `${result.candidate.bodyName} · ${round(result.recommendedFocal, 0)}mm ƒ/${round(result.recommendedAperture, 1)}`,
    fovDeg: fieldOfView(result.recommendedFocal, result.candidate.format).h,
    blurPct: result.sameFraming.blurPct,
    score: result.score,
    group: result.candidate.group,
  };
}

export function systemMapPoint(
  system: System & { id: string; context: string; subjectWidthM?: number; focusDistanceM?: number | null },
): LookMapPoint {
  const metrics = lookMetrics({
    format: system.format,
    focal: system.focal,
    aperture: system.aperture,
    subjectWidthM: system.subjectWidthM ?? 2,
    focusDistanceM: system.focusDistanceM,
  });
  return {
    id: system.id,
    label: `${round(system.focal, 0)}mm ƒ/${round(system.aperture, 1)}`,
    detail: system.context,
    fovDeg: metrics.fovDeg,
    blurPct: metrics.blurPct,
    group: 'compare',
  };
}

export function summarizeCompareSpread(points: LookMapPoint[]): { fovSpreadPct: number; blurSpreadStops: number; warning?: string } {
  if (points.length < 2) return { fovSpreadPct: 0, blurSpreadStops: 0 };
  const fovs = points.map((point) => point.fovDeg).filter(Number.isFinite);
  const blurs = points.map((point) => point.blurPct).filter((value) => Number.isFinite(value) && value > 0);
  const minFov = Math.min(...fovs);
  const maxFov = Math.max(...fovs);
  const minBlur = Math.min(...blurs);
  const maxBlur = Math.max(...blurs);
  const fovSpreadPct = ((maxFov - minFov) / Math.max(1, minFov)) * 100;
  const blurSpreadStops = stopsBetween(minBlur, maxBlur);
  const warning = fovSpreadPct > 70
    ? 'These systems are framing very different pictures; blur alone is a weak comparison.'
    : blurSpreadStops > 1.5
      ? 'The blur gap is large even after normalising by frame width.'
      : undefined;
  return { fovSpreadPct: round(fovSpreadPct, 0), blurSpreadStops: round(blurSpreadStops, 1), warning };
}

function scoreAxis(reference: LookMetrics, candidate: System, focusDistanceM: number): LookMatchAxis {
  const fov = fieldOfView(candidate.focal, candidate.format).h;
  const candidateBlur = blurPct(candidate, focusDistanceM);
  const fovDeltaPct = Math.abs(fov - reference.fovDeg) / Math.max(1, reference.fovDeg);
  const blurDeltaStops = Math.abs(stopsBetween(reference.blurPct, candidateBlur));
  const blurDeltaPctPoints = candidateBlur - reference.blurPct;
  const fovPenalty = Math.min(65, fovDeltaPct * 130);
  const blurPenalty = Math.min(45, blurDeltaStops * 32);
  return {
    score: clampScore(SCORE_MAX - fovPenalty - blurPenalty),
    fovDeltaPct: round(fovDeltaPct * 100, 1),
    blurDeltaStops: round(blurDeltaStops, 1),
    blurDeltaPctPoints: round(blurDeltaPctPoints, 1),
    blurPct: round(candidateBlur, 1),
    focusDistanceM: round(focusDistanceM, 1),
  };
}

function blurPct(system: System, focusDistanceM: number): number {
  return 100 * blurFraction(system, focusDistanceM, LOOK_BACKGROUND_DISTANCE_M);
}

function matchNote(
  score: number,
  reference: System,
  candidate: LookCandidate,
  focal: number,
  aperture: number,
  apertureShortfallStops: number,
  samePosition: LookMatchAxis,
): string {
  const setting = `${round(focal, 0)}mm at ƒ/${round(aperture, 1)}`;
  if (score >= 85) return `${candidate.lensName} on ${candidate.bodyName} is a close practical match at ${setting}.`;
  if (score >= 65) {
    return apertureShortfallStops > 0.4
      ? `${setting} gets close, but the lens is about ${round(apertureShortfallStops, 1)} stops short of the blur.`
      : `${setting} is usable, though the framing/blur relationship is not identical.`;
  }
  if (score >= 40) {
    return `This gets part of the look, but at the same camera position the framing differs by ${samePosition.fovDeltaPct}%.`;
  }
  return `You will struggle to reproduce ${round(reference.focal, 0)}mm ƒ/${round(reference.aperture, 1)} on this setup.`;
}

function verdictForScore(score: number): LookMatchVerdict {
  if (score >= 85) return 'close';
  if (score >= 65) return 'usable';
  if (score >= 40) return 'different';
  return 'impossible';
}

function stopsBetween(a: number, b: number): number {
  return Math.log2(Math.max(0.0001, b) / Math.max(0.0001, a));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampScore(value: number): number {
  return Math.round(clamp(value, 0, SCORE_MAX));
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
