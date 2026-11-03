// Meteo: com'è il tempo oggi e com'è adesso. Logica pura e deterministica
// (dal seme della partita e dalla data), così lo stesso giorno ha lo stesso
// tempo anche riaprendo il gioco.
//
// - il «tempo del giorno» si sceglie una volta al giorno: per stagione (più
//   nebbia e pioggia da ottobre a febbraio, più sereno d'estate, con qualche
//   temporale) e con continuità (spesso il tempo di ieri continua; un
//   temporale però non dura due giorni: il giorno dopo al massimo piove);
// - la pioggia non dura tutto il giorno: un giorno di pioggia ha uno o due
//   rovesci di qualche ora, un giorno di temporale un temporale di un paio d'ore
//   con la pioggia prima e dopo; fuori dai rovesci è sereno, e nell'ora dopo la
//   pioggia resta un po' di foschia.

import { createRng, type Rng } from './rng.ts';
import type { SaveData, Weather } from './state.ts';
import { isoDate } from './time.ts';

const ORDER: readonly Weather[] = ['clear', 'fog', 'rain', 'storm'];

/** Pesi del tempo del giorno per mese (0 = gennaio). In media sull'anno: ~48% sereno, 25% nebbia, 18% pioggia, 9% temporale. */
export function seasonWeights(month: number): Record<Weather, number> {
  if (month >= 9 || month <= 1) return { clear: 38, fog: 34, rain: 20, storm: 8 }; // ottobre–febbraio
  if (month >= 5 && month <= 7) return { clear: 63, fog: 10, rain: 15, storm: 12 }; // giugno–agosto: temporali estivi
  return { clear: 50, fog: 25, rain: 17, storm: 8 };
}

/** Probabilità che il tempo di ieri continui oggi. */
export const WEATHER_PERSIST = 0.6;

function pickWeighted(w: Record<Weather, number>, rng: Rng): Weather {
  const total = ORDER.reduce((a, k) => a + w[k], 0);
  let x = rng.next() * total;
  for (const k of ORDER) { x -= w[k]; if (x < 0) return k; }
  return 'clear';
}

function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** La data (AAAA-MM-GG) del giorno prima. */
export function previousDate(date: string): string {
  const d = parseDate(date);
  d.setDate(d.getDate() - 1);
  return isoDate(d);
}

/** Il tempo di un giorno: dalla stagione, e se ieri si conosce, spesso lo stesso di ieri. */
export function dayWeather(seed: string | number, date: string, yesterday: Weather | null): Weather {
  const rng = createRng(`${seed}:weather:${date}`);
  const k = yesterday && rng.chance(WEATHER_PERSIST) ? yesterday : pickWeighted(seasonWeights(parseDate(date).getMonth()), rng);
  return k === 'storm' && yesterday === 'storm' ? 'rain' : k; // dopo un temporale, al massimo piove
}

/** Un intervallo del giorno, in ore (inizio incluso, fine esclusa). */
export interface Spell { from: number; to: number; weather: Weather }

/** Le ore di pioggia (o di temporale) di un giorno: fuori da queste è sereno. */
export function daySpells(seed: string | number, date: string, kind: Weather): Spell[] {
  if (kind === 'clear' || kind === 'fog') return [];
  const rng = createRng(`${seed}:spells:${date}`);
  const spell = (len: [number, number], latest: number, weather: Weather): Spell => {
    const dur = len[0] + rng.next() * (len[1] - len[0]);
    const from = rng.next() * (latest - dur);
    return { from, to: from + dur, weather };
  };
  const out: Spell[] = [];
  if (kind === 'storm') {
    const s = spell([1.5, 3], 22, 'storm');
    s.from = Math.max(1, s.from); s.to = Math.min(23, Math.max(s.to, s.from + 1.5));
    out.push({ from: s.from - 1, to: s.from, weather: 'rain' }, s, { from: s.to, to: s.to + 1, weather: 'rain' });
  } else {
    out.push(spell([2, 4.5], 24, 'rain'));
    if (rng.chance(0.4)) {
      const b = spell([1, 2.5], 24, 'rain');
      // il secondo rovescio non si sovrappone al primo: se capita sopra, si sposta dopo (o si salta)
      const a = out[0];
      if (b.from < a.to + 1 && b.to > a.from - 1) { const len = b.to - b.from; b.from = a.to + 2; b.to = b.from + len; }
      if (b.to <= 24) out.push(b);
    }
  }
  return out.sort((x, y) => x.from - y.from);
}

/** Com'è il tempo in un'ora del giorno (0–24), dato il tempo del giorno. */
export function weatherAtHour(seed: string | number, date: string, kind: Weather, hour: number): Weather {
  if (kind === 'clear' || kind === 'fog') return kind;
  const spells = daySpells(seed, date, kind);
  for (const s of spells) if (hour >= s.from && hour < s.to) return s.weather;
  // nell'ora dopo la pioggia resta la foschia
  if (spells.some((s) => hour >= s.to && hour < s.to + 1)) return 'fog';
  return 'clear';
}

/** Com'è il tempo adesso nella partita. */
export function weatherNow(s: SaveData, now: Date): Weather {
  const date = s.world.lastWeatherDate ?? isoDate(now);
  // il giorno non ancora cambiato (gioco aperto oltre la mezzanotte): vale il tempo di quel giorno, senza rovesci
  if (date !== isoDate(now)) return s.world.weather === 'fog' ? 'fog' : 'clear';
  return weatherAtHour(s.seed, date, s.world.weather, now.getHours() + now.getMinutes() / 60);
}

/** Cambia il tempo del giorno se è cominciato un giorno nuovo; true se è cambiato. */
export function rollWeather(s: SaveData, now: Date): boolean {
  const today = isoDate(now);
  if (s.world.lastWeatherDate === today) return false;
  const yesterday = s.world.lastWeatherDate === previousDate(today) ? s.world.weather : null;
  s.world.weather = dayWeather(s.seed, today, yesterday);
  s.world.lastWeatherDate = today;
  return true;
}
