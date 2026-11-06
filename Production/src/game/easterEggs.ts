// Tocchi ravvicinati: stesso oggetto, quattro tocchi entro quattro secondi.
import type { SaveData } from './state.ts';

export class RapidTaps {
  private id = '';
  private first = 0;
  private count = 0;
  reset() { this.id = ''; this.first = 0; this.count = 0; }
  tap(id: string | null, now: number): boolean {
    if (!id) { this.reset(); return false; }
    if (id !== this.id || now < this.first || now - this.first > 4000) { this.id = id; this.first = now; this.count = 1; return false; }
    if (++this.count < 4) return false;
    this.reset();
    return true;
  }
}

/** Il premio è unico per partita, anche se si sposta o cambia laghetto. */
export function claimPondWisps(s: SaveData, id: string): boolean {
  if (s.world.pondWispsFound || !s.placeables.some((p) => p.id === id && p.type === 'pond')) return false;
  s.world.pondWispsFound = true;
  s.player.wisps += 100;
  s.player.counters.wispsEarned += 100;
  return true;
}

/** La parola d'ordine è la stessa in ogni lingua; ogni risposta corretta dà un premio. */
export function claimSecretWisps(s: SaveData, password: string): boolean {
  if (password.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() !== 'fluffy coniglietto') return false;
  s.player.wisps += 100;
  s.player.counters.wispsEarned += 100;
  return true;
}
