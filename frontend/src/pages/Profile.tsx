import { useState } from 'react';
import {
  UserCircleIcon, LockIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon, CheckCircleIcon,
  EnvelopeIcon, GlobeIcon, DeviceMobileIcon,
} from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usersApi } from '@/api/users.api';
import { toast } from '@/stores/uiStore';
import { useLogout } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  AGENT: 'Agent',
};

const PERMISSION_LABELS: Record<string, string> = {
  MANAGE_USERS: 'Gérer les utilisateurs',
  MANAGE_ZONES: 'Gérer les zones',
  MANAGE_RATES: 'Gérer les taux',
  VIEW_ALL_TRANSACTIONS: 'Voir toutes les transactions',
  CANCEL_TRANSACTIONS: 'Annuler les transactions',
  VIEW_AUDIT_LOGS: 'Voir les audits',
  GENERATE_REPORTS: 'Générer des rapports',
  FULL_ADMIN: 'Admin complet',
};

// ── Change password form ───────────────────────────────────────────────────
function ChangePasswordSection({ userId }: { userId: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [success, setSuccess] = useState(false);

  const change = useMutation({
    mutationFn: () => usersApi.changePassword(userId, current, next),
    onSuccess: () => {
      setSuccess(true);
      setCurrent(''); setNext(''); setConfirm('');
      toast.success('Mot de passe modifié', 'Votre mot de passe a été mis à jour.');
      setTimeout(() => setSuccess(false), 4000);
    },
    onError: (err: any) => toast.error('Erreur', err.message),
  });

  const passwordsMatch = next === confirm;
  const isStrong = next.length >= 8;
  const canSubmit = current && next && confirm && passwordsMatch && isStrong;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    change.mutate();
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center">
          <LockIcon size={18} className="text-brand" weight="duotone" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-navy">Changer le mot de passe</h2>
          <p className="text-xs text-muted">Minimum 8 caractères</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-success/10 rounded-xl border border-success/20 text-sm text-success">
          <CheckCircleIcon size={16} weight="fill" />
          Mot de passe modifié avec succès !
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Mot de passe actuel"
          type={showCurrent ? 'text' : 'password'}
          value={current}
          onChange={e => setCurrent(e.target.value)}
          required
          rightElement={
            <button type="button" onClick={() => setShowCurrent(v => !v)}
              className="p-1 text-muted hover:text-navy transition-colors">
              {showCurrent ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          }
        />
        <Input
          label="Nouveau mot de passe"
          type={showNext ? 'text' : 'password'}
          value={next}
          onChange={e => setNext(e.target.value)}
          required
          error={next && !isStrong ? 'Au moins 8 caractères requis' : undefined}
          helper={isStrong && next ? '✓ Longueur suffisante' : undefined}
          rightElement={
            <button type="button" onClick={() => setShowNext(v => !v)}
              className="p-1 text-muted hover:text-navy transition-colors">
              {showNext ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          }
        />
        <Input
          label="Confirmer le nouveau mot de passe"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          error={confirm && !passwordsMatch ? 'Les mots de passe ne correspondent pas' : undefined}
        />
        <div className="pt-1">
          <Button type="submit" disabled={!canSubmit} loading={change.isPending}>
            Enregistrer le nouveau mot de passe
          </Button>
        </div>
      </form>
    </section>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Profile() {
  const { user } = useAuthStore();
  const logout = useLogout();

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  const assignedZones = user.zones ?? [];
  const permissions = user.role === 'OWNER'
    ? ['Tous les droits (owner)']
    : user.permissions.map(p => PERMISSION_LABELS[p] ?? p);

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      {/* Profile header card */}
      <section className="bg-gradient-navy rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 flex items-end justify-end pointer-events-none">
          <div className="w-48 h-48 bg-cyan/5 rounded-full blur-3xl -mr-10 -mb-10" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-navy flex items-center justify-center shadow-lg shadow-brand/30 text-white text-xl font-bold shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{user.firstName} {user.lastName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-white/10 rounded-lg text-xs text-slate-300 font-medium">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              {user.totpEnabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/20 rounded-lg text-xs text-green-300 font-medium">
                  <ShieldCheckIcon size={11} weight="fill" /> 2FA activé
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Info card */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="px-6 pt-5 pb-3 border-b border-slate-50">
          <h2 className="text-base font-semibold text-navy flex items-center gap-2">
            <UserCircleIcon size={18} className="text-brand" weight="duotone" />
            Informations du compte
          </h2>
        </div>
        <div className="divide-y divide-slate-50">
          <div className="flex items-center gap-3 px-6 py-3.5">
            <EnvelopeIcon size={15} className="text-muted shrink-0" />
            <span className="text-sm text-muted w-24 shrink-0">Email</span>
            <span className="text-sm text-navy font-medium">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 px-6 py-3.5">
            <UserCircleIcon size={15} className="text-muted shrink-0" />
            <span className="text-sm text-muted w-24 shrink-0">Rôle</span>
            <span className="text-sm text-navy font-medium">{ROLE_LABELS[user.role] ?? user.role}</span>
          </div>
          <div className="flex items-start gap-3 px-6 py-3.5">
            <ShieldCheckIcon size={15} className="text-muted shrink-0 mt-0.5" />
            <span className="text-sm text-muted w-24 shrink-0">Permissions</span>
            <div className="flex flex-wrap gap-1.5">
              {permissions.length ? permissions.map((p, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-brand/10 text-brand rounded-lg font-medium">{p}</span>
              )) : (
                <span className="text-sm text-muted">Aucune permission spéciale</span>
              )}
            </div>
          </div>
          {assignedZones.length > 0 && (
            <div className="flex items-start gap-3 px-6 py-3.5">
              <GlobeIcon size={15} className="text-muted shrink-0 mt-0.5" />
              <span className="text-sm text-muted w-24 shrink-0">Zones</span>
              <div className="flex flex-wrap gap-1.5">
                {assignedZones.map(uz => (
                  <span key={uz.id} className="text-xs px-2 py-0.5 bg-cyan/10 text-brand font-mono rounded-lg font-semibold">
                    {uz.zone.name} ({uz.zone.currency})
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 px-6 py-3.5">
            <DeviceMobileIcon size={15} className="text-muted shrink-0" />
            <span className="text-sm text-muted w-24 shrink-0">2FA</span>
            <span className={`text-sm font-medium ${user.totpEnabled ? 'text-success' : 'text-warning'}`}>
              {user.totpEnabled ? 'Activé (TOTP)' : 'Non configuré'}
            </span>
          </div>
        </div>
      </section>

      {/* Change password */}
      <ChangePasswordSection userId={user.id} />

      {/* Logout */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-base font-semibold text-navy mb-1">Session</h2>
        <p className="text-sm text-muted mb-4">Se déconnecter de tous les appareils. Votre session sera invalidée.</p>
        <Button variant="danger" onClick={logout}>
          Se déconnecter
        </Button>
      </section>
    </div>
  );
}
