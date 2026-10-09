import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ArtStyle, GraveCondition, GraveRecord } from '../core/GameState.ts';
import { palette } from '../data/palette.ts';

export type WorldAssetType = 'grave' | 'house' | 'mausoleum' | 'tree' | 'lantern' | 'well' | 'gate' | 'pond' | 'coffin';
const graveProfiles = [
  { label: 'Pietra rettangolare', top: 'square' }, { label: 'Pietra arrotondata', top: 'round' },
  { label: 'Pietra gotica', top: 'point' }, { label: 'Croce di pietra', top: 'cross' }, { label: 'Monumento', top: 'ornate' },
];

const sharedMaterials = new Map<string, THREE.MeshStandardMaterial>();
const sharedMaterialSet = new WeakSet<THREE.Material>();
function material(color: string, roughness = 1, extra: THREE.MeshStandardMaterialParameters = {}) {
  const parameters = { color, roughness, flatShading: true, ...extra };
  const key = JSON.stringify(parameters);
  let shared = sharedMaterials.get(key);
  if (!shared) { shared = new THREE.MeshStandardMaterial(parameters); sharedMaterials.set(key, shared); sharedMaterialSet.add(shared); }
  return shared;
}

function mergeAssetMeshes(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const sourceMeshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh) return;
    mesh.updateWorldMatrix(true, false);
    let geometry = mesh.geometry.clone(); geometry.clearGroups();
    if (!geometry.index) { const indexed = mergeVertices(geometry); geometry.dispose(); geometry = indexed; }
    geometry.applyMatrix4(inverseRoot.clone().multiply(mesh.matrixWorld));
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const primary = materials[0];
    if (!primary) { geometry.dispose(); return; }
    const batch = batches.get(primary) ?? []; batch.push(geometry); batches.set(primary, batch); sourceMeshes.push(mesh);
  });
  if (sourceMeshes.length < 2) { batches.forEach((geometries) => geometries.forEach((geometry) => geometry.dispose())); return root; }
  const mergedGeometries = new Map<THREE.Material, THREE.BufferGeometry>();
  for (const [sharedMaterial, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    if (!merged) { batches.forEach((entries) => entries.forEach((geometry) => geometry.dispose())); return root; }
    mergedGeometries.set(sharedMaterial, merged);
  }
  batches.forEach((entries) => entries.forEach((geometry) => geometry.dispose()));
  for (const mesh of sourceMeshes) {
    mesh.parent?.remove(mesh); mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const entry of materials) if (!sharedMaterialSet.has(entry)) entry.dispose();
  }
  for (const [sharedMaterial, geometry] of mergedGeometries) {
    const mesh = new THREE.Mesh(geometry, sharedMaterial); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
  }
  return root;
}
function box(parent: THREE.Group, size: [number, number, number], pos: [number, number, number], color: string, style: ArtStyle) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, 1, style === 'voxel' ? { vertexColors: false } : {}));
  mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent: THREE.Group, radiusTop: number, radiusBottom: number, height: number, pos: [number, number, number], color: string, segments: number) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material(color));
  mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function candle(parent: THREE.Group, x: number, z: number, height: number, style: ArtStyle, light = false) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, .07, style === 'voxel' ? 5 : 7), material(palette.stoneDark));
  base.position.set(x, .035, z); parent.add(base);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(.072, .09, height, style === 'voxel' ? 5 : 7), material('#d8cdb5'));
  wax.position.set(x, .07 + height / 2, z); wax.castShadow = true; parent.add(wax);
  for (let i = 0; i < 2; i++) {
    const drip = new THREE.Mesh(new THREE.SphereGeometry(.042, 5, 4), material('#e3d5bb'));
    drip.scale.set(.65, 1.25, .7); drip.position.set(x + (i ? .045 : -.04), .11 + height * (.63 + i * .18), z + .047); parent.add(drip);
  }
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(.009, .012, .07, 4), material(palette.iron));
  wick.position.set(x, .1 + height + .025, z); parent.add(wick);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(.043, .15, style === 'voxel' ? 4 : 6), new THREE.MeshBasicMaterial({ color: '#ffc766' }));
  flame.position.set(x, .13 + height + .1, z); flame.scale.set(.8, 1.25, .8); parent.add(flame);
  if (light) { const glow = new THREE.PointLight('#f6b85d', 2.8, 2.2, 2); glow.position.set(x, .3 + height, z); parent.add(glow); }
}

