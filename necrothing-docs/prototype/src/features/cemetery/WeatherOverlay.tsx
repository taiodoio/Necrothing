// Overlay visivo del meteo e della fase del giorno sopra la mappa.
// Non interattivo (pointer-events: none). L'aspetto è gestito via CSS.

import type { DayPhase, Weather } from '@/shared/domain/enums';

interface Props {
  weather: Weather;
  dayPhase: DayPhase;
}

export function WeatherOverlay({ weather, dayPhase }: Props) {
  return (
    <div className={`weather-overlay phase-${dayPhase} wx-${weather}`} aria-hidden="true">
      {weather === 'storm' && <div className="wx-lightning" />}
    </div>
  );
}
