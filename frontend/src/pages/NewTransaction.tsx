import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon, ArrowRightIcon, ArrowsLeftRightIcon, UserIcon,
  CurrencyDollarIcon, CheckCircleIcon, WarningIcon,
} from '@phosphor-icons/react';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useCorridorRate } from '@/hooks/useRates';
import { useZones } from '@/hooks/useZones';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CodeDisplay } from '@/components/ui/CodeDisplay';
import type { Transaction } from '@/types';
import { useMe } from '@/hooks/useAuth'; // Added for user data sync

// ── Step indicator ─────────────────────────────────────────────────────────
function Steps({ current }: { current: 1 | 2 }) {
  const steps = [
    { n: 1, label: 'Détails du transfert' },
    { n: 2, label: 'Code de retrait' },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${s.n < current ? 'bg-success text-white' :
              s.n === current ? 'bg-brand text-white shadow-lg shadow-brand/30' :
                'bg-slate-100 text-muted'
              }`}>
              {s.n < current ? <CheckCircleIcon size={16} weight="fill" /> : s.n}
            </div>
            <span className={`text-sm font-medium hidden sm:block transition-colors ${s.n <= current ? 'text-navy' : 'text-muted'
              }`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-3 transition-colors ${s.n < current ? 'bg-success' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Quote preview ──────────────────────────────────────────────────────────
function QuotePreview({
  sourceAmount,
  srcCurrency,
  dstCurrency,
  rate,
  rateSource,
}: {
  sourceAmount: number;
  srcCurrency: string;
  dstCurrency: string;
  rate: string;
  rateSource: string;
}) {
  const rateNum = parseFloat(rate);
  const destAmount = sourceAmount * rateNum;

  return (
    <div className="bg-gradient-navy rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-40 h-40 bg-cyan/5 rounded-full blur-3xl" />
      </div>
      <p className="text-xs text-slate-400 uppercase tracking-widest mb-4 relative z-10">Aperçu du transfert</p>
      <div className="flex items-center justify-between gap-4 relative z-10">
        <div>
          <p className="text-2xl font-tabular font-bold text-white">
            {sourceAmount.toLocaleString('fr-FR')} <span className="text-sm text-slate-400 font-normal">{srcCurrency}</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Vous envoyez</p>
        </div>
        <ArrowRightIcon size={20} className="text-cyan shrink-0" weight="bold" />
        <div className="text-right">
          <p className="text-2xl font-tabular font-bold text-white">
            {destAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} <span className="text-sm text-slate-400 font-normal">{dstCurrency}</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Bénéficiaire reçoit</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
        <p className="text-xs text-slate-400">
          Taux : 1 {srcCurrency} = <span className="text-cyan font-mono font-semibold">{parseFloat(rate).toLocaleString('fr-FR', { maximumFractionDigits: 6 })}</span> {dstCurrency}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${rateSource === 'MANUAL' ? 'bg-warning/20 text-warning' : 'bg-brand/30 text-cyan-dim'
          }`}>
          {rateSource === 'MANUAL' ? 'Manuel' : 'Automatique'}
        </span>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function NewTransaction() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: zones, isLoading: isLoadingZones } = useZones(); // Added isLoadingZones
  const createTx = useCreateTransaction();

  const [step, setStep] = useState<1 | 2>(1);
  const [created, setCreated] = useState<Transaction | null>(null);

  // Form state
  const [sourceZoneId, setSourceZoneId] = useState('');
  const [destZoneId, setDestZoneId] = useState('');
  const [sourceAmount, setSourceAmount] = useState('');
  const [senderName, setSenderName] = useState('');
  const [recipientName, setRecipientName] = useState('');

  // Source zones: owners/managers see all, agents see only their assigned zones
  const userZoneIds = user?.zones?.map(uz => uz.zoneId) ?? [];
  const isOwnerOrManager = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const isAdmin = isOwnerOrManager || user?.permissions?.includes('FULL_ADMIN');

  const allActiveZones = zones?.filter(z => z.isActive) ?? [];
  const availableZones = isAdmin
    ? allActiveZones
    : allActiveZones.filter(z => userZoneIds.includes(z.id));

  // Destination: always all active zones except the selected source
  const destZones = allActiveZones.filter(z => z.id !== sourceZoneId);

  const { data: corridorRate } = useCorridorRate(sourceZoneId, destZoneId);

  const srcZone = allActiveZones.find(z => z.id === sourceZoneId);
  const dstZone = allActiveZones.find(z => z.id === destZoneId);
  const amountNum = parseFloat(sourceAmount);
  const hasQuote = !!corridorRate && !!amountNum && amountNum > 0;

  const canSubmit =
    sourceZoneId && destZoneId && sourceZoneId !== destZoneId &&
    amountNum > 0 && senderName.trim() && recipientName.trim() && corridorRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createTx.mutate(
      {
        sourceAmount: amountNum,
        sourceZoneId,
        destZoneId,
        senderName: senderName.trim(),
        recipientName: recipientName.trim(),
      },
      {
        onSuccess: (tx) => {
          setCreated(tx);
          setStep(2);
        },
      },
    );
  };

  // Sync user data
  const { data: updatedUser } = useMe();
  const setUser = useAuthStore(s => s.setUser);

  useEffect(() => {
    if (updatedUser) {
      setUser(updatedUser);
    }
  }, [updatedUser, setUser]);

  // Reset dest zone when source changes
  useEffect(() => {
    if (destZoneId === sourceZoneId) setDestZoneId('');
  }, [sourceZoneId]);

  return (
    <div className="animate-fade-in max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step === 2 ? navigate('/transactions') : navigate(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-navy transition-colors"
          aria-label="Retour"
        >
          <ArrowLeftIcon size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-navy">Nouveau transfert</h1>
          <p className="text-xs text-muted">{step === 1 ? 'Renseignez les informations du transfert' : 'Transmettez le code au bénéficiaire'}</p>
        </div>
      </div>

      <Steps current={step} />

      {/* Step 1 — Form */}
      {step === 1 && (
        <>
          {!isAdmin && availableZones.length === 0 && zones && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700">
              <WarningIcon size={20} weight="fill" className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Accès restreint</p>
                <p className="mt-1">Vous n'êtes affecté à aucune zone d'envoi. Veuillez contacter votre administrateur pour être assigné à une zone.</p>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Zone selection */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Zone d'envoi</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
                  value={sourceZoneId}
                  onChange={e => setSourceZoneId(e.target.value)}
                  required
                >
                  <option value="">Source…</option>
                  {availableZones.map(z => (
                    <option key={z.id} value={z.id}>{z.name} ({z.currency})</option>
                  ))}
                </select>
              </div>
              <div className="pb-3">
                <ArrowsLeftRightIcon size={18} className="text-muted" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Zone de réception</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
                  value={destZoneId}
                  onChange={e => setDestZoneId(e.target.value)}
                  required
                  disabled={!sourceZoneId}
                >
                  <option value="">Destination…</option>
                  {destZones.map(z => (
                    <option key={z.id} value={z.id}>{z.name} ({z.currency})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* No rate available */}
            {sourceZoneId && destZoneId && !corridorRate && (
              <div className="p-3 bg-warning/5 rounded-xl border border-warning/30 text-sm text-warning">
                Aucun taux disponible pour ce corridor. Contactez votre administrateur.
              </div>
            )}

            {/* Amount */}
            <Input
              label={`Montant à envoyer${srcZone ? ` (${srcZone.currency})` : ''}`}
              type="number"
              min="1"
              step="1"
              placeholder="ex: 50000"
              value={sourceAmount}
              onChange={e => setSourceAmount(e.target.value)}
              leftIcon={<CurrencyDollarIcon size={16} className="text-muted" />}
              required
            />

            {/* Sender */}
            <Input
              label="Nom de l'expéditeur"
              placeholder="Prénom NOM"
              value={senderName}
              onChange={e => setSenderName(e.target.value)}
              leftIcon={<UserIcon size={16} className="text-muted" />}
              required
            />

            {/* Recipient */}
            <Input
              label="Nom du bénéficiaire"
              placeholder="Prénom NOM"
              value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
              leftIcon={<UserIcon size={16} className="text-muted" />}
              required
            />

            {/* Quote preview */}
            {hasQuote && srcZone && dstZone && (
              <QuotePreview
                sourceAmount={amountNum}
                srcCurrency={srcZone.currency}
                dstCurrency={dstZone.currency}
                rate={corridorRate.appliedRate}
                rateSource={corridorRate.appliedSource}
              />
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={createTx.isPending}
              disabled={!canSubmit}
            >
              Créer le transfert
            </Button>
          </form>
        </>
      )}

      {/* Step 2 — Code display */}
      {step === 2 && created && (
        <div className="space-y-6 animate-slide-up">
          <div className="text-center">
            <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircleIcon size={32} weight="fill" className="text-success" />
            </div>
            <h2 className="text-lg font-bold text-navy">Transfert créé !</h2>
            <p className="text-sm text-muted mt-1">
              Communiquez ce code au correspondant de la zone de destination pour qu'il confirme le paiement.
            </p>
          </div>

          <CodeDisplay code={created.code} />

          <div className="bg-surface rounded-2xl border border-slate-100 divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted">Expéditeur</span>
              <span className="font-semibold text-navy">{created.senderName}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted">Bénéficiaire</span>
              <span className="font-semibold text-navy">{created.recipientName}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted">Montant envoyé</span>
              <span className="font-tabular font-semibold text-navy">
                {created.sourceAmount.toLocaleString('fr-FR')} {created.sourceCurrency}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted">Montant reçu</span>
              <span className="font-tabular font-semibold text-success">
                {created.destAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {created.destCurrency}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted">Expiration</span>
              <span className="text-warning font-medium text-xs">
                {created.expiresAt ? new Date(created.expiresAt).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                }) : '48h'}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/transactions')}>
              Voir mes transferts
            </Button>
            <Button className="flex-1" onClick={() => {
              setStep(1);
              setCreated(null);
              setSourceZoneId('');
              setDestZoneId('');
              setSourceAmount('');
              setSenderName('');
              setRecipientName('');
            }}>
              Nouveau transfert
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
