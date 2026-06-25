import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/shared/store/gameStore';
import { ACHIEVEMENTS } from '@/shared/services/achievementService';

export function AchievementsPage() {
  const navigate = useNavigate();
  const achievements = useGameStore((s) => s.achievements);
  const unlocked = new Set(achievements.map((a) => a.id));
  const unlockedAt = new Map(achievements.map((a) => [a.id, a.unlockedAt]));
  const count = unlocked.size;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="btn btn--ghost" onClick={() => navigate('/')} aria-label="Indietro">
          ← Cimitero
        </button>
        <strong style={{ marginLeft: 8 }}>Achievement</strong>
        <span className="weather-badge">
          {count}/{ACHIEVEMENTS.length}
        </span>
      </header>

      <div className="scene-wrap">
        <ul className="timeline">
          {ACHIEVEMENTS.map((a) => {
            const got = unlocked.has(a.id);
            return (
              <li key={a.id} style={{ opacity: got ? 1 : 0.5 }}>
                <span style={{ fontSize: 20 }}>{got ? '🏆' : '🔒'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{a.name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {a.description}
                  </div>
                </div>
                {got && (
                  <span className="when">
                    {new Date(unlockedAt.get(a.id)!).toLocaleDateString('it-IT')}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
