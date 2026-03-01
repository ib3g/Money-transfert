import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { connectSocket, setQueryClientRef } from '@/socket/socketClient';
import { Sidebar } from './Sidebar';
import { BottomTabBar } from './BottomTabBar';
import { Header } from './Header';
import { ToastContainer } from '../ui/ToastContainer';

export function Layout() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setQueryClientRef(queryClient);
    connectSocket();
  }, [isAuthenticated, navigate, queryClient]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Desktop Header */}
        <div className="hidden lg:block sticky top-0 z-40">
          <Header />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 max-w-7xl mx-auto w-full animate-fade-in">
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
