import { NavLink, useNavigate } from 'react-router-dom';
import {
  HouseIcon, ArrowsLeftRightIcon, PlusCircleIcon, BellIcon, BellRingingIcon, UserCircleIcon
} from '@phosphor-icons/react';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/utils/query';

export function BottomTabBar() {
  const { unreadCount } = useNotificationStore();
  const { canCreate } = usePermissions();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-[0_-1px_12px_rgba(5,11,43,0.08)] pb-safe"
      role="navigation"
      aria-label="Navigation principale"
    >
      <div className="flex items-end justify-around h-16 px-2">
        <TabItem to="/dashboard" icon={<HouseIcon />} label="Dashboard" />
        <TabItem to="/transactions" icon={<ArrowsLeftRightIcon />} label="Transferts" />

        {/* CTA central */}
        {canCreate && (
          <button
            onClick={() => navigate('/transactions/new')}
            className="flex flex-col items-center -mt-4"
            aria-label="Nouveau transfert"
          >
            <div className="w-14 h-14 bg-gradient-brand rounded-2xl flex items-center justify-center shadow-brand">
              <PlusCircleIcon size={28} weight="fill" className="text-white" />
            </div>
            <span className="text-[10px] text-muted-light mt-0.5 font-medium">Nouveau</span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative flex flex-col items-center">
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 px-3 py-2', isActive ? 'text-brand' : 'text-muted-light')
            }
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
          >
            {({ isActive }) => (
              <>
                {unreadCount > 0
                  ? <BellRingingIcon size={22} weight={isActive ? 'fill' : 'duotone'} />
                  : <BellIcon size={22} weight={isActive ? 'fill' : 'duotone'} />
                }
                <span className="text-[10px] font-medium">Notifs</span>
              </>
            )}
          </NavLink>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-danger text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        <TabItem to="/profile" icon={<UserCircleIcon />} label="Profil" />
      </div>
    </nav>
  );
}

function TabItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-0.5 px-3 py-2 transition-colors',
          isActive ? 'text-brand' : 'text-muted-light'
        )
      }
      aria-current={undefined}
    >
      {({ isActive }) => (
        <>
          {isActive
            ? <span className="[&>svg]:fill-current">{icon}</span>
            : icon
          }
          <span className="text-[10px] font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
}
