import { Link } from 'react-router-dom';
import { useGameStore } from '@/shared/store/gameStore';
import { XpBar } from '@/shared/components/XpBar';
import { rankForXp } from '@/shared/services/progressionService';
import { SEASON_LABELS, WEATHER_ICONS, WEATHER_LABELS } from '@/shared/domain/labels';

export function TopBar() {
  const progression = useGameStore((s) => s.progression);
  const world = useGameStore((s) => s.world);
  const rank = rankForXp(progression.xp);

  return (
    <header className="topbar">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="rank">
          Rango {rank.level}
          <strong>{rank.name}</strong>
        </div>
        <div style={{ marginTop: 6, maxWidth: 220 }}>
          <XpBar xp={progression.xp} />
          <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
            {progression.xp} Punti Necro
          </div>
        </div>
      </div>
      {world && (
        <div className="weather-badge">
          <div style={{ fontSize: 18 }}>{WEATHER_ICONS[world.currentWeather]}</div>
          <div>{WEATHER_LABELS[world.currentWeather]}</div>
          <div>{SEASON_LABELS[world.currentSeason]}</div>
        </div>
      )}
      <Link to="/settings" className="btn btn--ghost" aria-label="Impostazioni" style={{ marginLeft: 8 }}>
        ⚙️
      </Link>
    </header>
  );
}
