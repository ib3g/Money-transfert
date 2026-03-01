import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  HouseIcon, ArrowsLeftRightIcon, PlusCircleIcon, BellIcon, BellRingingIcon,
  DotsThreeIcon, UserCircleIcon, UsersIcon, GlobeIcon, ChartLineUpIcon,
  FilePdfIcon, ShieldCheckIcon, XIcon,
} from '@phosphor-icons/react';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/utils/query';

export function BottomTabBar() {
  const { unreadCount } = useNotificationStore();
  const { canCreate, can } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close "More" sheet on route change
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const moreItems = [
    { label: 'Mon profil', to: '/profile', icon: <UserCircleIcon size={20} /> },
    can('MANAGE_USERS') && { label: 'Utilisateurs', to: '/users', icon: <UsersIcon size={20} /> },
    can('MANAGE_ZONES') && { label: 'Zones', to: '/zones', icon: <GlobeIcon size={20} /> },
    can('MANAGE_RATES') && { label: 'Taux de change', to: '/rates', icon: <ChartLineUpIcon size={20} /> },
    can('GENERATE_REPORTS') && { label: 'Rapports', to: '/reports', icon: <FilePdfIcon size={20} /> },
    can('VIEW_AUDIT_LOGS') && { label: 'Audit Logs', to: '/audit', icon: <ShieldCheckIcon size={20} /> },
  ].filter(Boolean) as { label: string; to: string; icon: React.ReactNode }[];

  const moreIsActive = moreItems.some((i) => i.to === location.pathname);

  return (
    <>
      {/* More sheet overlay */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-16 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-[0_-4px_24px_rgba(5,11,43,0.14)] px-4 pt-4 pb-4 pb-safe animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-light">Menu</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1 rounded-lg text-muted-light hover:text-muted hover:bg-surface-alt transition-colors"
                aria-label="Fermer"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {moreItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors',
                      isActive
                        ? 'bg-brand/10 text-brand'
                        : 'text-muted hover:bg-surface-alt hover:text-navy'
                    )}
                  >
                    <span className={isActive ? 'text-brand' : ''}>{item.icon}</span>
                    <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-[0_-1px_12px_rgba(5,11,43,0.08)] pb-safe"
        role="navigation"
        aria-label="Navigation principale"
      >
        <div className="flex items-end h-16 px-2 w-full">
          <TabItem to="/dashboard" icon={<HouseIcon />} label="Dashboard" />
          <TabItem to="/transactions" icon={<ArrowsLeftRightIcon />} label="Transferts" />

          {/* CTA central */}
          {canCreate && (
            <div className="flex-1 flex justify-center pb-1">
              <button
                onClick={() => navigate('/transactions/new')}
                className="flex flex-col items-center -mt-6"
                aria-label="Nouveau transfert"
              >
                <div className="w-14 h-14 bg-gradient-brand rounded-2xl flex items-center justify-center shadow-brand">
                  <PlusCircleIcon size={28} weight="fill" className="text-white" />
                </div>
                <span className="text-[10px] text-muted-light mt-1 font-medium">Nouveau</span>
              </button>
            </div>
          )}

          {/* Notifications */}
          <div className="flex-1 relative flex flex-col items-center justify-end pb-1.5">
            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5', isActive ? 'text-brand' : 'text-muted-light')
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
              <span className="absolute top-0 right-1/4 bg-danger text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 pointer-events-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>

          {/* More */}
          <div className="flex-1 flex flex-col items-center justify-end pb-1.5">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                'flex flex-col items-center gap-0.5 transition-colors',
                moreOpen || moreIsActive ? 'text-brand' : 'text-muted-light'
              )}
              aria-label="Plus de menus"
              aria-expanded={moreOpen}
            >
              <DotsThreeIcon size={22} weight={moreOpen || moreIsActive ? 'fill' : 'regular'} />
              <span className="text-[10px] font-medium">Plus</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}

function TabItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex-1 flex flex-col items-center justify-end gap-0.5 pb-1.5 transition-colors',
          isActive ? 'text-brand' : 'text-muted-light'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive
            ? <span className="[&>svg]:fill-current">{icon}</span>
            : <span className="[&>svg]:stroke-none">{icon}</span>
          }
          <span className="text-[10px] font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
}
