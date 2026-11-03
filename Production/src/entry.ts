// Carica le traduzioni prima di tutto il resto: molti moduli (catalogo, ranghi,
// aree del recinto, etichette…) fissano i loro testi una sola volta
// all'importazione. Per questo qui si importa in modo statico solo i18n, e il
// resto (anche i salvataggi, che si portano dietro stato e catalogo) dopo
// initI18n(): importato prima, restava in italiano in ogni altra lingua.
import { initI18n } from './i18n/index.ts';
await initI18n();
const { initPersistence } = await import('./app/persistence.ts');
await initPersistence();
await import('./main.ts');
