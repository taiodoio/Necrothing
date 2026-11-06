// Effetto temporaneo per una sola casa: materiali e geometrie condivise restano intatti.
import * as THREE from 'three';
import type { CachedModel } from '../render/modelCache.ts';
import { animateRig, buildRig } from './characters.ts';

const COLORS = ['#ff6595', '#5ab9ff', '#a9ef6f', '#ce82ff', '#ffc66a'] as const;
export class HauntedParty {
  readonly root = new THREE.Group();
  private readonly glow = new THREE.MeshBasicMaterial({ color: COLORS[0], transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  private readonly ghost = buildRig('ghost');
  private readonly ghostMaterials: Array<{ material: THREE.Material; opacity: number }> = [];
  private age = 0;
  private stopped = false;
  private readonly parent: THREE.Group;
  private readonly reduced: boolean;
  constructor(parent: THREE.Group, model: CachedModel, reduced: boolean) {
    this.parent = parent;
    this.reduced = reduced;
    const geometry = model.geometries.glow;
    if (geometry) { const windows = new THREE.Mesh(geometry, this.glow); windows.renderOrder = 1; this.root.add(windows); }
    // La dissolvenza usa copie locali, mai i materiali condivisi degli altri fantasmi.
    this.ghost.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const copy = (material: THREE.Material) => {
        const local = material.clone();
        this.ghostMaterials.push({ material: local, opacity: local.opacity });
        local.transparent = true;
        local.depthWrite = false;
        return local;
      };
      object.material = Array.isArray(object.material) ? object.material.map(copy) : copy(object.material);
    });
    this.ghost.root.position.set(-0.2, 0.12, 0.08);
    this.ghost.root.scale.setScalar(reduced ? 0.8 : 0.03);
    this.root.add(this.ghost.root);
    parent.add(this.root);
  }
  /** Ritorna false quando l'effetto è terminato. */
  update(dt: number): boolean {
    if (this.stopped) return false;
    this.age += Math.max(0, dt);
    const duration = this.reduced ? 1.5 : 5;
    if (this.age >= duration) { this.dispose(); return false; }
    if (this.reduced) return true;
    this.glow.color.set(COLORS[Math.floor(this.age / 0.5) % COLORS.length]);
    const emerge = Math.min(1, this.age / 1.1);
    this.ghost.root.position.z = 0.08 + 1.25 * emerge;
    this.ghost.root.position.y = 0.12 + 0.12 * Math.sin(emerge * Math.PI);
    const fall = THREE.MathUtils.clamp((this.age - 1.4) / 0.85, 0, 1);
    const ease = fall * fall * (3 - 2 * fall);
    this.ghost.root.rotation.z = -ease * Math.PI / 2;
    this.ghost.root.position.y += 0.3 * ease;
    const appear = Math.min(1, this.age / 0.45);
    const fade = 1 - THREE.MathUtils.clamp((this.age - 3.6) / 1.2, 0, 1);
    this.ghost.root.scale.setScalar(Math.max(0.01, appear));
    for (const { material, opacity } of this.ghostMaterials) material.opacity = opacity * fade;
    animateRig(this.ghost, 'idle', this.age, 0);
    return true;
  }
  dispose() {
    if (this.stopped) return;
    this.stopped = true;
    this.parent.remove(this.root);
    this.glow.dispose();
    for (const { material } of this.ghostMaterials) material.dispose();
  }
}
