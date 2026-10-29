// Le immagini statiche dell'interfaccia (scripts/bake-previews.mjs): le
// anteprime illuminate di oggetti, tetti e aggiunte della casa e la terra in
// fondo alle schede. Le pubblica Vite col nome che cambia col contenuto, così
// il browser le tiene in cache finché non si rifanno.

const files = (import.meta as unknown as { glob: (p: string, o: object) => Record<string, string> })
  .glob('../assets/{previews,deco}/*.webp', { eager: true, query: '?url', import: 'default' });
const byName = new Map(Object.entries(files).map(([p, url]) => [p.slice(p.lastIndexOf('/') + 1, -'.webp'.length), url]));

/** L'anteprima di un oggetto del catalogo (`house-<id>` per tetti e aggiunte), se c'è. */
export const previewUrl = (id: string) => byName.get(id) ?? null;

/** La terra con lapidi, pala e lanterne in fondo alla scheda della tomba. */
export const groundUrl = () => byName.get('ground') ?? '';

/** Scarica in anticipo le anteprime (es. quelle della scheda che si sta per aprire): aprendola sono già pronte. */
export function warmPreviews(ids: string[]) {
  for (const id of ids) { const u = previewUrl(id); if (u) { const im = new Image(); im.decoding = 'async'; im.src = u; } }
}
