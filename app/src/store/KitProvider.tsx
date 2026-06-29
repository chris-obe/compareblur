import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Kit, OwnedCamera, OwnedLens } from '../lib/types';
import type { Camera, CatalogLens } from '../lib/gear';
import { newId } from '../lib/id';
import { KIT_SEED } from '../data/kit.seed';

interface KitContextValue {
  cameras: OwnedCamera[];
  lenses: OwnedLens[];
  addCamera: (cam: Camera) => void;
  removeCamera: (id: string) => void;
  /** add catalog lenses, scoped to a mount; dedupes by catalogId+mount */
  addCatalogLenses: (lenses: CatalogLens[], mount: string) => void;
  addManualLens: (lens: Omit<OwnedLens, 'id'>) => void;
  removeLens: (id: string) => void;
  clear: () => void;
}

const KitContext = createContext<KitContextValue | null>(null);
const STORAGE_KEY = 'hmb-kit-v2';

function loadKit(): Kit {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const k = JSON.parse(raw) as Kit;
      if (k && Array.isArray(k.cameras) && Array.isArray(k.lenses)) return k;
    }
  } catch {
    /* ignore */
  }
  return KIT_SEED;
}

export function ownedLensFromCatalog(l: CatalogLens, mount: string): OwnedLens {
  return {
    id: newId(),
    catalogId: l.id,
    name: `${l.maker} ${l.name}`,
    maker: l.maker,
    type: l.type,
    focalMin: l.focalMin,
    focalMax: l.focalMax,
    apMax: l.apMax,
    apMin: l.apMin,
    aperturePoints: l.aperturePoints,
    mount,
    coversFormatIds: l.coversFormatIds,
    af: l.af,
  };
}

export function KitProvider({ children }: { children: ReactNode }) {
  const [kit, setKit] = useState<Kit>(loadKit);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kit));
    } catch {
      /* ignore */
    }
  }, [kit]);

  const addCamera = useCallback((cam: Camera) => {
    setKit((k) => {
      if (k.cameras.some((c) => c.catalogId === cam.id)) return k; // already owned
      const owned: OwnedCamera = {
        id: newId(),
        catalogId: cam.id,
        name: cam.name,
        maker: cam.maker,
        mount: cam.mount,
        formatId: cam.formatId,
      };
      return { ...k, cameras: [...k.cameras, owned] };
    });
  }, []);

  const removeCamera = useCallback((id: string) => {
    setKit((k) => ({ ...k, cameras: k.cameras.filter((c) => c.id !== id) }));
  }, []);

  const addCatalogLenses = useCallback((lenses: CatalogLens[], mount: string) => {
    setKit((k) => {
      const owned = new Set(k.lenses.filter((l) => l.mount === mount).map((l) => l.catalogId));
      const fresh = lenses
        .filter((l) => !owned.has(l.id))
        .map((l) => ownedLensFromCatalog(l, mount));
      return fresh.length ? { ...k, lenses: [...k.lenses, ...fresh] } : k;
    });
  }, []);

  const addManualLens = useCallback((lens: Omit<OwnedLens, 'id'>) => {
    setKit((k) => ({ ...k, lenses: [...k.lenses, { ...lens, id: newId() }] }));
  }, []);

  const removeLens = useCallback((id: string) => {
    setKit((k) => ({ ...k, lenses: k.lenses.filter((l) => l.id !== id) }));
  }, []);

  const clear = useCallback(() => setKit({ cameras: [], lenses: [] }), []);

  return (
    <KitContext.Provider
      value={{
        cameras: kit.cameras,
        lenses: kit.lenses,
        addCamera,
        removeCamera,
        addCatalogLenses,
        addManualLens,
        removeLens,
        clear,
      }}
    >
      {children}
    </KitContext.Provider>
  );
}

export function useKit(): KitContextValue {
  const ctx = useContext(KitContext);
  if (!ctx) throw new Error('useKit must be used within KitProvider');
  return ctx;
}
