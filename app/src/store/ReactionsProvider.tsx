import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { userTokenParams } from '../auth/config';
import {
  clearMyGalleryReaction,
  listMyGalleryReactions,
  setMyGalleryReaction,
} from '../lib/galleryApi';
import { emptyReactionCounts, type Reaction, type ReactionCounts } from '../lib/reactions';

interface ReactionsValue {
  reactions: Record<string, Reaction>;
  counts: Record<string, ReactionCounts>;
  get: (photoId: string) => Reaction | undefined;
  getCounts: (photoId: string) => ReactionCounts;
  registerCounts: (items: Array<{ id: string; reactionCounts?: ReactionCounts }>) => void;
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
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
  const [reactions, setReactions] = useState<Record<string, Reaction>>(load);
  const [counts, setCounts] = useState<Record<string, ReactionCounts>>({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reactions));
    } catch {
      /* ignore */
    }
  }, [reactions]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let cancelled = false;
    getAccessTokenSilently({ authorizationParams: userTokenParams })
      .then((token) => listMyGalleryReactions(token))
      .then((remote) => {
        if (!cancelled) setReactions((local) => ({ ...local, ...remote }));
      })
      .catch(() => {
        // Keep the local taste store usable if the account sync endpoint is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [getAccessTokenSilently, isAuthenticated, isLoading]);

  const get = useCallback((photoId: string) => reactions[photoId], [reactions]);
  const getCounts = useCallback((photoId: string) => counts[photoId] ?? emptyReactionCounts(), [counts]);

  const registerCounts = useCallback((items: Array<{ id: string; reactionCounts?: ReactionCounts }>) => {
    setCounts((current) => {
      let changed = false;
      const next = { ...current };
      for (const item of items) {
        if (!item.reactionCounts) continue;
        const existing = next[item.id];
        const incoming = item.reactionCounts;
        if (
          !existing ||
          existing.dislike !== incoming.dislike ||
          existing.like !== incoming.like ||
          existing.love !== incoming.love ||
          existing.total !== incoming.total
        ) {
          next[item.id] = incoming;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, []);

  const set = useCallback((photoId: string, reaction: Reaction | null) => {
    const previous = reactions[photoId];
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

    setCounts((current) => {
      const next = { ...(current[photoId] ?? emptyReactionCounts()) };
      if (previous) {
        next[previous] = Math.max(0, next[previous] - 1);
        next.total = Math.max(0, next.total - 1);
      }
      if (reaction) {
        next[reaction] += 1;
        next.total += 1;
      }
      return { ...current, [photoId]: next };
    });

    if (!isAuthenticated) return;

    getAccessTokenSilently({ authorizationParams: userTokenParams })
      .then((token) => reaction ? setMyGalleryReaction(photoId, reaction, token) : clearMyGalleryReaction(photoId, token))
      .then((result) => {
        setCounts((current) => ({ ...current, [photoId]: result.reactionCounts }));
      })
      .catch(() => {
        setReactions((prev) => {
          if (!previous) {
            const next = { ...prev };
            delete next[photoId];
            return next;
          }
          return { ...prev, [photoId]: previous };
        });
      });
  }, [getAccessTokenSilently, isAuthenticated, reactions]);

  return (
    <ReactionsContext.Provider value={{ reactions, counts, get, getCounts, registerCounts, set }}>
      {children}
    </ReactionsContext.Provider>
  );
}

export function useReactions(): ReactionsValue {
  const ctx = useContext(ReactionsContext);
  if (!ctx) throw new Error('useReactions must be used within ReactionsProvider');
  return ctx;
}
