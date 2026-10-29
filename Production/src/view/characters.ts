// Personaggi procedurali composti da parti (busto, testa, braccia, gambe)
// con pivot alle articolazioni: animazione leggera di idle/camminata/lavoro
// senza scheletri. Parti e perni sono quelli dello stile v2 (render/lowpoly/v2).

import * as THREE from 'three';
import { getModel, instantiate, lightWorldPos } from '../render/modelCache.ts';
import { VOX, type LightAnchor } from '../render/types.ts';
import { humanSpec, sparklePointsV2, type KawaiiSpec, type KPart } from '../render/lowpoly/v2/custode.ts';
import { V2_SPECS as KAWAII } from '../render/lowpoly/v2/npc.ts';
import { LP } from '../render/lowpoly/kit.ts';
import { LOWPOLY_MATERIALS, type CachedModel } from '../render/modelCache.ts';
import { DEFAULT_LOOK, lookKey, type CustodeLook } from '../game/look.ts';

export type CharacterKind =
  | 'custode' | 'priest' | 'gravedigger' | 'mourner' | 'mournerB' | 'ghost' | 'ghostRare'
  | 'zombie' | 'skeleton' | 'gardener' | 'cat' | 'crow' | 'rat' | 'witch' | 'vampire'
  | 'petDog' | 'petCat' | 'petRabbit' | 'petDuck' | 'petCrow';

type PartName = 'body' | 'head' | 'armL' | 'armR' | 'legL' | 'legR' | 'extra';

interface Spec {
  scale?: number;
  bucket?: 'ghost';
  quadruped?: boolean;
  flier?: boolean;
  /** Ampiezza dei sobbalzi (gambe corte). */
  bob?: number;
  /** Spostamento verticale del busto da seduti (unità di design). */
  sitDy?: number;
  /** Testa grande e braccia corte (stile v2): le braccia alzate finirebbero dentro la testa, si aprono di lato. */
  bigHead?: boolean;
}

export interface Rig {
  kind: CharacterKind;
  root: THREE.Group;
  parts: Partial<Record<PartName, THREE.Group>>;
  lights: Array<{ part: THREE.Group; anchor: LightAnchor }>;
  spec: Spec;
}

/** Parti del Custode personalizzato, per aspetto (poche: una per look usato). */
const lookModels = new Map<string, CachedModel>();

function lookPart(spec: KawaiiSpec, key: string, part: KPart): CachedModel | null {
  let m = lookModels.get(key);
  if (!m) {
    const build = spec.parts[part];
    if (!build) return null;
    const lp = new LP(`kawaii:custode:${part}`);
    build(lp);
    const { geometries, lights } = lp.build();
    m = { geometries, lights, height: 1 };
    if (lookModels.size > 120) lookModels.clear();
    lookModels.set(key, m);
  }
  return m;
}

/**
 * Rig di un personaggio. Nel low-poly il Custode può avere un aspetto
 * personalizzato (`look`); nelle vecchie versioni restava quello classico.
 */
// ── Brillantini che scintillano ─────────────────────────────────────────
// Sopra le stelline fisse della pelle brillantinata, a turno qualche punto si
// accende in un lampo a croce (shader a punti, tempo letto a ogni render).

const TWINKLE_VERT = /* glsl, i18n-ok */ `
uniform float uTime;
uniform float uScale;
attribute float aSeed;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float w = sin(uTime * (1.1 + aSeed * 2.4) + aSeed * 37.0);
  vA = pow(max(w, 0.0), 6.0);
  float persp = projectionMatrix[3][3] == 0.0 ? -mv.z : 1.0;
  gl_PointSize = 0.11 * vA * projectionMatrix[1][1] * uScale / persp;
}`;
const TWINKLE_FRAG = /* glsl, i18n-ok */ `
varying float vA;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float star = max(0.0, 1.0 - abs(c.x) * 7.0) * (1.0 - abs(c.y)) + max(0.0, 1.0 - abs(c.y) * 7.0) * (1.0 - abs(c.x));
  float a = clamp(star + max(0.0, 1.0 - length(c) * 3.0), 0.0, 1.0) * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(1.0, 0.96, 1.0) * a, a);
}`;
let twinkleMat: THREE.ShaderMaterial | null = null;
const drawSize = new THREE.Vector2();

