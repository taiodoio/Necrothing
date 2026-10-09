import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGameState } from '../core/GameState.ts';
import { CemeteryWorld } from './CemeteryWorld.ts';

test('world keeps grave identities and positions while its art style changes', () => {
  const state = createGameState(717);
  const scene = new THREE.Scene();
  const world = new CemeteryWorld(scene, state);
  const originalGraves = state.graves.map(({ id, x, z, condition }) => ({ id, x, z, condition }));
  assert.equal(world.graveObjects.size, 24);
  assert.equal(world.interactive.length, 28);
  assert.equal(world.root.getObjectByName('Custode'), undefined);

  world.build('voxel');
  assert.equal(state.graves.length, 24);
  assert.deepEqual(state.graves.map(({ id, x, z, condition }) => ({ id, x, z, condition })), originalGraves);
  assert.equal(world.graveObjects.size, 24);
  assert.equal(world.root.getObjectByName('Custode'), undefined);
});
