import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowsLeftRightIcon, PlusIcon, FunnelSimpleIcon, XIcon, MagnifyingGlassIcon,
  CaretLeftIcon, CaretRightIcon, ArrowRightIcon, ClockIcon, CheckIcon, TrashIcon,
  GlobeIcon
} from '@phosphor-icons/react';
import { useTransactions, useCancelTransaction } from '@/hooks/useTransactions';
import { useZones } from '@/hooks/useZones';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BlankSlate } from '@/components/ui/BlankSlate';
import { SkeletonTable } from '@/components/ui/Skeleton';
import type { Transaction, TransactionStatus, TransactionFilters } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────
function formatAmount(n: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function timeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const STATUS_OPTIONS: { value: TransactionStatus | ''; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'COMPLETED', label: 'Complété' },
  { value: 'CANCELLED', label: 'Annulé' },
  { value: 'EXPIRED', label: 'Expiré' },
];

// ── Cancel modal ───────────────────────────────────────────────────────────
function CancelModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const cancel = useCancelTransaction();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-navy">Annuler la transaction</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <XIcon size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-surface rounded-xl border border-slate-100 text-sm">
            <span className="font-mono text-brand font-semibold">{tx.code}</span>
            <span className="text-muted ml-2">— {tx.recipientName}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Motif d'annulation (optionnel)</label>
            <textarea
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
              rows={3}
              placeholder="Saisir un motif…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Retour</Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={cancel.isPending}
              onClick={() => cancel.mutate({ id: tx.id, reason }, { onSuccess: onClose })}
            >
              Annuler le transfert
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Transaction card (mobile) ──────────────────────────────────────────────
function TxCard({
  tx, myId, canCancel, onCancel, onConfirm,
}: {
  tx: Transaction;
  myId: string;
  canCancel: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isSender = tx.senderAgentId === myId;
  const isPending = tx.status === 'PENDING';
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/transactions/confirm?code=${tx.code}`)}
      className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 animate-fade-in cursor-pointer hover:bg-slate-50 active:scale-[0.99] transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-mono text-sm font-bold text-brand tracking-wider">{tx.code}</p>
          <div className="flex flex-col gap-0.5 mt-2">
            <span className="text-xs font-bold text-navy leading-none">{tx.senderName}</span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted">
              <ArrowRightIcon size={10} />
              <span>{tx.recipientName}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={tx.status} />
      </div>

      <div className="flex items-center gap-2 text-sm mb-3">
        <span className="font-tabular font-semibold text-navy">{formatAmount(tx.sourceAmount, tx.sourceCurrency)}</span>
        <ArrowRightIcon size={13} className="text-muted" />
        <span className="font-tabular font-semibold text-navy">{formatAmount(tx.destAmount, tx.destCurrency)}</span>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-light mb-4">
        <div className="flex items-center gap-1">
          <GlobeIcon size={12} />
          <span>{tx.sourceZone?.name ?? '—'} → {tx.destZone?.name ?? '—'}</span>
        </div>
        {isPending && tx.expiresAt && (
          <span className="flex items-center gap-1 text-warning font-medium">
            <ClockIcon size={11} /> {timeLeft(tx.expiresAt)}
          </span>
        )}
      </div>

      {isPending && (
        <div className="flex gap-2">
          {!isSender && (
            <button
              onClick={(e) => { e.stopPropagation(); onConfirm(); }}
              className="flex-1 text-xs py-1.5 rounded-lg bg-success/10 text-success font-medium hover:bg-success/20 transition-colors"
            >
              Confirmer
            </button>
          )}
          {(isSender || canCancel) && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className="flex-1 text-xs py-1.5 rounded-lg bg-danger/5 text-danger font-medium hover:bg-danger/10 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Transactions() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { can } = usePermissions();
  const { data: zones } = useZones();

  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, limit: 15 });
  const [showFilters, setShowFilters] = useState(false);
  const [cancelTx, setCancelTx] = useState<Transaction | null>(null);

  const { data, isLoading } = useTransactions(filters);
  const txList = data?.data ?? [];
  const pagination = data?.pagination;

  const canCancel = can('CANCEL_TRANSACTIONS');

  const updateFilter = (key: keyof TransactionFilters, value: string | number | undefined) =>
    setFilters(prev => ({ ...prev, [key]: value || undefined, page: 1 }));

  const setPage = (p: number) => setFilters(prev => ({ ...prev, page: p }));

  const hasActiveFilters = !!(
    filters.status || filters.sourceZoneId || filters.destZoneId ||
    filters.from || filters.to
  );

  const clearFilters = () => setFilters({ page: 1, limit: 15 });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Transactions</h1>
          {pagination && (
            <p className="text-sm text-muted mt-0.5">
              {pagination.total} transfert{pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${hasActiveFilters
              ? 'bg-brand text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <FunnelSimpleIcon size={15} weight={hasActiveFilters ? 'fill' : 'regular'} />
            <span className="hidden sm:inline">Filtres</span>
            {hasActiveFilters && <span className="text-xs bg-white/20 px-1 rounded">{[filters.status, filters.sourceZoneId, filters.destZoneId, filters.from].filter(Boolean).length}</span>}
          </button>
          <Button onClick={() => navigate('/transactions/new')} className="gap-2">
            <PlusIcon size={16} weight="bold" />
            <span className="hidden sm:inline">Nouveau transfert</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>
      </div>

      {/* Confirm search bar (shortcut) */}
      <button
        onClick={() => navigate('/transactions/confirm')}
        className="w-full mb-4 flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm text-muted hover:border-brand/40 hover:bg-surface transition-all group"
      >
        <MagnifyingGlassIcon size={16} className="group-hover:text-brand transition-colors" />
        <span>Confirmer un transfert par code…</span>
        <ArrowRightIcon size={14} className="ml-auto opacity-0 group-hover:opacity-100 text-brand transition-all" />
      </button>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-navy">Filtres</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-danger hover:underline">
                Réinitialiser
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Statut</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                value={filters.status ?? ''}
                onChange={e => updateFilter('status', e.target.value as TransactionStatus)}
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Zone source</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                value={filters.sourceZoneId ?? ''}
                onChange={e => updateFilter('sourceZoneId', e.target.value)}
              >
                <option value="">Toutes</option>
                {zones?.filter(z => z.isActive).map(z => (
                  <option key={z.id} value={z.id}>{z.name} ({z.currency})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Zone destination</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                value={filters.destZoneId ?? ''}
                onChange={e => updateFilter('destZoneId', e.target.value)}
              >
                <option value="">Toutes</option>
                {zones?.filter(z => z.isActive).map(z => (
                  <option key={z.id} value={z.id}>{z.name} ({z.currency})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Depuis</label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                value={filters.from ?? ''}
                onChange={e => updateFilter('from', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && <SkeletonTable rows={8} />}

      {/* Empty */}
      {!isLoading && txList.length === 0 && (
        <BlankSlate
          icon={<ArrowsLeftRightIcon size={32} weight="duotone" />}
          title={hasActiveFilters ? 'Aucun résultat' : 'Aucune transaction'}
          description={
            hasActiveFilters
              ? 'Essayez de modifier vos filtres pour trouver ce que vous cherchez.'
              : 'Créez votre premier transfert pour commencer.'
          }
          action={!hasActiveFilters ? { label: 'Nouveau transfert', onClick: () => navigate('/transactions/new') } : undefined}
        />
      )}

      {/* Mobile list */}
      {!isLoading && txList.length > 0 && (
        <>
          <div className="lg:hidden space-y-3">
            {txList.map(tx => (
              <TxCard
                key={tx.id}
                tx={tx}
                myId={user?.id ?? ''}
                canCancel={canCancel}
                onCancel={() => setCancelTx(tx)}
                onConfirm={() => navigate(`/transactions/confirm?code=${tx.code}`)}
              />
            ))}
          </div>

          {/* Desktop table - with horizontal scroll on small desktops */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
            <table className="w-full min-w-[800px] lg:min-w-full">
              <thead>
                <tr className="bg-surface border-b border-slate-100">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Code</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden xl:table-cell">Clients</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Montant</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Corridor</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Statut</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden 2xl:table-cell">Date</th>
                  <th className="px-6 py-3.5 text-right font-semibold text-muted uppercase tracking-wider text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {txList.map(tx => {
                  const isSender = tx.senderAgentId === user?.id;
                  const isPending = tx.status === 'PENDING';
                  return (
                    <tr key={tx.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-bold text-brand tracking-wider">{tx.code}</span>
                      </td>
                      <td className="px-6 py-4 hidden xl:table-cell">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-navy">{tx.senderName}</span>
                          <div className="flex items-center gap-1 text-[10px] text-muted">
                            <ArrowRightIcon size={10} className="opacity-50" />
                            <span>{tx.recipientName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-tabular font-semibold text-navy text-sm">
                            {formatAmount(tx.sourceAmount, tx.sourceCurrency)}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-muted">
                            <ArrowRightIcon size={10} />
                            <span className="font-tabular font-bold text-success">
                              {formatAmount(tx.destAmount, tx.destCurrency)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs leading-tight">
                          <span className="text-navy font-medium">{tx.sourceZone?.name ?? '—'}</span>
                          <div className="text-muted flex items-center gap-1">
                            <ArrowRightIcon size={10} className="opacity-50" />
                            <span>{tx.destZone?.name ?? '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={tx.status} />
                          {isPending && tx.expiresAt && (
                            <span className="text-[10px] text-warning flex items-center gap-1 font-medium px-1">
                              <ClockIcon size={10} /> {timeLeft(tx.expiresAt)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden 2xl:table-cell">
                        <div className="flex flex-col text-xs leading-tight text-muted">
                          <span className="font-medium text-navy/80">
                            {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] opacity-70">
                            {new Date(tx.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {isPending ? (
                            <>
                              {!isSender && (
                                <button
                                  onClick={() => navigate(`/transactions/confirm?code=${tx.code}`)}
                                  title="Confirmer le transfert"
                                  className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg bg-success/10 text-success font-bold hover:bg-success/20 transition-all active:scale-95 shadow-sm"
                                >
                                  <CheckIcon size={12} weight="bold" />
                                  <span className="hidden lg:inline">Confirmer</span>
                                </button>
                              )}
                              {(isSender || canCancel) && (
                                <button
                                  onClick={() => setCancelTx(tx)}
                                  title="Annuler le transfert"
                                  className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg bg-danger/5 text-danger font-bold hover:bg-danger/10 transition-all active:scale-95 shadow-sm"
                                >
                                  <XIcon size={12} weight="bold" />
                                  <span className="hidden lg:inline">Annuler</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={() => navigate(`/transactions/confirm?code=${tx.code}`)}
                              title="Voir les détails"
                              className="p-2 text-muted-light hover:text-brand hover:bg-brand-light rounded-lg transition-colors"
                            >
                              <MagnifyingGlassIcon size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-sm text-muted">
                Page {pagination.page} sur {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((filters.page ?? 1) - 1)}
                  disabled={(filters.page ?? 1) <= 1}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <CaretLeftIcon size={14} />
                </button>
                <button
                  onClick={() => setPage((filters.page ?? 1) + 1)}
                  disabled={(filters.page ?? 1) >= pagination.totalPages}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <CaretRightIcon size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {cancelTx && <CancelModal tx={cancelTx} onClose={() => setCancelTx(null)} />}
    </div>
  );
}
