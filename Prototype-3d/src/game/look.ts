// Aspetto del Custode (personalizzabile, salvato nella partita). Nessun
// genere: si scelgono la testa (anche zucca, teschio, zombie), pelle (anche "brillantinata"), capelli e colore, occhi,
// dettagli (occhiali, lentiggini, cerotto), barba e baffi, cappello, vestiti e colori.
// I nomi delle scelte sono in src/i18n/it/game.ts (look.*).

import { t } from '../i18n/index.ts';
import type { Access } from '../config/distribution.ts';

export type HairStyle = 'tufts' | 'bob' | 'long' | 'curly' | 'longcurly' | 'bun' | 'spiky' | 'none'
  | 'fringe' | 'fringeLong' | 'side' | 'sideLong' | 'wavy' | 'wavyLong' | 'buzz';
/** Testa: umana, zucca intagliata, teschio, zombie. */
export type HeadStyle = 'human' | 'pumpkin' | 'skull' | 'zombie';
export type HatStyle = 'wide' | 'top' | 'beanie' | 'witch' | 'none';
export type Outfit = 'coat' | 'cloak' | 'overalls' | 'sweater';
export type Glasses = 'none' | 'round' | 'square' | 'monocle';
export type Beard = 'none' | 'short' | 'full' | 'braid';
export type Mustache = 'none' | 'thin' | 'handlebar' | 'bushy';

export interface CustodeLook {
  /** Tipo di testa: umana, zucca intagliata, teschio, zombie. */
  head: HeadStyle;
  skin: string;
  sparkle: boolean;
  hair: HairStyle;
  hairColor: string;
  eyes: string;
  glasses: Glasses;
  /** Barba (anche con treccia) e baffi, con un colore tutto loro. */
  beard: Beard;
  mustache: Mustache;
  beardColor: string;
  freckles: boolean;
  bandaid: boolean;
  hat: HatStyle;
  hatColor: string;
  outfit: Outfit;
  outfitColor: string;
  accentColor: string;
}

type Swatch = [color: string, label: string];

export const LOOK_COLORS: Record<'skin' | 'hairColor' | 'beardColor' | 'eyes' | 'hatColor' | 'outfitColor' | 'accentColor', Swatch[]> = {
  skin: [['#f6dcc7', t('look.skin.porcelain')], ['#f2cfb0', t('look.skin.peach')], ['#e0b48f', t('look.skin.honey')], ['#c68e62', t('look.skin.amber')], ['#8d5a3b', t('look.skin.cocoa')], ['#5e3a26', t('look.skin.ebony')], ['#b9d7c8', t('look.skin.spectral')], ['#c9c3e6', t('look.skin.lilac')]],
  hairColor: [['#2a2226', t('look.hairColor.black')], ['#6b4a33', t('look.hairColor.brown')], ['#b0774a', t('look.hairColor.copper')], ['#e0c27a', t('look.hairColor.blond')], ['#d9d4cc', t('look.hairColor.white')], ['#8a5ab0', t('look.hairColor.purple')], ['#4f7fb0', t('look.hairColor.blue')], ['#d0607a', t('look.hairColor.pink')]],
  beardColor: [['#2a2226', t('look.beardColor.black')], ['#6b4a33', t('look.beardColor.brown')], ['#b0774a', t('look.beardColor.copper')], ['#e0c27a', t('look.beardColor.blond')], ['#8a8580', t('look.beardColor.grey')], ['#d9d4cc', t('look.beardColor.white')], ['#8a5ab0', t('look.beardColor.purple')], ['#4f7fb0', t('look.beardColor.blue')], ['#d0607a', t('look.beardColor.pink')]],
  eyes: [['#1b1a20', t('look.eyes.black')], ['#3b2a1e', t('look.eyes.brown')], ['#1f4a6b', t('look.eyes.blue')], ['#2f5a32', t('look.eyes.green')], ['#5a2f6b', t('look.eyes.purple')], ['#8a2a2a', t('look.eyes.ruby')]],
  hatColor: [['#4a3326', t('look.hatColor.leather')], ['#2a2a30', t('look.hatColor.black')], ['#5a2f3a', t('look.hatColor.wine')], ['#3a4a3a', t('look.hatColor.moss')], ['#6b6050', t('look.hatColor.mud')], ['#2f3a5a', t('look.hatColor.night')]],
  outfitColor: [['#6e4c36', t('look.outfitColor.leather')], ['#3a4150', t('look.outfitColor.slate')], ['#4f5a3e', t('look.outfitColor.moss')], ['#6b2f35', t('look.outfitColor.wine')], ['#4a3a5a', t('look.outfitColor.plum')], ['#2b2b30', t('look.outfitColor.black')], ['#8a7a5a', t('look.outfitColor.sand')]],
  accentColor: [['#a4473b', t('look.accentColor.rust')], ['#d9b48a', t('look.accentColor.cream')], ['#4f7fb0', t('look.accentColor.cornflower')], ['#5f8a4a', t('look.accentColor.sage')], ['#c9a227', t('look.accentColor.mustard')], ['#8a5ab0', t('look.accentColor.wisteria')]],
};

