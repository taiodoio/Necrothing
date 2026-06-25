import { rankProgress } from '@/shared/services/progressionService';

export function XpBar({ xp }: { xp: number }) {
  const pct = Math.round(rankProgress(xp) * 100);
  return (
    <div className="xp-bar" aria-label={`Progresso rango ${pct}%`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
