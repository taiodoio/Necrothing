import * as THREE from 'three';
import type { ArtStyle, CameraMode, EnvironmentTime, GameState, GraveCondition } from './GameState.ts';
import { CameraManager } from '../rendering/CameraManager.ts';
import { LightingManager } from '../rendering/LightingManager.ts';
import { CemeteryWorld } from '../world/CemeteryWorld.ts';
import { graveLabel } from '../assets/AssetFactory.ts';

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cameraManager = new CameraManager();
  readonly lighting: LightingManager;
  readonly world: CemeteryWorld;
  readonly raycaster = new THREE.Raycaster();
  readonly pointer = new THREE.Vector2();
  readonly state: GameState;
  private readonly canvas: HTMLCanvasElement;
  private readonly clock = new THREE.Clock();
  private frameCounter = 0;
  private fpsElapsed = 0;
  private fps = 0;
  private selectedDom = document.querySelector<HTMLElement>('#inspector')!;
  private toastTimer = 0;
  private readonly activePointers = new Map<number, THREE.Vector2>();
  private lastPointer = new THREE.Vector2();
  private pointerStart = new THREE.Vector2();
  private pointerDragged = false;
  private pinching = false;
  private pinchStartDistance = 0;
  private pinchStartZoom = 1;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, state: GameState) {
    this.canvas = canvas; this.state = state;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.15 : 1.65));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.12;
    this.renderer.info.autoReset = false;
    this.lighting = new LightingManager(this.scene);
    this.world = new CemeteryWorld(this.scene, state);
    this.bindEvents(); this.resize(); this.updateInspector();
  }

  start() { this.renderer.setAnimationLoop(this.tick); }
  setStyle(style: ArtStyle) { if (this.state.style === style) return; this.state.style = style; this.world.build(style); this.updateInspector(); this.updateSegments('style', style); this.toast(style === 'voxel' ? 'Pietra dopo pietra.' : 'Un tratto più illustrato.'); }
  setCamera(mode: CameraMode) { this.state.camera = mode; this.cameraManager.setMode(mode); this.updateSegments('camera', mode); }
  setTime(time: EnvironmentTime) { this.state.time = time; this.lighting.setTime(time, this.scene); }

  private readonly tick = () => {
    if (this.disposed) return;
    const delta = Math.min(this.clock.getDelta(), .05); const elapsed = this.clock.elapsedTime;
    this.world.update(delta, elapsed);
    this.cameraManager.update(delta); this.renderer.info.reset(); this.renderer.render(this.scene, this.cameraManager.camera);
    this.frameCounter++; this.fpsElapsed += delta;
    if (this.fpsElapsed >= .5) { this.fps = Math.round(this.frameCounter / this.fpsElapsed); this.frameCounter = 0; this.fpsElapsed = 0; this.updateDebug(); }
  };

  private bindEvents() {
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKeyDown);
    this.canvas.addEventListener('pointerdown', this.onPointerDown); this.canvas.addEventListener('pointermove', this.onPointerMove); this.canvas.addEventListener('pointerup', this.onPointerUp); this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach((button) => button.addEventListener('click', () => this.setStyle(button.dataset.style as ArtStyle)));
    document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach((button) => button.addEventListener('click', () => this.setCamera(button.dataset.camera as CameraMode)));
    document.querySelector<HTMLButtonElement>('#time-toggle')!.addEventListener('click', () => this.cycleTime());
    document.querySelector<HTMLButtonElement>('#zoom-in')!.addEventListener('click', () => this.zoomBy(.22));
    document.querySelector<HTMLButtonElement>('#zoom-out')!.addEventListener('click', () => this.zoomBy(-.22));
    document.querySelector<HTMLButtonElement>('#camera-reset')!.addEventListener('click', () => { this.cameraManager.reset(); this.cameraManager.resize(window.innerWidth, window.innerHeight); });
    document.querySelector<HTMLButtonElement>('#debug-toggle')!.addEventListener('click', () => { const panel = document.querySelector<HTMLElement>('#debug-panel')!; panel.hidden = !panel.hidden; });
    document.querySelector<HTMLButtonElement>('#close-inspector')!.addEventListener('click', () => this.selectGrave(null));
    document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => button.addEventListener('click', () => this.act(button.dataset.action as 'clean' | 'neglect' | 'decorate')));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clock.stop(); else this.clock.start(); });
  }

  private readonly resize = () => { const width = window.innerWidth; const height = window.innerHeight; this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 760 ? 1.15 : 1.65)); this.renderer.setSize(width, height, false); this.cameraManager.resize(width, height); };
  private readonly onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (['input','select','textarea'].includes((event.target as HTMLElement)?.tagName?.toLowerCase())) return;
    if (['v','c','e'].includes(key) && event.repeat) return;
    if (key === 'v') this.setStyle(this.state.style === 'lowpoly' ? 'voxel' : 'lowpoly');
    else if (key === 'c') this.setCamera(this.state.camera === 'angled' ? 'top' : 'angled');
    else if (key === 'e') this.interact();
  };
  private readonly onWheel = (event: WheelEvent) => { event.preventDefault(); this.cameraManager.setZoom(event.deltaY * .0012); this.cameraManager.resize(window.innerWidth, window.innerHeight); };
  private readonly onPointerDown = (event: PointerEvent) => {
    this.canvas.setPointerCapture(event.pointerId);
    const point = new THREE.Vector2(event.clientX, event.clientY);
    this.activePointers.set(event.pointerId, point);
    if (this.activePointers.size === 1) { this.pointerStart.copy(point); this.lastPointer.copy(point); this.pointerDragged = false; this.pinching = false; }
    else if (this.activePointers.size === 2) {
      const [first, second] = [...this.activePointers.values()];
      this.pinchStartDistance = first.distanceTo(second); this.pinchStartZoom = this.cameraManager.getZoom();
      this.pinching = true; this.pointerDragged = true;
    }
  };
  private readonly onPointerMove = (event: PointerEvent) => {
    const point = this.activePointers.get(event.pointerId); if (!point) return;
    point.set(event.clientX, event.clientY);
    if (this.activePointers.size >= 2) {
      const [first, second] = [...this.activePointers.values()];
      const distance = first.distanceTo(second);
      if (this.pinchStartDistance > 0) this.cameraManager.setZoomTo(this.pinchStartZoom * distance / this.pinchStartDistance);
      this.cameraManager.resize(window.innerWidth, window.innerHeight);
      return;
    }
    const delta = new THREE.Vector2(event.clientX - this.lastPointer.x, event.clientY - this.lastPointer.y);
    if (this.pointerStart.distanceTo(point) > 5) this.pointerDragged = true;
    if (this.pointerDragged) this.cameraManager.panPixels(delta.x, delta.y, window.innerHeight);
    this.lastPointer.copy(point);
  };
  private readonly onPointerUp = (event: PointerEvent) => {
    const point = this.activePointers.get(event.pointerId);
    if (point && !this.pointerDragged && !this.pinching && this.activePointers.size === 1) this.pick(point.x, point.y);
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) this.pinchStartDistance = 0;
    if (this.activePointers.size === 0) { this.pointerDragged = false; this.pinching = false; }
  };
  private readonly onContextLost = (event: Event) => { event.preventDefault(); this.toast('La scena si sta ripristinando.'); };

  private pick(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect(); this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.cameraManager.camera);
    const hits = this.raycaster.intersectObjects(this.world.interactive, true);
    const graveHit = hits.find((hit) => this.findGraveRoot(hit.object));
    const graveRoot = graveHit ? this.findGraveRoot(graveHit.object) : null;
    if (graveRoot?.userData.graveId) this.selectGrave(String(graveRoot.userData.graveId));
    else if (hits.length) { this.selectGrave(null); this.toast(hits[0].object.parent?.name || 'Un luogo silenzioso.'); }
    else if (this.state.selectedGraveId) this.selectGrave(null);
  }

  private findGraveRoot(object: THREE.Object3D): THREE.Object3D | null { let current: THREE.Object3D | null = object; while (current && !current.userData.graveId) current = current.parent; return current; }
  private interact() {
    if (this.state.selectedGraveId) { this.updateInspector(); return; }
    this.toast('Tocca una tomba per aprirne la memoria.');
  }
  private selectGrave(id: string | null) { this.state.selectedGraveId = id; this.world.build(this.state.style); this.updateInspector(); }
  private act(action: 'clean' | 'neglect' | 'decorate') {
    const grave = this.state.graves.find((entry) => entry.id === this.state.selectedGraveId); if (!grave) return;
    const conditions: Record<typeof action, GraveCondition> = { clean: 'clean', neglect: 'neglected', decorate: 'decorated' };
    grave.condition = conditions[action]; this.world.build(this.state.style); this.updateInspector();
    this.toast(action === 'clean' ? 'La memoria è di nuovo in ordine.' : action === 'neglect' ? 'Il muschio reclama la pietra.' : 'I fiori trovano un posto quieto.');
  }
  private updateInspector() {
    const grave = this.state.graves.find((entry) => entry.id === this.state.selectedGraveId);
    this.selectedDom.hidden = !grave; if (!grave) return;
    document.querySelector('#grave-number')!.textContent = 'MEMORIA · ' + String(Number(grave.id.split('-')[1])).padStart(2, '0');
    document.querySelector('#grave-title')!.textContent = grave.name;
    document.querySelector('#grave-description')!.textContent = graveLabel(grave) + ' · una storia affidata al silenzio.';
    const labels: Record<GraveCondition, string> = { clean: 'In ordine', neglected: 'Trascurata', decorated: 'Ricordata con fiori' };
    document.querySelector('#grave-status')!.textContent = labels[grave.condition];
    document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => { button.disabled = (button.dataset.action === 'clean' && grave.condition === 'clean') || (button.dataset.action === 'neglect' && grave.condition === 'neglected') || (button.dataset.action === 'decorate' && grave.condition === 'decorated'); });
  }
  private updateSegments(group: 'style' | 'camera', active: string) { const attribute = group === 'style' ? 'style' : 'camera'; document.querySelectorAll<HTMLButtonElement>('[data-' + attribute + ']').forEach((button) => button.classList.toggle('active', button.dataset[attribute] === active)); }
  private zoomBy(amount: number) { this.cameraManager.setZoomTo(this.cameraManager.getZoom() + amount); this.cameraManager.resize(window.innerWidth, window.innerHeight); }
  private cycleTime() {
    const order: EnvironmentTime[] = ['day', 'dusk', 'night']; const next = order[(order.indexOf(this.state.time) + 1) % order.length]; this.setTime(next);
    const button = document.querySelector<HTMLButtonElement>('#time-toggle')!;
    button.querySelector('.time-symbol')!.textContent = next === 'day' ? '☼' : next === 'dusk' ? '☾' : '✦';
    button.querySelector('.time-label')!.textContent = next === 'day' ? 'ALBA' : next === 'dusk' ? 'CREPUSCOLO' : 'NOTTE';
  }
  private toast(message: string) { const toast = document.querySelector<HTMLElement>('#toast')!; toast.textContent = message; toast.classList.add('visible'); window.clearTimeout(this.toastTimer); this.toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2200); }
  private updateDebug() {
    document.querySelector('#fps-value')!.textContent = String(this.fps);
    document.querySelector('#calls-value')!.textContent = String(this.renderer.info.render.calls);
    document.querySelector('#triangles-value')!.textContent = this.renderer.info.render.triangles.toLocaleString('it-IT');
    document.querySelector('#objects-value')!.textContent = String(this.world.root.children.length);
  }
  dispose() { this.disposed = true; this.renderer.setAnimationLoop(null); this.renderer.dispose(); this.world.root.removeFromParent(); }
}
