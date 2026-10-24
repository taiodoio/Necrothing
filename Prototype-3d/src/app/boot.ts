// Schermata di caricamento: il nome del gioco, un fuoco fatuo che ondeggia,
// la barra e una frase per fase. Il markup è già in index.html (compare
// prima del codice); qui la si fa avanzare e alla fine sfuma via. La barra
// e il fuoco fatuo si muovono con le animazioni CSS, che vanno avanti anche
// mentre il codice lavora (la costruzione del cimitero blocca il resto).

import { t } from '../i18n/index.ts';

export interface BootScreen {
  /** Nuova fase: la frase sotto la barra e fin dove arriva la barra. */
  stage(key: string, to: number): void;
  /** Avanzamento dentro la fase (0…1 dell'intera barra). */
  progress(p: number): void;
  /** Barra piena, frase di saluto, poi la schermata sfuma. */
  finish(): Promise<void>;
}

/** Lascia disegnare la pagina (la barra, la frase) prima del prossimo lavoro pesante. */
export const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function bootScreen(): BootScreen {
  const el = document.getElementById('boot');
  const fill = el?.querySelector<HTMLElement>('.boot-fill');
  const line = el?.querySelector<HTMLElement>('.boot-step');
  let at = 0;
  const set = (p: number) => {
    at = Math.max(at, Math.min(1, p)); // la barra non torna mai indietro
    if (fill) fill.style.transform = `scaleX(${at.toFixed(3)})`;
  };
  if (el) el.setAttribute('aria-label', t('boot.aria'));
  el?.querySelector<HTMLElement>('.boot-sub')?.replaceChildren(t('boot.tagline'));
  return {
    stage: (key, to) => { if (line) line.textContent = t(key); set(to); },
    progress: set,
    finish: async () => {
      if (!el) return;
      if (line) line.textContent = t('boot.step.ready');
      set(1);
      await sleep(450);
      el.classList.add('done');
      await sleep(600);
      el.remove();
    },
  };
}

/**
 * Esegue i lavori a fette di ~30 ms, lasciando disegnare la barra tra una
 * fetta e l'altra; `onProgress` riceve la frazione fatta (0…1).
 */
export async function runSliced(jobs: Array<() => void>, onProgress: (k: number) => void) {
  let i = 0;
  while (i < jobs.length) {
    const until = performance.now() + 30;
    while (i < jobs.length && performance.now() < until) {
      try { jobs[i](); } catch { /* un modello che non si costruisce si riprova quando serve */ }
      i++;
    }
    onProgress(i / jobs.length);
    await nextPaint();
  }
}
