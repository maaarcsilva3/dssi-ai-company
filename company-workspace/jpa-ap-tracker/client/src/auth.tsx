import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type AuthUser, type PermissionKey } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  can: (key: PermissionKey) => boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await api.get<AuthUser>('/auth/me');
      } catch (e) {
        if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 401) {
          return null;
        }
        throw e;
      }
    },
    retry: false,
    staleTime: 30_000,
  });

  const loginMutation = useMutation({
    mutationFn: (body: { username: string; password: string }) => api.post<AuthUser>('/auth/login', body),
    onSuccess: (user) => {
      qc.setQueryData(['auth', 'me'], user);
      qc.invalidateQueries();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post<{ ok: boolean }>('/auth/logout'),
    onSuccess: () => {
      qc.setQueryData(['auth', 'me'], null);
      qc.clear();
    },
  });

  const value = useMemo<AuthContextValue>(() => {
    const user = me.data ?? null;
    return {
      user,
      loading: me.isLoading,
      isAdmin: user?.role === 'admin',
      can: (key) => Boolean(user && (user.role === 'admin' || user.permissions[key])),
      login: (username, password) => loginMutation.mutateAsync({ username, password }),
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
      refresh: () => me.refetch(),
    };
  }, [me.data, me.isLoading, me.refetch, loginMutation, logoutMutation]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
