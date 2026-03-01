import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon, MagnifyingGlassIcon, ArrowRightIcon, CheckCircleIcon,
  WarningIcon, UserIcon, ClockIcon, InfoIcon,
} from '@phosphor-icons/react';
import { useTransactionByCode, useConfirmTransaction } from '@/hooks/useTransactions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuthStore } from '@/stores/authStore';
import { Link } from 'react-router-dom';

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

function displayAgent(agent?: Pick<import('@/types').User, 'id' | 'firstName' | 'lastName' | 'deletedAt'>, fallback = '—') {
  if (!agent) return <>{fallback}</>;
  return (
    <span className={`inline-flex items-center gap-1.5 align-middle ${agent.deletedAt ? 'text-danger' : ''}`}>
      {agent.firstName} {agent.lastName}
      {agent.deletedAt && (
        <span title="Supprimé de la plateforme" className="flex items-center">
          <InfoIcon size={14} weight="fill" />
        </span>
      )}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ConfirmTransaction() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
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
          <h1 className="text-xl font-bold text-navy">
            {tx && tx.status !== 'PENDING' ? 'Détails du transfert' : 'Confirmer un transfert'}
          </h1>
          <p className="text-xs text-muted">
            {tx && tx.status !== 'PENDING'
              ? `Consultation de la transaction ${tx.code}`
              : 'Saisissez le code de retrait communiqué par l\'expéditeur'}
          </p>
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
              <span className="text-muted">Expéditeur</span>
              <span className="font-semibold text-navy ml-auto">{tx.senderName}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <UserIcon size={16} className="text-muted shrink-0" />
              <span className="text-muted">Bénéficiaire</span>
              <span className="font-semibold text-navy ml-auto">{tx.recipientName}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted">Agent (Envoi)</span>
              <span className="text-navy">{displayAgent(tx.senderAgent)}</span>
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
            <div className="flex items-start gap-3 p-4 bg-surface rounded-2xl border border-slate-100 text-sm shadow-sm relative overflow-hidden group">
              {tx.status === 'COMPLETED' ? (
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CheckCircleIcon size={48} weight="fill" className="text-success" />
                </div>
              ) : (
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <WarningIcon size={48} weight="fill" className="text-muted" />
                </div>
              )}
              <div className="relative z-10">
                <p className="font-semibold text-navy flex items-center gap-2">
                  {tx.status === 'COMPLETED' && <CheckCircleIcon size={16} weight="fill" className="text-success" />}
                  {tx.status === 'COMPLETED' ? 'Transaction déjà payée' : tx.status === 'CANCELLED' ? 'Transaction annulée' : 'Transaction expirée'}
                </p>
                <div className="text-muted mt-1 space-y-1 leading-relaxed">
                  {tx.status === 'COMPLETED' ? (
                    <>
                      <p className="flex items-center gap-1.5 flex-wrap">Ce transfert a été confirmé par <strong>{displayAgent(tx.receiverAgent, 'un agent')}</strong>.</p>
                      <p className="text-[10px]">Le {new Date(tx.confirmedAt!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </>
                  ) : tx.status === 'CANCELLED' ? (
                    <>
                      <p>Ce transfert a été annulé{tx.cancelReason ? ` : "${tx.cancelReason}"` : '.'}</p>
                      {tx.cancelledAt && <p className="text-[10px]">Le {new Date(tx.cancelledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                    </>
                  ) : (
                    <p>Le délai de retrait pour ce transfert est dépassé.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Confirm button */}
          {tx.status === 'PENDING' && tx.senderAgentId !== user?.id && (
            <Button
              className="w-full shadow-lg shadow-brand/20 active:scale-[0.98] transition-all"
              size="lg"
              onClick={handleConfirm}
              loading={confirm.isPending}
            >
              <CheckCircleIcon size={20} weight="fill" />
              Confirmer le paiement de {formatAmount(tx.destAmount, tx.destCurrency)}
            </Button>
          )}

          {tx.status === 'PENDING' && tx.senderAgentId === user?.id && (
            <div className="space-y-4">
              <div className="p-4 bg-warning/5 border border-warning/20 rounded-2xl flex items-start gap-3">
                <WarningIcon size={20} weight="fill" className="text-warning shrink-0" />
                <div className="text-sm">
                  <p className="font-bold text-navy">Action non autorisée</p>
                  <p className="text-muted mt-1 leading-relaxed">
                    Vous ne pouvez pas confirmer un transfert que vous avez émis vous-même.
                    Un autre agent doit s'en charger.
                  </p>
                </div>
              </div>
              <Link
                to={`/transactions?code=${tx.code}`}
                className="block w-full text-center bg-danger/5 text-danger text-sm font-semibold py-3 rounded-xl hover:bg-danger/10 transition-colors"
              >
                Annuler ce transfert
              </Link>
            </div>
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
