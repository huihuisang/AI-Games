import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelectionTicket, layoutTicketQuote } from '../ticket.mjs';
import { MASCOT_LINES } from '../mascot-lines.mjs';
import { restoreHistory } from '../draw.mjs';

const entry = () => ({ red: [30, 7, 29, 8, 26, 21], blue: 15, at: 1792287360000 });

test('a selection ticket sorts a copy and preserves the original draw order', () => {
  const record = entry();
  const ticket = createSelectionTicket(record);
  assert.deepEqual(ticket.red, [7, 8, 21, 26, 29, 30]);
  assert.deepEqual(record.red, [30, 7, 29, 8, 26, 21]);
  assert.equal(ticket.blue, record.blue);
  record.red[0] = 1;
  assert.equal(ticket.red[5], 30);
  assert.ok(Object.isFrozen(ticket));
  assert.ok(Object.isFrozen(ticket.red));
});

test('ticket identity and metadata stay the same when a stored selection is opened again', () => {
  const record = { ...entry(), ritualId: 'cat', line: '本喵爪子一盖，这组号码归我保佑。', presetName: '我的组合' };
  const restored = restoreHistory(JSON.stringify([record]));
  assert.deepEqual(restored, [record]);
  assert.deepEqual(createSelectionTicket(restored[0]), createSelectionTicket(record));
  assert.equal(createSelectionTicket(record).ritual.id, 'cat');
  assert.equal(createSelectionTicket(record).line, record.line);
});

test('legacy history and direct selection do not invent a mascot or its dialogue', () => {
  for (const ritualId of [undefined, 'direct', '__proto__', 'removed-character']) {
    const ticket = createSelectionTicket({ ...entry(), ritualId });
    assert.equal(ticket.ritual.id, 'direct');
    assert.equal(ticket.ritual.art, null);
    assert.equal(ticket.mode, '完全随机');
    assert.equal(ticket.line, '这一组，送给今天的你。');
  }
});

test('tickets reject incomplete or invalid records before rendering or exporting', () => {
  for (const invalid of [null, {}, { ...entry(), red: [1, 1, 2, 3, 4, 5] }, { ...entry(), blue: 17 },
    { ...entry(), at: Infinity }, { ...entry(), at: NaN }, { ...entry(), at: 8.64e15 + 1 }]) {
    assert.throws(() => createSelectionTicket(invalid), TypeError);
  }
});

test('optional history metadata is bounded and corrupt fields do not hide valid numbers', () => {
  const record = { ...entry(), ritualId: { id: 'cat' }, line: 'x'.repeat(81), presetName: 'x'.repeat(21) };
  assert.deepEqual(restoreHistory(JSON.stringify([record])), [entry()]);
  const ticket = createSelectionTicket({ ...entry(), line: 'x'.repeat(100), presetName: 'x'.repeat(100) });
  assert.equal(ticket.line.length, 80);
  assert.equal(ticket.mode.length, 20);
});

test('all mascot blessings fit the hero quote area without losing text or opening with punctuation', () => {
  const measure = (value, size) => [...value].reduce((sum, char) => sum + (char.charCodeAt(0) < 128 ? .6 : 1) * size, 0);
  for (const line of [...Object.values(MASCOT_LINES).flat(), '这一组，送给今天的你。', '福'.repeat(80)]) {
    const layout = layoutTicketQuote(line, measure);
    assert.equal(layout.lines.join(''), line);
    assert.ok(layout.lines.every(part => measure(part, layout.size) <= 798));
    assert.ok(layout.lines.length * layout.lineHeight <= 224);
    assert.ok(layout.lines.every(part => !/^[，。！？、；：]/.test(part)));
  }
});

test('a blessing wraps at its spoken pause before splitting a phrase', () => {
  const layout = layoutTicketQuote('本喵爪子一盖，这组号码归我保佑。', (value, size) => value.length * size);
  assert.deepEqual(layout.lines, ['本喵爪子一盖，', '这组号码归我保佑。']);
});
