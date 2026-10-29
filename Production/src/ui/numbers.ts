// Numeri per l'interfaccia (puri: li provano i test).

import { t } from '../i18n/index.ts';

/** Punti delle migliaia sempre, anche a 4 cifre (toLocaleString in italiano a volte scrive «1250», a volte «1.250»). */
export const thousands = (n: number): string => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, t('num.thousandsSep'));

/** Il saldo nell'HUD: intero fino a 99.999, poi abbreviato (125k, 1,2 mln) perché non si tagli mai. */
export function shortWisps(n: number): string {
  if (n < 100_000) return thousands(n);
  if (n < 1_000_000) return t('num.thousand', { n: String(Math.floor(n / 1000)) });
  const m = Math.floor(n / 100_000) / 10;
  return t('num.million', { n: String(m).replace('.', t('num.decimalSep')) });
}
