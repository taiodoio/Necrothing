// Decori naturali dell'interfaccia, disegnati una volta all'avvio e passati al
// CSS come immagini (variabili --ivy, --sprig, --fern, --vines-*, --zones-*):
// l'edera negli angoli dei pannelli, i rametti su HUD, notifiche e finestre, il
// ciuffo di foglie accanto alla foto e, sullo sfondo, rami d'edera che entrano
// dai bordi e zone più scure sfumate.

type Pt = [number, number];
const P = (pts: Pt[]) => pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
/** Verdi a due toni (luce da sinistra), come le foglie low-poly del gioco. */
const G: Array<[string, string]> = [['#6f9150', '#57773f'], ['#5d7d43', '#4a6a36'], ['#4b6a3a', '#3b5530'], ['#7f9d5a', '#66854a']];
const BARK = '#4a3a2a';

const leaf = (x: number, y: number, s: number, rot: number, [c1, c2]: [string, string]) => `<g transform="translate(${x} ${y}) rotate(${rot})">`
  + `<polygon points="${P([[0, -s], [-0.55 * s, -0.12 * s], [-0.32 * s, 0.5 * s], [0, 0.85 * s]])}" fill="${c1}"/>`
  + `<polygon points="${P([[0, -s], [0.55 * s, -0.12 * s], [0.32 * s, 0.5 * s], [0, 0.85 * s]])}" fill="${c2}"/></g>`;
