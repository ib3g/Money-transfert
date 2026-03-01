import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force TOTP setup if not done
  if (user && !user.totpEnabled && location.pathname !== '/setup-2fa') {
    return <Navigate to="/setup-2fa" replace />;
  }

  return <>{children}</>;
}
