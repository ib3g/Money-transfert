import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

interface UiState {
  toasts: Toast[];
  wsConnected: boolean;
  wsReconnecting: boolean;

  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setWsStatus: (connected: boolean, reconnecting?: boolean) => void;
}

let toastId = 0;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  wsConnected: false,
  wsReconnecting: false,

  addToast: (toast) => {
    const id = String(++toastId);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

    const duration = toast.type === 'error' ? 5000 : toast.type === 'success' ? 3000 : 4000;
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  setWsStatus: (connected, reconnecting = false) =>
    set({ wsConnected: connected, wsReconnecting: reconnecting }),
}));

// Convenience helper
export const toast = {
  success: (title: string, message?: string) =>
    useUiStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useUiStore.getState().addToast({ type: 'error', title, message }),
  warning: (title: string, message?: string) =>
    useUiStore.getState().addToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) =>
    useUiStore.getState().addToast({ type: 'info', title, message }),
};
