import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/shared/store/gameStore';
import {
  ACHIEVEMENTS,
  type AchievementContext,
  type AchievementTier,
} from '@/shared/services/achievementService';

const TIER_LABEL: Record<AchievementTier, string> = {
  bronze: 'Bronzo',
  silver: 'Argento',
  gold: 'Oro',
};
const TIER_ORDER: AchievementTier[] = ['gold', 'silver', 'bronze'];

export function AchievementsPage() {
  const navigate = useNavigate();
  const achievements = useGameStore((s) => s.achievements);
  const graves = useGameStore((s) => s.graves);
  const progression = useGameStore((s) => s.progression);
  const decorations = useGameStore((s) => s.decorations);
  const zones = useGameStore((s) => s.zones);

  const unlocked = new Set(achievements.map((a) => a.id));
  const unlockedAt = new Map(achievements.map((a) => [a.id, a.unlockedAt]));
  const ctx: AchievementContext = { graves, progression, decorations, zones };
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
        {TIER_ORDER.map((tier) => {
          const items = ACHIEVEMENTS.filter((a) => a.tier === tier);
          if (items.length === 0) return null;
          return (
            <section key={tier} className={`ach-group ach-${tier}`}>
              <h3 className="ach-group-title">{TIER_LABEL[tier]}</h3>
              <div className="ach-grid">
                {items.map((a) => {
                  const got = unlocked.has(a.id);
                  const pct = got ? 1 : a.progress ? a.progress(ctx) : 0;
                  return (
                    <div key={a.id} className={`ach-card${got ? ' got' : ''}`}>
                      <div className="ach-icon" aria-hidden>
                        {got ? a.icon : '🔒'}
                      </div>
                      <div className="ach-body">
                        <div className="ach-name">{a.name}</div>
                        <div className="muted ach-desc">{a.description}</div>
                        {!got && a.progress && pct > 0 && (
                          <div className="ach-progress" aria-hidden>
                            <span style={{ width: `${Math.round(pct * 100)}%` }} />
                          </div>
                        )}
                        {got && (
                          <div className="when ach-date">
                            {new Date(unlockedAt.get(a.id)!).toLocaleDateString('it-IT')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