function skull(parent: THREE.Group, x: number, y: number, z: number, scale: number, style: ArtStyle) {
  const bone = material('#c7bdab');
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(scale * .28, style === 'voxel' ? 6 : 8, 6), bone);
  cranium.position.set(x, y + scale * .18, z); cranium.scale.set(1, .85, .78); cranium.castShadow = true; parent.add(cranium);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(scale * .34, scale * .12, scale * .24), bone);
  jaw.position.set(x, y - scale * .02, z + scale * .025); parent.add(jaw);
  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(scale * .075, 6, 5), material(palette.iron));
    socket.position.set(x + side * scale * .105, y + scale * .2, z + scale * .23); parent.add(socket);
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(scale * .04, scale * .075, scale * .04), material('#ded2bc'));
    tooth.position.set(x + side * scale * .055, y - scale * .075, z + scale * .16); parent.add(tooth);
  }
}

function gravePlaque(parent: THREE.Group, style: ArtStyle, z: number) {
  box(parent, [.48, .37, .055], [0, .79, z], palette.stoneDark, style);
  for (const y of [.625, .705, .79]) box(parent, [.25 - (y === .625 ? .05 : 0), .016, .018], [0, y, z + .039], palette.ivory, style);
  const cross = new THREE.Group(); box(cross, [.045, .19, .025], [0, .06, 0], palette.ivory, style); box(cross, [.15, .04, .025], [0, .07, 0], palette.ivory, style); cross.position.set(0, 1.05, z + .035); parent.add(cross);
}

