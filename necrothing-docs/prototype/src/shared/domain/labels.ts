// Etichette UI per enum di simulazione (i18n futura).

import type { DayPhase, Season, Weather } from './enums';

export const WEATHER_LABELS: Record<Weather, string> = {
  gloomy_clear: 'Sereno cupo',
  fog: 'Nebbia',
  rain: 'Pioggia',
  storm: 'Temporale',
  wind: 'Vento',
  snow: 'Neve',
  full_moon: 'Luna piena',
};

export const SEASON_LABELS: Record<Season, string> = {
  spring: 'Primavera',
  summer: 'Estate',
  autumn: 'Autunno',
  winter: 'Inverno',
};

export const DAY_PHASE_LABELS: Record<DayPhase, string> = {
  dawn: 'Alba',
  day: 'Giorno',
  dusk: 'Tramonto',
  night: 'Notte',
};

export const WEATHER_ICONS: Record<Weather, string> = {
  gloomy_clear: '🌥️',
  fog: '🌫️',
  rain: '🌧️',
  storm: '⛈️',
  wind: '🌬️',
  snow: '❄️',
  full_moon: '🌕',
};