const flower = (x: number, y: number, r: number, c: string, core = '#f0c46e') => {
  const petal = (a: number) => `<polygon points="0,0 ${(r * Math.cos((a - 18) * Math.PI / 180)).toFixed(1)},${(r * Math.sin((a - 18) * Math.PI / 180)).toFixed(1)} ${(r * Math.cos((a + 18) * Math.PI / 180)).toFixed(1)},${(r * Math.sin((a + 18) * Math.PI / 180)).toFixed(1)}" fill="${c}"/>`;
  return `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(petal).join('')}<circle r="${r * 0.32}" fill="${core}"/></g>`;
};
const svg = (w: number, h: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const branchPath = (d: string, w: number) => `<path d="${d}" fill="none" stroke="${BARK}" stroke-width="${w}" stroke-linecap="round"/>`;

/** Edera nell'angolo in alto a sinistra dei pannelli (a destra si specchia). */
export function ivySvg(): string {
  let s = branchPath('M-4 22 C 40 14, 90 8, 176 10', 3) + branchPath('M18 -4 C 12 50, 10 100, 8 176', 3) + branchPath('M30 18 C 48 40, 52 60, 46 86', 2);
  const top = [[34, 14, 13, 70], [56, 12, 11, -110], [78, 9, 12, 75], [102, 8, 10, -100], [126, 8, 9, 80], [150, 9, 8, -95], [170, 10, 7, 85]];
  const left = [[16, 34, 13, 160], [14, 58, 12, 20], [12, 82, 11, 165], [11, 106, 10, 15], [10, 130, 9, 170], [9, 154, 7, 20]];
  const mid = [[44, 34, 10, 120], [50, 56, 9, -60], [47, 78, 8, 130]];
  [...top, ...left, ...mid].forEach(([x, y, r, a], i) => { s += leaf(x, y, r, a, G[i % G.length]); });
  s += flower(28, 26, 7, '#e9d8f2') + flower(66, 24, 5, '#f2b8c8') + flower(24, 70, 5, '#f2b8c8') + flower(116, 18, 4, '#e9d8f2');
  s += '<circle cx="44" cy="44" r="2.6" fill="#a5372a"/><circle cx="48" cy="47" r="2.2" fill="#c2453a"/><circle cx="20" cy="96" r="2.4" fill="#a5372a"/>';
  return svg(180, 180, s);
}

/** Rametto piccolo per un angolo (in alto a sinistra; il CSS lo gira per gli altri). */
export function sprigSvg(): string {
  let s = branchPath('M2 10 C 18 6, 34 4, 60 5', 1.8) + branchPath('M8 2 C 6 20, 5 36, 4 60', 1.8);
  [[16, 8, 6, 70], [27, 6, 5.5, -110], [38, 5, 5, 75], [50, 5, 4, -100], [7, 18, 6, 160], [6, 29, 5.5, 20], [5, 40, 4.5, 165], [5, 50, 3.5, 15]].forEach(([x, y, r, a], i) => { s += leaf(x, y, r, a, G[i % G.length]); });
  return svg(64, 64, s + flower(11, 11, 4, '#e9d8f2') + flower(30, 10, 2.6, '#f2b8c8') + '<circle cx="18" cy="17" r="1.6" fill="#a5372a"/>');
}

/** Ciuffo di foglie e fiori ai piedi della foto. */
export function fernSvg(): string {
  let s = '';
  [[20, 56, 14, -50], [34, 48, 15, -20], [48, 46, 16, 8], [62, 50, 14, 34], [74, 58, 12, 60], [28, 62, 10, -75], [56, 60, 11, 70], [42, 58, 12, -5]].forEach(([x, y, r, a], i) => { s += leaf(x, y, r, a, G[i % G.length]); });
  return svg(90, 70, s + flower(40, 40, 5, '#f2b8c8') + flower(60, 44, 4, '#e9d8f2'));
}

/** Generatore ripetibile (stesso seme, stesso disegno). */
const rng = (seed: number) => { let x = seed; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; };

/**
 * Rami d'edera che entrano dai bordi, a sinistra e a destra alternati: un ramo
 * curvo con foglie a tre lobi e qualche rametto laterale. Colore pieno e
 * trasparenza sul gruppo, così dove le foglie si sovrappongono non si scurisce.
 */
export function vinesSvg(color: string, opacity: number, W: number, H: number, seed: number, opts: { count?: number; reach?: number } = {}): string {
  const rnd = rng(seed);
  const cub = (p: Pt[], t: number): Pt => { const u = 1 - t; return [0, 1].map((k) => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]) as Pt; };
  const IVY = 'M0 0C-2.6-1-6.4-3-7.6-6.8-5.8-7.8-4-7.6-2.8-6.6-3.8-9.8-2.2-13 0-15 2.2-13 3.8-9.8 2.8-6.6 4-7.6 5.8-7.8 7.6-6.8 6.4-3 2.6-1 0 0Z';
  const ivyLeaf = (x: number, y: number, s: number, a: number) => {
    const r = (a + 180) * Math.PI / 180;
    return `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(0)}) scale(${s.toFixed(2)})" d="${IVY}"/>`
      + `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${(-Math.sin(r) * 4 * s).toFixed(1)} ${(Math.cos(r) * 4 * s).toFixed(1)}" stroke="${color}" stroke-width="${(0.9 * s).toFixed(2)}"/>`;
  };
  let out = '';
  const branch = (left: boolean, y: number, len: number, sw: number) => {
    const dir = left ? 1 : -1, sx = left ? -6 : W + 6;
    const ey = y + (rnd() - 0.5) * 120;
    const p: Pt[] = [[sx, y], [sx + dir * len * 0.35, y + (rnd() - 0.5) * 140], [sx + dir * len * 0.7, ey + (rnd() - 0.5) * 120], [sx + dir * len, ey]];
    out += `<path d="M${p[0]} C${p[1]} ${p[2]} ${p[3]}" stroke="${color}" stroke-width="${sw.toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    const n = Math.round(len / 12);
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1), [x, y2] = cub(p, t), [x2, y3] = cub(p, Math.min(1, t + 0.01));
      const ang = Math.atan2(y3 - y2, x2 - x) * 180 / Math.PI + 90;
      const s = (2.0 - t * 0.9) * (0.75 + rnd() * 0.5), side = i % 2 ? 1 : -1;
      out += ivyLeaf(x + side * 3, y2 + side * 2, s, ang + side * (55 + rnd() * 30));
      if (rnd() < 0.45) out += ivyLeaf(x - side * 2, y2 - side * 3, s * 0.8, ang - side * (60 + rnd() * 30));
      if (rnd() < 0.3 && t < 0.85) {
        const tl = 22 + rnd() * 26, a2 = (ang - 90 + side * (40 + rnd() * 30)) * Math.PI / 180;
        const tx = x + Math.cos(a2) * tl, ty = y2 + Math.sin(a2) * tl;
        out += `<path d="M${x.toFixed(1)} ${y2.toFixed(1)} Q${((x + tx) / 2 + side * 6).toFixed(1)} ${((y2 + ty) / 2).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}" stroke="${color}" stroke-width="${(sw * 0.55).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
        out += ivyLeaf(tx, ty, s * 0.85, a2 * 180 / Math.PI + 90) + ivyLeaf((x + tx) / 2, (y2 + ty) / 2, s * 0.7, a2 * 180 / Math.PI + 90 + side * 70);
      }
    }
  };
  const count = opts.count ?? Math.round(H / 150);
  for (let i = 0; i < count; i++) branch(i % 2 === 0, (i + 0.4 + rnd() * 0.5) * (H / count), W * (opts.reach ?? (0.36 + rnd() * 0.24)), 3.2 + rnd() * 1.4);
  return svg(W, H, `<g fill="${color}" opacity="${opacity}">${out}</g>`);
}