function graveStone(parent: THREE.Group, type: number, style: ArtStyle, seed: number) {
  const random = (() => { let n = seed >>> 0; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; })();
  const width = .72 + random() * .13;
  const height = 1.05 + random() * .2;
  const depth = .2 + random() * .08;
  if (style === 'voxel') {
    box(parent, [.95, .15, .43], [0, .2, -.02], palette.stoneDark, style);
    box(parent, [.84, .12, .36], [0, .32, -.02], palette.stoneLight, style);
    const rows = Math.ceil(height / .22);
    for (let row = 0; row < rows; row++) {
      const widthFactor = type === 2 ? 1 - Math.max(0, row - rows * .56) * .1 : type === 1 && row === rows - 1 ? .56 : .96;
      box(parent, [width * widthFactor, .22, depth], [0, .34 + row * .22, -.045], row > 2 && random() > .68 ? palette.stoneLight : palette.stone, style);
    }
    if (type === 3) {
      box(parent, [.28, 1.16, .22], [0, .92, .09], palette.stoneLight, style);
      box(parent, [.78, .23, .22], [0, 1.03, .09], palette.stone, style);
    }
    if (type === 4) {
      box(parent, [width + .18, .14, depth + .13], [0, .32, -.045], palette.stoneDark, style);
      box(parent, [width - .12, .16, depth + .08], [0, 1.47, .08], palette.stoneLight, style);
      box(parent, [.12, 1.12, .18], [0, .91, .19], palette.stone, style);
      box(parent, [.58, .13, .18], [0, 1.16, .19], palette.stone, style);
    }
  } else {
    const lowerPlinth = new THREE.Mesh(new THREE.CylinderGeometry(.55, .62, .15, 8), material(palette.stoneDark)); lowerPlinth.scale.set(1.05, 1, .46); lowerPlinth.position.set(0, .21, -.02); lowerPlinth.castShadow = true; parent.add(lowerPlinth);
    const upperPlinth = new THREE.Mesh(new THREE.CylinderGeometry(.45, .5, .11, 8), material(palette.stoneLight)); upperPlinth.scale.set(1.05, 1, .45); upperPlinth.position.set(0, .33, -.02); parent.add(upperPlinth);
    const shape = new THREE.Shape();
    const w = width / 2;
    if (type === 1) shape.moveTo(-w, .34).lineTo(-w, .34 + height * .66).quadraticCurveTo(-w, .34 + height, 0, .34 + height).quadraticCurveTo(w, .34 + height, w, .34 + height * .66).lineTo(w, .34).closePath();
    else if (type === 2) shape.moveTo(-w, .34).lineTo(-w, .34 + height * .76).lineTo(0, .34 + height).lineTo(w, .34 + height * .76).lineTo(w, .34).closePath();
    else if (type === 4) shape.moveTo(-w, .34).lineTo(-w, 1.22).lineTo(-w * .82, 1.22).lineTo(0, 1.48).lineTo(w * .82, 1.22).lineTo(w, 1.22).lineTo(w, .34).closePath();
    else shape.moveTo(-w, .34).lineTo(-w, .34 + height).lineTo(w, .34 + height).lineTo(w, .34).closePath();
    const stone = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .035, bevelThickness: .04 }), material(type === 4 ? palette.stoneLight : palette.stone));
    stone.position.z = -.13; stone.castShadow = true; stone.receiveShadow = true; parent.add(stone);
    if (type === 3) {
      box(parent, [.24, 1.12, .2], [0, .91, .18], palette.stoneLight, style);
      box(parent, [.72, .2, .2], [0, 1, .18], palette.stone, style);
    }
    if (type === 4) {
      box(parent, [width + .22, .12, depth + .17], [0, .3, -.02], palette.stoneDark, style);
      cylinder(parent, .13, .2, .18, [0, 1.51, 0], palette.stoneLight, 7);
    }
  }
  gravePlaque(parent, style, style === 'voxel' ? .11 : .165);
  if (type === 2 || type === 4) skull(parent, .32, .53, .16, .48, style);
  const sideStone = material(palette.stoneDark);
  for (const side of [-1, 1]) {
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(.045, 5, 4), sideStone);
    rivet.position.set(side * (width * .43), .57, .105); parent.add(rivet);
  }
}

function grave(record: GraveRecord, style: ArtStyle, selected: boolean) {
  const root = new THREE.Group(); root.name = `Tomba · ${record.name}`; root.position.set(record.x, 0, record.z); root.userData.graveId = record.id;
  if (selected) cylinder(root, .88, .93, .055, [0, .035, 0], palette.lantern, 9).material = material(palette.lantern, .9, { emissive: palette.lantern, emissiveIntensity: .13 });
  if (style === 'voxel') {
    box(root, [1.38, .13, 1.62], [0, .09, .23], record.condition === 'neglected' ? palette.dryGrass : palette.earth, style);
    box(root, [1.2, .08, .35], [0, .17, .63], palette.path, style);
  } else {
    const earth = new THREE.Mesh(new THREE.CylinderGeometry(.78, .84, .08, 9), material(record.condition === 'neglected' ? palette.dryGrass : palette.earth));
    earth.scale.z = .82; earth.position.set(0, .05, .2); earth.receiveShadow = true; root.add(earth);
    const soil = new THREE.Mesh(new THREE.CircleGeometry(.42, 7), material(palette.path)); soil.rotation.x = -Math.PI / 2; soil.scale.set(1.5, .72, 1); soil.position.set(0, .1, .59); root.add(soil);
  }
  graveStone(root, record.type, style, record.seed);
  if (record.condition === 'neglected') {
    for (let i = 0; i < 3; i++) { const weed = new THREE.Mesh(new THREE.ConeGeometry(.055, .25 + i * .025, style === 'voxel' ? 4 : 5), material(palette.moss)); weed.position.set((i - 1) * .25, .22, .76 + (i % 2) * .1); weed.rotation.z = (i - 1) * .15; root.add(weed); }
    for (let i = 0; i < 3; i++) {
      box(root, [.12, .025, .08], [-.38 + i * .3, .13, .57 + (i % 2) * .14], palette.dryGrass, style);
      const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(.105, 0), material(palette.moss)); moss.scale.set(1.4, .34, .8); moss.position.set((i - 1) * .22, .43 + (i % 2) * .12, .12); root.add(moss);
    }
  }
  if (record.condition === 'decorated') {
    for (let i = 0; i < 3; i++) {
      const flower = new THREE.Group(); cylinder(flower, .025, .032, .28, [0, .14, 0], palette.moss, 5);
      for (let petal = 0; petal < 5; petal++) { const angle = petal * Math.PI * 2 / 5; const bloom = new THREE.Mesh(new THREE.SphereGeometry(.052, 5, 4), material(i === 1 ? palette.ivory : palette.flowers)); bloom.scale.set(.9, .7, .72); bloom.position.set(Math.cos(angle) * .052, .3, Math.sin(angle) * .052); flower.add(bloom); }
      const heart = new THREE.Mesh(new THREE.SphereGeometry(.035, 5, 4), material(palette.lantern)); heart.position.y = .31; flower.add(heart);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(.07, 5, 4), material(palette.moss)); leaf.scale.set(1.6, .35, .55); leaf.position.set(i % 2 ? .05 : -.05, .16, 0); flower.add(leaf);
      flower.position.set((i - 1) * .2, .12, .72 + (i % 2) * .1); root.add(flower);
    }
    const candles = new THREE.Group(); candle(candles, -.38, .73, .24, style); candle(candles, .38, .75, .31, style, true); root.add(candles);
  }
  return root;
}

