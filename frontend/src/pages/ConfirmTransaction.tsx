import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon, MagnifyingGlassIcon, ArrowRightIcon, CheckCircleIcon,
  WarningIcon, UserIcon, ClockIcon,
} from '@phosphor-icons/react';
import { useTransactionByCode, useConfirmTransaction } from '@/hooks/useTransactions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';

// ── Helpers ────────────────────────────────────────────────────────────────
function formatAmount(n: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(n);
}

function timeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m restantes` : `${m} minutes restantes`;
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ConfirmTransaction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code') ?? '';

  const [inputCode, setInputCode] = useState(codeParam);
  const [searchCode, setSearchCode] = useState(codeParam);
  const [confirmed, setConfirmed] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tx, isLoading, error, isError } = useTransactionByCode(searchCode);
  const confirm = useConfirmTransaction();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchCode(inputCode.toUpperCase().trim());
    setConfirmed(false);
  };

  const handleConfirm = () => {
    if (!tx) return;
    confirm.mutate(tx.id, {
      onSuccess: () => setConfirmed(true),
    });
  };

  // Auto-focus input on mount
  useEffect(() => {
    if (!codeParam) inputRef.current?.focus();
  }, [codeParam]);

  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/transactions')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-navy transition-colors"
          aria-label="Retour"
        >
          <ArrowLeftIcon size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-navy">Confirmer un transfert</h1>
          <p className="text-xs text-muted">Saisissez le code de retrait communiqué par l'expéditeur</p>
        </div>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              ref={inputRef}
              placeholder="ex: TR-AB3K9M7X"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              leftIcon={<MagnifyingGlassIcon size={16} className="text-muted" />}
              className="font-mono tracking-wider"
            />
          </div>
          <Button type="submit" disabled={!inputCode.trim()} loading={isLoading && !!searchCode}>
            Chercher
          </Button>
        </div>
      </form>

      {/* Loading */}
      {isLoading && searchCode && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error — not found */}
      {isError && !isLoading && (
        <div className="flex items-start gap-3 p-4 bg-danger/5 rounded-2xl border border-danger/20 text-sm">
          <WarningIcon size={20} weight="fill" className="text-danger shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-navy">Code introuvable</p>
            <p className="text-muted mt-0.5">Vérifiez le code et réessayez. Les codes sont sensibles à la casse.</p>
          </div>
        </div>
      )}

      {/* Success — confirmed */}
      {confirmed && tx && (
        <div className="space-y-5 animate-slide-up">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon size={40} weight="fill" className="text-success" />
            </div>
            <h2 className="text-xl font-bold text-navy">Paiement confirmé !</h2>
            <p className="text-sm text-muted mt-2">
              Le bénéficiaire <strong>{tx.recipientName}</strong> a bien reçu son transfert.
            </p>
          </div>

          <div className="bg-gradient-navy rounded-2xl p-5 text-center relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-32 bg-success/10 rounded-full blur-3xl" />
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 relative z-10">Montant payé</p>
            <p className="text-3xl font-tabular font-bold text-white relative z-10">
              {formatAmount(tx.destAmount, tx.destCurrency)}
            </p>
          </div>

          <Button className="w-full" size="lg" onClick={() => navigate('/transactions')}>
            Retour aux transactions
          </Button>
        </div>
      )}

      {/* Transaction found — pending */}
      {tx && !confirmed && !isLoading && (
        <div className="space-y-5 animate-slide-up">
          {/* Status header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-lg font-bold text-brand tracking-wider">{tx.code}</p>
              <p className="text-xs text-muted mt-0.5">Trouvé</p>
            </div>
            <StatusBadge status={tx.status} />
          </div>

          {/* Details card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100 text-sm">
            <div className="flex items-center gap-3 px-4 py-3">
              <UserIcon size={16} className="text-muted shrink-0" />
              <span className="text-muted">Bénéficiaire</span>
              <span className="font-semibold text-navy ml-auto">{tx.recipientName}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted">Montant</span>
              <div className="flex items-center gap-1.5">
                <span className="font-tabular font-semibold text-navy">{formatAmount(tx.sourceAmount, tx.sourceCurrency)}</span>
                <ArrowRightIcon size={12} className="text-muted" />
                <span className="font-tabular font-bold text-success">{formatAmount(tx.destAmount, tx.destCurrency)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted">Corridor</span>
              <span className="text-navy">{tx.sourceZone?.name ?? '—'} → {tx.destZone?.name ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted">Expéditeur</span>
              <span className="text-navy">{tx.senderAgent ? `${tx.senderAgent.firstName} ${tx.senderAgent.lastName}` : '—'}</span>
            </div>
            {tx.status === 'PENDING' && tx.expiresAt && (
              <div className="flex items-center gap-2 px-4 py-3">
                <ClockIcon size={14} className="text-warning shrink-0" />
                <span className="text-warning font-medium text-xs">
                  {timeLeft(tx.expiresAt) ?? 'Expiré'}
                </span>
              </div>
            )}
          </div>

          {/* Not pending — show info */}
          {tx.status !== 'PENDING' && (
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm">
              <WarningIcon size={18} weight="fill" className="text-muted shrink-0 mt-0.5" />
              <p className="text-muted">
                Cette transaction ne peut plus être confirmée — elle est <strong>{tx.status === 'COMPLETED' ? 'déjà complétée' : tx.status === 'CANCELLED' ? 'annulée' : 'expirée'}</strong>.
              </p>
            </div>
          )}

          {/* Confirm button */}
          {tx.status === 'PENDING' && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleConfirm}
              loading={confirm.isPending}
            >
              <CheckCircleIcon size={18} weight="fill" />
              Confirmer le paiement de {formatAmount(tx.destAmount, tx.destCurrency)}
            </Button>
          )}

          <button
            onClick={() => { setSearchCode(''); setInputCode(''); }}
            className="w-full text-sm text-muted hover:text-brand transition-colors py-1"
          >
            Rechercher un autre code
          </button>
        </div>
      )}
    </div>
  );
}
