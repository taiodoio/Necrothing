import * as THREE from 'three';
import type { CameraMode } from '../core/GameState.ts';

export class CameraManager {
  readonly camera = new THREE.OrthographicCamera(-16, 16, 10, -10, .1, 140);
  readonly focus = new THREE.Vector3(0, 0, 0);
  mode: CameraMode = 'angled';
  private target = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private zoom = .82;
  private initialized = false;
  constructor() { this.setMode('angled'); }
  setMode(mode: CameraMode) { this.mode = mode; if (mode === 'top') this.camera.up.set(0, 0, -1); else this.camera.up.set(0, 1, 0); }
  setZoom(delta: number) { this.setZoomTo(this.zoom * Math.exp(delta)); }
  setZoomTo(value: number) { this.zoom = THREE.MathUtils.clamp(value, .3, 1.75); }
  reset() { this.focus.set(0, 0, 0); this.zoom = .82; }
  resize(width: number, height: number) {
    const aspect = width / Math.max(1, height); const viewHeight = 26 / this.zoom;
    this.camera.left = -viewHeight * aspect / 2; this.camera.right = viewHeight * aspect / 2;
    this.camera.top = viewHeight / 2; this.camera.bottom = -viewHeight / 2; this.camera.updateProjectionMatrix();
  }
  panPixels(dx: number, dy: number, viewportHeight: number) {
    const forward = this.camera.getWorldDirection(new THREE.Vector3());
    const right = forward.clone().cross(this.camera.up).normalize();
    const screenUp = right.clone().cross(forward).normalize();
    const worldPerPixel = (26 / this.zoom) / Math.max(1, viewportHeight);
    this.focus.addScaledVector(right, -dx * worldPerPixel);
    this.focus.addScaledVector(screenUp, dy * worldPerPixel);
    this.focus.x = THREE.MathUtils.clamp(this.focus.x, -18, 18);
    this.focus.z = THREE.MathUtils.clamp(this.focus.z, -18, 18);
  }
  update(delta: number) {
    this.target.lerp(this.focus, Math.min(1, delta * 9));
    if (this.mode === 'top') this.desired.set(this.target.x, 40, this.target.z + .001);
    else this.desired.set(this.target.x + 20, 23, this.target.z + 23);
    if (!this.initialized) { this.camera.position.copy(this.desired); this.initialized = true; }
    else this.camera.position.lerp(this.desired, Math.min(1, delta * 7));
    this.camera.lookAt(this.target.x, 0, this.target.z); this.camera.updateMatrixWorld();
  }
  getZoom() { return this.zoom; }
}
