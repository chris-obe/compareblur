// Single typed entry point to the shared optics engine. The rest of the app
// imports from here, never from '@engine' directly, so the JS boundary is isolated.
export {
  FULL_FRAME,
  FORMATS,
  getFormat,
  diagonal,
  cropFactor,
  aspectRatio,
  cropToAspect,
  sensorFormat,
  cropFactorFormat,
  sensorDim,
  fieldOfView,
  focalForFov,
  entrancePupil,
  focusDistanceForFraming,
  blurFraction,
  blurCurve,
  matchSystem,
  nearestFStop,
} from '@engine';

export type { Format, System, Axis, Fov, MatchResult } from '@engine';
