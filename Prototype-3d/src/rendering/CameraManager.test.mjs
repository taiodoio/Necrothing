import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CameraManager } from './CameraManager.ts';

test('top camera points directly down and keeps an orthographic projection', () => {
  const manager = new CameraManager();
  manager.setMode('top');
  manager.update(1);
  const direction = manager.camera.getWorldDirection(new THREE.Vector3());
  assert.ok(direction.dot(new THREE.Vector3(0, -1, 0)) > .9999);
  assert.ok(manager.camera.isOrthographicCamera);
});

test('map drag changes the camera focus and zoom stays within usable limits', () => {
  const manager = new CameraManager();
  manager.update(1);
  manager.panPixels(130, 75, 844);
  assert.ok(manager.focus.length() > 1);
  manager.setZoomTo(0);
  assert.equal(manager.getZoom(), .3);
  manager.setZoomTo(20);
  assert.equal(manager.getZoom(), 1.75);
});
