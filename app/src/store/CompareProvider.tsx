import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Format } from '../lib/engine';

// One line on the compare chart. `context` is the stable descriptor (camera,
// format, source); focal/aperture are editable, so the display label is derived.
export interface CompareSystem {
  id: string;
  context: string;
  format: Format;
  focal: number;
  aperture: number;
}

export function systemLabel(s: CompareSystem): string {
  const ap = Math.round(s.aperture * 10) / 10;
  return `${Math.round(s.focal)}mm ƒ/${ap} · ${s.context}`;
}

interface CompareContextValue {
  systems: CompareSystem[];
  add: (sys: CompareSystem) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<CompareSystem>) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

let seq = 0;
export const nextSystemId = () => `sys-${++seq}`;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [systems, setSystems] = useState<CompareSystem[]>([]);

  const add = useCallback((sys: CompareSystem) => {
    setSystems((prev) => (prev.length >= 4 ? prev : [...prev, sys]));
  }, []);
  const remove = useCallback((id: string) => {
    setSystems((prev) => prev.filter((s) => s.id !== id));
  }, []);
  const update = useCallback((id: string, patch: Partial<CompareSystem>) => {
    setSystems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);
  const clear = useCallback(() => setSystems([]), []);

  return (
    <CompareContext.Provider value={{ systems, add, remove, update, clear }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}
