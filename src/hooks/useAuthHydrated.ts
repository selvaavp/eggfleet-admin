import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

/**
 * Zustand `persist` rehydrates from localStorage asynchronously. Until then,
 * `isAuthenticated` is still the default `false` and route guards can wrongly
 * send users to `/login` even when a valid session exists — or the opposite race.
 * Wait for hydration before enforcing auth redirects.
 */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    typeof window !== 'undefined' ? useAuthStore.persist.hasHydrated() : false
  );

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  return hydrated;
}
