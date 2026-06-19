import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearAuthToken,
  getAuthToken,
  getProfile,
  loginWithGoogleIdToken,
  saveAuthToken,
  type AuthUser,
  type DietPrefs,
  type ProfilePayload,
} from './api';

interface AuthContextValue {
  user: AuthUser | null;
  prefs: DietPrefs | null;
  stats: ProfilePayload['stats'] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setLocalPrefs: (prefs: DietPrefs) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Bypass de auth para dev/E2E. Se lee en runtime (no como const de módulo) para
 * que sea testeable sin recargar el módulo; en el bundle de Expo el valor de
 * `EXPO_PUBLIC_AUTH_DEV_BYPASS` se inyecta en build, así que el comportamiento
 * en la app real no cambia.
 */
function devAuthBypass() {
  return process.env.EXPO_PUBLIC_AUTH_DEV_BYPASS === 'true';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [prefs, setPrefs] = useState<DietPrefs | null>(null);
  const [stats, setStats] = useState<ProfilePayload['stats'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyProfile = (profile: ProfilePayload) => {
    setUser(profile.user);
    setPrefs(profile.prefs);
    setStats(profile.stats);
  };

  const refreshProfile = useCallback(async () => {
    const profile = await getProfile();
    applyProfile(profile);
  }, []);

  useEffect(() => {
    let mounted = true;
    if (devAuthBypass()) {
      getProfile()
        .then((profile) => {
          if (mounted) applyProfile(profile);
        })
        .catch(() => {
          if (mounted) {
            setUser({
              id: 'e2e-test-user',
              email: 'e2e@nutrilens.local',
              name: 'Usuario local',
              image: null,
            });
            setPrefs({ vegano: false, celiaco: false, lactosa: false, avisos: true });
            setStats({ analizados: 0, riesgoAlto: 0, sinAlergenos: 0 });
          }
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });

      return () => {
        mounted = false;
      };
    }

    getAuthToken()
      .then(async (token) => {
        if (!token) return;
        const profile = await getProfile();
        if (mounted) applyProfile(profile);
      })
      .catch(async () => {
        await clearAuthToken();
        if (mounted) {
          setUser(null);
          setPrefs(null);
          setStats(null);
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const signInWithGoogleIdToken = useCallback(
    async (idToken: string) => {
      const response = await loginWithGoogleIdToken(idToken);
      await saveAuthToken(response.token);
      await refreshProfile();
    },
    [refreshProfile],
  );

  const signOut = useCallback(async () => {
    await clearAuthToken();
    setUser(null);
    setPrefs(null);
    setStats(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      prefs,
      stats,
      isLoading,
      isAuthenticated: Boolean(user),
      signInWithGoogleIdToken,
      signOut,
      refreshProfile,
      setLocalPrefs: setPrefs,
    }),
    [user, prefs, stats, isLoading, signInWithGoogleIdToken, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
