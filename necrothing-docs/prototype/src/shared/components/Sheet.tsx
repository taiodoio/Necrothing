// Bottom sheet modale, mobile-first. Chiude su backdrop, ESC o pulsante Chiudi.

import { useEffect, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ title, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <button className="sheet-close" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
          <h2>{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}
