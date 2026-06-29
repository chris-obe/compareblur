import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { isDevAdminBypass } from './adminAccess';
import { adminTokenParams } from './config';
import { getAdminIdentity } from '../lib/adminApi';

export type AdminStatus = 'loading' | 'anonymous' | 'checking' | 'admin' | 'denied';

interface AdminAccessValue {
  status: AdminStatus;
  isAdmin: boolean;
  error: string | null;
}

const AdminAccessContext = createContext<AdminAccessValue | null>(null);

// Verifies admin access once (dev bypass, or a server identity check) and shares
// it: the sidebar uses it to show the Admin link, and the Admin page to gate.
export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
  const devBypass = isDevAdminBypass();
  const [status, setStatus] = useState<AdminStatus>(devBypass ? 'admin' : 'loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (devBypass) {
      setStatus('admin');
      return;
    }
    if (isLoading) {
      setStatus('loading');
      return;
    }
    if (!isAuthenticated) {
      setStatus('anonymous');
      return;
    }

    let cancelled = false;
    setStatus('checking');
    setError(null);
    getAccessTokenSilently({ authorizationParams: adminTokenParams })
      .then((token) => getAdminIdentity(token))
      .then(() => {
        if (!cancelled) setStatus('admin');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('denied');
        setError(err instanceof Error ? err.message : 'Admin authorization failed');
      });

    return () => {
      cancelled = true;
    };
  }, [devBypass, isAuthenticated, isLoading, getAccessTokenSilently]);

  return (
    <AdminAccessContext.Provider value={{ status, isAdmin: status === 'admin', error }}>
      {children}
    </AdminAccessContext.Provider>
  );
}

export function useAdminAccess(): AdminAccessValue {
  const ctx = useContext(AdminAccessContext);
  if (!ctx) throw new Error('useAdminAccess must be used within AdminAccessProvider');
  return ctx;
}
