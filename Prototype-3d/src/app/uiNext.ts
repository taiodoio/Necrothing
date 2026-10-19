// Interfaccia nuova, in prova: per ora si accende solo nella pagina di misura
// (bench.html); quando convince si accende anche nel gioco. Comprende:
// - oggetti di contorno (sentieri, recinzioni, muretti, erba alta, fango,
//   aiuole, cespugli) selezionabili solo in Modifica; fuori ci si cammina sopra;
// - toccando un oggetto il Custode ci va e il menù compare quando arriva;
// - menù contestuale di sole icone;
// - menù di gioco verticale (icona a tre righe), con l'etichetta a destra.

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
