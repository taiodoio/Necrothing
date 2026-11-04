// Gesti unificati mouse/touch: tap, trascinamento (pan o drag oggetto),
// pressione lunga (350 ms: si prende subito l'oggetto o si comincia a disegnare),
// pinch per lo zoom, rotella; più la tastiera (WASD/frecce, E, C, V).

/** Quanto si tiene premuto, fermi, perché il gesto diventi una «pressione lunga». */
export const LONG_PRESS_MS = 350;
/** Oltre questi pixel il dito si sta muovendo: è un trascinamento (e la pressione lunga si annulla). */
const DRAG_PX = 7;

export interface InputHandlers {
  tap(x: number, y: number): void;
  /**
   * Ritorna true se il trascinamento "appartiene" a un oggetto (non pan).
   * `long`: è partito da una pressione lunga (il dito è ancora fermo).
   */
  dragStart(x: number, y: number, long: boolean): boolean;
  dragMove(x: number, y: number, dx: number, dy: number, owned: boolean): void;
  /** `suspended`: è arrivato un secondo dito (pinch o pan a due dita) e il gesto si ferma lì. */
  dragEnd(x: number, y: number, owned: boolean, suspended?: boolean): void;
  /**
   * La pressione lunga in corso, per l'anello che si riempie sotto il dito: `start` (un dito giù),
   * `fire` (350 ms fermi: preso), `cancel` (il dito si è mosso o alzato prima, o è arrivato un secondo dito).
   */
  hold?(phase: 'start' | 'fire' | 'cancel', x: number, y: number): void;
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
  private ignoreBefore = 0;
  private longTimer: ReturnType<typeof setTimeout> | null = null;
  /** La pressione lunga ha preso l'oggetto: alzando il dito non è un tocco. */
  private longOwned = false;

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

  /** Ignora anche i tocchi accodati mentre la scena era occupata. */
  ignorePointerEventsBefore(timestamp: number) {
    this.ignoreBefore = Math.max(this.ignoreBefore, timestamp);
    this.pointers.clear();
    this.clearLong();
    this.dragging = this.owned = this.multi = this.longOwned = false;
  }

  /** Dove sta il dito che sta spostando o disegnando qualcosa (per lo scorrimento ai bordi); null se non c'è. */
  activeDrag(): { x: number; y: number } | null {
    return this.dragging && this.owned && !this.multi && this.pointers.size === 1 ? { ...this.last } : null;
  }

  private clearLong() {
    if (!this.longTimer) return;
    clearTimeout(this.longTimer);
    this.longTimer = null;
    this.h.hold?.('cancel', this.start.x, this.start.y);
  }

  private longPress = () => {
    this.longTimer = null;
    const ok = this.pointers.size === 1 && !this.dragging && !this.multi && this.h.dragStart(this.start.x, this.start.y, true);
    this.h.hold?.(ok ? 'fire' : 'cancel', this.start.x, this.start.y);
    if (!ok) return;
    // da qui il dito sposta (o disegna) senza doversi alzare
    this.dragging = this.owned = this.longOwned = true;
    globalThis.navigator?.vibrate?.(12);
  };

  private down = (e: PointerEvent) => {
    if (e.timeStamp < this.ignoreBefore) return;
    this.el.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.start = { x: e.clientX, y: e.clientY };
      this.last = { ...this.start };
      this.dragging = false;
      this.owned = false;
      this.multi = false;
      this.longOwned = false;
      this.clearLong();
      // il mouse non ha la pressione lunga col tasto destro & co.: solo il principale
      if (e.button === 0 || e.pointerType !== 'mouse') { this.longTimer = setTimeout(this.longPress, LONG_PRESS_MS); this.h.hold?.('start', e.clientX, e.clientY); }
    } else if (this.pointers.size === 2) {
      // il secondo dito sospende quello che si stava facendo: per riprendere serve un gesto nuovo
      this.multi = true;
      this.clearLong();
      if (this.dragging) { this.h.dragEnd(this.last.x, this.last.y, this.owned, true); this.dragging = false; this.owned = false; }
      this.pinchDist = this.distance();
      const [a, b] = [...this.pointers.values()];
      this.last = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
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
    if (!this.dragging && dist > DRAG_PX) {
      this.clearLong(); // il dito si è mosso prima della soglia: niente pressione lunga
      this.dragging = true;
      this.owned = this.h.dragStart(this.start.x, this.start.y, false);
    }
    if (this.dragging) this.h.dragMove(e.clientX, e.clientY, e.clientX - this.last.x, e.clientY - this.last.y, this.owned);
    this.last = { x: e.clientX, y: e.clientY };
  };

  private up = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) {
      this.clearLong();
      if (this.dragging) this.h.dragEnd(e.clientX, e.clientY, this.owned);
      else if (!this.multi && !this.longOwned) this.h.tap(e.clientX, e.clientY);
      this.dragging = false;
      this.owned = false;
      this.multi = false;
      this.longOwned = false;
    } else if (this.pointers.size === 1) {
      const [p] = [...this.pointers.values()];
      this.last = { ...p };
    }
  };

  private cancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    this.clearLong();
    if (this.dragging && this.pointers.size === 0) this.h.dragEnd(this.last.x, this.last.y, this.owned, true);
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