function house(style: ArtStyle) {
  const root = new THREE.Group(); root.position.set(-10, 0, -10.2); root.name = 'Casa del custode';
  if (style === 'voxel') {
    box(root, [5.5, 3.3, 4], [0, 1.65, 0], palette.stoneDark, style);
    box(root, [5.9, .4, 4.4], [0, 3.35, 0], palette.roof, style);
    box(root, [4.6, .4, 4], [0, 3.75, 0], palette.roof, style);
    box(root, [3.2, .4, 3.1], [0, 4.15, 0], palette.roof, style);
    box(root, [.9, 1.6, .16], [0, .82, 2.05], palette.wood, style);
    box(root, [.62, .78, .12], [-1.5, 2.15, 2.05], palette.lantern, style);
    box(root, [.62, .78, .12], [1.5, 2.15, 2.05], palette.lantern, style);
    box(root, [.8, 1.2, .65], [1.5, 4.2, -.8], palette.stone, style);
  } else {
    box(root, [5.1, 3, 3.8], [0, 1.5, 0], palette.stoneDark, style);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.7, 2.1, 4), material(palette.roof)); roof.rotation.y = Math.PI / 4; roof.position.set(0, 3.95, 0); roof.scale.z = .78; roof.castShadow = true; root.add(roof);
    box(root, [.9, 1.6, .16], [0, .8, 1.95], palette.wood, style);
    box(root, [.62, .78, .12], [-1.5, 2, 1.96], palette.lantern, style); box(root, [.62, .78, .12], [1.5, 2, 1.96], palette.lantern, style);
    box(root, [.65, 1, .55], [1.5, 4.05, -.8], palette.stone, style);
  }
  for (let i = 0; i < 2; i++) box(root, [1.35, .16, .72], [0, .1 + i * .16, 2.28 + i * .34], palette.stone, style);
  box(root, [1.18, 1.88, .12], [0, 1.02, 2.05], palette.woodLight, style);
  for (let i = 0; i < 5; i++) box(root, [.035, 1.62, .035], [-.42 + i * .21, 1.04, 2.13], palette.wood, style);
  box(root, [.52, .12, .08], [0, 1.45, 2.19], palette.wood, style);
  for (const side of [-1, 1]) {
    box(root, [.82, 1.05, .12], [side * 1.48, 2, 2.03], palette.iron, style);
    box(root, [.62, .84, .06], [side * 1.48, 2.04, 2.11], palette.lantern, style);
    box(root, [.94, .12, .22], [side * 1.48, 1.45, 2.04], palette.stoneLight, style);
    for (const y of [1.78, 2.13, 2.48]) box(root, [.68, .035, .075], [side * 1.48, y, 2.16], palette.iron, style);
    const windowGlow = new THREE.PointLight(palette.lantern, 1.3, 3, 2); windowGlow.position.set(side * 1.48, 2.1, 2.5); root.add(windowGlow);
  }
  for (const side of [-1, 1]) {
    box(root, [.25, 3.25, 4.1], [side * 2.55, 1.62, 0], palette.stone, style);
    for (let y = .7; y < 3; y += .72) box(root, [.31, .045, 4.12], [side * 2.55, y, 0], palette.stoneLight, style);
  }
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape().moveTo(-2.75, 3.05).lineTo(0, 5.1).lineTo(2.75, 3.05).closePath(), { depth: 4.1, bevelEnabled: true, bevelSegments: 1, bevelSize: .06, bevelThickness: .05 }), material(palette.stoneDark)); gable.position.z = -2.05; gable.castShadow = true; root.add(gable);
  for (const side of [-1, 1]) { const trim = box(root, [3.7, .11, .12], [side * 1.42, 3.55, 2.12], palette.stoneLight, style); trim.rotation.z = side * -.39; }
  cylinder(root, .35, .43, .15, [0, 5.04, 0], palette.stoneLight, 6);
  const roofCross = new THREE.Group(); box(roofCross, [.09, .48, .09], [0, .24, 0], palette.iron, style); box(roofCross, [.32, .08, .09], [0, .35, 0], palette.iron, style); roofCross.position.set(0, 5.11, 0); root.add(roofCross);
  return root;
}

