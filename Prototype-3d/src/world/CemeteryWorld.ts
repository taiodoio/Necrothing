import * as THREE from 'three';
import type { GameState, ArtStyle } from '../core/GameState.ts';
import { seededRandom } from '../core/GameState.ts';
import { createWorldAsset, disposeTree, type WorldAssetType } from '../assets/AssetFactory.ts';
import { palette } from '../data/palette.ts';

interface InstanceTransform {
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  color?: string;
}

export class CemeteryWorld {
  readonly root = new THREE.Group();
  readonly graveObjects = new Map<string, THREE.Group>();
  readonly interactive: THREE.Object3D[] = [];
  readonly width = 32;
  private lanterns: THREE.PointLight[] = [];
  private readonly scene: THREE.Scene;
  private readonly state: GameState;

  constructor(scene: THREE.Scene, state: GameState) {
    this.scene = scene; this.state = state;
    this.root.name = 'Cimitero'; scene.add(this.root); this.build(state.style);
  }

  private addAsset(type: WorldAssetType, style: ArtStyle, options: { seed?: number } = {}) {
    const asset = createWorldAsset(type, style, options); this.root.add(asset); return asset;
  }

  build(style: ArtStyle) {
    for (const child of [...this.root.children]) { this.root.remove(child); disposeTree(child); }
    this.graveObjects.clear(); this.interactive.length = 0; this.lanterns = [];
    const random = seededRandom(this.state.seed);
    this.createIsland(style, random);
    this.createPaths(style, random);
    this.makeFence(style);
    const gate = this.addAsset('gate', style); this.interactive.push(gate);
    const house = this.addAsset('house', style); house.position.set(-10, 0, -10.2); this.interactive.push(house);
    const mausoleum = this.addAsset('mausoleum', style); mausoleum.position.set(10, 0, -10.2); this.interactive.push(mausoleum);
    const well = this.addAsset('well', style); well.position.set(-11.2, 0, 4);
    const pond = this.addAsset('pond', style); this.interactive.push(pond);
    const coffin = this.addAsset('coffin', style); coffin.position.set(7, 0, 9.5);
    const treeSlots: [number, number][] = [[-13,-13],[0,-13],[13,-13],[-13,0],[13,0],[-13,12],[-7,12],[7,12]];
    treeSlots.forEach(([x,z], i) => { const tree = this.addAsset('tree', style, { seed: this.state.seed + i * 47 }); tree.position.set(x + (random() - .5) * .45, 0, z + (random() - .5) * .45); });
    for (const record of this.state.graves) {
      const object = createWorldAsset('grave', style, { grave: record, selected: record.id === this.state.selectedGraveId }) as THREE.Group;
      this.root.add(object); this.graveObjects.set(record.id, object); this.interactive.push(object);
    }
    const lanternSpots: [number, number][] = [[-6.2,-7.5],[6.2,-7.5],[-7,1.5],[7,1.5],[0,13.1]];
    lanternSpots.forEach(([x,z]) => { const post = this.addAsset('lantern', style); post.position.set(x, 0, z); post.traverse((part) => { if ((part as THREE.PointLight).isPointLight) this.lanterns.push(part as THREE.PointLight); }); });
  }

  update(_delta: number, elapsed: number) {
    this.lanterns.forEach((light, index) => { light.intensity = 10.5 + Math.sin(elapsed * 3.2 + index * 1.73) * .85; });
  }

  private createIsland(style: ArtStyle, random: () => number) {
    const earth = new THREE.Mesh(new THREE.BoxGeometry(32.6, .64, 32.6), new THREE.MeshStandardMaterial({ color: '#292c2b', roughness: 1, flatShading: true }));
    earth.position.y = -.43; earth.receiveShadow = true; earth.castShadow = true; this.root.add(earth);
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(32, 32), new THREE.MeshStandardMaterial({ color: palette.grass, roughness: 1 })); lawn.rotation.x = -Math.PI / 2; lawn.position.y = -.105; lawn.receiveShadow = true; this.root.add(lawn);

