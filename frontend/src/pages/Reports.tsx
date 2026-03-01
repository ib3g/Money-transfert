import { FilePdfIcon } from '@phosphor-icons/react';
import { BlankSlate } from '@/components/ui/BlankSlate';

export default function Reports() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Rapports</h1>
      <BlankSlate
        icon={<FilePdfIcon size={32} weight="duotone" />}
        title="Rapports PDF"
        description="Générez des relevés et résumés. Implémentation Scope 4."
      />
    </div>
  );
}
