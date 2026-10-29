// Il nome del Custode (quello del giocatore): qualsiasi alfabeto, spazi,
// apostrofi, trattini e punti; niente emoji né simboli; da 1 a NAME_MAX
// caratteri visibili. Lo usano il primo ingresso e il profilo.

export const NAME_MAX = 24;

export type NameCheck = { ok: true; name: string } | { ok: false; error: 'empty' | 'long' | 'chars' };

/** Caratteri visibili (le lettere composte contano una volta sola). */
export function nameLength(s: string): number {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: 'grapheme' }) => { segment(s: string): Iterable<unknown> } }).Segmenter;
  return Seg ? [...new Seg(undefined, { granularity: 'grapheme' }).segment(s)].length : [...s].length;
}

/** Controlla e ripulisce un nome (spazi doppi e ai lati via). */
export function checkName(raw: string): NameCheck {
  const name = raw.normalize('NFC').replace(/\s+/gu, ' ').trim();
  if (!name) return { ok: false, error: 'empty' };
  if (!/^[\p{L}\p{M}\p{N} '’.\-]+$/u.test(name) || !/\p{L}/u.test(name)) return { ok: false, error: 'chars' };
  if (nameLength(name) > NAME_MAX) return { ok: false, error: 'long' };
  return { ok: true, name };
}
