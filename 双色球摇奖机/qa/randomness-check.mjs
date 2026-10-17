import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBallPool } from '../draw.mjs';
import { createMachine, stepMachine, FIXED_STEP } from '../simulation.mjs';

const geometry = JSON.parse(readFileSync(new URL('../assets/machine-layout.json', import.meta.url)));
const red = Array(33).fill(0);
const blue = Array(16).fill(0);
const runsPerState = 2500;
const states = [11, 29, 41, 0xffffffff];
const timings = [];
for (const seed of states) {
  const machine = createMachine(geometry, { seed });
  machine.sequence.start();
  let tick = 0;
  for (; tick < 120 * 60 && machine.sequence.active; tick++) stepMachine(machine, FIXED_STEP);
  assert.equal(machine.sequence.phase, 'complete');
  timings.push(tick * FIXED_STEP);
  // Physics never reads labels. Sample secure permutations at the actual captured slots.
  for (let run = 0; run < runsPerState; run++) {
    const redLabels = createBallPool(33);
    const blueLabels = createBallPool(16);
    machine.sequence.draw.red.forEach(slot => red[redLabels[slot - 1] - 1]++);
    blue[blueLabels[machine.sequence.draw.blue - 1] - 1]++;
  }
}
const samples = states.length * runsPerState;
const redExpected = samples * 6 / 33;
const blueExpected = samples / 16;
assert.ok(red.every(count => Math.abs(count - redExpected) < redExpected * 0.25));
assert.ok(blue.every(count => Math.abs(count - blueExpected) < blueExpected * 0.35));
console.log(JSON.stringify({ samples, redCounts: red, blueCounts: blue, physicalDrawSeconds: timings,
  note: 'A broad smoke check for stuck labels or gross bias; not a randomness certification.' }, null, 2));
