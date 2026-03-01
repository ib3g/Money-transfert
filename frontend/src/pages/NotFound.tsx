import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-8xl font-extrabold text-brand-light font-mono">404</p>
        <h1 className="text-2xl font-bold text-navy mt-4 mb-2">Page introuvable</h1>
        <p className="text-muted mb-8">Cette page n'existe pas ou a été déplacée.</p>
        <Button onClick={() => navigate('/dashboard')}>Retour au dashboard</Button>
      </div>
    </div>
  );
}
