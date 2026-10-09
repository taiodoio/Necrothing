import * as THREE from 'three';
import type { EnvironmentTime } from '../core/GameState.ts';

export class LightingManager {
  readonly group = new THREE.Group();
  private hemi = new THREE.HemisphereLight('#c7ced0', '#39413b', 2.1);
  private sun = new THREE.DirectionalLight('#fff0d9', 3.1);
  private fill = new THREE.AmbientLight('#aeb6b4', .45);
  constructor(scene: THREE.Scene) { this.group.add(this.hemi, this.sun, this.fill); this.sun.position.set(-13, 22, 12); this.sun.castShadow = true; const shadowSize = window.innerWidth < 760 ? 1024 : 1536; this.sun.shadow.mapSize.set(shadowSize, shadowSize); this.sun.shadow.camera.left = -24; this.sun.shadow.camera.right = 24; this.sun.shadow.camera.top = 24; this.sun.shadow.camera.bottom = -24; this.sun.shadow.bias = -.00025; scene.add(this.group); this.setTime('dusk', scene); }
  setTime(time: EnvironmentTime, scene: THREE.Scene) {
    const presets = {
      day: { background: '#303a36', fog: '#59665d', hemi: 2.8, sun: 3.7, fill: .7, sunColor: '#fff2de' },
      dusk: { background: '#222c31', fog: '#39464a', hemi: 1.8, sun: 2.1, fill: .35, sunColor: '#d9c7ae' },
      night: { background: '#131c25', fog: '#27333d', hemi: 1.15, sun: .95, fill: .18, sunColor: '#9eb6d0' },
    } as const;
    const p = presets[time]; scene.background = new THREE.Color(p.background); scene.fog = new THREE.Fog(p.fog, 28, 62); this.hemi.intensity = p.hemi; this.sun.intensity = p.sun; this.fill.intensity = p.fill; this.sun.color.set(p.sunColor);
  }
}
