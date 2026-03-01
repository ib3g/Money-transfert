import { NavLink } from 'react-router-dom';
import {
  HouseIcon, ArrowsLeftRightIcon, UsersIcon, GlobeIcon, ChartLineUpIcon,
  FilePdfIcon, ShieldCheckIcon, BellIcon, UserCircleIcon, SignOutIcon
} from '@phosphor-icons/react';
import { useCurrentUser } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useLogout } from '@/hooks/useAuth';
import { cn } from '@/utils/query';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const user = useCurrentUser();
  const { can } = usePermissions();
  const logout = useLogout();

  const mainNav: NavItem[] = [
    { label: 'Dashboard', to: '/dashboard', icon: <HouseIcon size={18} /> },
    { label: 'Transactions', to: '/transactions', icon: <ArrowsLeftRightIcon size={18} /> },
    { label: 'Notifications', to: '/notifications', icon: <BellIcon size={18} /> },
  ];

  const adminNav: NavItem[] = [
    can('MANAGE_USERS') && { label: 'Utilisateurs', to: '/users', icon: <UsersIcon size={18} /> },
    can('MANAGE_ZONES') && { label: 'Zones', to: '/zones', icon: <GlobeIcon size={18} /> },
    can('MANAGE_RATES') && { label: 'Taux de change', to: '/rates', icon: <ChartLineUpIcon size={18} /> },
    can('GENERATE_REPORTS') && { label: 'Rapports', to: '/reports', icon: <FilePdfIcon size={18} /> },
    can('VIEW_AUDIT_LOGS') && { label: 'Audit Logs', to: '/audit', icon: <ShieldCheckIcon size={18} /> },
  ].filter(Boolean) as NavItem[];

  return (
    <div className="flex flex-col h-full bg-gradient-navy">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center shadow-brand">
            <ArrowsLeftRightIcon size={16} weight="bold" className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">TransferApp</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNav.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}

        {adminNav.length > 0 && (
          <>
            <div className="pt-4 pb-1.5 px-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Administration
              </span>
            </div>
            {adminNav.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* User profile */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
          <div className="w-9 h-9 bg-brand/30 rounded-full flex items-center justify-center flex-shrink-0">
            <UserCircleIcon size={20} weight="fill" className="text-cyan-dim" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-400 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Déconnexion"
            className="p-1.5 text-slate-500 hover:text-danger-light hover:bg-white/5 rounded-lg transition-colors"
          >
            <SignOutIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarLink({ label, to, icon }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-navy-800 text-white border-l-2 border-cyan rounded-l-none pl-[10px]'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? 'text-cyan-dim' : ''}>{icon}</span>
          {label}
        </>
      )}
    </NavLink>
  );
}
