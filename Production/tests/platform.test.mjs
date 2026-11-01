import test from 'node:test';
import assert from 'node:assert/strict';
import { LifecycleGate } from '../src/app/platform.ts';

test('lifecycle: eventi nativi e DOM duplicati producono una sola transizione', () => {
  const calls = [];
  const gate = new LifecycleGate({
    pause: () => calls.push('pause'),
    resume: () => calls.push('resume'),
    blur: () => calls.push('blur'),
    focus: () => calls.push('focus'),
  }, false, false);

  gate.pause();
  gate.pause(); // visibilitychange + appStateChange
  gate.resume();
  gate.resume(); // pageshow + appStateChange
  gate.blur();
  gate.blur();
  gate.focus();
  gate.focus();

  assert.deepEqual(calls, ['pause', 'resume', 'focus', 'blur', 'focus']);
});

test('lifecycle: rientrare dall’avvio in background ripristina anche il focus', () => {
  const calls = [];
  const gate = new LifecycleGate({
    pause: () => calls.push('pause'),
    resume: () => calls.push('resume'),
    blur: () => calls.push('blur'),
    focus: () => calls.push('focus'),
  }, true, false);
  gate.resume();
  assert.deepEqual(calls, ['resume', 'focus']);
});

test('input: i tocchi accodati durante un cambio scena non diventano azioni nel tutorial', async () => {
  const { Input } = await import('../src/app/Input.ts');
  const previousWindow = globalThis.window;
  const events = new Map();
  const taps = [];
  globalThis.window = { addEventListener() {} };
  try {
    const el = { addEventListener: (name, fn) => events.set(name, fn), setPointerCapture() {} };
    const input = new Input(el, { tap: (x, y) => taps.push([x, y]), dragStart: () => false, dragMove() {}, dragEnd() {}, zoom() {}, key() {} });
    input.ignorePointerEventsBefore(100);
    events.get('pointerdown')({ pointerId: 1, timeStamp: 99, clientX: 12, clientY: 18 });
    events.get('pointerup')({ pointerId: 1, timeStamp: 101, clientX: 12, clientY: 18 });
    assert.deepEqual(taps, []);
    events.get('pointerdown')({ pointerId: 2, timeStamp: 101, clientX: 20, clientY: 30 });
    events.get('pointerup')({ pointerId: 2, timeStamp: 102, clientX: 20, clientY: 30 });
    assert.deepEqual(taps, [[20, 30]]);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('input: il pinch parte dal centro delle due dita senza far saltare la mappa', async () => {
  const { Input } = await import('../src/app/Input.ts');
  const previousWindow = globalThis.window;
  const events = new Map(), moves = [], zooms = [];
  globalThis.window = { addEventListener() {} };
  try {
    const el = { addEventListener: (name, fn) => events.set(name, fn), setPointerCapture() {} };
    new Input(el, { tap() {}, dragStart: () => false, dragMove: (_x, _y, dx, dy) => moves.push([dx, dy]), dragEnd() {}, zoom: (f) => zooms.push(f), key() {} });
    events.get('pointerdown')({ pointerId: 1, timeStamp: 1, clientX: 100, clientY: 100 });
    events.get('pointerdown')({ pointerId: 2, timeStamp: 2, clientX: 200, clientY: 100 });
    events.get('pointermove')({ pointerId: 1, timeStamp: 3, clientX: 110, clientY: 100 });
    assert.deepEqual(moves, [[5, 0]]);
    assert.equal(zooms.length, 1);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
