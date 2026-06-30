import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CAMERAS as BASE_CAMERAS, LENSES as BASE_LENSES } from '../data/gear.seed';
import type { Camera, CatalogLens } from '../lib/gear';

const DEFAULT_CATALOG_URL = 'https://compareblur-catalog-sync.christian-obe.workers.dev/catalog/latest';
const FALLBACK_CATALOG_URL = '/catalog.fallback.json';

interface CatalogExport {
  generatedAt?: string;
  runId?: string;
  cameras?: Camera[];
  lenses?: CatalogLens[];
  compact?: {
    cameras?: Camera[];
    lenses?: CatalogLens[];
  };
}

interface CatalogContextValue {
  cameras: Camera[];
  lenses: CatalogLens[];
  status: 'loading' | 'ready' | 'fallback' | 'error';
  source: string;
  generatedAt?: string;
  raw: CatalogExport | null;
  refresh: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function mergeById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const seen = new Set(base.map((item) => item.id));
  return [...base, ...extra.filter((item) => !seen.has(item.id))];
}

async function fetchCatalog(url: string): Promise<CatalogExport> {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  return res.json() as Promise<CatalogExport>;
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [remote, setRemote] = useState<CatalogExport | null>(null);
  const [status, setStatus] = useState<CatalogContextValue['status']>('loading');
  const [source, setSource] = useState('base');

  const load = async () => {
    const catalogUrl = import.meta.env.VITE_CATALOG_URL || DEFAULT_CATALOG_URL;
    setStatus((current) => (current === 'ready' || current === 'fallback' ? current : 'loading'));
    try {
      const next = await fetchCatalog(catalogUrl);
      setRemote(next);
      setSource(catalogUrl);
      setStatus('ready');
    } catch {
      try {
        const fallback = await fetchCatalog(FALLBACK_CATALOG_URL);
        setRemote(fallback);
        setSource(FALLBACK_CATALOG_URL);
        setStatus('fallback');
      } catch {
        setRemote(null);
        setSource('base');
        setStatus('error');
      }
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const value = useMemo<CatalogContextValue>(() => {
    const compact = remote?.compact;
    const cameras = remote?.cameras ?? mergeById(BASE_CAMERAS, compact?.cameras ?? []);
    const lenses = remote?.lenses ?? mergeById(BASE_LENSES, compact?.lenses ?? []);
    return {
      cameras,
      lenses,
      status,
      source,
      generatedAt: remote?.generatedAt,
      raw: remote,
      refresh: load,
    };
  }, [remote, status, source]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}