function mausoleum(style: ArtStyle) {
  const root = new THREE.Group(); root.position.set(10, 0, -10.2); root.name = 'Mausoleo';
  box(root, [4.8, 2.8, 4.1], [0, 1.4, 0], palette.stone, style);
  if (style === 'voxel') { box(root, [5.6, .42, 4.8], [0, 2.85, 0], palette.roof, style); box(root, [4.4, .44, 3.8], [0, 3.28, 0], palette.stoneDark, style); }
  else { const roof = new THREE.Mesh(new THREE.ConeGeometry(3.25, 1.35, 4), material(palette.roof)); roof.rotation.y = Math.PI / 4; roof.position.y = 3.15; roof.scale.z = .84; roof.castShadow = true; root.add(roof); }
  box(root, [1.55, 2.12, .2], [0, 1.07, 2.08], palette.iron, style);
  for (let i = -1; i <= 1; i++) box(root, [.08, 2.08, .22], [i * .49, 1.05, 2.13], palette.stoneLight, style);
  for (let i = 0; i < 3; i++) box(root, [2.1 + i * .32, .16, .6], [0, .1 + i * .16, 2.45 + i * .3], palette.stoneLight, style);
  box(root, [2.1, 2.16, .12], [0, 1.1, 2.12], '#292d32', style);
  const archFrame = new THREE.Shape().moveTo(-1.42, 0).lineTo(-1.42, 1.55).quadraticCurveTo(-1.42, 2.45, 0, 2.54).quadraticCurveTo(1.42, 2.45, 1.42, 1.55).lineTo(1.42, 0).closePath();
  const archOpening = new THREE.Path().moveTo(-1.13, 0).lineTo(-1.13, 1.54).quadraticCurveTo(-1.13, 2.17, 0, 2.25).quadraticCurveTo(1.13, 2.17, 1.13, 1.54).lineTo(1.13, 0).closePath();
  archFrame.holes.push(archOpening);
  const doorArch = new THREE.Mesh(new THREE.ExtrudeGeometry(archFrame, { depth: .16, bevelEnabled: true, bevelSegments: 1, bevelSize: .045, bevelThickness: .04 }), material(palette.stoneLight)); doorArch.position.set(0, .06, 2.2); doorArch.castShadow = true; root.add(doorArch);
  for (let i = -2; i <= 2; i++) {
    const bar = box(root, [.055, 1.8, .07], [i * .37, 1.02, 2.42], palette.iron, style);
    if (i === 0) bar.scale.y = 1.07;
  }
  for (const y of [.3, 1.55]) box(root, [1.55, .07, .085], [0, y, 2.42], palette.iron, style);
  for (const side of [-1, 1]) {
    for (let y = .55; y < 2.7; y += .62) box(root, [.42, .12, .54], [side * 2.3, y, .2], palette.stoneLight, style);
    const buttress = new THREE.Mesh(new THREE.ConeGeometry(.72, 1.3, 4), material(palette.stoneDark)); buttress.rotation.z = side * .22; buttress.position.set(side * 2.36, 3.27, .05); buttress.castShadow = true; root.add(buttress);
    candle(root, side * 1.95, 2.92, .28, style);
  }
  for (const side of [-1, 1]) {
    const gargoyle = new THREE.Group(); gargoyle.position.set(side * 2.25, 3.22, .58);
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(.43, 0), material(palette.stoneDark)); body.scale.set(1, 1.25, .75); body.castShadow = true; gargoyle.add(body);
    const face = new THREE.Mesh(new THREE.SphereGeometry(.28, 7, 6), material(palette.stoneLight)); face.position.set(0, .22, .2); face.scale.set(.95, .9, .76); gargoyle.add(face);
    const muzzle = new THREE.Mesh(new THREE.DodecahedronGeometry(.16, 0), material(palette.stone)); muzzle.position.set(0, .04, .38); gargoyle.add(muzzle);
    for (const eyeSide of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.052, 5, 4), new THREE.MeshStandardMaterial({ color: palette.lantern, emissive: palette.lantern, emissiveIntensity: .85 })); eye.position.set(eyeSide * .115, .25, .405); gargoyle.add(eye);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(.105, .42, 5), material(palette.stoneDark)); horn.position.set(eyeSide * .21, .51, .12); horn.rotation.z = eyeSide * -.25; gargoyle.add(horn);
    }
    const wingShape = new THREE.Shape().moveTo(0, .05).lineTo(side * .67, .18).lineTo(side * 1.02, .68).lineTo(side * .56, .55).lineTo(side * .39, 1.0).lineTo(side * .19, .59).closePath();
    const wing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), new THREE.MeshStandardMaterial({ color: palette.stoneDark, roughness: .9, side: THREE.DoubleSide, flatShading: true })); wing.position.set(0, -.18, -.04); wing.castShadow = true; gargoyle.add(wing);
    root.add(gargoyle);
  }
  box(root, [.16, .65, .17], [0, 4, 0], palette.stoneLight, style);
  box(root, [.48, .11, .17], [0, 4.04, 0], palette.stoneLight, style);
  for (let i = -2; i <= 2; i++) { const tile = box(root, [.28, .065, 4.3], [i * .9, 2.9, 0], palette.stoneLight, style); tile.rotation.z = i * .035; }
  return root;
}