export const LOOK_STYLES = {
  head: [['human', t('look.head.human')], ['pumpkin', t('look.head.pumpkin')], ['skull', t('look.head.skull')], ['zombie', t('look.head.zombie')]] as Array<[HeadStyle, string]>,
  hair: [
    ['tufts', t('look.hair.tufts')], ['spiky', t('look.hair.spiky')], ['buzz', t('look.hair.buzz')], ['bob', t('look.hair.bob')], ['long', t('look.hair.long')],
    ['fringe', t('look.hair.fringe')], ['fringeLong', t('look.hair.fringeLong')], ['side', t('look.hair.side')], ['sideLong', t('look.hair.sideLong')], ['wavy', t('look.hair.wavy')],
    ['wavyLong', t('look.hair.wavyLong')], ['curly', t('look.hair.curly')], ['longcurly', t('look.hair.longcurly')], ['bun', t('look.hair.bun')], ['none', t('look.hair.none')],
  ] as Array<[HairStyle, string]>,
  hat: [['wide', t('look.hat.wide')], ['top', t('look.hat.top')], ['beanie', t('look.hat.beanie')], ['witch', t('look.hat.witch')], ['none', t('look.hat.none')]] as Array<[HatStyle, string]>,
  outfit: [['coat', t('look.outfit.coat')], ['cloak', t('look.outfit.cloak')], ['overalls', t('look.outfit.overalls')], ['sweater', t('look.outfit.sweater')]] as Array<[Outfit, string]>,
  glasses: [['none', t('look.glasses.none')], ['round', t('look.glasses.round')], ['square', t('look.glasses.square')], ['monocle', t('look.glasses.monocle')]] as Array<[Glasses, string]>,
  beard: [['none', t('look.beard.none')], ['short', t('look.beard.short')], ['full', t('look.beard.full')], ['braid', t('look.beard.braid')]] as Array<[Beard, string]>,
  mustache: [['none', t('look.mustache.none')], ['thin', t('look.mustache.thin')], ['handlebar', t('look.mustache.handlebar')], ['bushy', t('look.mustache.bushy')]] as Array<[Mustache, string]>,
};

export const DEFAULT_LOOK: CustodeLook = {
  head: 'human', skin: '#f2cfb0', sparkle: false, hair: 'tufts', hairColor: '#6b4a33', eyes: '#1b1a20',
  glasses: 'none', beard: 'none', mustache: 'none', beardColor: '#6b4a33', freckles: false, bandaid: false,
  hat: 'wide', hatColor: '#4a3326', outfit: 'coat', outfitColor: '#6e4c36', accentColor: '#a4473b',
};

/** Accetta solo valori noti (salvataggi vecchi o manomessi tornano al predefinito). */
export function normalizeLook(raw: unknown): CustodeLook {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<CustodeLook>;
  const color = (k: keyof typeof LOOK_COLORS) => (LOOK_COLORS[k].some(([c]) => c === r[k]) ? r[k] as string : DEFAULT_LOOK[k]);
  const pick = <T extends string>(v: unknown, opts: Array<[T, string]>, d: T): T => (opts.some(([o]) => o === v) ? v as T : d);
  return {
    skin: color('skin'), hairColor: color('hairColor'), eyes: color('eyes'), hatColor: color('hatColor'), outfitColor: color('outfitColor'), accentColor: color('accentColor'),
    // i salvataggi di prima avevano barba e baffi nel colore dei capelli
    beardColor: LOOK_COLORS.beardColor.some(([c]) => c === r.beardColor) ? r.beardColor as string : color('hairColor'),
    sparkle: r.sparkle === true, freckles: r.freckles === true, bandaid: r.bandaid === true,
    head: pick(r.head, LOOK_STYLES.head, DEFAULT_LOOK.head),
    hair: pick(r.hair, LOOK_STYLES.hair, DEFAULT_LOOK.hair),
    hat: pick(r.hat, LOOK_STYLES.hat, DEFAULT_LOOK.hat),
    outfit: pick(r.outfit, LOOK_STYLES.outfit, DEFAULT_LOOK.outfit),
    glasses: pick(r.glasses, LOOK_STYLES.glasses, DEFAULT_LOOK.glasses),
    beard: pick(r.beard, LOOK_STYLES.beard, DEFAULT_LOOK.beard),
    mustache: pick(r.mustache, LOOK_STYLES.mustache, DEFAULT_LOOK.mustache),
  };
}

/** Chiave breve e stabile di un aspetto (cache dei modelli). */
export function lookKey(l: CustodeLook): string {
  const s = JSON.stringify([l.head === 'human' ? undefined : l.head, l.skin, l.sparkle, l.hair, l.hairColor, l.eyes, l.glasses, l.beard, l.mustache, l.beardColor, l.freckles, l.bandaid, l.hat, l.hatColor, l.outfit, l.outfitColor, l.accentColor]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/**
 * Accesso commerciale delle scelte d'aspetto: tutte Demo, tranne quelle
 * elencate qui (il cappello da strega viene con l'Angolo della strega, Full).
 */
export const LOOK_ACCESS: { [K in keyof CustodeLook]?: Partial<Record<string, Access>> } = {
  hat: { witch: 'full' },
};
export const lookOptionAccess = (key: keyof CustodeLook, value: unknown): Access => LOOK_ACCESS[key]?.[String(value)] ?? 'demo';

/** Teste senza capelli, barba e baffi (la zucca ha il picciolo, il teschio è osso). */
export const BALD_HEADS: readonly HeadStyle[] = ['pumpkin', 'skull'];
/**
 * Scelte che una testa non usa (restano visibili ma disattivate nel selettore):
 * zucca e teschio non hanno capelli, barba, baffi, lentiggini, cerotto né brillantini;
 * la loro pelle e i loro occhi non cambiano colore.
 */
export function lookUnused(head: HeadStyle): Set<keyof CustodeLook> {
  if (!BALD_HEADS.includes(head)) return new Set();
  return new Set<keyof CustodeLook>(['hair', 'hairColor', 'beard', 'mustache', 'beardColor', 'freckles', 'bandaid', 'sparkle', 'skin', 'eyes']);
}
