import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowsLeftRightIcon, CheckCircleIcon, ClockIcon, XCircleIcon,
  ChartBarHorizontalIcon, MagnifyingGlassIcon, PlusCircleIcon,
  ArrowRightIcon, ArrowsClockwiseIcon, SpinnerGapIcon, SwapIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { useStatsSummary, useStatsByCorridor } from '@/hooks/useStats';
import { useTransactions, useTransactionByCode } from '@/hooks/useTransactions';
import { useZones } from '@/hooks/useZones';
import { useCorridorRate, useForceRefreshRates } from '@/hooks/useRates';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentUser } from '@/hooks/useAuth';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/utils/query';
import type { Transaction } from '@/types';

type Period = 'today' | '7d' | '30d';
const PERIODS: { label: string; value: Period }[] = [
  { label: "Aujourd'hui", value: 'today' },
  { label: '7 jours', value: '7d' },
  { label: '30 jours', value: '30d' },
];

// Amount display — amounts in DB are raw units (not cents)
const fmt = (n: number, currency: string) =>
  `${n.toLocaleString('fr-FR')} ${currency}`;

function timeLeft(expiresAt?: string): { label: string; urgent: boolean } {
  if (!expiresAt) return { label: '—', urgent: false };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: 'Expiré', urgent: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const label = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
  return { label, urgent: h < 2 };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { isOwner, can, canCreate } = usePermissions();
  const user = useCurrentUser();
  const [period, setPeriod] = useState<Period>('today');

  const showStats = isOwner || can('VIEW_ALL_TRANSACTIONS');

  const pendingFilters = {
    status: 'PENDING' as const,
    ...(showStats ? {} : { agentId: user?.id }),
    limit: 8,
  };
  const { data: pendingData, isLoading: loadingPending } = useTransactions(pendingFilters);
  const pending = pendingData?.data ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-navy flex-1">Dashboard</h1>
        {showStats && (
          <div className="flex gap-1 bg-surface-alt rounded-xl p-1 self-start sm:self-auto">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  period === p.value ? 'bg-white text-brand shadow-card' : 'text-muted hover:text-navy'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Stats — owner / managers */}
      {showStats && <StatsSection period={{ period }} />}

      {/* Quick actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QuickCodeSearch canCreate={canCreate} userId={user?.id} />
        <RateSimulator />
      </div>

      {/* Pending transactions */}
      <PendingSection
        transactions={pending}
        loading={loadingPending}
        currentUserId={user?.id}
        showAll={showStats}
      />

      {/* Corridor breakdown — owner / managers */}
      {showStats && <CorridorSection period={{ period }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK CODE SEARCH
// ─────────────────────────────────────────────────────────────────────────────
function QuickCodeSearch({ canCreate, userId }: { canCreate: boolean; userId?: string }) {
  const [raw, setRaw] = useState('');
  const navigate = useNavigate();

  // Normalize: uppercase, auto-insert hyphen after TR
  const code = raw.toUpperCase().replace(/\s/g, '');

  const { data: tx, isLoading, isError } = useTransactionByCode(code);

  const handleInput = (v: string) => {
    // auto-format: insert dash after "TR" if user typed "TR" without it
    let val = v.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (val.length === 2 && val === 'TR') val = 'TR-';
    setRaw(val);
  };

  const goConfirm = () => navigate(`/transactions/confirm?code=${code}`);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-navy flex items-center gap-2">
          <MagnifyingGlassIcon size={18} weight="duotone" className="text-brand" />
          Recherche par code
        </h2>
        {canCreate && (
          <Link
            to="/transactions/new"
            className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-dark bg-brand-light hover:bg-brand/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <PlusCircleIcon size={14} weight="fill" />
            Nouveau transfert
          </Link>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={raw}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="TR-XXXXXXXX"
          maxLength={11}
          className="w-full font-mono text-sm bg-surface border border-slate-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder:text-muted-light uppercase tracking-wider"
          autoComplete="off"
          spellCheck={false}
        />
        {isLoading && (
          <SpinnerGapIcon
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand animate-spin"
          />
        )}
      </div>

      {/* Result */}
      {code.length >= 11 && (
        <div className="flex-1">
          {isLoading && (
            <div className="h-20 bg-surface rounded-xl animate-pulse" />
          )}
          {isError && !isLoading && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger-bg px-4 py-3 rounded-xl">
              <WarningCircleIcon size={16} weight="fill" />
              Aucune transaction trouvée pour ce code
            </div>
          )}
          {tx && !isLoading && (
            <div className="border border-slate-100 rounded-xl p-4 space-y-3 bg-surface">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs font-bold text-brand">{tx.code}</p>
                  <p className="text-sm font-semibold text-navy mt-0.5">{tx.recipientName}</p>
                </div>
                <StatusBadge status={tx.status} />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-navy">{fmt(tx.sourceAmount, tx.sourceCurrency)}</span>
                <ArrowRightIcon size={12} className="text-muted-light flex-shrink-0" />
                <span className="font-bold text-brand">{fmt(tx.destAmount, tx.destCurrency)}</span>
              </div>
              {tx.expiresAt && tx.status === 'PENDING' && (() => {
                const { label, urgent } = timeLeft(tx.expiresAt);
                return (
                  <p className={cn('text-xs font-medium flex items-center gap-1', urgent ? 'text-danger' : 'text-warning')}>
                    <ClockIcon size={12} weight="fill" />
                    Expire dans {label}
                  </p>
                );
              })()}
              {tx.status === 'PENDING' && tx.senderAgentId !== userId && (
                <button
                  onClick={goConfirm}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-brand text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-brand"
                >
                  <CheckCircleIcon size={16} weight="fill" />
                  Confirmer ce transfert
                </button>
              )}
              {tx.status === 'PENDING' && tx.senderAgentId === userId && (
                <div className="flex items-center gap-2 p-3 bg-warning/5 border border-warning/20 rounded-xl text-[11px] text-warning-dark">
                  <WarningCircleIcon size={14} weight="fill" />
                  Vous ne pouvez pas confirmer un transfert que vous avez émis.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {code.length < 11 && (
        <p className="text-xs text-muted-light text-center py-2">
          Entrez un code complet (ex: TR-ABC12345) pour le rechercher
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE SIMULATOR
// ─────────────────────────────────────────────────────────────────────────────
function RateSimulator() {
  const { data: zones } = useZones();
  const [srcId, setSrcId] = useState('');
  const [dstId, setDstId] = useState('');
  const [amount, setAmount] = useState(100);

  const activeZones = zones?.filter((z) => z.isActive) ?? [];
  const canQuery = !!srcId && !!dstId && srcId !== dstId;

  const { data: rate, isLoading: loadingRate } = useCorridorRate(srcId, dstId);
  const { mutate: forceRefresh, isPending: refreshing } = useForceRefreshRates();

  const appliedRate = rate ? parseFloat(rate.appliedRate) : null;
  const destAmount = appliedRate && amount > 0 ? amount * appliedRate : null;

  const srcZone = activeZones.find((z) => z.id === srcId);
  const dstZone = activeZones.find((z) => z.id === dstId);

  const swap = () => {
    setSrcId(dstId);
    setDstId(srcId);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 flex flex-col gap-4">
      <h2 className="text-base font-semibold text-navy flex items-center gap-2">
        <ArrowsLeftRightIcon size={18} weight="duotone" className="text-brand" />
        Simulateur de taux
      </h2>

      {/* Zone selects + swap */}
      <div className="flex items-center gap-2">
        <select
          value={srcId}
          onChange={(e) => setSrcId(e.target.value)}
          className="flex-1 text-sm bg-surface border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-navy"
        >
          <option value="">Source</option>
          {activeZones.map((z) => (
            <option key={z.id} value={z.id}>{z.name} ({z.currency})</option>
          ))}
        </select>

        <button
          onClick={swap}
          disabled={!srcId && !dstId}
          className="p-2 rounded-xl bg-surface hover:bg-surface-alt transition-colors text-muted hover:text-brand disabled:opacity-40"
          aria-label="Inverser"
        >
          <SwapIcon size={18} />
        </button>

        <select
          value={dstId}
          onChange={(e) => setDstId(e.target.value)}
          className="flex-1 text-sm bg-surface border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-navy"
        >
          <option value="">Destination</option>
          {activeZones.filter((z) => z.id !== srcId).map((z) => (
            <option key={z.id} value={z.id}>{z.name} ({z.currency})</option>
          ))}
        </select>
      </div>

      {/* Amount */}
      {canQuery && (
        <div className="relative">
          <input
            type="number"
            value={amount}
            min={1}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
            className="w-full text-sm bg-surface border border-slate-200 rounded-xl px-4 py-2.5 pr-16 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            placeholder="Montant"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-light">
            {srcZone?.currency ?? '—'}
          </span>
        </div>
      )}

      {/* Result */}
      <div className="flex-1">
        {!canQuery && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-light text-center">
            Sélectionnez deux zones pour voir le taux applicable
          </div>
        )}

        {canQuery && loadingRate && (
          <div className="h-20 bg-surface rounded-xl animate-pulse" />
        )}

        {canQuery && !loadingRate && rate && (
          <div className="bg-gradient-navy rounded-xl px-5 py-4 space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-slate-300 text-sm">{amount.toLocaleString('fr-FR')} {srcZone?.currency}</span>
              <ArrowRightIcon size={12} className="text-slate-500" />
              <span className="text-white text-2xl font-extrabold font-mono">
                {destAmount ? destAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—'}
              </span>
              <span className="text-slate-300 text-sm">{dstZone?.currency}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Taux : {parseFloat(rate.appliedRate).toLocaleString('fr-FR', { maximumFractionDigits: 6 })}
              </span>
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide',
                rate.appliedSource === 'MANUAL'
                  ? 'bg-warning-bg text-warning'
                  : 'bg-success-bg text-success'
              )}>
                {rate.appliedSource === 'MANUAL' ? 'Manuel ★' : 'Marché'}
              </span>
            </div>
            {rate.hasManualOverride && rate.marketRate && (
              <p className="text-[10px] text-slate-500">
                Taux marché: {parseFloat(rate.marketRate).toLocaleString('fr-FR', { maximumFractionDigits: 6 })} (taux manuel prioritaire)
              </p>
            )}
          </div>
        )}

        {canQuery && !loadingRate && !rate && (
          <div className="flex items-center justify-center h-16 text-xs text-muted bg-surface rounded-xl">
            Aucun taux disponible pour ce corridor
          </div>
        )}
      </div>

      {/* Refresh */}
      <button
        onClick={() => forceRefresh()}
        disabled={refreshing || !canQuery}
        className={cn(
          'flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl transition-colors',
          canQuery
            ? 'bg-surface-alt text-muted hover:bg-brand-light hover:text-brand'
            : 'bg-surface text-muted-light cursor-not-allowed'
        )}
      >
        <ArrowsClockwiseIcon size={14} className={refreshing ? 'animate-spin' : ''} />
        {refreshing ? 'Actualisation en cours…' : 'Actualiser les taux du marché'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PENDING TRANSACTIONS
// ─────────────────────────────────────────────────────────────────────────────
function PendingSection({
  transactions, loading, currentUserId, showAll,
}: {
  transactions: Transaction[];
  loading: boolean;
  currentUserId?: string;
  showAll: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-navy flex items-center gap-2">
          <ClockIcon size={18} weight="duotone" className="text-warning" />
          Transferts en attente
          {transactions.length > 0 && (
            <span className="bg-warning-bg text-warning text-xs font-bold px-2 py-0.5 rounded-full">
              {transactions.length}
            </span>
          )}
        </h2>
        <Link
          to="/transactions?status=PENDING"
          className="text-xs text-brand hover:text-brand-dark font-semibold flex items-center gap-1 transition-colors"
        >
          Voir tout <ArrowRightIcon size={12} />
        </Link>
      </div>

      <div className="p-4">
        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && transactions.length === 0 && (
          <div className="text-center py-8 text-sm text-muted">
            <CheckCircleIcon size={28} weight="duotone" className="text-success mx-auto mb-2" />
            Aucun transfert en attente
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <PendingRow key={tx.id} tx={tx} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PendingRow({ tx, currentUserId }: { tx: Transaction; currentUserId?: string }) {
  const navigate = useNavigate();
  const { label: expLabel, urgent } = timeLeft(tx.expiresAt);
  const isSender = tx.senderAgentId === currentUserId;
  const isReceiver = !tx.receiverAgentId || tx.receiverAgentId === currentUserId;
  const canConfirm = !isSender && isReceiver;
  const canCancel = isSender;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition-colors group">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-brand">{tx.code}</span>
          {tx.rateSource === 'MANUAL' && (
            <span className="text-[9px] font-bold bg-warning-bg text-warning px-1 py-0.5 rounded uppercase">Manuel</span>
          )}
        </div>
        <p className="text-sm font-medium text-navy truncate mt-0.5">{tx.recipientName}</p>
        <p className="text-xs text-muted mt-0.5">
          {fmt(tx.sourceAmount, tx.sourceCurrency)}
          <span className="text-muted-light mx-1">→</span>
          <span className="font-semibold text-brand">{fmt(tx.destAmount, tx.destCurrency)}</span>
        </p>
      </div>

      {/* Expiry */}
      <div className="text-right flex-shrink-0">
        <p className={cn('text-[11px] font-semibold flex items-center gap-1 justify-end', urgent ? 'text-danger' : 'text-warning')}>
          <ClockIcon size={11} weight="fill" />
          {expLabel}
        </p>
        <p className="text-[10px] text-muted-light mt-0.5">
          {tx.sourceZone?.name ?? '—'} → {tx.destZone?.name ?? '—'}
        </p>
      </div>

      {/* Action */}
      <div className="flex-shrink-0 flex gap-2">
        {canConfirm && (
          <button
            onClick={() => navigate(`/transactions/confirm?code=${tx.code}`)}
            className="bg-gradient-brand text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-brand whitespace-nowrap"
          >
            Confirmer
          </button>
        )}
        {canCancel && (
          <Link
            to={`/transactions?code=${tx.code}`}
            className="bg-danger/5 text-danger text-xs font-bold px-3 py-2 rounded-xl hover:bg-danger/10 transition-colors whitespace-nowrap"
          >
            Annuler
          </Link>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function StatsSection({ period }: { period: { period: Period } }) {
  const { data: summary, isLoading } = useStatsSummary(period);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        icon={<ArrowsLeftRightIcon size={18} weight="duotone" className="text-brand" />}
        iconBg="bg-brand-light"
        label="Total"
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
  );
}

function StatCard({ icon, iconBg, label, value, highlight }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  highlight?: 'success' | 'warning' | 'danger';
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-3.5 sm:p-5 hover:shadow-card-hover hover:-translate-y-px transition-all duration-200">
      <div className={`w-8 h-8 sm:w-10 sm:h-10 ${iconBg} rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4`}>
        {icon}
      </div>
      <p className={cn(
        'text-2xl sm:text-3xl font-extrabold font-mono',
        highlight === 'success' ? 'text-success' :
          highlight === 'warning' ? 'text-warning' :
            highlight === 'danger' ? 'text-danger' : 'text-navy'
      )}>
        {value.toLocaleString('fr-FR')}
      </p>
      <p className="text-[10px] sm:text-xs text-muted mt-1.5 font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRIDOR SECTION
// ─────────────────────────────────────────────────────────────────────────────
function CorridorSection({ period }: { period: { period: Period } }) {
  const { data: corridors, isLoading } = useStatsByCorridor(period);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-base font-semibold text-navy flex items-center gap-2">
          <ChartBarHorizontalIcon size={18} weight="duotone" className="text-brand" />
          Volumes par corridor
        </h2>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />)}
          </div>
        ) : corridors && (corridors as any[]).length > 0 ? (
          <div className="space-y-3">
            {(corridors as any[]).map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3.5 bg-surface rounded-xl">
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
                      ? `${Number(c.totalSourceAmount).toLocaleString('fr-FR')} ${c.sourceZone?.currency ?? ''}`
                      : '—'}
                  </p>
                  {c.avgRate && (
                    <p className="text-xs text-muted">Taux moy. {parseFloat(c.avgRate).toFixed(4)}</p>
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
  );
}
