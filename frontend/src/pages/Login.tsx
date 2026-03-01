import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, ArrowsLeftRightIcon, LockIcon, EnvelopeSimpleIcon, LightningIcon } from '@phosphor-icons/react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth.api';
import { connectSocket } from '@/socket/socketClient';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/stores/uiStore';

type Step = 'credentials' | 'totp' | 'loading';

// ── Dev quick-login fixtures (only rendered in dev mode) ────────────────────
const DEV_USERS = [
  { role: 'OWNER', label: 'Owner', name: 'Jean Dupont', email: 'owner@transferapp.com', password: 'Owner1234!', color: 'bg-purple-100 text-purple-700' },
  { role: 'MANAGER', label: 'Manager', name: 'Sophie Dubois', email: 'manager1@transferapp.com', password: 'Manager1234!', color: 'bg-brand/10 text-brand' },
  { role: 'MANAGER', label: 'Manager', name: 'Karim Benali', email: 'manager2@transferapp.com', password: 'Manager1234!', color: 'bg-brand/10 text-brand' },
  { role: 'AGENT', label: 'Agent Paris', name: 'Amadou Sy', email: 'agent.paris@transferapp.com', password: 'Agent1234!', color: 'bg-slate-100 text-slate-600' },
  { role: 'AGENT', label: 'Agent Paris', name: 'Pierre Martin', email: 'agent.paris2@transferapp.com', password: 'Agent1234!', color: 'bg-slate-100 text-slate-600' },
  { role: 'AGENT', label: 'Agent Dakar', name: 'Moussa Diallo', email: 'agent.dakar@transferapp.com', password: 'Agent1234!', color: 'bg-slate-100 text-slate-600' },
  { role: 'AGENT', label: 'Agent Casa', name: 'Fatima El Ouafi', email: 'agent.casablanca@transferapp.com', password: 'Agent1234!', color: 'bg-slate-100 text-slate-600' },
  { role: 'AGENT', label: 'Agent MTL', name: 'Aminata Traore', email: 'agent.montreal@transferapp.com', password: 'Agent1234!', color: 'bg-slate-100 text-slate-600' },
  { role: 'AGENT', label: 'Agent Alger', name: 'Nabil Meziani', email: 'agent.alger@transferapp.com', password: 'Agent1234!', color: 'bg-slate-100 text-slate-600' },
];

export default function Login() {
  const { isAuthenticated, user, setAuth } = useAuthStore();
  const navigate = useNavigate();

  const showQuickLogin = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true';

  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    if (user && !user.totpEnabled && !showQuickLogin) return <Navigate to="/setup-2fa" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const quickLogin = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setError('');
    toast.info('Champs remplis', 'Cliquez sur Continuer pour vous connecter');
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });

      // Cas 1 : Premier login, doit configurer le 2FA (skip en dev)
      if (res.requireTotpSetup && res.accessToken && res.user) {
        setAuth(res.user, res.accessToken, res.refreshToken!);
        connectSocket();
        if (showQuickLogin) {
          navigate('/dashboard');
          toast.success('Bienvenue !', `Bonjour ${res.user.firstName} (2FA skippé en dev)`);
        } else {
          navigate('/setup-2fa');
        }
        return;
      }

      // Cas 2 : 2FA déjà configuré, demande le code
      if (res.requireTotp && res.tempToken) {
        setTempToken(res.tempToken);
        setStep('totp');
        return;
      }

      // Cas 3 : Login direct (si 2FA pas encore activé ou désactivé par l'admin)
      if (res.accessToken && res.user) {
        setAuth(res.user, res.accessToken, res.refreshToken!);
        connectSocket();
        navigate('/dashboard');
        toast.success('Bienvenue !', `Bonjour ${res.user.firstName}`);
      }
    } catch (err: any) {
      setError(err.message ?? 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.verifyTotp({ tempToken, totpCode });
      setAuth(res.user, res.accessToken, res.refreshToken);
      connectSocket();
      navigate('/dashboard');
      toast.success('Bienvenue !', `Bonjour ${res.user.firstName}`);
    } catch (err: any) {
      setError(err.message ?? 'Code A2F incorrect');
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-navy flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-brand rounded-2xl shadow-brand mb-4">
            <ArrowsLeftRightIcon size={24} weight="bold" className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">TransferApp</h1>
          <p className="text-slate-400 text-sm mt-1">Coordination sécurisée des transferts</p>
        </div>

        {/* Dev quick-login panel */}
        {showQuickLogin && (
          <div className="mb-4 bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              <LightningIcon size={12} weight="fill" className="text-yellow-400" />
              Dev — Connexion rapide
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {DEV_USERS.map((u) => (
                <button
                  key={u.email}
                  onClick={() => quickLogin(u.email, u.password)}
                  disabled={loading}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left disabled:opacity-50 group"
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${u.color}`}>
                    {u.label}
                  </span>
                  <span className="text-sm font-medium text-white group-hover:text-slate-200 truncate">
                    {u.name}
                  </span>
                  <span className="text-xs text-slate-500 truncate ml-auto hidden sm:block">
                    {u.email}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card-lg p-8">
          {step === 'credentials' ? (
            <>
              <h2 className="text-lg font-bold text-navy mb-6">Connexion</h2>
              <form onSubmit={handleCredentials} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  leftIcon={<EnvelopeSimpleIcon size={16} />}
                  required
                />
                <Input
                  label="Mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  leftIcon={<LockIcon size={16} />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-light hover:text-muted transition-colors"
                      aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showPassword ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  }
                  required
                />
                {error && (
                  <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{error}</p>
                )}
                <Button type="submit" loading={loading} className="w-full mt-2">
                  Continuer
                </Button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep('credentials'); setError(''); setTotpCode(''); }}
                className="text-xs text-muted hover:text-brand mb-4 flex items-center gap-1"
              >
                ← Retour
              </button>
              <h2 className="text-lg font-bold text-navy mb-2">Vérification A2F</h2>
              <p className="text-sm text-muted mb-6">
                Entrez le code à 6 chiffres de votre application d'authentification.
              </p>
              <form onSubmit={handleTotp} className="space-y-4">
                <Input
                  label="Code A2F"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  className="font-mono text-center text-2xl tracking-widest"
                  autoFocus
                  required
                />
                {error && (
                  <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{error}</p>
                )}
                <Button type="submit" loading={loading} className="w-full">
                  Vérifier
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
