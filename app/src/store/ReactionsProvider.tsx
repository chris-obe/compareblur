import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Ascending sentiment. This is the durable taste signal the Suggestions screen
// will later read ("you love images like this, but your kit can't make them").
export type Reaction = 'dislike' | 'like' | 'love';

interface ReactionsValue {
  reactions: Record<string, Reaction>;
  get: (photoId: string) => Reaction | undefined;
  /** set a reaction, or pass null to clear it (toggling off) */
  set: (photoId: string, reaction: Reaction | null) => void;
}

const ReactionsContext = createContext<ReactionsValue | null>(null);
const STORAGE_KEY = 'hmb-reactions';

function load(): Record<string, Reaction> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, Reaction>;
  } catch {
    /* ignore */
  }
  return {};
}

export function ReactionsProvider({ children }: { children: ReactNode }) {
  const [reactions, setReactions] = useState<Record<string, Reaction>>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reactions));
    } catch {
      /* ignore */
    }
  }, [reactions]);

  const get = useCallback((photoId: string) => reactions[photoId], [reactions]);

  const set = useCallback((photoId: string, reaction: Reaction | null) => {
    setReactions((prev) => {
      if (!reaction) {
        if (!(photoId in prev)) return prev;
        const next = { ...prev };
        delete next[photoId];
        return next;
      }
      if (prev[photoId] === reaction) return prev;
      return { ...prev, [photoId]: reaction };
    });
  }, []);

  return <ReactionsContext.Provider value={{ reactions, get, set }}>{children}</ReactionsContext.Provider>;
}

export function useReactions(): ReactionsValue {
  const ctx = useContext(ReactionsContext);
  if (!ctx) throw new Error('useReactions must be used within ReactionsProvider');
  return ctx;
}
