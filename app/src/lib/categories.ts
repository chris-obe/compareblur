import { FORMATS, type Format } from './engine';

// UI-facing format categories for the gallery filter. Maps engine format ids /
// families to the human buckets the user asked for. Easy to extend.
export type CategoryId = 'ff' | 'medium' | 'apsc' | 'mft' | 'pano';

export interface Category {
  id: CategoryId;
  label: string;
  formatIds: string[];
}

const MEMBERS: Record<CategoryId, string[]> = {
  ff: ['ff', 'film-135'],
  medium: ['gfx', 'phase-iq4', 'film-645', 'film-66', 'film-67', 'film-45'],
  apsc: ['apsc', 'apsc-canon'],
  mft: ['mft'],
  pano: ['xpan', 'film-617', 'film-612'],
};

export const CATEGORIES: Category[] = [
  { id: 'ff', label: 'Full Frame', formatIds: MEMBERS.ff },
  { id: 'medium', label: 'Medium Format', formatIds: MEMBERS.medium },
  { id: 'apsc', label: 'APS-C', formatIds: MEMBERS.apsc },
  { id: 'mft', label: 'MFT', formatIds: MEMBERS.mft },
  { id: 'pano', label: 'Panorama', formatIds: MEMBERS.pano },
];

const FORMAT_TO_CATEGORY = new Map<string, CategoryId>();
for (const cat of CATEGORIES) {
  for (const fid of cat.formatIds) FORMAT_TO_CATEGORY.set(fid, cat.id);
}

export function categoryForFormat(formatId: string): CategoryId | undefined {
  return FORMAT_TO_CATEGORY.get(formatId);
}

export function formatLabel(formatId: string): string {
  const f: Format | undefined = FORMATS.find((x) => x.id === formatId);
  return f?.name ?? formatId;
}
