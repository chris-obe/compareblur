import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { COMPARE_LINE_COLORS, COMPARE_LINE_STYLES } from '../lib/compareStyles';
import type { Format } from '../lib/engine';
import { DEFAULT_SUBJECT_DISTANCE_PRESET_ID, subjectPresetById } from '../lib/subjectDistance';
import type { LookSource } from '../lib/lookMatching';

// One line on the compare chart. `context` is the stable descriptor (camera,
// format, source); focal/aperture are editable, so the display label is derived.
export interface CompareSystem {
  id: string;
  identifier?: string;
  context: string;
  format: Format;
  focal: number;
  aperture: number;
  subjectPreset?: string;
  subjectWidthM?: number;
  source?: LookSource;
  lineColor?: string;
  lineStyle?: string;
}

export function systemLabel(s: CompareSystem): string {
  const ap = Math.round(s.aperture * 10) / 10;
  return `${s.identifier ?? s.id} · ${Math.round(s.focal)}mm ƒ/${ap}`;
}

interface CompareContextValue {
  systems: CompareSystem[];
  add: (sys: CompareSystem) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<CompareSystem>) => void;
  clear: () => void;
  subjectWidthM: number;
  setSubjectWidthM: (width: number) => void;
  /** when set, every system focuses at this fixed distance instead of framing by subject width */
  focusOverrideM: number | null;
  setFocusOverrideM: (m: number | null) => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

let seq = 0;
export const nextSystemId = () => `sys-${++seq}`;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [systems, setSystems] = useState<CompareSystem[]>([]);
  const [subjectWidthM, setSubjectWidthMState] = useState(
    subjectPresetById(DEFAULT_SUBJECT_DISTANCE_PRESET_ID)?.widthM ?? 2,
  );
  const [focusOverrideM, setFocusOverrideM] = useState<number | null>(null);

  // Choosing a subject width is the framing mode, so it clears any manual focus override.
  const setSubjectWidthM = useCallback((width: number) => {
    setSubjectWidthMState(width);
    setFocusOverrideM(null);
  }, []);

  const add = useCallback((sys: CompareSystem) => {
    const presetWidth = subjectPresetById(sys.subjectPreset)?.widthM;
    if (sys.subjectWidthM) setSubjectWidthM(sys.subjectWidthM);
    else if (presetWidth) setSubjectWidthM(presetWidth);
    setSystems((prev) => {
      const index = prev.length;
      return [
        ...prev,
        {
          ...sys,
          identifier: sys.identifier ?? sys.id,
          lineColor: sys.lineColor ?? COMPARE_LINE_COLORS[index % COMPARE_LINE_COLORS.length].id,
          lineStyle: sys.lineStyle ?? COMPARE_LINE_STYLES[index % COMPARE_LINE_STYLES.length].id,
        },
      ];
    });
  }, [setSubjectWidthM]);
  const remove = useCallback((id: string) => {
    setSystems((prev) => prev.filter((s) => s.id !== id));
  }, []);
  const update = useCallback((id: string, patch: Partial<CompareSystem>) => {
    setSystems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);
  const clear = useCallback(() => setSystems([]), []);

  return (
    <CompareContext.Provider
      value={{ systems, add, remove, update, clear, subjectWidthM, setSubjectWidthM, focusOverrideM, setFocusOverrideM }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}
