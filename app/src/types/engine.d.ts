// Ambient types for the shared JS optics engine (../../engine, aliased as @engine).
// The engine is plain ES modules with JSDoc; we declare a precise TS surface here
// so the app is fully typed across the JS boundary.
declare module '@engine' {
  export type Axis = 'h' | 'v' | 'd';

  export interface Format {
    id: string;
    name: string;
    w: number;
    h: number;
    mp?: number;
    family?: 'digital' | 'film' | 'pano' | 'crop' | string;
  }

  export interface System {
    format: Format;
    focal: number;
    aperture: number;
  }

  export interface Fov {
    h: number;
    v: number;
    d: number;
  }

  export interface MatchResult {
    axis: Axis;
    scale: number;
    target: {
      format: Format;
      focal: number;
      aperture: number;
      apertureNearest: number;
      fov: Fov;
    };
    source: {
      format: Format;
      focal: number;
      aperture: number;
      fov: Fov;
    };
    entrancePupilMm: number;
    fullFrameEquivalent: { focal: number; aperture: number };
  }

  export const FULL_FRAME: Format;
  export const FORMATS: Format[];

  export function getFormat(id: string): Format;
  export function diagonal(fmt: Format): number;
  export function cropFactor(fmt: Format): number;
  export function aspectRatio(fmt: Format): number;
  export function cropToAspect(
    base: Format,
    aspectW: number,
    aspectH: number,
  ): Format & { croppedFrom: string; mpRetained?: number };

  export function sensorDim(fmt: Format, axis?: Axis): number;
  export function fieldOfView(focal: number, fmt: Format): Fov;
  export function focalForFov(fovDeg: number, fmt: Format, axis?: Axis): number;
  export function entrancePupil(focal: number, aperture: number): number;
  export function focusDistanceForFraming(
    focal: number,
    fmt: Format,
    subjectWidthM: number,
    axis?: Axis,
  ): number;
  export function blurFraction(system: System, focusDistM: number, bgDistM: number): number;
  export function blurCurve(
    system: System,
    subjectWidthM: number,
    opts?: { axis?: Axis; minM?: number; maxM?: number; steps?: number },
  ): { distance: number; blurPct: number }[];
  export function matchSystem(
    source: System,
    targetFormat: Format,
    opts?: { axis?: Axis },
  ): MatchResult;
  export function nearestFStop(n: number): number;
}
