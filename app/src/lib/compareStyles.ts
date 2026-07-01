export interface CompareLineColor {
  id: string;
  label: string;
  stroke: string;
}

export interface CompareLineStyle {
  id: string;
  label: string;
  dash: string;
}

export const COMPARE_LINE_COLORS: CompareLineColor[] = [
  { id: 'mono', label: 'Mono', stroke: 'var(--fg)' },
  { id: 'blue', label: 'Blue', stroke: 'color-mix(in oklch, var(--fg) 68%, #4f7cff 32%)' },
  { id: 'green', label: 'Green', stroke: 'color-mix(in oklch, var(--fg) 68%, #20a36a 32%)' },
  { id: 'amber', label: 'Amber', stroke: 'color-mix(in oklch, var(--fg) 68%, #c08318 32%)' },
  { id: 'rose', label: 'Rose', stroke: 'color-mix(in oklch, var(--fg) 68%, #c95771 32%)' },
  { id: 'violet', label: 'Violet', stroke: 'color-mix(in oklch, var(--fg) 68%, #8067d8 32%)' },
  { id: 'teal', label: 'Teal', stroke: 'color-mix(in oklch, var(--fg) 68%, #1d9aa0 32%)' },
];

export const COMPARE_LINE_STYLES: CompareLineStyle[] = [
  { id: 'solid', label: 'Solid', dash: '0' },
  { id: 'dash', label: 'Dash', dash: '5,4' },
  { id: 'dot', label: 'Dot', dash: '1.5,4' },
  { id: 'long', label: 'Long', dash: '9,4' },
  { id: 'chain', label: 'Chain', dash: '9,4,1.5,4' },
];

export function compareLineColor(id: string | null | undefined, index = 0): CompareLineColor {
  if (id) {
    const found = COMPARE_LINE_COLORS.find((color) => color.id === id);
    if (found) return found;
  }
  return COMPARE_LINE_COLORS[index % COMPARE_LINE_COLORS.length];
}

export function compareLineStyle(id: string | null | undefined, index = 0): CompareLineStyle {
  if (id) {
    const found = COMPARE_LINE_STYLES.find((style) => style.id === id);
    if (found) return found;
  }
  return COMPARE_LINE_STYLES[index % COMPARE_LINE_STYLES.length];
}