function tree(style: ArtStyle, seed: number) {
  const random = (() => { let n = seed; return () => ((n = (n * 48271) % 2147483647) / 2147483647); })();
  const root = new THREE.Group();
  cylinder(root, .12, .28, 2.5, [0, 1.25, 0], palette.wood, style === 'voxel' ? 5 : 7);
  for (let i = 0; i < 5; i++) {
    const angle = random() * Math.PI * 2; const length = .75 + random() * .8;
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(.035, .08, length, style === 'voxel' ? 4 : 5), material(palette.woodLight));
    branch.position.set(Math.cos(angle) * .24, 1.5 + random() * 1.05, Math.sin(angle) * .24); branch.rotation.z = Math.cos(angle) * .9; branch.rotation.x = Math.sin(angle) * .8; branch.castShadow = true; root.add(branch);
    const cluster = new THREE.Mesh(new THREE.DodecahedronGeometry(.42 + random() * .26, 0), material(i % 2 ? palette.moss : palette.stoneDark));
    cluster.position.copy(branch.position).add(new THREE.Vector3(Math.cos(angle) * length * .4, length * .42, Math.sin(angle) * length * .4)); cluster.scale.set(1, 1.15, .92); cluster.castShadow = true; root.add(cluster);
  }
  return root;
}

