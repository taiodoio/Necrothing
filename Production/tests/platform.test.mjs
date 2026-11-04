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

/** Un Input finto (senza DOM) che registra i gesti; `owns`: cosa risponde dragStart. */
async function fakeInput(owns) {
  const { Input, LONG_PRESS_MS } = await import('../src/app/Input.ts');
  const events = new Map(), log = [];
  const el = { addEventListener: (name, fn) => events.set(name, fn), setPointerCapture() {} };
  const input = new Input(el, {
    tap: (x, y) => log.push(['tap', x, y]),
    dragStart: (x, y, long) => { log.push(['start', x, y, long]); return owns(long); },
    dragMove: (_x, _y, _dx, _dy, owned) => log.push(['move', owned]),
    dragEnd: (_x, _y, owned, suspended) => log.push(['end', owned, !!suspended]),
    zoom() {}, key() {},
  });
  const fire = (name, id, x, y) => events.get(name)({ pointerId: id, timeStamp: 1, clientX: x, clientY: y, button: 0, pointerType: 'touch' });
  return { input, log, fire, LONG_PRESS_MS, wait: (ms) => new Promise((r) => setTimeout(r, ms)) };
}

test('input: la pressione lunga (350 ms, fermi) prende subito; alzando il dito non è un tocco', async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { addEventListener() {} };
  try {
    const { input, log, fire, wait, LONG_PRESS_MS } = await fakeInput((long) => long);
    assert.equal(LONG_PRESS_MS, 350);
    fire('pointerdown', 1, 50, 50);
    await wait(LONG_PRESS_MS + 60);
    assert.deepEqual(log, [['start', 50, 50, true]]);
    assert.deepEqual(input.activeDrag(), { x: 50, y: 50 }); // lo scorrimento ai bordi sa dov'è il dito
    fire('pointermove', 1, 52, 51);
    fire('pointerup', 1, 52, 51);
    assert.deepEqual(log.slice(1), [['move', true], ['end', true, false]]);
    assert.equal(input.activeDrag(), null);
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
});

test('input: se il dito si muove prima della soglia la pressione lunga si annulla (è un trascinamento normale)', async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { addEventListener() {} };
  try {
    const { log, fire, wait, LONG_PRESS_MS } = await fakeInput(() => false);
    fire('pointerdown', 1, 50, 50);
    fire('pointermove', 1, 70, 50);
    await wait(LONG_PRESS_MS + 60);
    fire('pointerup', 1, 70, 50);
    assert.deepEqual(log.filter((e) => e[0] === 'start'), [['start', 50, 50, false]]);
    assert.ok(!log.some((e) => e[0] === 'tap'));
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
});

test('input: un secondo dito sospende lo spostamento in corso; per riprendere serve un gesto nuovo', async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { addEventListener() {} };
  try {
    const { log, fire } = await fakeInput(() => true);
    fire('pointerdown', 1, 50, 50);
    fire('pointermove', 1, 70, 50);
    fire('pointerdown', 2, 150, 50);
    assert.deepEqual(log.at(-1), ['end', true, true]);
    fire('pointerup', 2, 150, 50);
    fire('pointermove', 1, 90, 50); // resta un dito: non riprende da solo
    fire('pointerup', 1, 90, 50);
    assert.equal(log.filter((e) => e[0] === 'start').length, 1);
    assert.ok(!log.some((e) => e[0] === 'tap'));
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
});
