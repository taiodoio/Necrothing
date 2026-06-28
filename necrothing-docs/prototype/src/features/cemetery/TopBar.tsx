import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGameStore } from '@/shared/store/gameStore';
import { XpBar } from '@/shared/components/XpBar';
import { rankForXp } from '@/shared/services/progressionService';
import { SEASON_LABELS, WEATHER_ICONS, WEATHER_LABELS } from '@/shared/domain/labels';

function useClock(): string {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
  );
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
    }, 30_000);
    return () => clearInterval(t);
  }, []);
  return time;
}

export function TopBar() {
  const progression = useGameStore((s) => s.progression);
  const playerName = useGameStore((s) => s.playerName);
  const world = useGameStore((s) => s.world);
  const rank = rankForXp(progression.xp);
  const time = useClock();

  return (
    <header className="topbar">
      {/* Blocco giocatore: tap → pagina Player (achievement) */}
      <Link to="/achievements" className="player-block" style={{ flex: 1, minWidth: 0 }}>
        <div className="rank">
          {playerName} · Rango {rank.level}
          <strong>{rank.name}</strong>
        </div>
        <div style={{ marginTop: 6, maxWidth: 220 }}>
          <XpBar xp={progression.xp} />
          <div
            style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: 11, alignItems: 'center' }}
          >
            <span className="muted">{progression.xp} Punti Necro</span>
            <span className="wisp-counter">✦ {progression.wisps}</span>
          </div>
        </div>
      </Link>

      <div className="topbar-right">
        <div className="game-clock" aria-label="Ora">
          🕯 {time}
        </div>
        {world && (
          <div className="weather-badge">
            <div style={{ fontSize: 18 }}>{WEATHER_ICONS[world.currentWeather]}</div>
            <div>{WEATHER_LABELS[world.currentWeather]}</div>
            <div>{SEASON_LABELS[world.currentSeason]}</div>
          </div>
        )}
        <Link to="/settings" className="btn btn--ghost" aria-label="Impostazioni">
          ⚙️
        </Link>
      </div>
    </header>
  );
}
