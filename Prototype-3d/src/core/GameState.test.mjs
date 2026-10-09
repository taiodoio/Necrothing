import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, seededRandom } from './GameState.ts';

test('seeded generation produces the same cemetery and distinct seeds differ', () => {
  const first = createGameState(717);
  const repeated = createGameState(717);
  const alternate = createGameState(718);
  assert.equal(first.graves.length, 24);
  assert.deepEqual(first.graves, repeated.graves);
  assert.notDeepEqual(first.graves, alternate.graves);
});

test('seeded random values repeat exactly', () => {
  const first = seededRandom(41);
  const second = seededRandom(41);
  assert.deepEqual(Array.from({ length: 8 }, first), Array.from({ length: 8 }, second));
});

test('grave identity and condition are independent from the visual style field', () => {
  const state = createGameState(717);
  const grave = state.graves[4];
  grave.condition = 'decorated';
  const originalPosition = [grave.x, grave.z];
  state.style = 'voxel';
  state.style = 'lowpoly';
  assert.equal(state.graves[4].id, 'grave-5');
  assert.equal(state.graves[4].condition, 'decorated');
  assert.deepEqual([state.graves[4].x, state.graves[4].z], originalPosition);
});
