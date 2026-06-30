// Bolla FAB (basso-sinistra) che si espande verticalmente con le azioni
// principali. Si chiude al tocco fuori o dopo un'azione.

import { useEffect, useRef, useState } from 'react';

export interface BubbleAction {
  key: string;
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface Props {
  actions: BubbleAction[];
  /** Se true, il FAB scompare (un drawer è aperto). */
  hidden?: boolean;
}

export function ActionBubble({ actions, hidden }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  if (hidden) return null;

  return (
    <div className={`fab-wrap${open ? ' open' : ''}`} ref={ref}>
      {open && (
        <div className="fab-actions" role="menu">
          {actions.map((a) => (
            <button
              key={a.key}
              className="fab-action"
              disabled={a.disabled}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
            >
              <span className="fab-action-icon" aria-hidden>
                {a.icon}
              </span>
              <span className="fab-action-label">{a.label}</span>
            </button>
          ))}
        </div>
      )}
      <button
        className="fab-main"
        aria-label={open ? 'Chiudi menù' : 'Apri menù azioni'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '✕' : '✦'}
      </button>
    </div>
  );
}
