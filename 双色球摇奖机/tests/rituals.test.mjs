import test from 'node:test';
import assert from 'node:assert/strict';
import { RITUALS, restoreRitual } from '../rituals.mjs';

test('new users receive the wealth god ceremony and invalid saved values recover', () => {
  for (const value of [null, '', 'unknown', '{broken', '__proto__']) {
    assert.equal(restoreRitual(value).id, 'caishen');
  }
});

test('all four characters and direct draw can be restored independently of number presets', () => {
  assert.equal(RITUALS.length, 5);
  assert.equal(new Set(RITUALS.map(ritual => ritual.id)).size, 5);
  for (const ritual of RITUALS) {
    assert.equal(restoreRitual(ritual.id), ritual);
    assert.equal('red' in ritual || 'blue' in ritual || 'seed' in ritual, false);
    assert.ok(ritual.buttonLabel);
  }
  assert.equal(restoreRitual('direct').art, null);
});
