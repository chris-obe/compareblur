export const UI_TOOLTIPS = {
  compareFraming: 'Choose how much of the subject fills the frame. This sets the reproduction ratio for the comparison.',
  comparePositionMode: 'Match framing lets each system stand where it needs to. Fixed position uses one camera-to-subject distance for every system.',
  compareFixedDistance: 'Camera-to-subject distance used only in Fixed position mode.',
  compareChartReadout: 'Choose how hover values are shown: one fixed list, or labels that follow selected lines.',
  compareChartLayers: 'Toggle optional chart context such as room-depth bands and standing-distance/FOV readouts.',
  compareExamples: 'Open matching public gallery examples for the compared looks.',
} as const;

export type TooltipKey = keyof typeof UI_TOOLTIPS;

export function tooltip(key: TooltipKey): string {
  return UI_TOOLTIPS[key];
}
