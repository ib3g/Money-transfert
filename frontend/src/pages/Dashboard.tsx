import { useState } from 'react';
import {
  ArrowsLeftRightIcon, CheckCircleIcon, ClockIcon, XCircleIcon, WarningIcon,
  ChartBarHorizontalIcon, TrendUpIcon, TrendDownIcon
} from '@phosphor-icons/react';
import { useStatsSummary, useStatsByCorridor } from '@/hooks/useStats';
import { usePermissions } from '@/hooks/usePermissions';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatAmount } from '@/utils/query';

type Period = 'today' | '7d' | '30d';

const PERIODS: { label: string; value: Period }[] = [
  { label: "Aujourd'hui", value: 'today' },
  { label: '7 jours', value: '7d' },
  { label: '30 jours', value: '30d' },
];

export default function Dashboard() {
  const { isOwner, can } = usePermissions();
  const [period, setPeriod] = useState<Period>('today');

  const { data: summary, isLoading: loadingSummary } = useStatsSummary({ period });
  const { data: corridors, isLoading: loadingCorridors } = useStatsByCorridor({ period });
  const showStats = isOwner || can('VIEW_ALL_TRANSACTIONS');

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>

        {showStats && (
          <div className="flex gap-1 bg-surface-alt rounded-xl p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p.value
                  ? 'bg-white text-brand shadow-card'
                  : 'text-muted hover:text-navy'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {showStats ? (
        <>
          {/* KPI Cards */}
          {loadingSummary ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <StatCard
                icon={<ArrowsLeftRightIcon size={18} weight="duotone" className="text-brand" />}
                iconBg="bg-brand-light"
                label="Total transactions"
                value={summary?.total ?? 0}
              />
              <StatCard
                icon={<ClockIcon size={18} weight="duotone" className="text-warning" />}
                iconBg="bg-warning-bg"
                label="En attente"
                value={summary?.pending ?? 0}
                highlight={summary?.pending ? 'warning' : undefined}
              />
              <StatCard
                icon={<CheckCircleIcon size={18} weight="fill" className="text-success" />}
                iconBg="bg-success-bg"
                label="Complétées"
                value={summary?.completed ?? 0}
                highlight="success"
              />
              <StatCard
                icon={<XCircleIcon size={18} weight="fill" className="text-danger" />}
                iconBg="bg-danger-bg"
                label="Annulées + expirées"
                value={(summary?.cancelled ?? 0) + (summary?.expired ?? 0)}
              />
            </div>
          )}

          {/* Corridors */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-semibold text-navy flex items-center gap-2">
                <ChartBarHorizontalIcon size={18} weight="duotone" className="text-brand" />
                Volumes par corridor
              </h2>
            </div>
            <div className="p-5">
              {loadingCorridors ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : corridors && corridors.length > 0 ? (
                <div className="space-y-3">
                  {(corridors as any[]).map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-navy">
                          {c.sourceZone?.name} → {c.destZone?.name}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {c.count} transaction{c.count > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold text-navy">
                          {c.totalSourceAmount
                            ? formatAmount(c.totalSourceAmount, c.sourceZone?.currency ?? '')
                            : '—'}
                        </p>
                        {c.avgRate && (
                          <p className="text-xs text-muted">Taux moy. {parseFloat(c.avgRate).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted text-center py-8">
                  Aucune transaction complétée pour cette période
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Agent view */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 text-center">
          <p className="text-sm text-muted">
            Bienvenue sur TransferApp. Utilisez le menu pour créer et gérer vos transferts.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon, iconBg, label, value, highlight
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  highlight?: 'success' | 'warning' | 'danger';
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-3.5 sm:p-5 hover:shadow-card-hover hover:-translate-y-px transition-all duration-200">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 ${iconBg} rounded-lg sm:rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl sm:text-3xl font-extrabold font-mono font-tabular ${highlight === 'success' ? 'text-success' :
        highlight === 'warning' ? 'text-warning' :
          highlight === 'danger' ? 'text-danger' :
            'text-navy'
        }`}>
        {value.toLocaleString('fr-FR')}
      </p>
      <p className="text-[10px] sm:text-xs text-muted mt-1.5 font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}
