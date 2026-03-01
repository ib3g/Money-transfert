import { useState } from 'react';
import {
  ChartLineUpIcon, ArrowRightIcon, PencilSimpleIcon, TrashIcon, ArrowsClockwiseIcon,
  RobotIcon, UserIcon, WarningIcon, XIcon, CheckCircleIcon,
} from '@phosphor-icons/react';
import { useRates, useSetManualRate, useDeleteManualRate, useForceRefreshRates } from '@/hooks/useRates';
import { useZones } from '@/hooks/useZones';
import { usePermissions } from '@/hooks/usePermissions';
import { BlankSlate } from '@/components/ui/BlankSlate';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ExchangeRate, Zone } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────
function formatRate(rate: string | number) {
  const n = typeof rate === 'string' ? parseFloat(rate) : rate;
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

// ── Shared modal ───────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <XIcon size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Manual rate modal ──────────────────────────────────────────────────────
function ManualRateModal({
  rate, zones, onClose,
}: { rate?: ExchangeRate | null; zones: Zone[]; onClose: () => void }) {
  const isEdit = !!rate;

  const [srcId, setSrcId] = useState(rate?.sourceZoneId ?? '');
  const [dstId, setDstId] = useState(rate?.destZoneId ?? '');
  const [value, setValue] = useState(rate ? String(parseFloat(rate.rate)) : '');

  const setManual = useSetManualRate();

  const srcZone = zones.find(z => z.id === srcId);
  const dstZone = zones.find(z => z.id === dstId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(value);
    if (!srcId || !dstId || isNaN(rateNum) || rateNum <= 0) return;
    setManual.mutate(
      { sourceZoneId: srcId, destZoneId: dstId, rate: rateNum },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal title={isEdit ? 'Modifier le taux manuel' : 'Définir un taux manuel'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Zone source</label>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              value={srcId}
              onChange={e => setSrcId(e.target.value)}
              required
              disabled={isEdit}
            >
              <option value="">Source…</option>
              {zones.filter(z => z.isActive).map(z => (
                <option key={z.id} value={z.id}>{z.name} ({z.currency})</option>
              ))}
            </select>
          </div>
          <ArrowRightIcon size={18} className="text-muted mb-3" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Zone dest.</label>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              value={dstId}
              onChange={e => setDstId(e.target.value)}
              required
              disabled={isEdit}
            >
              <option value="">Destination…</option>
              {zones.filter(z => z.isActive && z.id !== srcId).map(z => (
                <option key={z.id} value={z.id}>{z.name} ({z.currency})</option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label={srcZone && dstZone ? `Taux : 1 ${srcZone.currency} = ? ${dstZone.currency}` : 'Taux de change'}
          type="number"
          step="0.000001"
          min="0.000001"
          placeholder="ex: 655.957"
          value={value}
          onChange={e => setValue(e.target.value)}
          required
          autoFocus={!isEdit}
          helper={
            srcZone && dstZone && value
              ? `Prévisualisation : 100 ${srcZone.currency} → ${(parseFloat(value) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${dstZone.currency}`
              : undefined
          }
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button type="submit" className="flex-1" loading={setManual.isPending}>
            {isEdit ? 'Mettre à jour' : 'Appliquer le taux'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────
function DeleteManualModal({ rate, onClose }: { rate: ExchangeRate; onClose: () => void }) {
  const deleteManual = useDeleteManualRate();
  return (
    <Modal title="Supprimer le taux manuel" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-warning/10 rounded-xl border border-warning/30">
          <WarningIcon size={20} weight="fill" className="text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700">
            En supprimant le taux manuel, le taux automatique du marché sera utilisé pour ce corridor.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={deleteManual.isPending}
            onClick={() =>
              deleteManual.mutate(
                { srcId: rate.sourceZoneId, dstId: rate.destZoneId },
                { onSuccess: onClose },
              )
            }
          >
            Supprimer le manuel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Rate row (desktop) ─────────────────────────────────────────────────────
function RateRow({
  rate, zones, canManage, onEdit, onDelete,
}: {
  rate: ExchangeRate;
  zones: Zone[];
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const srcZone = zones.find(z => z.id === rate.sourceZoneId);
  const dstZone = zones.find(z => z.id === rate.destZoneId);
  const isManual = rate.source === 'MANUAL';

  return (
    <tr className="hover:bg-surface/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex flex-col text-sm leading-tight">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-navy">{srcZone?.name ?? '—'}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-cyan/10 text-brand font-mono rounded">{srcZone?.currency}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted mt-1">
            <ArrowRightIcon size={10} className="opacity-50" />
            <span className="font-medium text-xs">{dstZone?.name ?? '—'}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-cyan/10 text-brand font-mono rounded">{dstZone?.currency}</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="font-tabular font-semibold text-navy text-sm">
          {formatRate(rate.rate)} <span className="text-muted font-normal text-xs">{dstZone?.currency}/{srcZone?.currency}</span>
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${isManual
          ? 'bg-warning/10 text-warning'
          : 'bg-brand/10 text-brand'
          }`}>
          {isManual ? <UserIcon size={12} weight="fill" /> : <RobotIcon size={12} weight="fill" />}
          {isManual ? 'Manuel' : 'Automatique'}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-muted">{timeAgo(rate.updatedAt)}</td>
      {canManage && (
        <td className="px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand transition-colors"
              title="Modifier le taux manuel"
            >
              <PencilSimpleIcon size={15} />
            </button>
            {isManual && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg hover:bg-danger/10 text-slate-400 hover:text-danger transition-colors"
                title="Supprimer le taux manuel"
              >
                <TrashIcon size={15} />
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

// ── Rate card (mobile) ─────────────────────────────────────────────────────
function RateCard({
  rate, zones, canManage, onEdit, onDelete,
}: {
  rate: ExchangeRate;
  zones: Zone[];
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const srcZone = zones.find(z => z.id === rate.sourceZoneId);
  const dstZone = zones.find(z => z.id === rate.destZoneId);
  const isManual = rate.source === 'MANUAL';

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border ${isManual ? 'border-warning/30' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-navy">
            <span>{srcZone?.name}</span>
            <span className="text-xs px-1.5 py-0.5 bg-cyan/10 text-brand font-mono rounded">{srcZone?.currency}</span>
            <ArrowRightIcon size={13} className="text-muted" />
            <span>{dstZone?.name}</span>
            <span className="text-xs px-1.5 py-0.5 bg-cyan/10 text-brand font-mono rounded">{dstZone?.currency}</span>
          </div>
          <p className="mt-2 font-tabular text-xl font-bold text-navy">
            {formatRate(rate.rate)}
            <span className="text-xs text-muted font-normal ml-1">{dstZone?.currency}/{srcZone?.currency}</span>
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${isManual ? 'text-warning' : 'text-brand'}`}>
              {isManual ? <UserIcon size={11} weight="fill" /> : <RobotIcon size={11} weight="fill" />}
              {isManual ? 'Manuel' : 'Automatique'}
            </span>
            <span className="text-xs text-muted">{timeAgo(rate.updatedAt)}</span>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand transition-colors">
              <PencilSimpleIcon size={15} />
            </button>
            {isManual && (
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-danger/10 text-slate-400 hover:text-danger transition-colors">
                <TrashIcon size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Rates() {
  const { can } = usePermissions();
  const { data: rates, isLoading: loadingRates } = useRates();
  const { data: zones, isLoading: loadingZones } = useZones();
  const forceRefresh = useForceRefreshRates();
  const canManage = can('MANAGE_RATES');

  const [showCreate, setShowCreate] = useState(false);
  const [editRate, setEditRate] = useState<ExchangeRate | null>(null);
  const [deleteRate, setDeleteRate] = useState<ExchangeRate | null>(null);

  const isLoading = loadingRates || loadingZones;
  const manualRates = rates?.filter(r => r.source === 'MANUAL') ?? [];
  const autoRates = rates?.filter(r => r.source === 'API') ?? [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Taux de change</h1>
          <p className="text-sm text-muted mt-0.5">
            {isLoading ? '…' : `${rates?.length ?? 0} corridor${(rates?.length ?? 0) !== 1 ? 's' : ''} · ${manualRates.length} manuel${manualRates.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => forceRefresh.mutate()}
              loading={forceRefresh.isPending}
              className="gap-2"
              title="Actualiser tous les taux automatiques"
            >
              <ArrowsClockwiseIcon size={16} weight="bold" />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <PencilSimpleIcon size={16} weight="bold" />
              <span className="hidden sm:inline">Taux manuel</span>
              <span className="sm:hidden">Manuel</span>
            </Button>
          </div>
        )}
      </div>

      {/* Legend */}
      {!isLoading && !!rates?.length && (
        <div className="flex items-center gap-4 mb-5 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <RobotIcon size={13} className="text-brand" weight="fill" /> Taux automatique (marché)
          </span>
          <span className="flex items-center gap-1.5">
            <UserIcon size={13} className="text-warning" weight="fill" /> Taux manuel (prioritaire)
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !rates?.length && (
        <BlankSlate
          icon={<ChartLineUpIcon size={32} weight="duotone" />}
          title="Aucun taux configuré"
          description="Les taux sont générés automatiquement dès que des zones sont créées, ou vous pouvez en saisir manuellement."
          action={canManage ? { label: 'Définir un taux', onClick: () => setShowCreate(true) } : undefined}
        />
      )}

      {/* Manual rates section */}
      {!isLoading && manualRates.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <UserIcon size={13} weight="fill" className="text-warning" />
            Taux manuels ({manualRates.length}) — priorité haute
          </h2>

          {/* Mobile */}
          <div className="lg:hidden space-y-3">
            {manualRates.map(r => (
              <RateCard key={r.id} rate={r} zones={zones ?? []} canManage={canManage}
                onEdit={() => setEditRate(r)} onDelete={() => setDeleteRate(r)} />
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-warning/30 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-warning/5 border-b border-warning/20">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Corridor</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Taux</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Source</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Mis à jour</th>
                  {canManage && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {manualRates.map(r => (
                  <RateRow key={r.id} rate={r} zones={zones ?? []} canManage={canManage}
                    onEdit={() => setEditRate(r)} onDelete={() => setDeleteRate(r)} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Auto rates section */}
      {!isLoading && autoRates.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <RobotIcon size={13} weight="fill" className="text-brand" />
            Taux automatiques ({autoRates.length}) — marché
          </h2>

          {/* Mobile */}
          <div className="lg:hidden space-y-3">
            {autoRates.map(r => (
              <RateCard key={r.id} rate={r} zones={zones ?? []} canManage={canManage}
                onEdit={() => setEditRate(r)} onDelete={() => setDeleteRate(r)} />
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Corridor</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Taux</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Source</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Mis à jour</th>
                  {canManage && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {autoRates.map(r => (
                  <RateRow key={r.id} rate={r} zones={zones ?? []} canManage={canManage}
                    onEdit={() => setEditRate(r)} onDelete={() => setDeleteRate(r)} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Info banner when no manual rate can be added (not canManage) */}
      {!isLoading && !canManage && !!rates?.length && (
        <div className="mt-6 flex items-center gap-3 p-4 bg-brand/5 rounded-xl border border-brand/20 text-sm text-brand">
          <CheckCircleIcon size={18} weight="fill" />
          Les taux sont mis à jour automatiquement chaque jour à 6h UTC.
        </div>
      )}

      {/* Modals */}
      {(showCreate || editRate) && (
        <ManualRateModal
          rate={editRate}
          zones={zones ?? []}
          onClose={() => { setShowCreate(false); setEditRate(null); }}
        />
      )}
      {deleteRate && (
        <DeleteManualModal rate={deleteRate} onClose={() => setDeleteRate(null)} />
      )}
    </div>
  );
}
