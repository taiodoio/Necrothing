// Regali dell'animale domestico: dopo un numero a caso di coccole o di giochi
// con l'osso (PET_GIFT.every) porta qualche fuoco fatuo (PET_GIFT.wisps), al
// massimo PET_GIFT.perOpening volte per apertura del gioco. Poi è «sazio»: si
// coccola e gioca come sempre, ma non porta altro fino alla prossima apertura
// (coccolarlo a ripetizione non deve rendere più del resto del gioco).
// Vive solo in memoria: ogni apertura del gioco ricomincia da capo.

import { PET_GIFT } from './balance.ts';

export class PetGifts {
  private left = new Map<string, number>();
  private given = new Map<string, number>();
  private readonly rand: () => number;

  constructor(rand: () => number = Math.random) { this.rand = rand; }

  private roll([a, b]: readonly [number, number]) { return a + Math.floor(this.rand() * (b - a + 1)); }

  /** Una coccola o un gioco con l'animale `id`: i fuochi fatui del regalo, o null se stavolta niente. */
  interact(id: string): number | null {
    if ((this.given.get(id) ?? 0) >= PET_GIFT.perOpening) return null;
    const left = (this.left.get(id) ?? this.roll(PET_GIFT.every)) - 1;
    if (left > 0) { this.left.set(id, left); return null; }
    this.left.set(id, this.roll(PET_GIFT.every));
    this.given.set(id, (this.given.get(id) ?? 0) + 1);
    return this.roll(PET_GIFT.wisps);
  }

  /** Ha già fatto tutti i regali di questa apertura. */
  sated(id: string): boolean { return (this.given.get(id) ?? 0) >= PET_GIFT.perOpening; }
}
