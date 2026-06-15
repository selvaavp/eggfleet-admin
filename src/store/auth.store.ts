import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types';

interface AuthState {
  token: string | null;
  /** Used to obtain new access tokens without re-login (`POST /auth/refresh`). */
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, user: AuthUser, refreshToken?: string | null) => void;
  /** After silent refresh — updates bearer token only. */
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
}

const TOKEN_KEY = 'eggfleet_admin_token';
const REFRESH_KEY = 'eggfleet_admin_refresh';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (accessToken, user, rt = null) => {
        localStorage.setItem(TOKEN_KEY, accessToken);
        if (rt) localStorage.setItem(REFRESH_KEY, rt);
        else localStorage.removeItem(REFRESH_KEY);
        set({
          token: accessToken,
          refreshToken: rt,
          user,
          isAuthenticated: true,
        });
      },
      setAccessToken: (accessToken) => {
        localStorage.setItem(TOKEN_KEY, accessToken);
        set({ token: accessToken });
      },
      clearAuth: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'eggfleet_admin_auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
