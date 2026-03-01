import { XIcon, CheckCircleIcon, XCircleIcon, WarningIcon, InfoIcon } from '@phosphor-icons/react';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/utils/query';

const TOAST_CONFIG = {
  success: { bg: 'bg-success', icon: <CheckCircleIcon size={16} weight="fill" /> },
  error: { bg: 'bg-danger', icon: <XCircleIcon size={16} weight="fill" /> },
  warning: { bg: 'bg-warning', icon: <WarningIcon size={16} weight="fill" /> },
  info: { bg: 'bg-brand', icon: <InfoIcon size={16} weight="fill" /> },
};

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const { bg, icon } = TOAST_CONFIG[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-xl text-white shadow-lg min-w-64 max-w-sm',
              'animate-slide-up pointer-events-auto',
              bg
            )}
            role="alert"
            aria-live="polite"
          >
            <span className="mt-0.5 flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.message && <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Fermer"
            >
              <XIcon size={14} weight="bold" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
