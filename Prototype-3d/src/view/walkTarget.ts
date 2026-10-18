// Dove sta andando il Custode: un cerchio dorato a terra sul punto toccato.
// Compare quando parte, pulsa piano mentre cammina e svanisce quando arriva
// (o quando gli si dà un'altra meta). Si vede anche dove il terreno sale.

import * as THREE from 'three';

const GOLD = '#f1d39c', INK = '#07080b';

const flat = (geo: THREE.BufferGeometry, color: string, opacity: number) => {
  const m = new THREE.Mesh(geo.rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false }));
  m.renderOrder = 3; // a terra si vede sempre, anche dove il terreno sale
  return m;
};

export class WalkTarget {
  readonly group = new THREE.Group();
  private readonly edge = flat(new THREE.RingGeometry(0.29, 0.41, 32), INK, 0.5);
  private readonly ring = flat(new THREE.RingGeometry(0.31, 0.38, 32), GOLD, 0.95);
  /** 0 = invisibile, 1 = pieno. */
  private alpha = 0;
  private active = false;
  private born = 0;

  constructor() {
    this.edge.position.y = 0.025;
    this.ring.position.y = 0.03;
    this.group.add(this.edge, this.ring);
    this.group.visible = false;
  }

  /** Nuova meta: il cerchio riparte da lì (si allarga un attimo, poi pulsa). */
  show(at: THREE.Vector3) {
    this.group.position.copy(at);
    this.active = true;
    this.born = -1;
    this.group.visible = true;
  }

  /** Il Custode è arrivato (o si è fermato): il cerchio svanisce. */
  hide() { this.active = false; }

  update(dt: number, t: number) {
    if (this.born < 0) this.born = t;
    this.alpha = this.active ? Math.min(1, this.alpha + dt * 8) : Math.max(0, this.alpha - dt * 4);
    if (this.alpha <= 0) { this.group.visible = false; return; }
    const pop = Math.max(0, 1 - (t - this.born) / 0.25); // appena toccato: un piccolo scatto
    const s = 1 + pop * 0.35 + (Math.sin(t * 5) + 1) * 0.04;
    this.ring.scale.setScalar(s);
    this.edge.scale.setScalar(s);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.95 * this.alpha;
    (this.edge.material as THREE.MeshBasicMaterial).opacity = 0.5 * this.alpha;
  }
}
