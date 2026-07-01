import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { COMPARE_LINE_COLORS, COMPARE_LINE_STYLES } from '../lib/compareStyles';
import { cropFactor, type Format } from '../lib/engine';
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

function apertureLabel(aperture: number): string {
  return Number.isInteger(aperture) ? String(aperture) : String(Math.round(aperture * 10) / 10);
}

export function systemSourceLabel(s: CompareSystem): string {
  const [source] = s.context.split(' · ').map((part) => part.trim()).filter(Boolean);
  return source || s.identifier || s.format.name;
}

export function systemOpticsLabel(s: CompareSystem): string {
  return `${cropFactor(s.format).toFixed(1)}x · ${Math.round(s.focal)}mm ƒ/${apertureLabel(s.aperture)}`;
}

export function systemLabel(s: CompareSystem): string {
  return `${systemSourceLabel(s)} · ${systemOpticsLabel(s)}`;
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
