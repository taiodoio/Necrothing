// Interfaccia nuova, accesa sia nel gioco (main.ts) sia nella pagina di misura
// (bench.ts); spegnendola torna l'interfaccia pixel di prima. Comprende:
// - oggetti di contorno (sentieri, recinzioni, muretti, erba alta, fango,
//   aiuole, cespugli) selezionabili solo in Modifica; fuori ci si cammina sopra;
// - toccando un oggetto il Custode ci va e il menù compare quando arriva;
// - menù contestuale di sole icone;
// - menù di gioco verticale (icona a tre righe), con l'etichetta a destra;
// - stile low-poly con tema chiaro e scuro, strumento a traccia, Bottega animata.

let on = false;

export const uiNext = () => on;

/** Tema chiaro o scuro dell'interfaccia nuova; «auto» segue il tema del telefono (e i suoi cambi). */
let themeSetting: 'auto' | 'light' | 'dark' = 'auto';
const dark = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
const resolve = () => (themeSetting === 'auto' ? (dark && !dark.matches ? 'light' : 'dark') : themeSetting);
export function applyTheme(t: 'auto' | 'light' | 'dark') {
  themeSetting = t;
  document.documentElement.dataset.theme = resolve();
}
dark?.addEventListener('change', () => { if (themeSetting === 'auto') document.documentElement.dataset.theme = resolve(); });

/** Da chiamare prima di creare il Game. */
export function setUiNext(v: boolean) {
  on = v;
  document.documentElement.classList.toggle('ui-next', v);
}

/**
 * Interfaccia «viva», accesa nel gioco e nel bench: carte e voci un po' storte,
 * decorazioni sui riquadri, pattern tono su tono, tema scuro marrone, icone
 * sulle schede, angoli automatici di staccionate e muretti.
 */
let play = false;
export const uiPlay = () => play;
export function setUiPlay(v: boolean) {
  play = v;
  document.documentElement.classList.toggle('ui-play', v);
}

/**
 * Casa del Custode e novità collegate, accese nel gioco e nel bench: la casa
 * (da lì parte il Custode) col registro delle sepolture, la personalizzazione
 * e i vantaggi delle aggiunte, la scheda «Casa» in Bottega, i requisiti di
 * sblocco espliciti, il morso del vampiro (si vola da pipistrello).
 */
let preview = false;
export const uiPreview = () => preview;
export function setUiPreview(v: boolean) { preview = v; }
