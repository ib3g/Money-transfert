import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useQueryClient } from '@tanstack/react-query';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:8000';

let socket: Socket | null = null;
let queryClientRef: ReturnType<typeof useQueryClient> | null = null;

export function setQueryClientRef(qc: ReturnType<typeof useQueryClient>) {
  queryClientRef = qc;
}

export function connectSocket(): void {
  const token = useAuthStore.getState().accessToken;
  if (!token || socket?.connected) return;

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    useUiStore.getState().setWsStatus(true, false);
  });

  socket.on('disconnect', () => {
    useUiStore.getState().setWsStatus(false, false);
  });

  socket.on('connect_error', () => {
    useUiStore.getState().setWsStatus(false, true);
  });

  socket.io.on('reconnect_attempt', () => {
    useUiStore.getState().setWsStatus(false, true);
  });

  socket.io.on('reconnect', () => {
    useUiStore.getState().setWsStatus(true, false);
  });

  socket.on('notification', (notification) => {
    useNotificationStore.getState().addNotification(notification);
  });

  socket.on('transaction:updated', (update: { id: string; status: string }) => {
    queryClientRef?.invalidateQueries({ queryKey: ['transactions', update.id] });
    queryClientRef?.invalidateQueries({ queryKey: ['transactions'] });
    queryClientRef?.invalidateQueries({ queryKey: ['stats'] });
  });

  socket.on('rate:updated', () => {
    queryClientRef?.invalidateQueries({ queryKey: ['rates'] });
  });

  socket.on('session:expired', () => {
    useAuthStore.getState().clearAuth();
    disconnectSocket();
  });
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  useUiStore.getState().setWsStatus(false, false);
}

export function getSocket(): Socket | null {
  return socket;
}
