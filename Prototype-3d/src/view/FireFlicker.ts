// Tremolio delle fiamme riutilizzabile: ogni sorgente ha frequenze e fasi
// proprie derivate da un seme (posizione o id), quindi le luci non pulsano
// all'unisono e lo stesso lampione tremola sempre allo stesso modo. Somma di
// sinusoidi incommensurabili + un "guizzo" a gradini interpolati.

import { hash3 } from '../game/rng.ts';

export class FireFlicker {
  private readonly f: [number, number, number];
  private readonly p: [number, number, number];
  private readonly seed: number;
  readonly amount: number;
  readonly speed: number;
  readonly fault: number;

  /** `amount` 0..1: ampiezza relativa; `speed` scala le frequenze; `fault` 0 sana, 1 sporca, 2 rotta. */
  constructor(seed: number, amount = 0.2, speed = 1, fault = 0) {
    this.seed = seed | 0;
    this.fault = fault;
    this.amount = amount + (fault >= 1 ? 0.12 : 0);
    this.speed = speed;
    const h = (k: number) => hash3(this.seed, k, 17, 991);
    this.f = [(7 + h(1) * 4) * speed, (13 + h(2) * 7) * speed, (2.1 + h(3) * 1.4) * speed];
    this.p = [h(4) * 6.283, h(5) * 6.283, h(6) * 6.283];
  }

  /** Moltiplicatore d'intensità al tempo t (secondi), attorno a 1. */
  value(t: number): number {
    const v = this.steady(t);
    if (this.fault <= 0) return v;
    if (this.fault >= 2) {
      // rotta: a periodi va in crisi e sfarfalla, spegnendosi quasi del tutto a scatti
      const crisis = hash3(Math.floor(t * 0.6), this.seed, 43, 9) < 0.65;
      const q = hash3(Math.floor(t * 12), this.seed, 41, 5);
      return crisis && q < 0.55 ? v * (0.04 + q * 0.35) : v;
    }
    // sporca: ogni tanto un calo breve
    const q = hash3(Math.floor(t * 3.5), this.seed, 47, 3);
    return q < 0.12 ? v * 0.55 : v;
  }

  private steady(t: number): number {
    if (this.amount <= 0) return 1;
    const s = Math.sin(t * this.f[0] + this.p[0]) * 0.45 + Math.sin(t * this.f[1] + this.p[1]) * 0.25 + Math.sin(t * this.f[2] + this.p[2]) * 0.2;
    // guizzo: valore casuale a gradini di ~0.12 s interpolato
    const k = t * 8 * this.speed, i = Math.floor(k), fr = k - i;
    const a = hash3(i, this.seed, 3, 7), b = hash3(i + 1, this.seed, 3, 7);
    const g = (a + (b - a) * fr * fr * (3 - 2 * fr) - 0.5) * 0.5;
    return Math.max(0.2, 1 + (s + g) * this.amount);
  }
}

/** Seme stabile da una posizione mondo. */
export function seedFromPosition(x: number, y: number, z: number): number {
  return Math.floor(hash3(Math.round(x * 50), Math.round(y * 50), Math.round(z * 50), 4242) * 2 ** 31);
}
