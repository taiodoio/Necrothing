// Pannello di sviluppo (solo dev): scorciatoie per innescare eventi casuali
// senza attendere la simulazione. Non incluso nei build di produzione.

import { useEffect, useState } from 'react';

export interface DevActions {
  ghost: () => void;
  cat: () => void;
  crow: () => void;
  gravedigger: () => void;
  priest: () => void;
  rat: () => void;
  zombie: () => void;
  wisp: () => void;
  dirty: () => void;
  weather: () => void;
  blessing: () => void;
}

interface DevTrigger {
  key: string;
  label: string;
  icon: string;
  run: keyof DevActions;
}

const TRIGGERS: DevTrigger[] = [
  { key: 'g', label: 'Fantasma', icon: '👻', run: 'ghost' },
  { key: 'c', label: 'Gatto nero', icon: '🐈‍⬛', run: 'cat' },
  { key: 'r', label: 'Corvo', icon: '🐦‍⬛', run: 'crow' },
  { key: 'e', label: 'Becchino', icon: '⛏️', run: 'gravedigger' },
  { key: 'p', label: 'Prete', icon: '✝️', run: 'priest' },
  { key: 't', label: 'Topo', icon: '🐀', run: 'rat' },
  { key: 'z', label: 'Zombie', icon: '🧟', run: 'zombie' },
  { key: 'f', label: 'Fuoco fatuo', icon: '🔥', run: 'wisp' },
  { key: 'd', label: 'Sporca lapide', icon: '🧹', run: 'dirty' },
  { key: 'w', label: 'Cambia meteo', icon: '🌧️', run: 'weather' },
  { key: 'b', label: 'Benedizione', icon: '🙏', run: 'blessing' },
];

export function DevPanel({ actions }: { actions: DevActions }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === '`') {
        setOpen((o) => !o);
        return;
      }
      const trig = TRIGGERS.find((x) => x.key === e.key.toLowerCase());
      if (trig) {
        actions[trig.run]();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);

  return (
    <div className={`devpanel${open ? ' open' : ''}`}>
      <button className="devpanel-toggle" onClick={() => setOpen((o) => !o)} title="Dev (`)">
        🛠
      </button>
      {open && (
        <div className="devpanel-body">
          <div className="devpanel-title">Dev · eventi</div>
          {TRIGGERS.map((t) => (
            <button key={t.run} className="devpanel-act" onClick={() => actions[t.run]()}>
              <span>
                {t.icon} {t.label}
              </span>
              <kbd>{t.key.toUpperCase()}</kbd>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
