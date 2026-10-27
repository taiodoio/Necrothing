// Ritratti dei personaggi (corvo, gatto, fantasma, zombie…) per le notifiche
// in alto: lo stesso modello della scena, disegnato una volta su un canvas a
// parte e tenuto come immagine. Testa e busto, girati un po' verso destra
// (la notifica sta alla loro destra).

import * as THREE from 'three';
import type { CustodeLook } from '../game/look.ts';
import { buildRig, type CharacterKind } from '../view/characters.ts';
import { createWispVisual } from '../render/lowpoly/wisp.ts';
import { alive, drewSomething } from './offscreen.ts';

const SIZE = 192;
/**
 * Figure umane (o quasi: zombie, strega, vampiro, scheletro): stessa scala per
 * tutte, Custode compreso. Inquadratura quadrata larga FRAME (unità del mondo),
 * che parte BUST sotto il collo (dove la testa si attacca al corpo): ogni
 * figura esce allo stesso ingrandimento, i cappelli alti salgono di più.
 */
const FRAME = 1.15;
const BUST = 0.3;
/** L'immagine delle figure umane è più alta che larga: i cappelli alti (strega) salgono senza tagli. */
const TALL = 1.5;

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 60);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 60);
const done = new Map<string, string>();

function setup() {
  renderer?.dispose();
  renderer = null;
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
 * Il ritratto del personaggio (data URL; vuota senza WebGL). Il Custode col
 * suo aspetto (`look`). Animali e fantasmi si inquadrano interi.
 */
export function npcPortrait(kind: CharacterKind, look?: CustodeLook): string {
  const key = look ? `${kind}:${JSON.stringify(look)}` : kind;
  const ready = done.get(key);
  if (ready !== undefined) return ready;
  let url = '';
  // un secondo tentativo con un renderer nuovo, se il primo esce vuoto (contesto perso)
  for (let attempt = 0; attempt < 2 && !url; attempt++) url = draw(kind, look, attempt > 0);
  // vuota non si tiene: alla prossima notifica si riprova
  if (url) done.set(key, url);
  return url;
}

function draw(kind: CharacterKind, look: CustodeLook | undefined, fresh: boolean): string {
  try {
    if (fresh || !alive(renderer)) setup();
    const rig = buildRig(kind, 'lowpoly', look);
    rig.root.rotation.y = 0.32; // girati come il Custode nel suo ritratto
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
    const center = box.getCenter(new THREE.Vector3());
    const head = rig.parts.head;
    if (head && size.y > 1.1) {
      const neck = head.getWorldPosition(new THREE.Vector3());
      const bottom = neck.y - BUST, top = bottom + FRAME * TALL;
      ortho.left = -FRAME / 2; ortho.right = FRAME / 2; ortho.top = (FRAME * TALL) / 2; ortho.bottom = -(FRAME * TALL) / 2;
      ortho.updateProjectionMatrix();
      const cy = (top + bottom) / 2;
      ortho.position.set(neck.x, cy, neck.z + 8);
      ortho.lookAt(neck.x, cy, neck.z);
      renderer!.setSize(SIZE, Math.round(SIZE * TALL), false);
      renderer!.render(scene!, ortho);
    } else {
      const top = box.max.y, bottom = box.min.y, cy = (top + bottom) / 2;
      // se è più largo che alto (ali, veli) conta la larghezza
      const h = Math.max(top - bottom, Math.max(size.x, size.z) * 0.85) * 1.02;
      const dist = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      camera.position.set(center.x, cy + h * 0.12, center.z + dist);
      camera.lookAt(center.x, cy, center.z);
      renderer!.render(scene!, camera);
    }
    const url = drewSomething(renderer!) ? renderer!.domElement.toDataURL('image/png') : '';
    renderer!.setSize(SIZE, SIZE, false);
    scene!.remove(rig.root);
    return url;
  } catch { return ''; }
}

/**
 * Il fuoco fatuo della scena, grande (data URL; vuota senza WebGL): fiammella,
 * cuore, occhietti e scintille, girato verso chi guarda. L'alone lo fa la pagina.
 */
export function wispPortrait(): string {
  const ready = done.get('wisp');
  if (ready !== undefined) return ready;
  let url = '';
  for (let attempt = 0; attempt < 2 && !url; attempt++) {
    try {
      if (attempt > 0 || !alive(renderer)) setup();
      const v = createWispVisual();
      v.update(0.6, 0);
      // niente alone additivo (su fondo trasparente velerebbe tutto); la faccina verso la camera
      v.root.children.filter((o) => (o as THREE.Sprite).isSprite).forEach((o) => v.root.remove(o));
      v.root.children[0].rotation.set(0.06, 0.12, -0.05);
      scene!.add(v.root);
      v.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(v.root);
      const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      const h = Math.max(size.y, size.x) * 1.08;
      const dist = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      camera.position.set(c.x, c.y + h * 0.05, c.z + dist);
      camera.lookAt(c.x, c.y, c.z);
      renderer!.render(scene!, camera);
      url = drewSomething(renderer!) ? renderer!.domElement.toDataURL('image/png') : '';
      scene!.remove(v.root);
    } catch { url = ''; }
  }
  if (url) done.set('wisp', url);
  return url;
}
