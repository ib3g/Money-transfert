import { useCurrentUser } from './useAuth';
import { hasPermission, isOwner, canCreateTransactions } from '@/utils/permissions';
import type { Permission } from '@/types';

export function usePermissions() {
  const user = useCurrentUser();

  return {
    can: (permission: Permission) => hasPermission(user, permission),
    isOwner: isOwner(user),
    canCreate: canCreateTransactions(user),
    user,
  };
}
