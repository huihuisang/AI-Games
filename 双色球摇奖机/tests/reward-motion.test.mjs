import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameMotion } from '../game-motion.mjs';

function scene() {
  const effects = [];
  const node = () => ({
    animate(frames, timing) {
      let reject;
      const effect = { frames, timing, state: 'running', finished: new Promise((_, fail) => { reject = fail; }),
        cancel() { this.state = 'cancelled'; reject(new Error('Cancelled')); },
        pause() { this.state = 'paused'; }, play() { this.state = 'running'; } };
      effects.push(effect); return effect;
    },
  });
  const pieces = [];
  const burst = { append: piece => pieces.push(piece), querySelectorAll: () => pieces };
  const ticket = Object.assign(new EventTarget(), { clientWidth: 360, querySelector: selector => selector === '.result-burst' ? burst : node() });
  const media = Object.assign(new EventTarget(), { matches: false });
  const document = Object.assign(new EventTarget(), { hidden: false, body: { classList: { add() {}, remove() {} } },
    querySelector: selector => selector === '#ticket-dialog' ? ticket : node(), createElement: node });
  const oldDocument = globalThis.document, oldMatchMedia = globalThis.matchMedia;
  globalThis.document = document; globalThis.matchMedia = () => media;
  const motion = createGameMotion();
  return { motion, ticket, media, document, effects,
    restore() { globalThis.document = oldDocument; globalThis.matchMedia = oldMatchMedia; } };
}

test('reward effects wait for rendered content and are cancelled on close or replacement', () => {
  const s = scene();
  try {
    s.motion.complete();
    assert.equal(s.effects.length, 0);
    s.ticket.dispatchEvent(new Event('ticketreveal'));
    assert.ok(s.effects.length > 24);
    const first = [...s.effects];
    s.ticket.dispatchEvent(new Event('ticketreveal'));
    assert.ok(first.every(effect => effect.state === 'cancelled'));
    s.ticket.dispatchEvent(new Event('close'));
    assert.ok(s.effects.every(effect => effect.state === 'cancelled'));
    s.ticket.dispatchEvent(new Event('ticketreveal'));
    s.ticket.dispatchEvent(new Event('ticketreset'));
    assert.ok(s.effects.every(effect => effect.state === 'cancelled'));
  } finally { s.restore(); }
});

test('reduced motion uses one short fade without rays, recoil, or particles', () => {
  const s = scene();
  try {
    s.media.matches = true;
    s.motion.reveal();
    s.ticket.dispatchEvent(new Event('ticketreveal'));
    assert.equal(s.effects.length, 1);
    assert.equal(s.effects[0].timing.duration, 200);
    assert.ok(s.effects[0].frames.every(frame => !('transform' in frame)));
  } finally { s.restore(); }
});

test('hidden pages pause both existing and newly created reward effects', () => {
  const s = scene();
  try {
    s.ticket.dispatchEvent(new Event('ticketreveal'));
    s.document.hidden = true; s.document.dispatchEvent(new Event('visibilitychange'));
    assert.ok(s.effects.every(effect => effect.state === 'paused'));
    s.ticket.dispatchEvent(new Event('ticketreveal'));
    assert.ok(s.effects.filter(effect => effect.state !== 'cancelled').every(effect => effect.state === 'paused'));
    s.document.hidden = false; s.document.dispatchEvent(new Event('visibilitychange'));
    assert.ok(s.effects.filter(effect => effect.state !== 'cancelled').every(effect => effect.state === 'running'));
    s.media.matches = true; s.media.dispatchEvent(new Event('change'));
    assert.ok(s.effects.every(effect => effect.state === 'cancelled'));
  } finally { s.restore(); }
});
