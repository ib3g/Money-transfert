import { ShieldCheckIcon } from '@phosphor-icons/react';
import { BlankSlate } from '@/components/ui/BlankSlate';

export default function AuditLogs() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Audit Logs</h1>
      <BlankSlate
        icon={<ShieldCheckIcon size={32} weight="duotone" />}
        title="Logs d'audit"
        description="Toutes les actions critiques sont enregistrées ici. Implémentation Scope 4."
      />
    </div>
  );
}
