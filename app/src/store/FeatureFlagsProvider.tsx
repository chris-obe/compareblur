import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_DEFINITIONS,
  getPublicFeatureFlags,
  type FeatureFlagKey,
  type FeatureFlagMap,
} from '../lib/featureFlags';

interface FeatureFlagsContextValue {
  flags: FeatureFlagMap;
  loading: boolean;
  error: string | null;
  isEnabled: (flag: FeatureFlagKey) => boolean;
  refresh: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlagMap>(DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFlags(await getPublicFeatureFlags());
    } catch (err) {
      setFlags(DEFAULT_FEATURE_FLAGS);
      setError(err instanceof Error ? err.message : 'Feature flags unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      flags,
      loading,
      error,
      isEnabled: (flag) => flags[flag] !== false,
      refresh,
    }),
    [error, flags, loading, refresh],
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext);
  if (!context) throw new Error('useFeatureFlags must be used inside FeatureFlagsProvider');
  return context;
}

export function FeatureFlagGate({ flag, children }: { flag: FeatureFlagKey; children: ReactNode }) {
  const { isEnabled } = useFeatureFlags();

  if (!isEnabled(flag)) {
    const definition = FEATURE_FLAG_DEFINITIONS.find((item) => item.key === flag);
    return (
      <div className="flex min-h-full items-center justify-center px-6 py-12">
        <div className="w-full max-w-md border border-line p-5">
          <div className="label mb-3">Temporarily unavailable</div>
          <h2 className="text-lg font-bold tracking-tight">{definition?.label ?? 'This screen'} is disabled</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            This screen has been turned off by an admin. Try again later or use another available section.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
