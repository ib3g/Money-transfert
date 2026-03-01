import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon, CheckCircleIcon, ArrowsLeftRightIcon, UserCircleIcon,
  ChartLineUpIcon, XCircleIcon, ClockIcon, CheckIcon, CaretLeftIcon, CaretRightIcon,
} from '@phosphor-icons/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications.api';
import { useNotificationStore } from '@/stores/notificationStore';
import { toast } from '@/stores/uiStore';
import { BlankSlate } from '@/components/ui/BlankSlate';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import type { Notification, NotificationType } from '@/types';

// ── Type display config ────────────────────────────────────────────────────
const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  TRANSACTION_CONFIRMED: {
    icon: <CheckCircleIcon size={18} weight="fill" />,
    color: 'text-success bg-success/10',
  },
  TRANSACTION_CANCELLED: {
    icon: <XCircleIcon size={18} weight="fill" />,
    color: 'text-danger bg-danger/5',
  },
  TRANSACTION_EXPIRED: {
    icon: <ClockIcon size={18} weight="fill" />,
    color: 'text-muted bg-slate-100',
  },
  RATE_UPDATED: {
    icon: <ChartLineUpIcon size={18} weight="fill" />,
    color: 'text-brand bg-brand/10',
  },
  USER_CREATED: {
    icon: <UserCircleIcon size={18} weight="fill" />,
    color: 'text-purple-600 bg-purple-50',
  },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  if (h < 48) return 'hier';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// ── Notification item ──────────────────────────────────────────────────────
function NotifItem({ notif, onMarkRead }: { notif: Notification; onMarkRead: (id: string) => void }) {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[notif.type] ?? { icon: <BellIcon size={18} />, color: 'text-muted bg-slate-100' };
  const txCode = (notif.data as any)?.transactionCode as string | undefined;

  const handleClick = () => {
    if (!notif.isRead) onMarkRead(notif.id);
    if (txCode) navigate(`/transactions/confirm?code=${txCode}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-4 px-4 py-4 transition-all ${txCode ? 'cursor-pointer hover:bg-slate-50' : ''
        } ${!notif.isRead ? 'bg-brand/[0.02]' : ''}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold ${notif.isRead ? 'text-slate-600' : 'text-navy'}`}>
            {notif.title}
          </p>
          <span className="text-xs text-muted shrink-0">{timeAgo(notif.createdAt)}</span>
        </div>
        <p className="text-xs text-muted mt-0.5 line-clamp-2">{notif.message}</p>
        {txCode && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-brand font-mono font-semibold">
            <ArrowsLeftRightIcon size={11} /> {txCode}
          </span>
        )}
      </div>
      {!notif.isRead && (
        <div className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Notifications() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { markAsRead, markAllAsRead } = useNotificationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationsApi.list(page),
    staleTime: 30_000,
  });

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: (_, id) => {
      markAsRead(id);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      markAllAsRead();
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Tout marqué comme lu');
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });

  const notifications = data?.data ?? [];
  const pagination = data?.pagination;
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Notifications</h1>
          <p className="text-sm text-muted mt-0.5">
            {isLoading ? '…' : `${pagination?.total ?? 0} notification${(pagination?.total ?? 0) !== 1 ? 's' : ''}`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" onClick={() => markAll.mutate()} loading={markAll.isPending} className="gap-2 text-sm">
            <CheckIcon size={15} />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 px-4 py-4 border-b border-slate-50 last:border-0">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <BlankSlate
          icon={<BellIcon size={32} weight="duotone" />}
          title="Aucune notification"
          description="Les mises à jour sur vos transferts et votre compte apparaîtront ici en temps réel."
        />
      )}

      {!isLoading && notifications.length > 0 && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
            {notifications.map(notif => (
              <NotifItem key={notif.id} notif={notif} onMarkRead={(id) => markRead.mutate(id)} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-sm text-muted">Page {pagination.page} sur {pagination.totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <CaretLeftIcon size={14} />
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= pagination.totalPages}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <CaretRightIcon size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
