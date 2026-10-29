// Palette "Necrothing — Stylized Gothic Low-Poly": colori desaturati, pietre
// non troppo chiare, vegetazione spenta. Unico punto da cambiare per
// ritoccare l'intero stile (i generatori usano solo queste chiavi).

export const LPC = {
  charcoal: '#252a30',
  stoneDark: '#343943',
  stone: '#656b73',
  stoneWarm: '#77706a',
  stoneLight: '#9a9690',
  marble: '#b9b3a7',
  grassDark: '#354839',
  grass: '#4a5f3f',
  moss: '#61745a',
  mossBright: '#76875a',
  dry: '#8d805c',
  dryDark: '#6b6242',
  soil: '#534238',
  soilDark: '#3b2f28',
  woodDark: '#49372e',
  wood: '#82634b',
  woodLight: '#9a7a5c',
  iron: '#252b32',
  ironLight: '#3c444d',
  rust: '#6b4130',
  roof: '#3d4556',
  roofDark: '#2c323f',
  lantern: '#f2ac58',
  flame: '#ffc76e',
  flameCore: '#fff0c4',
  window: '#f0a04f',
  spectral: '#85c8ba',
  flowers: ['#b87569', '#c99a8e', '#d6cdb9', '#8f7aa8', '#c9a75e', '#9e4b45'] as readonly string[],
  bone: '#c8c0ad',
  boneDark: '#9d9585',
  leafAutumn: ['#8e5a2e', '#a0682f', '#6e4426', '#9a7a3a'] as readonly string[],
  pine: '#2f4433',
  pineDark: '#24372b',
  leaf: '#4d6640',
  water: '#2c4a50',
  cloth: '#2a2b33',
  red: '#8e2f2a',
  gold: '#b8935a',
  engrave: '#24272c',
} as const;

/** Verdi dell'erba (più scuri alla base, punte più chiare). */
export const GRASS = ['#3f5536', '#4a5f3f', '#56693f', '#5f7345', '#465a3a'] as const;
export const GRASS_DRY = ['#8d805c', '#7a6e4c', '#6b6242', '#9a8a5e'] as const;
