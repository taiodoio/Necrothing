// Gesti unificati mouse/touch: tap, trascinamento (pan o drag oggetto),
// pinch per lo zoom, rotella; più la tastiera (WASD/frecce, E, C, V).

export interface InputHandlers {
  tap(x: number, y: number): void;
  /** Ritorna true se il trascinamento "appartiene" a un oggetto (non pan). */
  dragStart(x: number, y: number): boolean;
  dragMove(x: number, y: number, dx: number, dy: number, owned: boolean): void;
  dragEnd(x: number, y: number, owned: boolean): void;
  zoom(factor: number): void;
  key(key: string, down: boolean): void;
}

export class Input {
  private pointers = new Map<number, { x: number; y: number }>();
  private start = { x: 0, y: 0 };
  private last = { x: 0, y: 0 };
  private dragging = false;
  private owned = false;
  private pinchDist = 0;
  private multi = false;
  readonly keys = new Set<string>();
  private readonly el: HTMLElement;
  private readonly h: InputHandlers;

  constructor(el: HTMLElement, h: InputHandlers) {
    this.el = el;
    this.h = h;
    el.addEventListener('pointerdown', this.down);
    el.addEventListener('pointermove', this.move);
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.cancel);
    el.addEventListener('wheel', this.wheel, { passive: false });
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);
    window.addEventListener('blur', () => this.keys.clear());
  }

  private down = (e: PointerEvent) => {
    this.el.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.start = { x: e.clientX, y: e.clientY };
      this.last = { ...this.start };
      this.dragging = false;
      this.owned = false;
      this.multi = false;
    } else if (this.pointers.size === 2) {
      this.multi = true;
      if (this.dragging) { this.h.dragEnd(this.last.x, this.last.y, this.owned); this.dragging = false; this.owned = false; }
      this.pinchDist = this.distance();
    }
  };

  private distance() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private move = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (this.pointers.size >= 2) {
      const d = this.distance();
      if (this.pinchDist > 0 && d > 0) this.h.zoom(this.pinchDist / d);
      this.pinchDist = d;
      // pan col baricentro
      const [a, b] = [...this.pointers.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (this.last && this.multi) this.h.dragMove(mx, my, mx - this.last.x, my - this.last.y, false);
      this.last = { x: mx, y: my };
      return;
    }
    if (this.multi) return;
    const dist = Math.hypot(e.clientX - this.start.x, e.clientY - this.start.y);
    if (!this.dragging && dist > 7) {
      this.dragging = true;
      this.owned = this.h.dragStart(this.start.x, this.start.y);
    }
    if (this.dragging) this.h.dragMove(e.clientX, e.clientY, e.clientX - this.last.x, e.clientY - this.last.y, this.owned);
    this.last = { x: e.clientX, y: e.clientY };
  };

  private up = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) {
      if (this.dragging) this.h.dragEnd(e.clientX, e.clientY, this.owned);
      else if (!this.multi) this.h.tap(e.clientX, e.clientY);
      this.dragging = false;
      this.owned = false;
      this.multi = false;
    } else if (this.pointers.size === 1) {
      const [p] = [...this.pointers.values()];
      this.last = { ...p };
    }
  };

  private cancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.dragging && this.pointers.size === 0) this.h.dragEnd(this.last.x, this.last.y, this.owned);
    this.dragging = false;
  };

  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    this.h.zoom(Math.exp(e.deltaY * 0.0012));
  };

  private keydown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (!this.keys.has(k)) { this.keys.add(k); this.h.key(k, true); }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  };

  private keyup = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    this.keys.delete(k);
    this.h.key(k, false);
  };
}