/** Zone più scure, sfumate, sparse a caso (strati radial-gradient per il CSS). */
export function darkZones(rgb: string, n: number, seed: number, alpha: number): string {
  const rnd = rng(seed);
  return Array.from({ length: n }, () => `radial-gradient(${(22 + rnd() * 20).toFixed(0)}% ${(14 + rnd() * 14).toFixed(0)}% at ${(rnd() * 100).toFixed(0)}% ${(rnd() * 100).toFixed(0)}%, rgba(${rgb}, ${(alpha * (0.6 + rnd() * 0.4)).toFixed(2)}), rgba(${rgb}, 0) 100%)`).join(', '); // i18n-ok: stile
}

export const svgUrl = (s: string) => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}")`;

/**
 * Lo stesso disegno come immagine PNG (`url(...)` per il CSS), al doppio della
 * misura: un'immagine si ridisegna molto più in fretta di un SVG con tanti
 * tracciati o con i filtri (su Safari soprattutto). Null se non si riesce.
 */
export function svgToPng(s: string, w: number, h: number, scale = 2): Promise<string | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      const g = c.getContext('2d');
      if (!g) { resolve(null); return; }
      g.drawImage(im, 0, 0, c.width, c.height);
      try { resolve(`url("${c.toDataURL('image/png')}")`); } catch { resolve(null); }
      c.width = c.height = 0;
    };
    im.onerror = () => resolve(null);
    im.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
  });
}

/** Mette i decori a disposizione del CSS (ui-play.css): subito come SVG, poi (appena pronti) come PNG. */
export function installNatureDecor() {
  const st = document.documentElement.style;
  const set = (name: string, s: string, w: number, h: number) => {
    st.setProperty(name, svgUrl(s));
    void svgToPng(s, w, h).then((png) => { if (png) st.setProperty(name, png); });
  };
  set('--ivy', ivySvg(), 180, 180);
  set('--sprig', sprigSvg(), 64, 64);
  set('--fern', fernSvg(), 90, 70);
  set('--vines', vinesSvg('#0e0914', 0.22, 400, 900, 5), 400, 900);
  set('--vines-dialog', vinesSvg('#0e0914', 0.22, 400, 520, 13, { count: 3 }), 400, 520);
  set('--vines-hud', vinesSvg('#0e0914', 0.22, 300, 220, 9, { count: 2, reach: 0.34 }), 300, 220);
  set('--vines-paper', vinesSvg('#784e2a', 0.16, 300, 420, 21, { count: 3, reach: 0.4 }), 300, 420);
  st.setProperty('--zones', darkZones('10, 6, 16', 7, 3, 0.34));
  st.setProperty('--zones-small', darkZones('10, 6, 16', 3, 9, 0.3));
  st.setProperty('--zones-paper', darkZones('120, 84, 40', 3, 4, 0.16));
}
