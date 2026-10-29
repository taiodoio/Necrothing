// Fuoco fatuo low-poly: fiammella a goccia luminosa (involucro spettrale e
// cuore chiaro), due occhietti, scintille che le girano attorno e un alone
// morbido sempre visibile (anche di giorno). Ondeggia, pulsa e guizza.

import * as THREE from 'three';
import { LP } from './kit.ts';
import { LPC } from './palette.ts';
import { instantiate, LOWPOLY_MATERIALS, type CachedModel } from '../modelCache.ts';
import { radialGlowTexture } from '../glowTexture.ts';

let flameModel: CachedModel | null = null;
let sparkModel: CachedModel | null = null;
let glowTex: THREE.Texture | null = null;
const coreMat = new THREE.MeshBasicMaterial({ color: '#e9fff8', toneMapped: false });

function model(build: (lp: LP) => void): CachedModel {
  const lp = new LP('wisp');
  build(lp);
  const { geometries, lights } = lp.build();
  return { geometries, lights, height: 0.5 };
}

function glowTexture(): THREE.Texture {
  glowTex ??= radialGlowTexture([[0, 1], [0.25, 0.55], [1, 0]]);
  return glowTex;
}

export interface WispVisual { root: THREE.Group; update(t: number, phase: number): void }

export function createWispVisual(): WispVisual {
  flameModel ??= model((lp) => {
    // involucro spettrale a goccia con la punta piegata
    lp.lathe(0, -0.16, 0, [[0, 0], [0.1, 0.03], [0.14, 0.11], [0.13, 0.2], [0.09, 0.3], [0.045, 0.38], [0, 0.44]], 9, LPC.spectral, { bucket: 'glow', jitter: 0, vary: 0.06, ao: 0 });
    lp.push([0.02, 0.26, 0], 0, 0, -0.35).cyl(0, 0, 0, 0.04, 0, 0.16, 5, '#a8f0de', { bucket: 'glow', jitter: 0 }).pop();
    // occhietti (sul lato +z)
    for (const s of [-1, 1]) lp.blob(s * 0.045, 0.02, 0.125, 0.018, 0.024, 0.01, '#1b2a30', { jitter: 0, ao: 0 });
  });
  sparkModel ??= model((lp) => lp.blob(0, 0, 0, 0.025, 0.025, 0.025, '#c9fff0', { bucket: 'glow', jitter: 0, ao: 0 }));
  const root = new THREE.Group();
  root.scale.setScalar(1.4);
  const body = new THREE.Group();
  body.add(instantiate(flameModel, { castShadow: false }));
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), coreMat);
  core.position.y = -0.05;
  body.add(core);
  root.add(body);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: LPC.spectral, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.scale.setScalar(0.9);
  glow.renderOrder = 3;
  root.add(glow);
  const sparks = [0, 1, 2].map(() => { const s = instantiate(sparkModel!, { castShadow: false }); root.add(s); return s; });
  return {
    root,
    update(t, ph) {
      // ondeggia verso la camera (faccina leggibile) e guizza
      body.rotation.set(Math.sin(t * 1.7 + ph) * 0.12, Math.PI / 4 + Math.sin(t * 0.9 + ph) * 0.35, Math.sin(t * 2.3 + ph) * 0.1);
      const f = 1 + Math.sin(t * 9 + ph) * 0.06 + Math.sin(t * 13.7 + ph * 2) * 0.04;
      body.scale.set(1 / Math.sqrt(f), f, 1 / Math.sqrt(f));
      glow.material.opacity = 0.42 + Math.sin(t * 5 + ph) * 0.1;
      glow.scale.setScalar(0.9 + Math.sin(t * 3 + ph) * 0.1);
      sparks.forEach((s, i) => {
        const a = t * (1.6 + i * 0.4) + ph + i * 2.1;
        s.position.set(Math.cos(a) * 0.24, 0.05 + Math.sin(t * 2 + i) * 0.12 + i * 0.05, Math.sin(a) * 0.24);
        s.scale.setScalar(0.6 + Math.max(0, Math.sin(t * 6 + i * 2 + ph)) * 0.8);
      });
    },
  };
}
