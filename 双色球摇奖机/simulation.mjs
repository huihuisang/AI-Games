import { Chamber } from './physics.mjs';
import { DrawSequence } from './sequence.mjs';
import { BallTransit } from './transit.mjs';

export const FIXED_STEP = 1 / 120;
export const MIXING_SPEED = 6;

export function createMachine(geometry, options = {}) {
  const seed = options.seed ?? 0;
  const make = (bounds, count, radius, outlet, numbers, chamberSeed) => new Chamber({
    x: bounds.centerX, y: bounds.centerY, radius: bounds.safeCircleRadius,
  }, count, radius, { numbers, gateY: outlet[0][1], seed: chamberSeed });
  return {
    geometry,
    seed,
    mixingSpeed: MIXING_SPEED,
    reducedMotion: Boolean(options.reducedMotion),
    sequence: options.sequence ?? new DrawSequence(),
    red: make(geometry.redChamber, 33, 35, geometry.redOutletPath, options.redNumbers, seed),
    blue: make(geometry.blueChamber, 16, 20, geometry.blueOutletPath, options.blueNumbers, seed ^ 0x9e3779b9),
    traveling: null,
  };
}

export function stepMachine(machine, dt) {
  const { sequence, red, blue, geometry } = machine;
  const events = {};
  const previousPhase = sequence.phase;
  sequence.step(dt);
  events.gateOpened = sequence.phase === 'capturing' && previousPhase !== 'capturing';
  const motor = machine.reducedMotion ? 0.4 : MIXING_SPEED;
  const redBall = red.step(dt, sequence.active && !sequence.blue ? motor : false,
    sequence.phase === 'capturing' && !sequence.blue);
  const blueBall = blue.step(dt, sequence.active && sequence.blue ? motor : false,
    sequence.phase === 'capturing' && sequence.blue);
  const captured = redBall || blueBall;
  if (captured) {
    const isBlue = sequence.blue;
    sequence.capture(captured.number);
    machine.traveling = new BallTransit(captured, isBlue ? geometry.blueOutletPath : geometry.redOutletPath);
    machine.traveling.blue = isBlue;
    events.capture = { number: captured.number, blue: isBlue, index: sequence.index };
  }
  if (sequence.phase === 'travel') {
    machine.traveling.step(dt);
    if (machine.traveling.done) events.reveal = sequence.deliver();
  }
  return events;
}
