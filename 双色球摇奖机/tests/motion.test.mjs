import test from 'node:test';
import assert from 'node:assert/strict';
import { Chamber } from '../physics.mjs';
import { BallTransit } from '../transit.mjs';
import { DrawSequence } from '../sequence.mjs';
import { createBallPool } from '../draw.mjs';
import { readFileSync } from 'node:fs';

test('ball pools are complete random permutations with no repeated labels', () => {
  for (const count of [16, 33]) {
    const pool = createBallPool(count);
    assert.equal(new Set(pool).size, count);
    assert.deepEqual([...pool].sort((a, b) => a - b), Array.from({ length: count }, (_, i) => i + 1));
  }
});

test('a closed gate keeps its bottom ball inside the chamber', () => {
  const chamber = new Chamber({ x: 0, y: 0, radius: 304 }, 1, 35);
  const ball = chamber.balls[0];
  Object.assign(ball, { x: 0, y: 270, vx: 0, vy: 150 });
  for (let i = 0; i < 60; i++) assert.equal(chamber.step(1 / 120, false, false), null);
  assert.equal(chamber.balls.length, 1);
  assert.ok(ball.y <= 269.1);
});

test('the open gate releases a nearby ball without removing a remote ball', () => {
  const chamber = new Chamber({ x: 0, y: 0, radius: 304 }, 1, 35);
  const ball = chamber.balls[0];
  Object.assign(ball, { x: 0, y: 260, vx: 0, vy: 100 });
  let captured = null;
  for (let i = 0; i < 120 && !captured; i++) captured = chamber.step(1 / 120, false, true);
  assert.equal(captured, ball);
  assert.ok(captured.y >= 266);
  assert.ok(Math.abs(captured.x) < 35);
  assert.equal(chamber.balls.length, 0);
});

test('a ball away from the rotating paddle follows gravity', () => {
  const chamber = new Chamber({ x: 0, y: 0, radius: 304 }, 1, 20);
  const ball = chamber.balls[0];
  Object.assign(ball, { x: 180, y: -180, vx: 0, vy: 0 });
  chamber.step(1 / 120, true, false);
  assert.ok(ball.vy > 0);
  assert.ok(Math.abs(ball.vx) < 0.001);
});

test('the paddle transfers momentum by contact instead of a global orbit force', () => {
  const chamber = new Chamber({ x: 0, y: 0, radius: 304 }, 1, 20);
  const ball = chamber.balls[0];
  Object.assign(ball, { x: 38, y: -200, vx: 0, vy: 0 });
  for (let i = 0; i < 30; i++) chamber.step(1 / 120, true, false);
  assert.ok(Math.abs(ball.vx) > 20);
});

test('outlet travel starts at the captured position and accelerates downhill', () => {
  const ball = { x: 5, y: 250, radius: 30, number: 8, angle: 0, vx: 0, vy: 20 };
  const travel = new BallTransit(ball, [[0, 250], [0, 350], [20, 460], [90, 500]]);
  assert.equal(travel.ball.x, ball.x);
  assert.equal(travel.ball.y, ball.y);
  let previous = travel.distance;
  const distances = [];
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 12; j++) travel.step(1 / 120);
    distances.push(travel.distance - previous);
    previous = travel.distance;
  }
  assert.ok(distances[1] > distances[0]);
  assert.ok(travel.ball.angle !== 0);
  assert.equal(travel.ball.number, 8);
});

test('the outlet ball bumps the tray and settles before delivery', () => {
  const travel = new BallTransit({ x: 0, y: 0, radius: 30, number: 8, angle: 0, vx: 0, vy: 80 },
    [[0, 0], [0, 180], [30, 240], [100, 265]]);
  for (let i = 0; i < 1200 && !travel.done; i++) travel.step(1 / 120);
  assert.ok(travel.bounces >= 1);
  assert.equal(travel.done, true);
  assert.ok(Math.abs(travel.ball.x - 100) < 1);
  assert.ok(Math.abs(travel.ball.y - 265) < 1);
});

test('the sequence cannot reveal a number before the outlet confirms arrival', () => {
  const sequence = new DrawSequence();
  sequence.start();
  for (let i = 0; i < 600; i++) sequence.step(1 / 60);
  assert.equal(sequence.phase, 'capturing');
  assert.equal(sequence.capture(12), true);
  for (let i = 0; i < 600; i++) sequence.step(1 / 60);
  assert.equal(sequence.phase, 'travel');
  assert.equal(sequence.capture(14), false);
  const event = sequence.deliver();
  assert.equal(event.number, 12);
  assert.equal(sequence.index, 1);
});

test('physical capture is independent of the number written on a ball', () => {
  const make = numbers => new Chamber({ x: 0, y: 0, radius: 304 }, 33, 35, { numbers });
  const forward = make(Array.from({ length: 33 }, (_, i) => i + 1));
  const reverse = make(Array.from({ length: 33 }, (_, i) => 33 - i));
  let a;
  let b;
  for (let i = 0; i < 2400 && !a; i++) {
    a = forward.step(1 / 120, true, i > 340);
    b = reverse.step(1 / 120, true, i > 340);
  }
  assert.ok(a && b);
  assert.equal(a.x, b.x);
  assert.equal(a.y, b.y);
  assert.equal(a.number + b.number, 34);
});

test('the real machine geometry completes seven physical transfers without stalls', () => {
  const geometry = JSON.parse(readFileSync(new URL('../assets/machine-layout.json', import.meta.url)));
  for (const reducedMotion of [false, true]) {
    const make = (bounds, count, radius, outlet) => new Chamber({ x: bounds.centerX, y: bounds.centerY,
      radius: bounds.safeCircleRadius }, count, radius, { gateY: outlet[0][1], numbers: createBallPool(count) });
    const red = make(geometry.redChamber, 33, 35, geometry.redOutletPath);
    const blue = make(geometry.blueChamber, 16, 20, geometry.blueOutletPath);
    const sequence = new DrawSequence();
    sequence.start();
    let travel;
    const events = [];
    for (let tick = 0; tick < 120 * 60 && sequence.active; tick++) {
      const dt = 1 / 120;
      sequence.step(dt);
      const motor = reducedMotion ? 0.4 : true;
      const a = red.step(dt, !sequence.blue ? motor : false, sequence.phase === 'capturing' && !sequence.blue);
      const b = blue.step(dt, sequence.blue ? motor : false, sequence.phase === 'capturing' && sequence.blue);
      if (a || b) {
        const ball = a || b;
        sequence.capture(ball.number);
        travel = new BallTransit(ball, sequence.blue ? geometry.blueOutletPath : geometry.redOutletPath);
      }
      if (sequence.phase === 'travel') {
        travel.step(dt);
        if (travel.done) events.push(sequence.deliver());
      }
    }
    assert.equal(sequence.phase, 'complete', reducedMotion ? 'reduced motion stalled' : 'draw stalled');
    assert.equal(events.length, 7);
    assert.equal(new Set(sequence.draw.red).size, 6);
    assert.ok(sequence.draw.blue >= 1 && sequence.draw.blue <= 16);
    assert.equal(red.balls.length, 27);
    assert.equal(blue.balls.length, 15);
  }
});
