// Animazione di sepoltura: il prete e alcune persone arrivano, si svolge la
// cerimonia, poi se ne vanno e resta la nuova tomba. SVG/DOM + CSS.
// Rispetta prefers-reduced-motion (versione breve).

import { useEffect, useRef, useState } from 'react';
import type { Grave } from '@/shared/domain/types';
import { GraveSprite } from '@/shared/assets/GraveSprite';
import { PriestSprite } from '@/shared/assets/PriestSprite';
import { MournerSprite } from '@/shared/assets/MournerSprite';
import { DecorationSprite } from '@/shared/assets/DecorationSprite';

type Phase = 'enter' | 'ceremony' | 'leave' | 'done';

interface Props {
  grave: Grave;
  onDone: () => void;
}

const prefersReduced =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Posizioni di raccolta attorno alla fossa (left in %).
const FIGURES = [
  { kind: 'mourner', variant: 'b', left: 18, size: 92, delay: 0.15 },
  { kind: 'priest', variant: 'a', left: 33, size: 100, delay: 0 },
  { kind: 'mourner', variant: 'widow', left: 60, size: 90, delay: 0.1 },
  { kind: 'mourner', variant: 'child', left: 70, size: 90, delay: 0.25 },
] as const;

export function FuneralScene({ grave, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>(prefersReduced ? 'ceremony' : 'enter');
  const [mounted, setMounted] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    timers.current.forEach(clearTimeout);
    onDone();
  };

  useEffect(() => {
    const push = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
    push(() => setMounted(true), 40);

    if (prefersReduced) {
      push(finish, 900);
    } else {
      push(() => setPhase('ceremony'), 1700);
      push(() => setPhase('leave'), 1700 + 2400);
      push(finish, 1700 + 2400 + 1600);
    }
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gathered = mounted && phase !== 'leave';
  const walking = phase === 'enter' || phase === 'leave';
  const ceremony = phase === 'ceremony' || phase === 'leave';

  return (
    <div
      className="funeral-overlay"
      onClick={finish}
      role="dialog"
      aria-label="Cerimonia funebre"
    >
      <div className="funeral-stage">
        <div className="funeral-ground" />

        {/* Tomba al centro */}
        <div className={`funeral-grave ${ceremony ? 'show' : ''}`}>
          <GraveSprite type={grave.graveType} hasFlowers={ceremony} size={110} title={grave.name} />
        </div>

        {/* Candela accesa durante la cerimonia */}
        <div className={`funeral-candle ${ceremony ? 'show' : ''}`}>
          <DecorationSprite type="candle" size={42} />
        </div>

        {/* Figure */}
        {FIGURES.map((f, i) => (
          <div
            key={i}
            className={`funeral-figure ${gathered ? 'in' : ''} ${walking ? 'walking' : ''}`}
            style={{ left: `${f.left}%`, transitionDelay: `${f.delay}s` }}
          >
            <div className="funeral-bob">
              {f.kind === 'priest' ? (
                <PriestSprite size={f.size} blessing={phase === 'ceremony'} />
              ) : (
                <MournerSprite
                  size={f.size}
                  variant={f.variant as 'a' | 'b' | 'child' | 'widow'}
                  mourning={ceremony}
                />
              )}
            </div>
          </div>
        ))}

        {/* Didascalia */}
        <div className={`funeral-caption ${ceremony ? 'show' : ''}`}>
          <div className="funeral-rip">R.I.P.</div>
          <div className="funeral-name">{grave.name}</div>
        </div>
      </div>

      <div className="funeral-skip">tocca per saltare</div>
    </div>
  );
}
