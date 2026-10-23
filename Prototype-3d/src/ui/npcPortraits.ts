// Ritratti dei personaggi (corvo, gatto, fantasma, zombie…) per le notifiche
// in alto: lo stesso modello della scena, disegnato una volta su un canvas a
// parte e tenuto come immagine. Testa e busto, girati un po' verso destra
// (la notifica sta alla loro destra).

import * as THREE from 'three';
import { buildRig, type CharacterKind } from '../view/characters.ts';

const SIZE = 192;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 60);
const done = new Map<CharacterKind, string>();

function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#e9eff0', '#3b342a', 1.3));
  const key = new THREE.DirectionalLight('#fff0da', 2.4);
  key.position.set(-1.6, 2.6, 2.4);
  const rim = new THREE.DirectionalLight('#bcd2ff', 1.3);
  rim.position.set(1.9, 1.7, -2.3);
  scene.add(key, rim);
}

/**
 * Il ritratto del personaggio (data URL; vuota senza WebGL). Gli animali piccoli
 * si inquadrano interi, le figure alte dalla vita in su.
 */
export function npcPortrait(kind: CharacterKind): string {
  const ready = done.get(kind);
  if (ready !== undefined) return ready;
  let url = '';
  try {
    if (!renderer) setup();
    const rig = buildRig(kind, 'lowpoly');
    rig.root.rotation.y = 0.55;
    // le parti additive (il velo dei fantasmi) sono fatte per brillare sul buio della scena:
    // su fondo trasparente lascerebbero un alone su tutta l'immagine, qui sono trasparenti normali
    rig.root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m && !Array.isArray(m) && m.blending === THREE.AdditiveBlending) {
        const c = m.clone();
        c.blending = THREE.NormalBlending;
        c.depthWrite = false;
        (o as THREE.Mesh).material = c;
      }
    });
    scene!.add(rig.root);
    rig.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rig.root);
    const size = box.getSize(new THREE.Vector3());
    const tall = size.y > 1.1;
    // figure alte: dalla vita in su; animali: interi
    const top = box.max.y, bottom = tall ? box.min.y + size.y * 0.42 : box.min.y - size.y * 0.1;
    const cy = (top + bottom) / 2;
    // quanto inquadrare: l'altezza (o la larghezza, se è più largo che alto: fantasmi, corvi ad ali aperte)
    const h = Math.max(top - bottom, Math.max(size.x, size.z) * 0.85) * (tall ? 1.12 : 1.02);
    const center = box.getCenter(new THREE.Vector3());
    const dist = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.position.set(center.x, cy + h * 0.12, center.z + dist);
    camera.lookAt(center.x, cy, center.z);
    renderer!.render(scene!, camera);
    url = renderer!.domElement.toDataURL('image/png');
    scene!.remove(rig.root);
  } catch { url = ''; }
  done.set(kind, url);
  return url;
}
