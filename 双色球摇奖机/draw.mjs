const UINT32_RANGE = 0x100000000;

export function randomInt(max, fill = buffer => crypto.getRandomValues(buffer)) {
  if (!Number.isInteger(max) || max < 1 || max > UINT32_RANGE) {
    throw new RangeError('Invalid random range');
  }
  const limit = Math.floor(UINT32_RANGE / max) * max;
  const sample = new Uint32Array(1);
  do { fill(sample); } while (sample[0] >= limit);
  return sample[0] % max;
}

export function createBallPool(count) {
  const numbers = Array.from({ length: count }, (_, index) => index + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const index = randomInt(i + 1);
    [numbers[i], numbers[index]] = [numbers[index], numbers[i]];
  }
  return numbers;
}

export function validateDraw(value) {
  return Boolean(value && Array.isArray(value.red) && value.red.length === 6
    && new Set(value.red).size === 6
    && value.red.every(n => Number.isInteger(n) && n >= 1 && n <= 33)
    && Number.isInteger(value.blue) && value.blue >= 1 && value.blue <= 16);
}

export function restoreHistory(raw) {
  try {
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return entries.filter(entry => validateDraw(entry) && Number.isFinite(entry.at) && Math.abs(entry.at) <= 8.64e15)
      .slice(0, 20).map(({ red, blue, at, presetName }) => ({ red, blue, at,
        ...(typeof presetName === 'string' && presetName.length <= 20 ? { presetName } : {}) }));
  } catch { return []; }
}
