import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGameState } from '../core/GameState.ts';
import { createWorldAsset, disposeTree } from './AssetFactory.ts';

test('all five tombstone profiles build repeatable geometry in both styles', () => {
  const state = createGameState(717);
  for (let type = 0; type < 5; type++) {
    const record = { ...state.graves[type], type, seed: 900 + type };
    for (const style of ['voxel', 'lowpoly']) {
      const first = createWorldAsset('grave', style, { grave: record });
      const second = createWorldAsset('grave', style, { grave: record });
      first.updateMatrixWorld(true); second.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(first);
      const repeatedBounds = new THREE.Box3().setFromObject(second);
      assert.ok(bounds.getSize(new THREE.Vector3()).x > .5);
      assert.ok(bounds.getSize(new THREE.Vector3()).y > .7);
      assert.ok(bounds.getSize(new THREE.Vector3()).z > .3);
      assert.ok(bounds.min.distanceTo(repeatedBounds.min) < 1e-9);
      assert.ok(bounds.max.distanceTo(repeatedBounds.max) < 1e-9);
      disposeTree(first); disposeTree(second);
    }
  }
});

test('grave condition adds its matching decoration geometry', () => {
  const [record] = createGameState(717).graves;
  const clean = createWorldAsset('grave', 'lowpoly', { grave: { ...record, condition: 'clean' } });
  const neglected = createWorldAsset('grave', 'lowpoly', { grave: { ...record, condition: 'neglected' } });
  const decorated = createWorldAsset('grave', 'lowpoly', { grave: { ...record, condition: 'decorated' } });
  assert.ok(neglected.children.length > clean.children.length);
  assert.ok(decorated.children.length > clean.children.length);
  disposeTree(clean); disposeTree(neglected); disposeTree(decorated);
});
