// Foto dell'oggetto e cartolina funebre: il passo «Foto» della sepoltura
// (scatta o scegli, poi si scorre sulla foto per cambiare filtro), il
// ritratto incorniciato con la lapide in piccolo e la finestra della
// cartolina da condividere.

import { memorials } from '../app/persistence.ts';
import { newId } from '../game/rng.ts';
import { h, openModal, progressDialog, toast } from './dom.ts';
import { icon } from './icons.ts';
import { t } from '../i18n/index.ts';
import { applyPhotoFilter, PHOTO_FILTER_LABELS, squareCrop, type PhotoFilter } from './photoFilters.ts';
import { drawPostcard, sharePostcard, type PostcardData } from './postcard.ts';

const FILTERS: PhotoFilter[] = ['none', 'sepia', 'bw', 'worn'];

export const loadImage = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

/** La foto della sepoltura in corso: l'originale ritagliato, il filtro scelto e le versioni filtrate già pronte. */
export class BurialPhoto {
  base: HTMLCanvasElement | null = null;
  filter: PhotoFilter = 'none';
  private cache = new Map<PhotoFilter, string>();
  /** Ultima versione salvata (se si torna indietro dal posizionamento non si salva di nuovo). */
  private stored: { key: string; id: string } | null = null;
  private version = 0;

  get has() { return !!this.base; }

  /** L'immagine filtrata (JPEG) come la si salva. */
  url(f: PhotoFilter = this.filter): string | null {
    if (!this.base) return null;
    let u = this.cache.get(f);
    if (!u) {
      const c = applyPhotoFilter(this.base, f, 11);
      u = c.toDataURL('image/jpeg', 0.85);
      c.width = c.height = 0; // sul telefono la memoria per le tele è poca: questa non serve più
      this.cache.set(f, u);
    }
    return u;
  }

  async load(file: File) {
    const src = URL.createObjectURL(file);
    try { this.base = squareCrop(await loadImage(src)); } finally { URL.revokeObjectURL(src); }
    this.filter = 'none';
    this.cache.clear();
    this.version++;
  }

  step(dir: number) { this.filter = FILTERS[Math.max(0, Math.min(FILTERS.length - 1, FILTERS.indexOf(this.filter) + dir))]; }

  /** Salva la foto filtrata tra le foto delle tombe e ne restituisce l'id (null se non c'è o non si può salvare). */
  async store(): Promise<string | null> {
    const dataUrl = this.url();
    if (!dataUrl) return null;
    const key = `${this.version}:${this.filter}`;
    if (this.stored?.key === key) return this.stored.id;
    const id = newId('mp');
    try { await memorials.put({ id, dataUrl }); this.stored = { key, id }; return id; } catch { toast(t('memorial.saveFailed')); return null; }
  }
}

/** Foto incorniciata; la lapide in piccolo in basso a destra se c'è. Senza foto: cornice vuota. */
export function portrait(src: string | null, stone: string | null): HTMLElement {
  return src
    ? h('div', { class: 'portrait' }, h('img', { class: 'pic', src, alt: '' }), stone ? h('img', { class: 'stone', src: stone, alt: '' }) : null)
    : h('div', { class: 'portrait empty' }, h('div', { class: 'pic' }, icon('photo', 40), t('memorial.noPhoto')));
}

