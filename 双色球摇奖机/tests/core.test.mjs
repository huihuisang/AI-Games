import test from 'node:test';
import assert from 'node:assert/strict';
import { randomInt, createBallPool, validateDraw, restoreHistory } from '../draw.mjs';
import { Chamber, resolveCollision } from '../physics.mjs';
import { DrawSequence } from '../sequence.mjs';

test('draws contain six unique red balls and one blue ball in range', () => {
  for (let i = 0; i < 2000; i++) {
    const draw = { red: createBallPool(33).slice(0, 6), blue: createBallPool(16)[0] };
    assert.equal(validateDraw(draw), true);
    assert.equal(new Set(draw.red).size, 6);
  }
});

test('random integers reject the biased tail instead of using modulo alone', () => {
  const values = [0xffffffff, 31];
  let calls = 0;
  const result = randomInt(33, buffer => { buffer[0] = values[calls++]; });
  assert.equal(result, 31);
  assert.equal(calls, 2);
  assert.throws(() => randomInt(0), RangeError);
});

test('stored history filters malformed entries and caps its length', () => {
  const valid = { red: [1, 2, 3, 4, 5, 33], blue: 16, at: 1000 };
  const duplicate = { ...valid, red: [1, 1, 2, 3, 4, 5] };
  assert.deepEqual(restoreHistory('{broken'), []);
  assert.deepEqual(restoreHistory(JSON.stringify([null, duplicate, valid])), [valid]);
  assert.equal(restoreHistory(JSON.stringify(Array(50).fill(valid))).length, 20);
  assert.deepEqual(restoreHistory(JSON.stringify([{ ...valid, at: 1e308 }])), []);
  assert.equal(validateDraw({ ...valid, blue: 17 }), false);
  assert.equal(validateDraw({ ...valid, red: [0, 2, 3, 4, 5, 6] }), false);
  assert.equal(restoreHistory(JSON.stringify([{ ...valid, presetName: 'My preset' }]))[0].presetName, 'My preset');
  assert.equal(restoreHistory(JSON.stringify([{ ...valid, presetName: { invalid: true } }]))[0].presetName, undefined);
});

test('equal balls exchange their normal velocity on contact', () => {
  const a = { x: 0, y: 0, vx: 10, vy: 0, radius: 10 };
  const b = { x: 18, y: 0, vx: -10, vy: 0, radius: 10 };
  resolveCollision(a, b);
  assert.ok(a.vx < 0 && b.vx > 0);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 19.99);
});

test('mixing keeps all numbered balls finite and inside their chamber', () => {
  const chamber = new Chamber({ x: 300, y: 300, radius: 250 }, 33, 25);
  for (let i = 0; i < 1200; i++) chamber.step(1 / 120, true, false);
  assert.equal(chamber.balls.length, 33);
  for (const ball of chamber.balls) {
    assert.ok(Number.isFinite(ball.x + ball.y + ball.vx + ball.vy));
    assert.ok(Math.hypot(ball.x - 300, ball.y - 300) <= 250 - ball.radius + 0.1);
  }
});

test('each ball finishes its outlet travel before the next selection', () => {
  const sequence = new DrawSequence();
  const draw = { red: [2, 6, 12, 18, 23, 33], blue: 16 };
  assert.equal(sequence.start(), true);
  assert.equal(sequence.start(), false);
  const events = [];
  for (let i = 0; i < 3000 && sequence.active; i++) {
    sequence.step(1 / 60);
    if (sequence.phase === 'capturing') {
      const number = sequence.blue ? draw.blue : draw.red[sequence.index];
      sequence.capture(number);
      events.push({ type: 'select', number, blue: sequence.blue });
    } else if (sequence.phase === 'travel' && sequence.elapsed > 1) {
      events.push(sequence.deliver());
    }
  }
  assert.equal(sequence.phase, 'complete');
  assert.equal(events.length, 14);
  for (let i = 0; i < 7; i++) {
    assert.equal(events[i * 2].type, 'select');
    assert.equal(events[i * 2 + 1].type, 'reveal');
    assert.equal(events[i * 2].number, events[i * 2 + 1].number);
    assert.equal(events[i * 2].blue, i === 6);
  }
  assert.deepEqual(events.filter(event => event.type === 'reveal').map(event => event.number), [...draw.red, draw.blue]);
  assert.equal(sequence.start(), true);
});

test('a delayed animation frame cannot skip all outlet travel', () => {
  const sequence = new DrawSequence();
  sequence.start();
  sequence.step(120);
  assert.equal(sequence.phase, 'mixing');
  assert.ok(sequence.elapsed <= 0.05);
});
