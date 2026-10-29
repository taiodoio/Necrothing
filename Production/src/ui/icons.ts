// Le icone UI sono low-poly e colorate (src/ui/lpIcons.ts). Le icone d'azione
// restano SVG locali, così si possono usare anche come sfondo e nei canvas.
import { drawLpIcon, lpIconUrl } from './lpIcons.ts';

export type IconName = string;

export function iconUrl(name: string): string {
  return lpIconUrl(name);
}

export function drawIcon(g: CanvasRenderingContext2D, name: string, x: number, y: number, size: number) {
  drawLpIcon(g, name, x, y, size);
}

export function icon(name: string, size?: number): HTMLElement {
  const el = document.createElement('i');
  el.className = 'pxi';
  el.setAttribute('aria-hidden', 'true');
  el.style.backgroundImage = iconUrl(name);
  if (size) el.style.setProperty('--s', `${size}px`);
  return el;
}

export function hydrateIcons(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-icon]')) {
    el.classList.add('pxi');
    el.style.backgroundImage = iconUrl(el.dataset.icon!);
  }
}

export const ACH_ICONS: Record<string, string> = {
  first_burial: 'shovel', five_graves: 'district', ten_graves: 'district', twentyfive_graves: 'district',
  abstract_grief: 'heart', variety_5: 'variant', all_categories: 'book',
  florist: 'flower', green_thumb: 'flower', gardener_master: 'flower',
  caretaker: 'broom', caretaker_silver: 'broom', fixer: 'hammer',
  haunted: 'ghost', ghost_whisperer: 'ghost', socialite: 'paw', decorator: 'pumpkin',
  spender: 'wisp', photographer: 'photo', mausoleum_built: 'mausoleum',
  district_gothic: 'bat', district_natural: 'tree', district_tech: 'gear', master_planner: 'top',
  expansion: 'fence', rank_3: 'rank', rank_5: 'prestige',
};

export const ACH_COUNT: Record<string, number> = {
  five_graves: 5, ten_graves: 10, twentyfive_graves: 25, variety_5: 5, green_thumb: 10, gardener_master: 50,
  caretaker_silver: 15, fixer: 5, ghost_whisperer: 5, socialite: 10, decorator: 5, spender: 50, photographer: 3, rank_3: 3,
};
