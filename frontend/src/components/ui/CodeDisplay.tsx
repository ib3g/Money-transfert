import { useState } from 'react';
import { CopyIcon, CheckCircleIcon } from '@phosphor-icons/react';

export function CodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="relative bg-gradient-navy rounded-2xl p-8 text-center overflow-hidden select-none">
      {/* Cyan glow bg */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 bg-cyan/10 rounded-full blur-3xl" />
      </div>

      <p className="text-xs font-semibold text-cyan-dim uppercase tracking-widest mb-3 relative z-10">
        Code de retrait
      </p>
      <p className="font-mono text-4xl font-bold text-white tracking-[0.25em] relative z-10">
        {code}
      </p>
      <button
        onClick={handleCopy}
        className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-cyan-dim hover:text-cyan transition-colors relative z-10"
        aria-label="Copier le code"
      >
        {copied
          ? <><CheckCircleIcon size={14} weight="fill" className="text-success-light" /> Copié !</>
          : <><CopyIcon size={14} /> Copier le code</>
        }
      </button>
    </div>
  );
}