function lantern(style: ArtStyle) {
  const root = new THREE.Group(); cylinder(root, .075, .1, 1.45, [0, .72, 0], palette.iron, style === 'voxel' ? 4 : 6);
  box(root, [.42, .08, .42], [0, 1.42, 0], palette.iron, style); box(root, [.28, .32, .28], [0, 1.2, 0], palette.lantern, style);
  const light = new THREE.PointLight(palette.lantern, 13, 5, 2); light.position.set(0, 1.2, 0); root.add(light); return root;
}

function cemeteryGate(style: ArtStyle) {
  const root = new THREE.Group(); root.position.z = 15.05; root.name = 'Ingresso monumentale';
  const archShape = new THREE.Shape().moveTo(-3.3, 0).lineTo(-3.3, 3.2).quadraticCurveTo(-3.1, 4.65, 0, 4.85).quadraticCurveTo(3.1, 4.65, 3.3, 3.2).lineTo(3.3, 0).closePath();
  const opening = new THREE.Path().moveTo(-2.08, 0).lineTo(-2.08, 2.7).quadraticCurveTo(-1.93, 3.78, 0, 3.92).quadraticCurveTo(1.93, 3.78, 2.08, 2.7).lineTo(2.08, 0).closePath();
  archShape.holes.push(opening);
  const stoneArch = new THREE.Mesh(new THREE.ExtrudeGeometry(archShape, { depth: .78, bevelEnabled: true, bevelSegments: 2, bevelSize: .07, bevelThickness: .08 }), material(palette.stoneDark));
  stoneArch.position.z = -.4; stoneArch.castShadow = true; stoneArch.receiveShadow = true; root.add(stoneArch);
  for (const side of [-1, 1]) {
    for (let y = .18; y < 2.8; y += .58) box(root, [.98, .48, 1.04], [side * 2.82, y, 0], y > 1.3 ? palette.stone : palette.stoneLight, style);
    box(root, [1.16, .18, 1.22], [side * 2.82, 2.95, 0], palette.stoneLight, style);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(.31, .85, style === 'voxel' ? 4 : 5), material(palette.iron)); finial.position.set(side * 2.82, 3.46, .04); finial.castShadow = true; root.add(finial);
    for (let course = 0; course < 3; course++) box(root, [.08, .045, .78], [side * (2.3 + course * .24), .34 + course * .26, .46], palette.stoneLight, style);
    const lanternSconce = lantern(style); lanternSconce.position.set(side * 3.55, 0, .54); root.add(lanternSconce);
  }
  for (let i = -7; i <= 7; i++) {
    const x = i * .255;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.033, .046, 2.45, style === 'voxel' ? 4 : 6), material(palette.iron)); bar.position.set(x, 1.25, .18); bar.castShadow = true; root.add(bar);
    const spear = new THREE.Mesh(new THREE.ConeGeometry(.075, .2, 4), material(palette.stoneLight)); spear.position.set(x, 2.58, .18); root.add(spear);
  }
  for (const y of [.42, 2.18]) box(root, [4.1, .13, .15], [0, y, .18], palette.iron, style);
  skull(root, 0, 4.14, .49, 1.35, style);
  return root;
}

