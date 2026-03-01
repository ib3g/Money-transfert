import { Button } from './Button';

interface BlankSlateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function BlankSlate({ icon, title, description, action }: BlankSlateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-20 h-20 bg-brand-light rounded-2xl flex items-center justify-center mb-5 shadow-card">
        <span className="text-brand">{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-navy mb-2">{title}</h3>
      <p className="text-sm text-muted mb-6 max-w-xs leading-relaxed">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
