// Dove sta andando il Custode: un segno sulla cella toccata (e, volendo, i
// passi del percorso). Tre stili in prova: anello dorato con le frecce,
// anello spettrale col fuoco fatuo, segnaposto sospeso.

import * as THREE from 'three';

export type WalkTargetStyle = 'ring' | 'wisp' | 'pin';

const GOLD = '#f1d39c', GOLD_D = '#b8935a', SPECTRAL = '#85c8ba', INK = '#07080b';

const flat = (geo: THREE.BufferGeometry, color: string, opacity = 1, additive = false) => {
  const m = new THREE.Mesh(geo.rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
  m.renderOrder = 3; // a terra si vede sempre, anche dove il terreno sale
  return m;
};

/** Freccetta a terra che punta verso il centro (lungo -z prima di ruotarla). */
function arrowHead(size: number) {
  const s = new THREE.Shape();
  s.moveTo(0, -size * 0.55); s.lineTo(size * 0.6, size * 0.45); s.lineTo(-size * 0.6, size * 0.45); s.closePath();
  return new THREE.ShapeGeometry(s);
}

export interface WalkTarget {
  group: THREE.Group;
  /** `t` in secondi; `fade` 0..1 (1 = pieno, scende quando il Custode arriva). */
  update(t: number, fade?: number): void;
}

export function createWalkTarget(style: WalkTargetStyle): WalkTarget {
  const group = new THREE.Group();
  const mats: Array<{ m: THREE.MeshBasicMaterial; base: number }> = [];
  const add = (o: THREE.Mesh) => { group.add(o); mats.push({ m: o.material as THREE.MeshBasicMaterial, base: (o.material as THREE.MeshBasicMaterial).opacity }); return o; };
  const fadeAll = (k: number) => { for (const { m, base } of mats) m.opacity = base * k; };

  if (style === 'ring') {
    add(flat(new THREE.RingGeometry(0.3, 0.4, 28), INK, 0.55)).position.y = 0.025;
    const ring = add(flat(new THREE.RingGeometry(0.31, 0.37, 28), GOLD, 0.95));
    ring.position.y = 0.03;
    const arrows = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const a = add(flat(arrowHead(0.16), GOLD, 0.95));
      const ang = (i / 4) * Math.PI * 2;
      a.position.set(Math.sin(ang) * 0.58, 0.032, Math.cos(ang) * 0.58);
      a.rotation.y = ang;
      arrows.add(a);
    }
    group.add(arrows);
    return {
      group,
      update: (t, fade = 1) => {
        const k = (Math.sin(t * 5) + 1) / 2;
        ring.scale.setScalar(1 + k * 0.08);
        arrows.children.forEach((a, i) => { const ang = (i / 4) * Math.PI * 2; const r = 0.62 - k * 0.1; a.position.set(Math.sin(ang) * r, 0.032, Math.cos(ang) * r); });
        fadeAll(fade);
      },
    };
  }

  if (style === 'wisp') {
    const outer = add(flat(new THREE.RingGeometry(0.34, 0.42, 28), SPECTRAL, 0.55, true));
    const inner = add(flat(new THREE.RingGeometry(0.12, 0.17, 20), SPECTRAL, 0.8, true));
    outer.position.y = inner.position.y = 0.03;
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 1), new THREE.MeshBasicMaterial({ color: '#d6fff4', transparent: true, opacity: 0.95 }));
    const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), new THREE.MeshBasicMaterial({ color: SPECTRAL, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    for (const o of [orb, halo]) { group.add(o); mats.push({ m: o.material as THREE.MeshBasicMaterial, base: (o.material as THREE.MeshBasicMaterial).opacity }); }
    return {
      group,
      update: (t, fade = 1) => {
        const y = 0.55 + Math.sin(t * 2.4) * 0.08;
        orb.position.y = halo.position.y = y;
        halo.scale.setScalar(1 + Math.sin(t * 6) * 0.15);
        outer.scale.setScalar(1 + ((t * 0.8) % 1) * 0.35);
        (outer.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - ((t * 0.8) % 1)) * fade;
        inner.rotation.z = t;
        for (const { m, base } of mats) if (m !== outer.material) m.opacity = base * fade;
      },
    };
  }

  // segnaposto: una freccia a pixel che punta in giù, sospesa e ondeggiante, con l'ombra a terra
  const shadow = add(flat(new THREE.CircleGeometry(0.2, 18), INK, 0.45));
  shadow.position.y = 0.025;
  const pin = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.22); shape.lineTo(0.2, 0.02); shape.lineTo(0.08, 0.02); shape.lineTo(0.08, 0.2); shape.lineTo(-0.08, 0.2); shape.lineTo(-0.08, 0.02); shape.lineTo(-0.2, 0.02); shape.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false }).translate(0, 0, -0.03), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true }));
  const edge = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false }).scale(1.25, 1.18, 1).translate(0, -0.01, -0.035), new THREE.MeshBasicMaterial({ color: INK, transparent: true }));
  const side = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false }).translate(0, -0.015, -0.04), new THREE.MeshBasicMaterial({ color: GOLD_D, transparent: true }));
  for (const o of [edge, side, body]) { o.renderOrder = 3; pin.add(o); mats.push({ m: o.material as THREE.MeshBasicMaterial, base: 1 }); }
  group.add(pin);
  return {
    group,
    update: (t, fade = 1) => {
      const b = Math.abs(Math.sin(t * 3.2));
      pin.position.y = 0.45 + b * 0.18;
      pin.rotation.y = t * 1.5;
      shadow.scale.setScalar(1 - b * 0.25);
      fadeAll(fade);
    },
  };
}

/** I passi del percorso: una traccia di puntini da `from` all'arrivo (più chiara verso il Custode). */
export function pathDots(from: THREE.Vector3, points: THREE.Vector3[], heightAt: (x: number, z: number) => number, step = 0.4): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.CircleGeometry(0.055, 8).rotateX(-Math.PI / 2);
  const pts: THREE.Vector3[] = [];
  let prev = from.clone();
  let carry = step * 0.8;
  for (const p of points) {
    const seg = p.clone().sub(prev), len = Math.hypot(seg.x, seg.z);
    for (let d = carry; d < len; d += step) pts.push(prev.clone().addScaledVector(seg, d / len));
    carry = (carry - len) % step; if (carry < 0) carry += step;
    prev = p.clone();
  }
  const keep = pts.filter((p) => p.distanceTo(points[points.length - 1]) > 0.45); // non sotto l'anello
  keep.forEach((p, i) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.25 + 0.6 * (i / Math.max(1, keep.length - 1)), depthWrite: false, depthTest: false }));
    m.renderOrder = 3;
    m.position.set(p.x, heightAt(p.x, p.z) + 0.03, p.z);
    g.add(m);
  });
  return g;
}
