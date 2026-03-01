import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth.api';
import { connectSocket, disconnectSocket } from '@/socket/socketClient';
import { toast } from '@/stores/uiStore';

export function useCurrentUser() {
  const { user } = useAuthStore();
  return user;
}

export function useLogin() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async ({ email, password, totpCode, tempToken }: {
      email?: string; password?: string; totpCode?: string; tempToken?: string;
    }) => {
      if (totpCode && tempToken) {
        return authApi.verifyTotp({ tempToken, totpCode });
      }
      return authApi.login({ email: email!, password: password! });
    },
    onSuccess: (data: any) => {
      if (data.requireTotp || data.requireTotpSetup) return data;

      if (data.accessToken && data.user) {
        setAuth(data.user, data.accessToken, data.refreshToken);
        connectSocket();

        if (!data.user.totpEnabled) {
          navigate('/setup-2fa');
        } else {
          navigate('/dashboard');
        }
      }
      return data;
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const { clearAuth, refreshToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    try {
      await authApi.logout(refreshToken ?? undefined);
    } catch { /* ignore */ }
    disconnectSocket();
    clearAuth();
    queryClient.clear();
    navigate('/login');
  }, [navigate, clearAuth, refreshToken, queryClient]);
}

export function useMe() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
