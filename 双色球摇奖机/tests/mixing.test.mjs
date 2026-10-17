import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMachine, stepMachine, FIXED_STEP } from '../simulation.mjs';
import { restorePresetState, createPresetDraw, createPresetPools } from '../presets.mjs';

const geometry = JSON.parse(readFileSync(new URL('../assets/machine-layout.json', import.meta.url)));
const positions = machine => [machine.red, machine.blue].map(chamber => ({ angle: chamber.angle,
  balls: chamber.balls.map(({ x, y, vx, vy, spin }) => [x, y, vx, vy, spin]) }));

test('different draw seeds produce different initial ball positions and paddle phases', () => {
  const first = createMachine(geometry, { seed: 11 });
  const second = createMachine(geometry, { seed: 29 });
  assert.notDeepEqual(positions(first), positions(second));
  for (const machine of [first, second]) {
    for (const chamber of [machine.red, machine.blue]) {
      for (const ball of chamber.balls) {
        assert.ok(Math.hypot(ball.x - chamber.bounds.x, ball.y - chamber.bounds.y) <= chamber.bounds.radius - ball.radius);
      }
    }
  }
});

test('the same seed replays the same mixing state for preset planning', () => {
  const first = createMachine(geometry, { seed: 41 });
  const second = createMachine(geometry, { seed: 41 });
  first.sequence.start();
  second.sequence.start();
  for (let tick = 0; tick < 120 * 10; tick++) {
    assert.deepEqual(stepMachine(first, FIXED_STEP), stepMachine(second, FIXED_STEP));
  }
  assert.deepEqual(positions(first), positions(second));
});

test('normal mixing reaches a fast motor speed and keeps the first gate closed for eight seconds', () => {
  const machine = createMachine(geometry, { seed: 11 });
  machine.sequence.start();
  for (let tick = 0; tick < 120 * 8 - 1; tick++) {
    const event = stepMachine(machine, FIXED_STEP);
    assert.equal(Boolean(event.gateOpened || event.capture), false);
  }
  assert.ok(machine.red.angularVelocity >= 5, `Motor speed: ${machine.red.angularVelocity}`);
});

test('the mixed preset intentionally repeats its fixed numbers while its other numbers vary', () => {
  const preset = restorePresetState(null).presets.find(item => item.id === 'mixed-example');
  assert.deepEqual(preset.red, [6, 16]);
  assert.equal(preset.blue, 8);
  const outcomes = new Set();
  for (let index = 0; index < 80; index++) {
    const draw = createPresetDraw(preset);
    assert.ok(draw.red.includes(6) && draw.red.includes(16));
    assert.equal(draw.blue, 8);
    outcomes.add([...draw.red].sort((a, b) => a - b).join(','));
  }
  assert.ok(outcomes.size > 50);
});

test('preset plans replay their random seed in normal and reduced motion', () => {
  const preset = restorePresetState(null).presets.find(item => item.id === 'mixed-example');
  for (const [seed, reducedMotion] of [[29, false], [0xffffffff, true]]) {
    const plan = createPresetPools(geometry, preset, reducedMotion, seed);
    assert.equal(plan.seed, seed);
    const machine = createMachine(geometry, { ...plan, reducedMotion });
    machine.sequence.start();
    for (let tick = 0; tick < 120 * 60 && machine.sequence.active; tick++) stepMachine(machine, FIXED_STEP);
    assert.equal(machine.sequence.phase, 'complete');
    assert.deepEqual(machine.sequence.draw, plan.draw);
  }
});
