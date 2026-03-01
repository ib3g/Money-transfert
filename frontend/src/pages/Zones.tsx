import { useState } from 'react';
import {
  GlobeIcon, PlusIcon, PencilSimpleIcon, TrashIcon, MapPinIcon, XIcon, WarningIcon,
  ChartLineUpIcon,
} from '@phosphor-icons/react';
import { useZones, useCreateZone, useUpdateZone } from '@/hooks/useZones';
import { usePermissions } from '@/hooks/usePermissions';
import { zonesApi } from '@/api/zones.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BlankSlate } from '@/components/ui/BlankSlate';
import { Skeleton } from '@/components/ui/Skeleton';
import { Link } from 'react-router-dom';
import type { Zone } from '@/types';

// Badge shown on zones that have no initialized API rates (config incomplete)
function NoRatesBadge() {
  return (
    <Link
      to="/rates"
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-warning-bg text-warning hover:bg-warning/20 transition-colors whitespace-nowrap"
      title="Taux non initialisés — cliquez pour configurer"
      onClick={(e) => e.stopPropagation()}
    >
      <WarningIcon size={10} weight="fill" />
      Taux manquants
    </Link>
  );
}

// ── Shared Modal shell ─────────────────────────────────────────────────────
function Modal({
  title, onClose, children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
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

// ── Currency options ───────────────────────────────────────────────────────
const CURRENCY_OPTIONS = [
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'XOF', label: 'Franc CFA BCEAO (XOF)' },
  { code: 'XAF', label: 'Franc CFA BEAC (XAF)' },
  { code: 'GBP', label: 'Livre Sterling (GBP)' },
  { code: 'CAD', label: 'Dollar Canadien (CAD)' },
  { code: 'MAD', label: 'Dirham Marocain (MAD)' },
  { code: 'DZD', label: 'Dinar Algérien (DZD)' },
  { code: 'TND', label: 'Dinar Tunisien (TND)' },
  { code: 'NGN', label: 'Naira Nigérian (NGN)' },
  { code: 'GHS', label: 'Cedi Ghanéen (GHS)' },
  { code: 'SEN', label: 'Sénégal (XOF)' },
];

// ── Create / Edit modal ────────────────────────────────────────────────────
function ZoneFormModal({
  zone, onClose,
}: { zone?: Zone | null; onClose: () => void }) {
  const isEdit = !!zone;
  const [name, setName] = useState(zone?.name ?? '');
  const [currency, setCurrency] = useState(zone?.currency ?? '');
  const [customCurrency, setCustomCurrency] = useState(
    zone?.currency && !CURRENCY_OPTIONS.find(c => c.code === zone.currency) ? zone.currency : '',
  );
  const [useCustom, setUseCustom] = useState(
    !!zone?.currency && !CURRENCY_OPTIONS.find(c => c.code === zone.currency),
  );

  const create = useCreateZone();
  const update = useUpdateZone();
  const isPending = create.isPending || update.isPending;

  const resolvedCurrency = useCustom ? customCurrency.toUpperCase() : currency;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !resolvedCurrency.trim()) return;

    if (isEdit && zone) {
      update.mutate(
        { id: zone.id, data: { name: name.trim(), currency: resolvedCurrency } },
        { onSuccess: onClose },
      );
    } else {
      create.mutate(
        { name: name.trim(), currency: resolvedCurrency },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <Modal title={isEdit ? 'Modifier la zone' : 'Nouvelle zone'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nom de la zone"
          placeholder="ex: France, Sénégal, Canada…"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
        />

        {!useCustom ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Devise</label>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              required={!useCustom}
            >
              <option value="">Sélectionner une devise…</option>
              {CURRENCY_OPTIONS.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        ) : (
          <Input
            label="Code devise personnalisé"
            placeholder="ex: JPY, AED…"
            value={customCurrency}
            onChange={e => setCustomCurrency(e.target.value.toUpperCase())}
            maxLength={5}
            required={useCustom}
          />
        )}

        <button
          type="button"
          onClick={() => { setUseCustom(v => !v); setCurrency(''); setCustomCurrency(''); }}
          className="text-xs text-brand hover:underline"
        >
          {useCustom ? '← Sélectionner depuis la liste' : 'Saisir un code personnalisé →'}
        </button>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" className="flex-1" loading={isPending}>
            {isEdit ? 'Enregistrer' : 'Créer la zone'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete confirm modal ───────────────────────────────────────────────────
function DeleteModal({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  const qc = useQueryClient();
  const deleteZone = useMutation({
    mutationFn: () => zonesApi.delete(zone.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Zone supprimée', zone.name);
      onClose();
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });

  return (
    <Modal title="Supprimer la zone" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-danger/5 rounded-xl border border-danger/20">
          <WarningIcon size={20} weight="fill" className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700">
            Supprimer la zone <strong className="text-navy">{zone.name}</strong> ?
            Cette action est irréversible. La zone ne peut pas être supprimée si des transactions en cours y sont associées.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button variant="danger" className="flex-1" loading={deleteZone.isPending} onClick={() => deleteZone.mutate()}>
            Supprimer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Zone card (mobile) ─────────────────────────────────────────────────────
function ZoneCard({
  zone, canManage, onEdit, onDelete, showNoRates,
}: { zone: Zone; canManage: boolean; onEdit: () => void; onDelete: () => void; showNoRates?: boolean }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => zonesApi.update(zone.id, { isActive: !zone.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
    onError: (err: any) => toast.error('Erreur', err.message),
  });

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border ${zone.isActive ? 'border-slate-100' : 'border-slate-200 opacity-60'} transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${zone.isActive ? 'bg-brand/10' : 'bg-slate-100'}`}>
            <GlobeIcon size={20} weight="duotone" className={zone.isActive ? 'text-brand' : 'text-slate-400'} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-navy text-sm">{zone.name}</p>
              {showNoRates && <NoRatesBadge />}
            </div>
            <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 bg-cyan/10 text-brand text-xs font-mono font-semibold rounded-md">
              {zone.currency}
            </span>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand transition-colors">
              <PencilSimpleIcon size={15} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-danger/10 text-slate-400 hover:text-danger transition-colors">
              <TrashIcon size={15} />
            </button>
          </div>
        )}
      </div>
      {canManage && (
        <button
          onClick={() => toggle.mutate()}
          className={`mt-3 w-full text-xs py-1.5 rounded-lg font-medium transition-colors ${zone.isActive
            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            : 'bg-success/10 text-success hover:bg-success/20'
            }`}
        >
          {zone.isActive ? 'Désactiver' : 'Réactiver'}
        </button>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Zones() {
  const { can } = usePermissions();
  const { data: zones, isLoading } = useZones();
  const canManage = can('MANAGE_ZONES');

  const [showCreate, setShowCreate] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);
  const [deleteZone, setDeleteZone] = useState<Zone | null>(null);

  const activeZones = zones?.filter(z => z.isActive) ?? [];
  const inactiveZones = zones?.filter(z => !z.isActive) ?? [];
  const multipleZones = (zones?.length ?? 0) > 1;
  const hasNoRates = (z: Zone) => multipleZones && z.isActive && (z._count?.sourceRates ?? 1) === 0;

  const qc = useQueryClient();
  const toggleZone = useMutation({
    mutationFn: (z: Zone) => zonesApi.update(z.id, { isActive: !z.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
    onError: (err: any) => toast.error('Erreur', err.message),
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Zones</h1>
          <p className="text-sm text-muted mt-0.5">
            {isLoading ? '…' : `${zones?.length ?? 0} zone${(zones?.length ?? 0) !== 1 ? 's' : ''} configurée${(zones?.length ?? 0) !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <PlusIcon size={16} weight="bold" />
            <span className="hidden sm:inline">Nouvelle zone</span>
            <span className="sm:hidden">Zone</span>
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !zones?.length && (
        <BlankSlate
          icon={<MapPinIcon size={32} weight="duotone" />}
          title="Aucune zone configurée"
          description="Créez des zones géographiques (pays / régions) pour définir les corridors de transfert."
          action={canManage ? { label: 'Créer une zone', onClick: () => setShowCreate(true) } : undefined}
        />
      )}

      {/* Mobile cards */}
      {!isLoading && !!zones?.length && (
        <div className="lg:hidden space-y-6">
          {activeZones.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Actives ({activeZones.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeZones.map(z => (
                  <ZoneCard key={z.id} zone={z} canManage={canManage} showNoRates={hasNoRates(z)}
                    onEdit={() => setEditZone(z)} onDelete={() => setDeleteZone(z)} />
                ))}
              </div>
            </section>
          )}
          {inactiveZones.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Inactives ({inactiveZones.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inactiveZones.map(z => (
                  <ZoneCard key={z.id} zone={z} canManage={canManage}
                    onEdit={() => setEditZone(z)} onDelete={() => setDeleteZone(z)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Desktop table */}
      {!isLoading && !!zones?.length && (
        <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface border-b border-slate-100">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Zone</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Devise</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Statut</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Créée le</th>
                {canManage && (
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {zones.map(zone => (
                <tr key={zone.id} className="hover:bg-surface/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${zone.isActive ? 'bg-brand/10' : 'bg-slate-100'}`}>
                        <GlobeIcon size={16} weight="duotone" className={zone.isActive ? 'text-brand' : 'text-slate-400'} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-navy text-sm">{zone.name}</span>
                        {hasNoRates(zone) && <NoRatesBadge />}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-cyan/10 text-brand text-xs font-mono font-semibold rounded-lg">
                      {zone.currency}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${zone.isActive ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${zone.isActive ? 'bg-success' : 'bg-slate-400'}`} />
                      {zone.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted">
                    {new Date(zone.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  {canManage && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleZone.mutate(zone)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${zone.isActive
                            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            : 'bg-success/10 text-success hover:bg-success/20'
                            }`}
                        >
                          {zone.isActive ? 'Désactiver' : 'Réactiver'}
                        </button>
                        <button
                          onClick={() => setEditZone(zone)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand transition-colors"
                          title="Modifier"
                        >
                          <PencilSimpleIcon size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteZone(zone)}
                          className="p-1.5 rounded-lg hover:bg-danger/10 text-slate-400 hover:text-danger transition-colors"
                          title="Supprimer"
                        >
                          <TrashIcon size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreate && <ZoneFormModal onClose={() => setShowCreate(false)} />}
      {editZone && <ZoneFormModal zone={editZone} onClose={() => setEditZone(null)} />}
      {deleteZone && <DeleteModal zone={deleteZone} onClose={() => setDeleteZone(null)} />}
    </div>
  );
}
