// Camera ortografica con due modalità reali:
//  • angled: tre quarti (elevazione ~40°, azimut ~35°)
//  • top: esattamente perpendicolare al terreno (asse -Y), nessuna prospettiva
// Pan (trascinamento), zoom (pinch/rotella), inseguimento morbido del Custode.

import * as THREE from 'three';
import type { CameraMode } from '../game/state.ts';

const ELEVATION = THREE.MathUtils.degToRad(40);
const AZIMUTH = THREE.MathUtils.degToRad(35);
const DISTANCE = 70;

export class CameraRig {
  readonly camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.5, 240);
  readonly target = new THREE.Vector3();
  private readonly smooth = new THREE.Vector3();
  mode: CameraMode = 'angled';
  /** Altezza visibile (unità mondo) a zoom corrente. */
  viewHeight = 18;
  minView = 7;
  maxView = 42;
  follow: THREE.Vector3 | null = null;
  private width = 1;
  private height = 1;
  private bounds = 18;
  private blend = 1; // 0 = top, 1 = angled (transizione)

  setMode(mode: CameraMode) { this.mode = mode; }

  resize(w: number, h: number) {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.applyProjection();
  }

  /** Zoom moltiplicativo (fattore > 1 allontana). */
  zoomBy(factor: number) {
    this.viewHeight = THREE.MathUtils.clamp(this.viewHeight * factor, this.minView, this.maxView);
    this.applyProjection();
  }

  setView(h: number) {
    this.viewHeight = THREE.MathUtils.clamp(h, this.minView, this.maxView);
    this.applyProjection();
  }

  private applyProjection() {
    const aspect = this.width / this.height;
    const h = this.viewHeight / 2;
    this.camera.top = h;
    this.camera.bottom = -h;
    this.camera.left = -h * aspect;
    this.camera.right = h * aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Mezza diagonale visibile sul terreno (per ombre/nebbia/pool di luci). */
  groundRadius(): number {
    const aspect = this.width / this.height;
    const stretch = this.mode === 'top' ? 1 : 1 / Math.sin(ELEVATION);
    return Math.hypot(this.viewHeight * aspect, this.viewHeight * stretch) / 2;
  }

  /** Trascinamento in pixel → spostamento del bersaglio sul terreno. */
  panPixels(dx: number, dy: number) {
    const perPx = this.viewHeight / this.height;
    this.follow = null;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion).setY(0).normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).setY(0);
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1); else forward.normalize();
    const stretch = this.mode === 'top' ? 1 : 1 / Math.sin(ELEVATION);
    this.target.addScaledVector(right, -dx * perPx);
    this.target.addScaledVector(forward, dy * perPx * stretch);
    this.clampTarget();
  }

  setBounds(halfSize: number) { this.bounds = halfSize; this.clampTarget(); }

  private clampTarget() {
    this.target.x = THREE.MathUtils.clamp(this.target.x, -this.bounds, this.bounds);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -this.bounds, this.bounds);
    this.target.y = 0;
  }

  jumpTo(p: THREE.Vector3) {
    this.target.set(p.x, 0, p.z);
    this.clampTarget();
  }

  snap() {
    this.smooth.copy(this.target);
    this.blend = this.mode === 'angled' ? 1 : 0;
  }

  update(dt: number) {
    if (this.follow) {
      this.target.lerp(new THREE.Vector3(this.follow.x, 0, this.follow.z), Math.min(1, dt * 3));
      this.clampTarget();
    }
    this.smooth.lerp(this.target, Math.min(1, dt * 8));
    const goal = this.mode === 'angled' ? 1 : 0;
    this.blend += (goal - this.blend) * Math.min(1, dt * 6);
    if (Math.abs(goal - this.blend) < 0.002) this.blend = goal;
    const el = THREE.MathUtils.lerp(Math.PI / 2, ELEVATION, this.blend);
    const az = AZIMUTH * this.blend;
    const horiz = Math.cos(el) * DISTANCE;
    this.camera.position.set(
      this.smooth.x + Math.sin(az) * horiz,
      Math.sin(el) * DISTANCE,
      this.smooth.z + Math.cos(az) * horiz,
    );
    // In vista dall'alto pura l'"alto" dello schermo è il nord (-z).
    this.camera.up.set(0, 1, 0);
    if (this.blend === 0) this.camera.up.set(0, 0, -1);
    this.camera.lookAt(this.smooth);
    this.camera.updateMatrixWorld();
  }

  /** Punto del terreno (y=0) sotto un punto dello schermo in NDC. */
  groundAt(ndc: THREE.Vector2, raycaster: THREE.Raycaster): THREE.Vector3 | null {
    raycaster.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, hit) ? hit : null;
  }

  get distance() { return DISTANCE; }
}
