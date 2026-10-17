import test from 'node:test';
import assert from 'node:assert/strict';
import { restorePresetState, savePreset, deletePreset, createPresetDraw, createPresetPools } from '../presets.mjs';
import { createMachine, stepMachine, FIXED_STEP } from '../simulation.mjs';
import { validateDraw } from '../draw.mjs';
import { readFileSync } from 'node:fs';

const geometry = JSON.parse(readFileSync(new URL('../assets/machine-layout.json', import.meta.url)));
const preset = { id: 'test', name: 'My numbers', red: [3, 8, 33], blue: 16 };

test('new users get three editable examples and a random default', () => {
  const state = restorePresetState(null);
  assert.equal(state.presets.length, 3);
  assert.equal(state.selectedId, 'random');
  assert.ok(state.presets.some(item => item.red.length && item.blue === null));
  assert.ok(state.presets.some(item => !item.red.length && item.blue !== null));
});

test('presets support create, edit, selection restoration, and deletion', () => {
  const initial = restorePresetState(null);
  const added = savePreset(initial, preset);
  assert.equal(added.selectedId, 'test');
  assert.equal(added.presets.length, 4);
  const edited = savePreset(added, { ...preset, name: 'Updated', red: [6], blue: null });
  assert.equal(edited.presets.length, 4);
  assert.equal(edited.presets.find(item => item.id === 'test').name, 'Updated');
  assert.deepEqual(restorePresetState(JSON.stringify(edited)), edited);
  const removed = deletePreset(edited, 'test');
  assert.equal(removed.selectedId, 'random');
  assert.equal(removed.presets.length, 3);
});

test('invalid ranges, repeated reds, excessive reds, and duplicate names are rejected', () => {
  const state = restorePresetState(null);
  for (const changes of [{ red: [1, 1] }, { red: [0] }, { red: [34] },
    { red: [1, 2, 3, 4, 5, 6, 7] }, { blue: 17 }, { blue: 0 }, { name: '' }, { red: [], blue: null }]) {
    assert.throws(() => savePreset(state, { ...preset, ...changes }));
  }
  const added = savePreset(state, preset);
  assert.throws(() => savePreset(added, { ...preset, id: 'other' }));
});

test('damaged saved data is filtered and a deleted selection returns to random', () => {
  assert.equal(restorePresetState('{broken').presets.length, 3);
  const restored = restorePresetState(JSON.stringify({ selectedId: 'missing', presets: [null, preset, { ...preset, id: 'bad', blue: 18 }] }));
  assert.equal(restored.presets.length, 1);
  assert.equal(restored.selectedId, 'random');
  assert.deepEqual(restorePresetState(JSON.stringify({ selectedId: 'random', presets: [] })).presets, []);
});

test('partial red and blue presets always appear with a valid random remainder', () => {
  const outcomes = new Set();
  for (let i = 0; i < 150; i++) {
    const draw = createPresetDraw(preset);
    assert.equal(validateDraw(draw), true);
    assert.ok(preset.red.every(number => draw.red.includes(number)));
    assert.equal(draw.blue, 16);
    outcomes.add([...draw.red].sort((a, b) => a - b).join(','));
  }
  assert.ok(outcomes.size > 1);
  const full = createPresetDraw({ ...preset, red: [1, 2, 3, 4, 5, 6], blue: 1 });
  assert.deepEqual([...full.red].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
});

test('red-only, blue-only, and fully specified presets remain independent', () => {
  const blues = new Set();
  for (let i = 0; i < 60; i++) {
    const redOnly = createPresetDraw({ ...preset, red: [1, 33], blue: null });
    assert.ok(redOnly.red.includes(1) && redOnly.red.includes(33));
    blues.add(redOnly.blue);
    const blueOnly = createPresetDraw({ ...preset, red: [], blue: 9 });
    assert.equal(blueOnly.blue, 9);
    assert.equal(validateDraw(blueOnly), true);
  }
  assert.ok(blues.size > 1);
});

test('preset pools preserve all 33 red and 16 blue balls', () => {
  const plan = createPresetPools(geometry, preset, false);
  assert.deepEqual([...plan.redNumbers].sort((a, b) => a - b), Array.from({ length: 33 }, (_, i) => i + 1));
  assert.deepEqual([...plan.blueNumbers].sort((a, b) => a - b), Array.from({ length: 16 }, (_, i) => i + 1));
});

test('physical draws honor preset numbers at different render rates and in reduced motion', () => {
  for (const [rate, reducedMotion] of [[30, false], [60, false], [120, true]]) {
    const plan = createPresetPools(geometry, preset, reducedMotion);
    const machine = createMachine(geometry, { ...plan, reducedMotion });
    machine.sequence.start();
    let accumulator = 0;
    let captures = 0;
    for (let frame = 0; frame < rate * 60 && machine.sequence.active; frame++) {
      accumulator += 1 / rate;
      while (accumulator + 1e-9 >= FIXED_STEP) {
        const events = stepMachine(machine, FIXED_STEP);
        if (events.capture) captures++;
        accumulator -= FIXED_STEP;
      }
    }
    assert.equal(machine.sequence.phase, 'complete');
    assert.equal(captures, 7);
    assert.deepEqual(machine.sequence.draw, plan.draw);
    assert.ok(preset.red.every(number => machine.sequence.draw.red.includes(number)));
    assert.equal(machine.sequence.draw.blue, 16);
  }
});
