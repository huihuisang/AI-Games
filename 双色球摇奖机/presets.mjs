import { createBallPool, randomInt } from './draw.mjs';
import { createMachine, stepMachine, FIXED_STEP } from './simulation.mjs';

const DEFAULT_PRESETS = [
  { id: 'red-example', name: '只指定红球', red: [3, 8], blue: null },
  { id: 'blue-example', name: '只指定蓝球', red: [], blue: 9 },
  { id: 'mixed-example', name: '红蓝组合', red: [6, 16], blue: 8 },
];

function normalizePreset(input) {
  if (!input || typeof input.id !== 'string' || !input.id || input.id === 'random' || input.id.length > 80) {
    throw new Error('预设信息无效，请重新保存');
  }
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 20) throw new Error('请输入 1–20 字的预设名称');
  if (!Array.isArray(input.red) || input.red.length > 6 || new Set(input.red).size !== input.red.length
    || !input.red.every(number => Number.isInteger(number) && number >= 1 && number <= 33)) {
    throw new Error('红球请选择 01–33，最多 6 个，不能重复');
  }
  if (input.blue !== null && (!Number.isInteger(input.blue) || input.blue < 1 || input.blue > 16)) {
    throw new Error('蓝球请选择 01–16，最多 1 个');
  }
  if (!input.red.length && input.blue === null) throw new Error('请至少指定 1 个红球或蓝球');
  return { id: input.id, name, red: [...input.red].sort((a, b) => a - b), blue: input.blue };
}

export function restorePresetState(raw) {
  try {
    if (!raw) throw new Error('No saved presets');
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved?.presets)) throw new Error('Invalid saved presets');
    const presets = [];
    for (const input of saved.presets.slice(0, 20)) {
      try {
        const preset = normalizePreset(input);
        if (!presets.some(item => item.id === preset.id || item.name === preset.name)) presets.push(preset);
      } catch { /* Ignore invalid saved entries. */ }
    }
    return { presets, selectedId: presets.some(item => item.id === saved.selectedId) ? saved.selectedId : 'random' };
  } catch {
    return { presets: DEFAULT_PRESETS.map(item => ({ ...item, red: [...item.red] })), selectedId: 'random' };
  }
}

export function savePreset(state, input) {
  const preset = normalizePreset(input);
  if (state.presets.some(item => item.name === preset.name && item.id !== preset.id)) throw new Error('已有同名预设，请换个名字');
  const exists = state.presets.some(item => item.id === preset.id);
  if (!exists && state.presets.length >= 20) throw new Error('最多保存 20 个预设，请先删除不用的预设');
  return { selectedId: preset.id, presets: exists
    ? state.presets.map(item => item.id === preset.id ? preset : item)
    : [...state.presets, preset] };
}

export function deletePreset(state, id) {
  return { presets: state.presets.filter(item => item.id !== id),
    selectedId: state.selectedId === id ? 'random' : state.selectedId };
}

export function createPresetDraw(input) {
  const preset = normalizePreset(input);
  const remaining = createBallPool(33).filter(number => !preset.red.includes(number));
  const red = [...preset.red, ...remaining.slice(0, 6 - preset.red.length)];
  const order = createBallPool(6);
  return { red: order.map(position => red[position - 1]), blue: preset.blue ?? createBallPool(16)[0] };
}

function forecastCaptureOrder(geometry, reducedMotion, seed) {
  const machine = createMachine(geometry, { reducedMotion, seed });
  machine.sequence.start();
  const order = { red: [], blue: [] };
  // Replay this draw's initial state. Labels do not affect any physical calculation.
  for (let tick = 0; tick < 120 * 60 && machine.sequence.active; tick++) {
    const events = stepMachine(machine, FIXED_STEP);
    if (events.capture) order[events.capture.blue ? 'blue' : 'red'].push(events.capture.number);
  }
  if (order.red.length !== 6 || order.blue.length !== 1 || machine.sequence.phase !== 'complete') {
    throw new Error('预设准备失败，请重试');
  }
  return order;
}

function assignLabels(count, slots, labels) {
  const pool = Array(count).fill(null);
  slots.forEach((slot, index) => { pool[slot - 1] = labels[index]; });
  const remainder = createBallPool(count).filter(number => !labels.includes(number));
  let cursor = 0;
  return pool.map(number => number ?? remainder[cursor++]);
}

export function createPresetPools(geometry, preset, reducedMotion, seed = randomInt(0x100000000)) {
  const draw = createPresetDraw(preset);
  const order = forecastCaptureOrder(geometry, reducedMotion, seed);
  return { draw, seed, redNumbers: assignLabels(33, order.red, draw.red),
    blueNumbers: assignLabels(16, order.blue, [draw.blue]) };
}