/** Passo «Foto» della sepoltura. `rerender` ridisegna il passo (e il piede, che passa da «Salta» ad «Avanti»). */
export function photoStep(photo: BurialPhoto, rerender: () => void): HTMLElement {
  const pickFile = (camera: boolean) => {
    const input = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    if (camera) input.setAttribute('capture', 'environment');
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      input.remove();
      if (!f) return;
      try { await photo.load(f); } catch { toast(t('memorial.badImage')); return; }
      rerender();
    });
    document.body.append(input);
    input.click();
  };
  const box = h('div', { class: 'photo-pick' },
    h('p', { class: 'muted', style: 'margin:0' }, photo.has ? t('memorial.hint.swipe') : t('memorial.hint.optional')));
  const frame = portrait(photo.url(), null);
  box.append(frame);
  if (photo.has) {
    const i = FILTERS.indexOf(photo.filter);
    const go = (dir: number) => { const before = photo.filter; photo.step(dir); if (photo.filter !== before) rerender(); };
    // scorrimento orizzontale sulla foto: a sinistra il filtro dopo, a destra quello prima
    const pic = frame.querySelector('.pic') as HTMLElement;
    let x0: number | null = null;
    pic.setAttribute('draggable', 'false'); // se no il browser trascina l'immagine e si prende il gesto
    pic.addEventListener('dragstart', (e) => e.preventDefault());
    pic.addEventListener('pointerdown', (e) => { e.preventDefault(); x0 = e.clientX; pic.setPointerCapture(e.pointerId); });
    pic.addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 36) go(dx < 0 ? 1 : -1); });
    pic.addEventListener('pointercancel', () => { x0 = null; });
    box.append(h('div', { class: 'filter-switch' },
      h('button', { class: 'icon-btn small', 'aria-label': t('memorial.filter.prev'), disabled: i === 0, onclick: () => go(-1) }, '‹'),
      h('div', {}, h('b', {}, PHOTO_FILTER_LABELS[photo.filter]), h('div', { class: 'swipe-dots' }, ...FILTERS.map((_, k) => h('i', { class: k === i ? 'on' : '' })))),
      h('button', { class: 'icon-btn small', 'aria-label': t('memorial.filter.next'), disabled: i === FILTERS.length - 1, onclick: () => go(1) }, '›')));
  }
  box.append(h('div', { class: 'row' },
    h('button', { class: 'big-btn ghost', onclick: () => pickFile(true) }, icon('photo', 22), photo.has ? t('memorial.retake') : t('memorial.take')),
    h('button', { class: 'big-btn ghost', onclick: () => pickFile(false) }, photo.has ? t('memorial.another') : t('memorial.fromGallery'))));
  return box;
}

/**
 * La cartolina in un modale sopra al resto (sfondo scuro, X in alto a destra
 * come gli altri modali; il drawer sotto resta com'è): l'immagine e «Condividi»
 * (dove non si può condividere, si scarica). Mentre la si disegna una finestra
 * lo dice; se non si riesce (es. sul telefono manca memoria) lo dice invece di
 * non fare nulla. `data` può essere ancora in preparazione (foto e lapide da caricare).
 */
export async function openPostcard(data: PostcardData | Promise<PostcardData>) {
  const p = progressDialog(t('postcard.preparing'), t('postcard.preparingText'));
  let d: PostcardData, blob: Blob;
  try {
    d = await data;
    const card = await drawPostcard(d);
    blob = await new Promise<Blob>((res, rej) => card.toBlob((b) => (b ? res(b) : rej(new Error(t('postcard.failedText')))), 'image/png'));
    card.width = card.height = 0; // la tela non serve più: sul telefono la sua memoria va liberata subito
  } catch {
    await p.done(t('postcard.failed'), t('postcard.failedText'), false);
    return;
  }
  p.close();
  const url = URL.createObjectURL(blob);
  const share = async () => {
    const r = await sharePostcard(blob, d.name);
    if (r === 'downloaded') toast(t('postcard.saved'));
  };
  openModal(h('div', { class: 'postcard-dialog' },
    h('h3', { class: 'modal-title' }, t('postcard.dialog.title')),
    h('img', { class: 'postcard-view', src: url, alt: t('postcard.dialog.alt', { name: d.name }) }),
    h('button', { class: 'big-btn', onclick: share }, icon('postcard', 22), t('postcard.share'))), { label: t('postcard.dialog.title'), onClose: () => URL.revokeObjectURL(url) });
}
