import { useLocation, NavLink } from 'react-router-dom';
import { BellIcon, BellRingingIcon } from '@phosphor-icons/react';
import { useNotificationStore } from '@/stores/notificationStore';
import { useUiStore } from '@/stores/uiStore';
import { useCurrentUser } from '@/hooks/useAuth';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/transactions':  'Transactions',
  '/notifications': 'Notifications',
  '/users':         'Utilisateurs',
  '/zones':         'Zones',
  '/rates':         'Taux de change',
  '/reports':       'Rapports',
  '/audit':         'Audit',
  '/profile':       'Mon profil',
};

export function MobileHeader() {
  const location  = useLocation();
  const { unreadCount } = useNotificationStore();
  const { wsConnected, wsReconnecting } = useUiStore();
  const user = useCurrentUser();

  const title = PAGE_TITLES[location.pathname] ?? 'TransferApp';

  return (
    <header className="h-14 bg-white border-b border-slate-100 shadow-sm flex items-center justify-between px-4">
      <h1 className="text-base font-bold text-navy truncate">{title}</h1>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* WS status dot */}
        <span
          className={`w-2 h-2 rounded-full ${
            wsConnected   ? 'bg-success animate-pulse-dot' :
            wsReconnecting? 'bg-warning animate-pulse'    :
                            'bg-danger'
          }`}
        />

        {/* Notifications bell */}
        <NavLink
          to="/notifications"
          className="relative p-1.5 rounded-xl hover:bg-surface-alt transition-colors"
          aria-label="Notifications"
        >
          {unreadCount > 0
            ? <BellRingingIcon size={20} weight="fill" className="text-brand" />
            : <BellIcon        size={20} weight="regular" className="text-muted" />
          }
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </NavLink>

        {/* Avatar → Profile */}
        <NavLink
          to="/profile"
          className="w-8 h-8 bg-brand-light rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-transparent hover:ring-brand/30 transition-all"
          aria-label="Mon profil"
        >
          <span className="text-xs font-bold text-brand leading-none">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </NavLink>
      </div>
    </header>
  );
}