function twinkles(look: CustodeLook): THREE.Points {
  twinkleMat ??= new THREE.ShaderMaterial({
    vertexShader: TWINKLE_VERT, fragmentShader: TWINKLE_FRAG,
    uniforms: { uTime: { value: 0 }, uScale: { value: 400 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  // sui brillantini della pelle (che cambiano con capelli, barba e cappello)
  const pts = sparklePointsV2(look);
  const twinkleGeo = new THREE.BufferGeometry();
  twinkleGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap(({ p, n }) => [p.x + n.x * 0.012, p.y + n.y * 0.012, p.z + n.z * 0.012]), 3));
  twinkleGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(pts.map(({ r }) => r), 1));
  const points = new THREE.Points(twinkleGeo, twinkleMat);
  points.name = 'scintille';
  points.raycast = () => undefined; // non intralcia la selezione
  points.onBeforeRender = (renderer) => {
    twinkleMat!.uniforms.uTime.value = performance.now() / 1000;
    twinkleMat!.uniforms.uScale.value = renderer.getDrawingBufferSize(drawSize).y / 2;
  };
  return points;
}

export function buildRig(kind: CharacterKind, look?: CustodeLook): Rig {
  if (kind === 'custode' && look && lookKey(look) !== lookKey(DEFAULT_LOOK)) {
    const rig = buildKawaiiRig(kind, humanSpec(look), lookKey(look));
    if (look.sparkle && rig.parts.head) rig.parts.head.add(twinkles(look));
    return rig;
  }
  return buildKawaiiRig(kind);
}

/**
 * Rig del personaggio: parti e perni dal catalogo di render/lowpoly/v2 (unità
 * mondo); le luci portate (lanterna del Custode, bagliore dei fantasmi)
 * arrivano dai modelli delle parti.
 */
function buildKawaiiRig(kind: CharacterKind, custom?: KawaiiSpec, customKey?: string): Rig {
  const k = custom ?? KAWAII[kind];
  // da seduti il busto resta all'altezza di uno sgabello (≈0,26) invece di affondare
  const s: Spec = { scale: k.scale, bucket: k.ghost ? 'ghost' : undefined, quadruped: k.quadruped, flier: k.flier, bob: 0.6, sitDy: 0.67, bigHead: !k.quadruped && !k.flier && !k.ghost };
  const root = new THREE.Group();
  root.name = kind;
  const inner = new THREE.Group();
  inner.scale.setScalar(k.scale);
  root.add(inner);
  const parts: Rig['parts'] = {};
  const lights: Rig['lights'] = [];
  for (const [name, pv] of Object.entries(k.pivots) as [PartName, [number, number, number]][]) {
    const key = `char:${kind}:${name}`;
    const model = (custom && lookPart(custom, `${customKey}:${name}`, name as KPart)) || getModel(key);
    const pivot = new THREE.Group();
    pivot.position.set(pv[0], pv[1] + (k.hover ?? 0), pv[2]);
    pivot.add(instantiate(model, { castShadow: !k.ghost }));
    pivot.userData.base = pivot.position.clone();
    inner.add(pivot);
    parts[name] = pivot;
    for (const anchor of model.lights) lights.push({ part: pivot, anchor });
  }
  return { kind, root, parts, lights, spec: s };
}

/** Posizione mondo di una luce portata (es. lanterna del Custode). */
export function rigLightPos(rig: Rig, i: number, target = new THREE.Vector3()): THREE.Vector3 {
  const l = rig.lights[i];
  return lightWorldPos(l.anchor, target).applyMatrix4(l.part.matrixWorld);
}

export type Pose = 'idle' | 'walk' | 'work' | 'dance' | 'sit' | 'pray' | 'fly' | 'cheer';

/** Animazione procedurale delle parti. `phase` avanza con la distanza percorsa. */
export function animateRig(rig: Rig, pose: Pose, t: number, phase: number) {
  const p = rig.parts;
  const swing = Math.sin(phase * 2.2);
  const set = (part: THREE.Group | undefined, rx: number, rz = 0) => { if (part) { part.rotation.x = rx; part.rotation.z = rz; } };
  const k = rig.spec.bob ?? 1;
  const bob = (part: THREE.Group | undefined, dy: number) => { if (part) part.position.y = (part.userData.base as THREE.Vector3).y + dy * VOX * k; };
  /** Busto, testa e braccia sobbalzano insieme: le braccia restano attaccate alle spalle. */
  const torso = (dy: number) => { bob(p.body, dy); bob(p.head, dy); bob(p.armL, dy); bob(p.armR, dy); };
  if (rig.spec.bucket === 'ghost') {
    const f = Math.sin(t * 2);
    bob(p.body, f * 1.2); bob(p.armL, f * 1.2); bob(p.armR, f * 1.2);
    if (pose === 'cheer') { const c = Math.sin(t * 10) * 0.3; set(p.armL, 0, -2.4 + c); set(p.armR, 0, 2.4 - c); }
    else { set(p.armL, 0, -0.6 + Math.sin(t * 3) * 0.3); set(p.armR, 0, 0.6 - Math.sin(t * 3) * 0.3); }
    return;
  }
  // animali contenti (coccole, osso riportato): saltellano sul posto
  const hop = pose === 'cheer' && (rig.spec.flier || rig.spec.quadruped) ? Math.abs(Math.sin(t * 9)) * 1.3 : 0;
  if (rig.spec.flier || rig.spec.quadruped) for (const part of Object.values(p)) bob(part, hop);
  if (rig.spec.flier) {
    const flap = pose === 'fly' ? Math.sin(t * 18) * 0.9 : pose === 'cheer' ? Math.sin(t * 16) * 0.6 : 0.05;
    set(p.armL, 0, flap); set(p.armR, 0, -flap);
    set(p.head, pose === 'idle' ? Math.sin(t * 1.5) * 0.3 : 0);
    return;
  }
  if (rig.spec.quadruped) {
    const k = pose === 'walk' ? 0.7 : 0;
    set(p.legL, swing * k); set(p.legR, swing * k); set(p.armL, -swing * k); set(p.armR, -swing * k);
    set(p.head, pose === 'idle' ? Math.sin(t * 0.8) * 0.15 : pose === 'cheer' ? -0.25 + Math.sin(t * 9) * 0.12 : 0, pose === 'cheer' ? Math.sin(t * 4.5) * 0.18 : 0);
    return;
  }
  switch (pose) {
    case 'walk':
      set(p.legL, swing * 0.6); set(p.legR, -swing * 0.6);
      set(p.armL, -swing * 0.45); set(p.armR, swing * 0.45);
      torso(Math.abs(Math.cos(phase * 2.2)) * 0.5);
      set(p.head, 0);
      break;
    case 'work': {
      const w = Math.sin(t * 7);
      set(p.armR, -1.1 + w * 0.7); set(p.armL, -0.6 + w * 0.4);
      set(p.legL, 0); set(p.legR, 0); set(p.head, 0.25 + w * 0.05);
      torso(-0.4 + w * 0.2);
      break;
    }
    case 'dance': {
      const d = Math.sin(t * 6);
      if (rig.spec.bigHead) { set(p.armL, d * 0.3, -1.25 - d * 0.35); set(p.armR, -d * 0.3, 1.25 - d * 0.35); }
      else { set(p.armL, -2.4 + d * 0.5, -0.3); set(p.armR, -2.4 - d * 0.5, 0.3); }
      set(p.legL, d * 0.4); set(p.legR, -d * 0.4);
      torso(Math.abs(d) * 1); set(p.head, 0, d * 0.2);
      break;
    }
    case 'sit':
      set(p.legL, -1.4); set(p.legR, -1.4);
      set(p.armL, -0.9 + Math.sin(t * 2) * 0.15); set(p.armR, -0.9 - Math.sin(t * 2.3) * 0.15);
      torso(rig.spec.sitDy ?? -2.6); set(p.head, Math.sin(t * 0.7) * 0.15);
      break;
    case 'pray':
      set(p.armL, -0.9, 0.35); set(p.armR, -0.9, -0.35); set(p.head, 0.35); set(p.legL, 0); set(p.legR, 0); torso(0);
      break;
    case 'cheer':
      if (rig.spec.bigHead) { const c = Math.sin(t * 8) * 0.25; set(p.armL, -0.2, -1.5 - c); set(p.armR, -0.2, 1.5 + c); }
      else { set(p.armL, -2.6, -0.2); set(p.armR, -2.6, 0.2); }
      torso(Math.abs(Math.sin(t * 8)) * 1);
      break;
    default: {
      const br = Math.sin(t * 1.6) * 0.04;
      set(p.legL, 0); set(p.legR, 0); set(p.armL, br); set(p.armR, -br); set(p.head, Math.sin(t * 0.6) * 0.08);
      torso(Math.sin(t * 1.6) * 0.15);
    }
  }
  if (rig.kind === 'zombie') {
    if (pose === 'walk') {
      // camminata zoppa: la gamba sinistra fa il passo, la destra rigida viene trascinata;
      // il busto pende verso la gamba ferma e sobbalza a scatti, la testa ciondola
      const step = Math.max(0, swing);
      set(p.legL, swing * 0.75);
      set(p.legR, 0.12 - step * 0.18, 0.12);
      set(p.armL, -1.45 + swing * 0.12, -0.08); set(p.armR, -1.25 - swing * 0.08, 0.15);
      set(p.body, 0.12, 0.1 + step * 0.08);
      torso(step * 0.9);
      set(p.head, 0.22 + step * 0.1, 0.28 - step * 0.12);
    } else set(p.body, 0, 0);
  }
}
