export type SubjectDistancePresetId = 'face' | 'half-body' | 'full-body' | 'group' | 'landscape';

export interface SubjectDistancePreset {
  id: SubjectDistancePresetId;
  label: string;
  widthM: number;
}

export const SUBJECT_DISTANCE_PRESETS: SubjectDistancePreset[] = [
  { id: 'face', label: 'Face', widthM: 0.5 },
  { id: 'half-body', label: 'Half body', widthM: 1 },
  { id: 'full-body', label: 'Full body', widthM: 2 },
  { id: 'group', label: 'Group', widthM: 4 },
  { id: 'landscape', label: 'Infinity / landscape', widthM: 100 },
];

export const DEFAULT_SUBJECT_DISTANCE_PRESET_ID: SubjectDistancePresetId = 'full-body';

export function subjectPresetById(id: string | null | undefined): SubjectDistancePreset | undefined {
  return SUBJECT_DISTANCE_PRESETS.find((preset) => preset.id === id);
}

export function subjectPresetForWidth(widthM: number): SubjectDistancePreset | undefined {
  return SUBJECT_DISTANCE_PRESETS.find((preset) => preset.widthM === widthM);
}

