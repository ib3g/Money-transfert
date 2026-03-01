import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCodeIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/stores/uiStore';
import { connectSocket } from '@/socket/socketClient';

export default function Setup2FA() {
  const navigate = useNavigate();
  const { setUser, user } = useAuthStore();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'intro' | 'scan' | 'confirm'>('intro');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await authApi.setupTotp();
      setQrCode(res.qrCodeDataUrl);
      setSecret(res.secret);
      setStep('scan');
    } catch (err: any) {
      toast.error('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.confirmTotp(code);
      if (user) setUser({ ...user, totpEnabled: true });
      connectSocket();
      toast.success('A2F activée !', 'Votre compte est maintenant sécurisé.');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Code incorrect');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-navy flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-brand rounded-2xl shadow-brand mb-4">
            <ShieldCheckIcon size={24} weight="bold" className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sécuriser votre compte</h1>
          <p className="text-slate-400 text-sm mt-1">Configuration de l'authentification à 2 facteurs</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card-lg p-8">
          {step === 'intro' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                <QrCodeIcon size={32} weight="duotone" className="text-brand" />
              </div>
              <h2 className="text-lg font-bold text-navy mb-2">A2F obligatoire</h2>
              <p className="text-sm text-muted mb-6 leading-relaxed">
                Pour sécuriser votre compte, vous devez configurer l'authentification à 2 facteurs
                avec Google Authenticator ou Authy.
              </p>
              <Button onClick={handleGenerate} loading={loading} className="w-full">
                Générer le QR Code
              </Button>
            </div>
          )}

          {step === 'scan' && (
            <>
              <h2 className="text-lg font-bold text-navy mb-4">Scanner le QR Code</h2>
              <ol className="text-sm text-muted space-y-2 mb-4">
                <li>1. Ouvrez Google Authenticator ou Authy</li>
                <li>2. Ajoutez un nouveau compte en scannant ce QR Code</li>
                <li>3. Entrez le code à 6 chiffres ci-dessous</li>
              </ol>
              {qrCode && (
                <div className="flex justify-center mb-4 p-4 bg-surface rounded-xl border border-slate-100">
                  <img src={qrCode} alt="QR Code A2F" className="w-48 h-48" />
                </div>
              )}
              <details className="mb-6 text-xs">
                <summary className="text-muted cursor-pointer hover:text-brand">Afficher la clé manuelle</summary>
                <code className="block mt-2 p-2 bg-surface rounded-lg font-mono text-navy break-all">{secret}</code>
              </details>
              <Button onClick={() => setStep('confirm')} variant="secondary" className="w-full">
                J'ai scanné le QR Code →
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button onClick={() => setStep('scan')} className="text-xs text-muted hover:text-brand mb-4 flex items-center gap-1">
                ← Retour au QR Code
              </button>
              <h2 className="text-lg font-bold text-navy mb-2">Confirmer le code</h2>
              <p className="text-sm text-muted mb-6">Entrez le code de votre application pour valider la configuration.</p>
              <form onSubmit={handleConfirm} className="space-y-4">
                <Input
                  label="Code A2F"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="font-mono text-center text-2xl tracking-widest"
                  autoFocus
                  autoComplete="one-time-code"
                  required
                />
                {error && (
                  <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{error}</p>
                )}
                <Button type="submit" loading={loading} className="w-full">
                  Activer l'A2F
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
