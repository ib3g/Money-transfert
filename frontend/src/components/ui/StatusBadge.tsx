import type { TransactionStatus } from '@/types';
import { cn } from '@/utils/query';

const STATUS_CONFIG: Record<TransactionStatus, { bg: string; text: string; dot: string; label: string }> = {
  PENDING:   { bg: 'bg-warning-bg',  text: 'text-warning',  dot: 'bg-warning-light animate-pulse-dot', label: 'En attente' },
  COMPLETED: { bg: 'bg-success-bg',  text: 'text-success',  dot: 'bg-success-light',                  label: 'Complété' },
  CANCELLED: { bg: 'bg-danger-bg',   text: 'text-danger',   dot: 'bg-danger-light',                   label: 'Annulé' },
  EXPIRED:   { bg: 'bg-slate-100',   text: 'text-slate-500',dot: 'bg-slate-400',                      label: 'Expiré' },
};

export function StatusBadge({ status, size = 'sm' }: { status: TransactionStatus; size?: 'xs' | 'sm' }) {
  const { bg, text, dot, label } = STATUS_CONFIG[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-semibold',
      size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      bg, text
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
      {label}
    </span>
  );
}
