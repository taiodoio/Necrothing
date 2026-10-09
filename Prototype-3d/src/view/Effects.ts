// Effetti leggeri: pioggia (temporale), lucciole/spore spettrali di notte,
// pulviscolo di giorno, sbuffi quando una presenza svanisce. Quantità in
// base alla qualità grafica.

import * as THREE from 'three';
import type { Quality, Weather } from '../game/state.ts';
import type { DayPhase } from '../game/time.ts';

export class Effects {
  readonly group = new THREE.Group();
  private rain: THREE.LineSegments;
  private rainPos: Float32Array;
  private motes: THREE.Points;
  private motePos: Float32Array;
  private moteSeed: Float32Array;
  private puffs: Array<{ mesh: THREE.Points; life: number; vel: Float32Array }> = [];
  private center = new THREE.Vector3();
  private radius = 14;
  private rainCount = 0;
  private moteCount = 0;

  constructor(scene: THREE.Scene, quality: Quality) {
    scene.add(this.group);
    const rainMax = 900, moteMax = 140;
    this.rainPos = new Float32Array(rainMax * 6);
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#9fb2c8', transparent: true, opacity: 0.38, depthWrite: false }));
    this.rain.frustumCulled = false;
    this.group.add(this.rain);
    this.motePos = new Float32Array(moteMax * 3);
    this.moteSeed = new Float32Array(moteMax * 4).map(() => Math.random());
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(this.motePos, 3));
    this.motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: '#c9fff0', size: 0.09, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.motes.frustumCulled = false;
    this.group.add(this.motes);
    this.setQuality(quality);
  }

  setQuality(q: Quality) {
    this.rainCount = q === 'low' ? 250 : q === 'medium' ? 520 : 900;
    this.moteCount = q === 'low' ? 30 : q === 'medium' ? 80 : 140;
  }

  setConditions(phase: DayPhase, weather: Weather, enabled: boolean) {
    const wet = enabled && (weather === 'rain' || weather === 'storm');
    this.rain.visible = wet;
    this.rain.geometry.setDrawRange(0, this.rainCount * 2);
    const mat = this.motes.material as THREE.PointsMaterial;
    if (phase === 'night' || phase === 'dusk') { mat.color.set('#bfffe9'); mat.size = 0.1; mat.opacity = 0.9; }
    else { mat.color.set('#f3e6c0'); mat.size = 0.05; mat.opacity = 0.45; }
    this.motes.visible = enabled && !wet;
    this.motes.geometry.setDrawRange(0, this.moteCount);
  }

  focus(center: THREE.Vector3, radius: number) {
    this.center.copy(center);
    this.radius = radius;
  }

  puff(at: THREE.Vector3, color = '#cfeee6') {
    const n = 18;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos.set([at.x, at.y + 0.5, at.z], i * 3);
      vel.set([(Math.random() - 0.5) * 2, Math.random() * 2 + 0.5, (Math.random() - 0.5) * 2], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mesh = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.group.add(mesh);
    this.puffs.push({ mesh, life: 0.9, vel });
  }

  update(dt: number, t: number) {
    const R = this.radius, c = this.center;
    if (this.rain.visible) {
      const p = this.rainPos;
      for (let i = 0; i < this.rainCount; i++) {
        const o = i * 6;
        let y = p[o + 1] - dt * 16;
        if (y < 0 || p[o + 1] === 0) {
          const x = c.x + (Math.random() - 0.5) * R * 2.2, z = c.z + (Math.random() - 0.5) * R * 2.2;
          y = 6 + Math.random() * 10;
          p[o] = x; p[o + 2] = z; p[o + 3] = x - 0.08; p[o + 5] = z - 0.04;
        }
        p[o + 1] = y; p[o + 4] = y + 0.45;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    if (this.motes.visible) {
      const p = this.motePos, s = this.moteSeed;
      for (let i = 0; i < this.moteCount; i++) {
        const a = s[i * 4], b = s[i * 4 + 1], k = s[i * 4 + 2], e = s[i * 4 + 3];
        p[i * 3] = c.x + (a - 0.5) * R * 2 + Math.sin(t * 0.3 + k * 9) * 0.8;
        p[i * 3 + 1] = 0.4 + b * 2.4 + Math.sin(t * 0.8 + e * 7) * 0.3;
        p[i * 3 + 2] = c.z + (k - 0.5) * R * 2 + Math.cos(t * 0.27 + a * 9) * 0.8;
      }
      this.motes.geometry.attributes.position.needsUpdate = true;
      (this.motes.material as THREE.PointsMaterial).opacity = 0.55 + Math.sin(t * 2) * 0.25;
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const f = this.puffs[i];
      f.life -= dt;
      const pos = f.mesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) {
        pos.setXYZ(k, pos.getX(k) + f.vel[k * 3] * dt, pos.getY(k) + f.vel[k * 3 + 1] * dt, pos.getZ(k) + f.vel[k * 3 + 2] * dt);
      }
      pos.needsUpdate = true;
      (f.mesh.material as THREE.PointsMaterial).opacity = Math.max(0, f.life / 0.9);
      if (f.life <= 0) { this.group.remove(f.mesh); f.mesh.geometry.dispose(); (f.mesh.material as THREE.Material).dispose(); this.puffs.splice(i, 1); }
    }
  }
}
