export const UI_TOOLTIPS = {
  compareFraming: 'Choose how much of the subject fills the frame. This sets the reproduction ratio for the comparison.',
  comparePositionMode: 'Match framing lets each system stand where it needs to. Fixed position uses one camera-to-subject distance for every system.',
  compareFixedDistance: 'Camera-to-subject distance used only in Fixed position mode.',
  compareStandSummary: 'In Match framing, each system moves closer or farther away until the subject takes up the same space in the frame.',
  compareBgAxisSummary: 'The graph moves the background from close behind the subject out to open distance. This is the x-axis.',
  compareChartReadout: 'Choose what appears when you hover across a background position on the graph.',
  compareReadoutFixed: 'Summary pins one ranked blur list in the corner while the cursor moves.',
  compareReadoutTracked: 'Follow line moves blur labels beside selected curves as the cursor moves.',
  compareChartLayers: 'Toggle optional chart context such as room-depth bands and standing-distance/FOV readouts.',
  compareDepthBands: 'Shows roughly where small rooms, larger rooms, streets, and open backgrounds sit on the distance axis.',
  compareFovStandLayer: 'Shows where each system has to stand for the selected framing, plus its horizontal field of view.',
  compareBackgroundPosition: 'The background distance being sampled. Move left for closer backgrounds, right for farther backgrounds.',
  compareLineStyle: 'Change the plotted line colour and dash pattern for this system.',
  compareExamples: 'Open matching public gallery examples for the compared looks.',
} as const;

export type TooltipKey = keyof typeof UI_TOOLTIPS;

export function tooltip(key: TooltipKey): string {
  return UI_TOOLTIPS[key];
}
