import type { User, Permission } from '@/types';

export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  if (user.role === 'OWNER') return true;
  if (user.permissions.includes('FULL_ADMIN')) return true;
  return user.permissions.includes(permission);
}

export function canManageUsers(user: User | null): boolean {
  return hasPermission(user, 'MANAGE_USERS');
}

export function canManageZones(user: User | null): boolean {
  return hasPermission(user, 'MANAGE_ZONES');
}

export function canManageRates(user: User | null): boolean {
  return hasPermission(user, 'MANAGE_RATES');
}

export function canViewAllTransactions(user: User | null): boolean {
  return hasPermission(user, 'VIEW_ALL_TRANSACTIONS');
}

export function canCancelTransactions(user: User | null): boolean {
  return hasPermission(user, 'CANCEL_TRANSACTIONS');
}

export function canViewAuditLogs(user: User | null): boolean {
  return hasPermission(user, 'VIEW_AUDIT_LOGS');
}

export function canGenerateReports(user: User | null): boolean {
  return hasPermission(user, 'GENERATE_REPORTS');
}

export function isOwner(user: User | null): boolean {
  return user?.role === 'OWNER';
}

export function isAgent(user: User | null): boolean {
  return user?.role === 'AGENT';
}

export function isManager(user: User | null): boolean {
  return user?.role === 'MANAGER';
}

export function canCreateTransactions(user: User | null): boolean {
  return user?.role === 'AGENT' || user?.role === 'MANAGER';
}
