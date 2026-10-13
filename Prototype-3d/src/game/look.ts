// Aspetto del Custode (personalizzabile, salvato nella partita). Nessun
// genere: si scelgono pelle (anche "brillantinata"), capelli e colore, occhi,
// dettagli (occhiali, lentiggini, cerotto), barba e baffi, cappello, vestiti e colori.

export type HairStyle = 'tufts' | 'bob' | 'long' | 'curly' | 'longcurly' | 'bun' | 'spiky' | 'none'
  | 'fringe' | 'fringeLong' | 'side' | 'sideLong' | 'wavy' | 'wavyLong' | 'buzz';
/** Testa: umana, zucca intagliata, teschio, zombie. */
export type HeadStyle = 'human' | 'pumpkin' | 'skull' | 'zombie';
export type HatStyle = 'wide' | 'top' | 'beanie' | 'none';
export type Outfit = 'coat' | 'cloak' | 'overalls' | 'sweater';
export type Glasses = 'none' | 'round' | 'square' | 'monocle';
export type Beard = 'none' | 'short' | 'full' | 'braid';
export type Mustache = 'none' | 'thin' | 'handlebar' | 'bushy';

export interface CustodeLook {
  /** Tipo di testa (in anteprima: non ancora nel selettore del gioco). */
  head?: HeadStyle;
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
  skin: [['#f6dcc7', 'Porcellana'], ['#f2cfb0', 'Pesca'], ['#e0b48f', 'Miele'], ['#c68e62', 'Ambra'], ['#8d5a3b', 'Cacao'], ['#5e3a26', 'Ebano'], ['#b9d7c8', 'Spettrale'], ['#c9c3e6', 'Lilla']],
  hairColor: [['#2a2226', 'Nero'], ['#6b4a33', 'Castano'], ['#b0774a', 'Rame'], ['#e0c27a', 'Biondo'], ['#d9d4cc', 'Bianco'], ['#8a5ab0', 'Viola'], ['#4f7fb0', 'Blu'], ['#d0607a', 'Rosa']],
  beardColor: [['#2a2226', 'Nero'], ['#6b4a33', 'Castano'], ['#b0774a', 'Rame'], ['#e0c27a', 'Biondo'], ['#8a8580', 'Grigio'], ['#d9d4cc', 'Bianco'], ['#8a5ab0', 'Viola'], ['#4f7fb0', 'Blu'], ['#d0607a', 'Rosa']],
  eyes: [['#1b1a20', 'Nero'], ['#3b2a1e', 'Castano'], ['#1f4a6b', 'Blu'], ['#2f5a32', 'Verde'], ['#5a2f6b', 'Viola'], ['#8a2a2a', 'Rubino']],
  hatColor: [['#4a3326', 'Cuoio'], ['#2a2a30', 'Nero'], ['#5a2f3a', 'Vinaccia'], ['#3a4a3a', 'Muschio'], ['#6b6050', 'Fango'], ['#2f3a5a', 'Notte']],
  outfitColor: [['#6e4c36', 'Cuoio'], ['#3a4150', 'Ardesia'], ['#4f5a3e', 'Muschio'], ['#6b2f35', 'Vinaccia'], ['#4a3a5a', 'Prugna'], ['#2b2b30', 'Nero'], ['#8a7a5a', 'Sabbia']],
  accentColor: [['#a4473b', 'Ruggine'], ['#d9b48a', 'Panna'], ['#4f7fb0', 'Fiordaliso'], ['#5f8a4a', 'Salvia'], ['#c9a227', 'Senape'], ['#8a5ab0', 'Glicine']],
};

export const LOOK_STYLES = {
  hair: [['tufts', 'Ciuffi'], ['bob', 'Caschetto'], ['long', 'Lunghi'], ['curly', 'Ricci'], ['longcurly', 'Ricci lunghi'], ['bun', 'Chignon'], ['spiky', 'Spettinati'], ['none', 'Nessuno']] as Array<[HairStyle, string]>,
  hat: [['wide', 'Tesa larga'], ['top', 'Cilindro'], ['beanie', 'Berretto'], ['none', 'Nessuno']] as Array<[HatStyle, string]>,
  outfit: [['coat', 'Cappotto'], ['cloak', 'Mantella'], ['overalls', 'Salopette'], ['sweater', 'Maglione']] as Array<[Outfit, string]>,
  glasses: [['none', 'Nessuno'], ['round', 'Tondi'], ['square', 'Squadrati'], ['monocle', 'Monocolo']] as Array<[Glasses, string]>,
  beard: [['none', 'Nessuna'], ['short', 'Corta'], ['full', 'Folta'], ['braid', 'Con treccia']] as Array<[Beard, string]>,
  mustache: [['none', 'Nessuno'], ['thin', 'Sottili'], ['handlebar', 'A manubrio'], ['bushy', 'Folti']] as Array<[Mustache, string]>,
};

export const DEFAULT_LOOK: CustodeLook = {
  skin: '#f2cfb0', sparkle: false, hair: 'tufts', hairColor: '#6b4a33', eyes: '#1b1a20',
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
  const s = JSON.stringify([l.skin, l.sparkle, l.hair, l.hairColor, l.eyes, l.glasses, l.beard, l.mustache, l.beardColor, l.freckles, l.bandaid, l.hat, l.hatColor, l.outfit, l.outfitColor, l.accentColor]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
