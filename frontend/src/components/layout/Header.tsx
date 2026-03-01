import { useLocation } from 'react-router-dom';
import { BellIcon, BellRingingIcon } from '@phosphor-icons/react';
import { useNotificationStore } from '@/stores/notificationStore';
import { useUiStore } from '@/stores/uiStore';
import { useCurrentUser } from '@/hooks/useAuth';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/notifications': 'Notifications',
  '/users': 'Utilisateurs',
  '/zones': 'Zones',
  '/rates': 'Taux de change',
  '/reports': 'Rapports',
  '/audit': 'Audit Logs',
  '/profile': 'Mon profil',
};

export function Header() {
  const location = useLocation();
  const { unreadCount } = useNotificationStore();
  const { wsConnected, wsReconnecting } = useUiStore();
  const user = useCurrentUser();

  const title = PAGE_TITLES[location.pathname] ?? 'TransferApp';

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6">
      <h1 className="text-xl font-bold text-navy">{title}</h1>

      <div className="flex items-center gap-4">
        {/* WS Status */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-success-light animate-pulse-dot' :
              wsReconnecting ? 'bg-warning-light animate-pulse' :
                'bg-danger-light'
            }`} />
          {!wsConnected && (
            <span className="text-xs text-muted hidden sm:block">
              {wsReconnecting ? 'Reconnexion...' : 'Hors ligne'}
            </span>
          )}
        </div>

        {/* Notification Bell */}
        <a href="/notifications" className="relative p-2 rounded-xl hover:bg-surface-alt transition-colors" aria-label="Notifications">
          {unreadCount > 0
            ? <BellRingingIcon size={20} weight="fill" className="text-brand" />
            : <BellIcon size={20} weight="regular" className="text-muted" />
          }
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </a>

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
          <div className="w-8 h-8 bg-brand-light rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-brand">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <span className="text-sm font-medium text-navy hidden sm:block">{user?.firstName}</span>
        </div>
      </div>
    </header>
  );
}
