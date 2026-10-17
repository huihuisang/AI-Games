import test from 'node:test';
import assert from 'node:assert/strict';
import { MachineAudio } from '../machine-audio.mjs';

function fixture(loader = async () => ({ duration: 1.5 })) {
  const param = () => ({ value: 0, setTargetAtTime() {}, setValueAtTime() {},
    linearRampToValueAtTime() {}, cancelScheduledValues() {} });
  const sources = [];
  const context = { currentTime: 0, state: 'suspended', destination: {},
    resume: async () => { context.state = 'running'; },
    createGain: () => ({ gain: param(), connect() { return this; }, disconnect() {} }),
    createBiquadFilter: () => ({ frequency: param(), Q: param(), connect() { return this; }, disconnect() {} }),
    createDynamicsCompressor: () => ({ threshold: param(), knee: param(), ratio: param(),
      attack: param(), release: param(), connect() { return this; } }),
    createBufferSource: () => {
      const source = { playbackRate: param(), connect() { return this; }, disconnect() {},
        start(...args) { this.started = args; }, stop(time) { this.stopped = time; } };
      sources.push(source);
      return source;
    },
  };
  const audio = new MachineAudio({ createContext: () => context, loadBuffer: loader });
  const chamber = { angularVelocity: 1.65, impact: 12, balls: [{ vx: 200, vy: 100, radius: 35 }] };
  const machine = { sequence: { active: true }, red: chamber, blue: { ...chamber, angularVelocity: 0, impact: 0 }, traveling: null };
  return { audio, context, sources, machine };
}

test('audio stays optional when the platform or sample loading fails', async () => {
  const { audio, machine } = fixture(async () => { throw new Error('offline'); });
  audio.setEnabled(true);
  assert.equal(await audio.prepare(), false);
  assert.doesNotThrow(() => { audio.mix(true); audio.update(machine, {}); audio.setEnabled(false); });
  const unsupported = new MachineAudio({ createContext: () => null });
  unsupported.setEnabled(true);
  assert.equal(await unsupported.prepare(), false);
});

test('muting during loading cannot re-enable audio after loading finishes', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const { audio, machine, sources } = fixture(() => pending);
  audio.setEnabled(true);
  const preparation = audio.prepare();
  audio.mix(true);
  audio.setEnabled(false);
  finish({ duration: 1.5 });
  await preparation;
  const count = sources.length;
  audio.update(machine, { gateOpened: true, capture: { blue: false } });
  assert.equal(sources.length, count);
  assert.equal(audio.enabled, false);
});

test('rapid contacts have bounded voices and muting stops every transient', async () => {
  const { audio, context, sources, machine } = fixture();
  audio.setEnabled(true);
  await audio.prepare();
  audio.mix(true);
  for (let i = 0; i < 200; i++) {
    context.currentTime += 1 / 120;
    audio.update(machine, { gateOpened: i === 0 });
    assert.ok(audio.voices.size <= 12);
  }
  assert.ok(sources.length > 5);
  assert.ok(sources.length < 65);
  const voices = [...audio.voices.keys()];
  audio.setEnabled(false);
  assert.ok(voices.every(source => source.stopped !== undefined));
  assert.equal(audio.voices.size, 0);
});

test('a hidden page stays silent and resuming reuses the motor loop', async () => {
  const { audio, context, sources, machine } = fixture();
  audio.setEnabled(true);
  await audio.prepare();
  audio.mix(true);
  audio.update(machine, {});
  audio.mix(false);
  const count = sources.length;
  for (let i = 0; i < 50; i++) {
    context.currentTime += 0.01;
    audio.update(machine, { gateOpened: true });
  }
  assert.equal(sources.length, count);
  audio.mix(true);
  await audio.prepare();
  audio.update(machine, {});
  assert.equal(sources.filter(source => source.loop).length, 1);
});

test('each actual tray bounce sounds once and delivery adds no electronic chime', async () => {
  const { audio, context, sources, machine } = fixture();
  machine.red.impact = 0;
  audio.setEnabled(true);
  await audio.prepare();
  audio.mix(true);
  const transit = { blue: false, bounces: 0, speed: 0, done: false };
  machine.traveling = transit;
  audio.update(machine, {});
  const before = sources.length;
  transit.bounces = 1;
  for (let i = 0; i < 5; i++) {
    context.currentTime += 0.01;
    audio.update(machine, {});
  }
  assert.equal(sources.length - before, 1);
  const after = sources.length;
  transit.done = true;
  audio.update(machine, { reveal: { blue: false } });
  assert.equal(sources.length, after);
});
