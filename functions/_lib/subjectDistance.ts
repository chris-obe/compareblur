export const SUBJECT_DISTANCE_PRESETS: Record<string, number> = {
  face: 0.5,
  'half-body': 1,
  'full-body': 2,
  group: 4,
  landscape: 100,
};

export function subjectPresetValue(value: unknown, fallback = ''): string {
  const preset = typeof value === 'string' ? value.trim() : fallback;
  return Object.prototype.hasOwnProperty.call(SUBJECT_DISTANCE_PRESETS, preset) ? preset : '';
}

export function subjectWidthForPreset(preset: string): number {
  return SUBJECT_DISTANCE_PRESETS[preset] ?? SUBJECT_DISTANCE_PRESETS['full-body'];
}

