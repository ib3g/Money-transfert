import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useAuth';
import { hasPermission } from '@/utils/permissions';
import type { Permission } from '@/types';

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ permission, children, fallback }: PermissionGuardProps) {
  const user = useCurrentUser();

  if (!hasPermission(user, permission)) {
    return fallback ? <>{fallback}</> : <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
