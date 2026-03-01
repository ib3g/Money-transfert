import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { connectSocket, setQueryClientRef } from '@/socket/socketClient';
import { notificationsApi } from '@/api/notifications.api';
import { Sidebar } from './Sidebar';
import { BottomTabBar } from './BottomTabBar';
import { Header } from './Header';
import { MobileHeader } from './MobileHeader';
import { ToastContainer } from '../ui/ToastContainer';
import { useMe } from '@/hooks/useAuth';

export function Layout() {
  const { isAuthenticated } = useAuthStore();
  const setUnreadCount = useNotificationStore(s => s.setUnreadCount);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setQueryClientRef(queryClient);
    connectSocket();

    // Fetch initial unread notifications count
    notificationsApi.unreadCount()
      .then(res => setUnreadCount(res.count))
      .catch(() => { /* ignore */ });
  }, [isAuthenticated, navigate, queryClient, setUnreadCount]);

  // Sync user data
  const { data: updatedUser } = useMe();
  const setUser = useAuthStore(s => s.setUser);

  useEffect(() => {
    if (updatedUser) {
      setUser(updatedUser);
    }
  }, [updatedUser, setUser]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Desktop header */}
        <div className="hidden lg:block sticky top-0 z-40">
          <Header />
        </div>

        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-40">
          <MobileHeader />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto w-full animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="lg:hidden">
        <BottomTabBar />
      </div>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}
