import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Lens } from '../lib/types';
import { KIT_SEED } from '../data/kit.seed';

interface KitContextValue {
  kit: Lens[];
  addLens: (lens: Lens) => void;
  removeLens: (id: string) => void;
}

const KitContext = createContext<KitContextValue | null>(null);
const STORAGE_KEY = 'hmb-kit';

function loadKit(): Lens[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Lens[];
  } catch {
    /* ignore */
  }
  return KIT_SEED;
}

export function KitProvider({ children }: { children: ReactNode }) {
  const [kit, setKit] = useState<Lens[]>(loadKit);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kit));
    } catch {
      /* ignore */
    }
  }, [kit]);

  const addLens = useCallback((lens: Lens) => setKit((k) => [...k, lens]), []);
  const removeLens = useCallback((id: string) => setKit((k) => k.filter((l) => l.id !== id)), []);

  return <KitContext.Provider value={{ kit, addLens, removeLens }}>{children}</KitContext.Provider>;
}

export function useKit(): KitContextValue {
  const ctx = useContext(KitContext);
  if (!ctx) throw new Error('useKit must be used within KitProvider');
  return ctx;
}
