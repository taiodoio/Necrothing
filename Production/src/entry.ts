// Carica le traduzioni prima dei moduli UI, che inizializzano alcune etichette
// una sola volta all'importazione.
import { initI18n } from './i18n/index.ts';
await initI18n();
await import('./main.ts');
