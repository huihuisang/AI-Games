import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MASCOT_LINES, createMascotVoice } from '../mascot-lines.mjs';

const ids = ['caishen', 'future', 'cat', 'koi'];
const memory = () => {
  let saved = null;
  return { readStorage: () => saved, writeStorage: (_, value) => { saved = value; } };
};

test('each character has exactly twenty distinct fictional luck blessings', () => {
  assert.deepEqual(Object.keys(MASCOT_LINES), ids);
  const all = ids.flatMap(id => MASCOT_LINES[id]);
  assert.equal(new Set(all).size, 80);
  for (const id of ids) {
    assert.equal(MASCOT_LINES[id].length, 20);
    assert.ok(MASCOT_LINES[id].every(line => typeof line === 'string' && line.length > 0 && line.length <= 40));
  }
  assert.doesNotMatch(all.join('\n'), /开奖|摇奖|出票|兑奖/);
});

test('each shuffled cycle uses every line once and does not repeat at a cycle boundary', () => {
  const voice = createMascotVoice({ ...memory(), randomIndex: max => max - 1 });
  for (const id of ids) {
    let previous;
    for (let cycle = 0; cycle < 10; cycle++) {
      const seen = [];
      for (let i = 0; i < 20; i++) {
        const line = voice.next(id);
        assert.notEqual(line, previous);
        previous = line;
        seen.push(line);
      }
      assert.equal(new Set(seen).size, 20);
    }
  }
});

test('reload continues the same character cycle and roles have independent progress', () => {
  const storage = memory();
  const first = createMascotVoice({ ...storage, randomIndex: max => max - 1 });
  const used = [first.next('caishen'), first.next('caishen')];
  for (let i = 0; i < 10; i++) first.next('cat');
  const restored = createMascotVoice({ ...storage, randomIndex: max => max - 1 });
  for (let i = 0; i < 18; i++) used.push(restored.next('caishen'));
  assert.equal(new Set(used).size, 20);
  assert.equal(restored.next('future'), MASCOT_LINES.future[19]);
});

test('damaged storage and unavailable persistence do not stop dialogue', () => {
  for (const raw of ['{broken', 'null', '{}', '{"version":1,"characters":{"cat":{"remaining":[0,0],"last":0}}}']) {
    const voice = createMascotVoice({ readStorage: () => raw, writeStorage: () => { throw new Error('Storage full'); } });
    assert.ok(MASCOT_LINES.cat.includes(voice.next('cat')));
    assert.equal(voice.next('direct'), null);
    assert.equal(voice.next('__proto__'), null);
  }
});

test('visible copy uses number selection while the existing route remains compatible', () => {
  for (const file of ['../index.html', '../app.mjs', '../rituals.mjs', '../ritual-ui.mjs']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /开奖|摇奖|出票|兑奖/);
  }
  const home = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(home, /双色球选号机/);
  assert.match(home, /href="双色球摇奖机\/index.html"/);
});

test('fictional probability and winning boasts keep their entertainment context visible', () => {
  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(page, /角色祝福不改变概率/);
  assert.match(page, /class="ritual-footnote">角色台词仅供娱乐，实际概率不变/);
});
