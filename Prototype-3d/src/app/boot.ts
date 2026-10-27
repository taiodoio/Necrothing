// Schermata di caricamento: la scena del cimitero di sera, il logo con il
// sottotitolo sulla targa (nella lingua del gioco), una frase per fase, la
// barra e la percentuale. Il markup è già in index.html (compare prima del
// codice); qui la si fa avanzare e alla fine sfuma via. Il luccichio della
// barra è un'animazione CSS: va avanti anche mentre il codice lavora (la
// costruzione del cimitero blocca il resto).

import { t } from '../i18n/index.ts';

export interface BootScreen {
  /** Nuova fase: la frase sotto la barra e fin dove arriva la barra. */
  stage(key: string, to: number): void;
  /** Avanzamento dentro la fase (0…1 dell'intera barra). */
  progress(p: number): void;
  /**
   * Barra piena, frase di saluto, poi la schermata sfuma. Con `cta` (solo al
   * primo ingresso) al posto della barra compare il pulsante, e la schermata
   * sfuma quando lo si tocca.
   */
  finish(opts?: { cta?: string }): Promise<void>;
  /** Il sottotitolo tradotto sulla targa, quando il suo carattere è pronto. */
  showTagline(): void;
}

/** Lascia disegnare la pagina (la barra, la frase) prima del prossimo lavoro pesante. */
export const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function bootScreen(): BootScreen {
  const el = document.getElementById('boot');
  const fill = el?.querySelector<HTMLElement>('.boot-fill');
  const line = el?.querySelector<HTMLElement>('.boot-step');
  const pct = el?.querySelector<HTMLElement>('.boot-pct');
  const sub = el?.querySelector<HTMLElement>('.boot-sub');
  let at = 0;
  const set = (p: number) => {
    at = Math.max(at, Math.min(1, p)); // la barra non torna mai indietro
    if (fill) fill.style.transform = `scaleX(${at.toFixed(3)})`;
    if (pct) pct.textContent = t('boot.percent', { n: Math.round(at * 100) });
  };
  if (el) el.setAttribute('aria-label', t('boot.aria'));
  return {
    showTagline: () => {
      if (!sub) return;
      sub.textContent = t('boot.tagline');
      // una lingua dal sottotitolo lungo: il testo si stringe finché sta nella targa
      sub.style.fontSize = '';
      let size = parseFloat(getComputedStyle(sub).fontSize);
      while (sub.scrollWidth > sub.clientWidth && size > 6) { size -= 0.5; sub.style.fontSize = `${size}px`; }
      sub.classList.add('on');
    },
    stage: (key, to) => { if (line) line.textContent = t(key); set(to); },
    progress: set,
    finish: async (opts = {}) => {
      if (!el) return;
      if (line) line.textContent = t('boot.step.ready');
      set(1);
      await sleep(450);
      if (opts.cta) {
        // primo ingresso: il pulsante al posto della barra, sopra un'ombra che lo rende leggibile
        const btn = document.createElement('button');
        btn.className = 'boot-cta';
        btn.textContent = opts.cta;
        el.classList.add('with-cta');
        el.querySelector('.boot-load')?.replaceChildren(btn);
        btn.focus({ preventScroll: true });
        await new Promise<void>((resolve) => btn.addEventListener('click', () => resolve(), { once: true }));
      }
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