    const patchGeometry = new THREE.CircleGeometry(1, style === 'voxel' ? 5 : 8);
    const patchMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true });
    const patches = new THREE.InstancedMesh(patchGeometry, patchMaterial, 250);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 250; i++) {
      const x = (random() - .5) * 29.8, z = (random() - .5) * 29.8, radius = .12 + random() * .52;
      dummy.position.set(x, -.097, z); dummy.rotation.set(-Math.PI / 2, 0, random() * Math.PI); dummy.scale.set(radius * (1.1 + random() * .4), radius * .72, 1); dummy.updateMatrix(); patches.setMatrixAt(i, dummy.matrix);
      patches.setColorAt(i, new THREE.Color(random() > .65 ? palette.moss : random() > .5 ? '#405342' : '#384b3d'));
    }
    patches.instanceMatrix.needsUpdate = true; if (patches.instanceColor) patches.instanceColor.needsUpdate = true; patches.receiveShadow = true; this.root.add(patches);

    const stoneGeometry = new THREE.DodecahedronGeometry(1, 0);
    const rubble = new THREE.InstancedMesh(stoneGeometry, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .96, flatShading: true }), 115);
    for (let i = 0; i < 115; i++) {
      const x = (random() - .5) * 29, z = (random() - .5) * 29;
      dummy.position.set(x, -.035, z); dummy.rotation.set(random() * .3, random() * Math.PI, random() * .3); dummy.scale.set(.08 + random() * .16, .035 + random() * .06, .07 + random() * .13); dummy.updateMatrix(); rubble.setMatrixAt(i, dummy.matrix);
      rubble.setColorAt(i, new THREE.Color(random() > .55 ? palette.stoneDark : palette.dryGrass));
    }
    rubble.instanceMatrix.needsUpdate = true; if (rubble.instanceColor) rubble.instanceColor.needsUpdate = true; rubble.castShadow = true; this.root.add(rubble);

    const blades = new THREE.InstancedMesh(new THREE.ConeGeometry(.055, .34, style === 'voxel' ? 4 : 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), 145);
    for (let i = 0; i < 145; i++) {
      const x = (random() - .5) * 29, z = (random() - .5) * 29;
      dummy.position.set(x, .08, z); dummy.rotation.set((random() - .5) * .55, random() * Math.PI, (random() - .5) * .55); dummy.scale.set(.6 + random() * .75, .55 + random() * .9, .6 + random() * .75); dummy.updateMatrix(); blades.setMatrixAt(i, dummy.matrix); blades.setColorAt(i, new THREE.Color(random() > .55 ? palette.moss : palette.dryGrass));
    }
    blades.instanceMatrix.needsUpdate = true; if (blades.instanceColor) blades.instanceColor.needsUpdate = true; blades.castShadow = true; this.root.add(blades);

    const edging = new THREE.MeshStandardMaterial({ color: palette.stoneDark, roughness: .94 });
    for (const [x, z, sx, sz] of [[0,-16.15,32.5,.32],[0,16.15,32.5,.32],[-16.15,0,.32,32.5],[16.15,0,.32,32.5]] as const) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(sx, .2, sz), edging); edge.position.set(x, .04, z); edge.receiveShadow = true; edge.castShadow = true; this.root.add(edge);
    }
  }

  private createPaths(style: ArtStyle, random: () => number) {
    const pathMaterial = new THREE.MeshStandardMaterial({ color: '#57544d', roughness: .94, flatShading: true });
    const vertical = new THREE.Mesh(new THREE.PlaneGeometry(2, 31.4), pathMaterial); vertical.rotation.x = -Math.PI / 2; vertical.position.set(0, -.075, -.25); this.root.add(vertical);
    const horizontal = new THREE.Mesh(new THREE.PlaneGeometry(31.4, 1.8), pathMaterial); horizontal.rotation.x = -Math.PI / 2; horizontal.position.set(0, -.073, .3); this.root.add(horizontal);
    const toHouse = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 1.45), pathMaterial); toHouse.rotation.x = -Math.PI / 2; toHouse.position.set(-5.1, -.07, -8.7); this.root.add(toHouse);
    const toMausoleum = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 1.45), pathMaterial); toMausoleum.rotation.x = -Math.PI / 2; toMausoleum.position.set(5.1, -.07, -8.7); this.root.add(toMausoleum);
    const tiles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .91, flatShading: true }), 365);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 365; i++) {
      let x: number, z: number;
      const route = i % 4;
      if (route === 0) { x = (random() - .5) * 1.85; z = (random() - .5) * 30; }
      else if (route === 1) { x = (random() - .5) * 30; z = (random() - .5) * 1.65; }
      else { x = (random() - .5) * 9.5 + (route === 2 ? -5 : 5); z = -8.7 + (random() - .5) * 1.25; }
      const size = .25 + random() * .25;
      dummy.position.set(x, -.015 + random() * .018, z); dummy.rotation.set(0, random() * Math.PI, 0); dummy.scale.set(size * (1.25 + random() * .6), .055 + random() * .025, size * (.72 + random() * .45)); dummy.updateMatrix(); tiles.setMatrixAt(i, dummy.matrix);
      tiles.setColorAt(i, new THREE.Color(random() > .75 ? palette.stone : random() > .4 ? palette.stoneDark : palette.path));
    }
    tiles.instanceMatrix.needsUpdate = true; if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true; tiles.castShadow = true; tiles.receiveShadow = true; this.root.add(tiles);
    const threshold = new THREE.Mesh(new THREE.BoxGeometry(3.7, .2, 1.5), new THREE.MeshStandardMaterial({ color: palette.stoneLight, roughness: .88 })); threshold.position.set(0, .04, 14.25); this.root.add(threshold);
    void style;
  }

  private makeFence(style: ArtStyle) {
    const iron = new THREE.MeshStandardMaterial({ color: palette.iron, roughness: .58, metalness: .4, flatShading: true });
    const stone = new THREE.MeshStandardMaterial({ color: palette.stoneDark, roughness: .94, flatShading: true });
    const coping = new THREE.MeshStandardMaterial({ color: palette.stone, roughness: .9, flatShading: true });
    const wallBlocks: InstanceTransform[] = [], caps: InstanceTransform[] = [], pillars: InstanceTransform[] = [], rails: InstanceTransform[] = [], bars: InstanceTransform[] = [], spikes: InstanceTransform[] = [];
    const pushSide = (axis: 'x' | 'z', fixed: number, opening = false) => {
      for (let i = -15; i < 15; i += 1.25) {
        const along = i + .625; if (opening && Math.abs(along) < 3.35) continue;
        const horizontal = axis === 'x'; const position = (y: number, offset = 0) => new THREE.Vector3(horizontal ? along : fixed + offset, y, horizontal ? fixed + offset : along);
        wallBlocks.push({ position: position(.22), scale: new THREE.Vector3(horizontal ? 1.25 : .56, .43, horizontal ? .56 : 1.25) });
        caps.push({ position: position(.51), scale: new THREE.Vector3(horizontal ? 1.21 : .56, .13, horizontal ? .56 : 1.21) });
        const insideOffset = horizontal ? 0 : -Math.sign(fixed) * .31;
        for (const y of [.77, 1.26]) rails.push({ position: position(y, insideOffset), scale: new THREE.Vector3(horizontal ? 1.25 : .075, .065, horizontal ? .075 : 1.25) });
        for (let step = 0; step < 3; step++) {
          const segment = along - .625 + step * .4167 + .208;
          if (Math.abs(segment) > 15) continue;
          bars.push({ position: new THREE.Vector3(horizontal ? segment : fixed + insideOffset, 1.0, horizontal ? fixed : segment), scale: new THREE.Vector3(.045, .82, .045) });
          spikes.push({ position: new THREE.Vector3(horizontal ? segment : fixed + insideOffset, 1.48, horizontal ? fixed : segment), scale: new THREE.Vector3(.08, .25, .08) });
        }
      }
      for (let post = -15; post <= 15; post += 2.5) {
        if (opening && Math.abs(post) < 3.35) continue;
        pillars.push({ position: axis === 'x' ? new THREE.Vector3(post, .9, fixed) : new THREE.Vector3(fixed, .9, post), scale: axis === 'x' ? new THREE.Vector3(.53, 1.8, .6) : new THREE.Vector3(.6, 1.8, .53) });
      }
    };
    pushSide('x', -15.1); pushSide('x', 15.1, true); pushSide('z', -15.1); pushSide('z', 15.1);
    this.addInstances(new THREE.BoxGeometry(1, 1, 1), stone, wallBlocks);
    this.addInstances(new THREE.BoxGeometry(1, 1, 1), coping, caps);
    this.addInstances(new THREE.BoxGeometry(1, 1, 1), stone, pillars);
    this.addInstances(new THREE.BoxGeometry(1, 1, 1), iron, rails);
    this.addInstances(new THREE.CylinderGeometry(.5, .5, 1, style === 'voxel' ? 4 : 6), iron, bars);
    this.addInstances(new THREE.ConeGeometry(.5, 1, 4), iron, spikes);
    const cornerCaps = new THREE.Mesh(new THREE.BoxGeometry(.9, .3, .9), coping);
    for (const x of [-15.1, 15.1]) for (const z of [-15.1, 15.1]) { const corner = cornerCaps.clone(); corner.position.set(x, 1.88, z); corner.castShadow = true; this.root.add(corner); }
  }

  private addInstances(geometry: THREE.BufferGeometry, mat: THREE.Material, transforms: InstanceTransform[]) {
    if (!transforms.length) { geometry.dispose(); return; }
    const mesh = new THREE.InstancedMesh(geometry, mat, transforms.length); const dummy = new THREE.Object3D();
    transforms.forEach((entry, index) => {
      dummy.position.copy(entry.position); dummy.rotation.set(0, 0, 0); if (entry.rotation) dummy.rotation.copy(entry.rotation); if (entry.scale) dummy.scale.copy(entry.scale); else dummy.scale.set(1, 1, 1); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
      if (entry.color) mesh.setColorAt(index, new THREE.Color(entry.color));
    });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true; this.root.add(mesh);
  }
}