function pond(style: ArtStyle) {
  const root = new THREE.Group(); root.position.set(11, 0, 7.8); root.name = 'Stagno delle lucciole';
  const bank = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.55, .19, style === 'voxel' ? 8 : 11), material(palette.stoneDark)); bank.scale.z = .66; bank.position.y = .035; bank.receiveShadow = true; root.add(bank);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.18, 12), material(palette.water, .27, { metalness: .16, emissive: '#1d383c', emissiveIntensity: .25 })); water.rotation.x = -Math.PI / 2; water.scale.set(1, .66, 1); water.position.y = .145; root.add(water);
  for (let i = 0; i < 11; i++) {
    const angle = i * Math.PI * 2 / 11; const radius = 2.16;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(.3, 0), material(i % 3 === 0 ? palette.moss : palette.stone)); stone.scale.set(1.2, .35, .8); stone.position.set(Math.cos(angle) * radius, .17, Math.sin(angle) * radius * .66); stone.rotation.y = angle; stone.castShadow = true; root.add(stone);
  }
  for (let i = 0; i < 5; i++) {
    const reed = new THREE.Group(); cylinder(reed, .025, .035, .68 + (i % 3) * .12, [0, .36, 0], palette.moss, 5);
    const head = new THREE.Mesh(new THREE.ConeGeometry(.09, .28, 5), material(palette.dryGrass)); head.position.y = .77 + (i % 3) * .12; reed.add(head); reed.position.set(-1.3 + i * .22, .13, -.8 + (i % 2) * .25); root.add(reed);
  }
  return root;
}

function openCoffin(style: ArtStyle) {
  const root = new THREE.Group(); root.position.set(8, 0, 10.5); root.name = 'Sepoltura aperta';
  box(root, [1.55, .24, 2.05], [0, .12, 0], palette.wood, style);
  box(root, [1.32, .09, 1.7], [0, .265, -.06], palette.iron, style);
  const lid = box(root, [1.3, .12, 1.67], [1.03, .24, -.32], palette.woodLight, style); lid.rotation.z = -.28;
  for (const side of [-1, 1]) {
    box(root, [.11, .48, 1.7], [side * .66, -.18, 0], palette.earth, style);
    box(root, [.22, .18, 1.82], [side * .8, .09, 0], palette.dryGrass, style);
  }
  for (let i = 0; i < 4; i++) box(root, [.06, .045, .28], [-.46 + i * .3, .33, -.72], palette.iron, style);
  return root;
}

export function createWorldAsset(type: WorldAssetType, style: ArtStyle, options: { grave?: GraveRecord; selected?: boolean; seed?: number } = {}) {
  if (type === 'grave' && options.grave) return mergeAssetMeshes(grave(options.grave, style, options.selected ?? false));
  if (type === 'house') return mergeAssetMeshes(house(style));
  if (type === 'mausoleum') return mergeAssetMeshes(mausoleum(style));
  if (type === 'tree') return mergeAssetMeshes(tree(style, options.seed ?? 1));
  if (type === 'lantern') return mergeAssetMeshes(lantern(style));
  if (type === 'gate') return mergeAssetMeshes(cemeteryGate(style));
  if (type === 'pond') return mergeAssetMeshes(pond(style));
  if (type === 'coffin') return mergeAssetMeshes(openCoffin(style));
  const well = new THREE.Group(); cylinder(well, .8, .9, .6, [0, .3, 0], palette.stone, style === 'voxel' ? 6 : 9); cylinder(well, .57, .57, .12, [0, .67, 0], palette.water, 9);
  for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4; const post = new THREE.Mesh(new THREE.BoxGeometry(.08, .72, .08), material(palette.wood)); post.position.set(Math.cos(angle) * .7, .65, Math.sin(angle) * .7); well.add(post); }
  const beam = box(well, [.12, .12, 1.65], [0, 1.08, 0], palette.wood, style); beam.rotation.y = Math.PI / 4;
  cylinder(well, .055, .055, .45, [0, .95, 0], palette.iron, 7);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.02, .48, 8), material(palette.roof)); roof.position.y = 1.45; roof.scale.z = .8; well.add(roof); return mergeAssetMeshes(well);
}

export function graveLabel(record: GraveRecord) { return graveProfiles[record.type]?.label ?? 'Pietra antica'; }
export function disposeTree(root: THREE.Object3D) {
  root.traverse((object) => { const mesh = object as THREE.Mesh; if (!mesh.isMesh) return; mesh.geometry.dispose(); const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; materials.forEach((entry) => { if (!sharedMaterialSet.has(entry)) entry.dispose(); }); });
}

export type { GraveCondition };
