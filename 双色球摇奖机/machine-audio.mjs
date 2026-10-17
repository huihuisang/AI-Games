const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const impacts = [1, 2, 3, 4].map(index => `chips-collide-${index}`);
const rolls = [1, 2, 3].map(index => `dice-shake-${index}`);
const samples = ['motor', 'chip-lay-1', ...impacts, ...rolls];

async function loadSample(context, name) {
  const response = await fetch(new URL(`assets/audio/${name}.wav`, import.meta.url));
  if (!response.ok) throw new Error('Audio sample could not be loaded');
  return context.decodeAudioData(await response.arrayBuffer());
}

export class MachineAudio {
  constructor({ createContext = () => {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    return Context ? new Context() : null;
  }, loadBuffer = loadSample } = {}) {
    this.createContext = createContext;
    this.loadBuffer = loadBuffer;
    this.enabled = false;
    this.active = false;
    this.buffers = new Map();
    this.voices = new Map();
    this.nextImpact = [0, 0];
    this.pendingImpact = [0, 0];
    this.nextRoll = 0;
    this.lastTransit = null;
    this.lastBounce = 0;
  }

  async prepare() {
    if (!this.enabled) return false;
    try {
      if (!this.context) {
        this.context = this.createContext();
        if (!this.context) return false;
        const context = this.context;
        this.master = context.createGain();
        this.master.gain.value = 0;
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.knee.value = 8;
        limiter.ratio.value = 6;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.12;
        this.master.connect(limiter).connect(context.destination);
        this.motor = context.createGain();
        this.motor.gain.value = 0;
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1300;
        this.motor.connect(filter).connect(this.master);
      }
      // Resume in the click handler, before waiting for network or preset work.
      const resumed = this.context.resume?.();
      if (!this.loading) {
        this.loading = Promise.allSettled(samples.map(async name => {
          if (!this.buffers.has(name)) this.buffers.set(name, await this.loadBuffer(this.context, name));
        })).then(() => {
          if (this.buffers.has('motor') && !this.motorSource) {
            this.motorSource = this.context.createBufferSource();
            this.motorSource.buffer = this.buffers.get('motor');
            this.motorSource.loop = true;
            this.motorSource.connect(this.motor);
            this.motorSource.start();
          }
          const ready = this.buffers.size > 0;
          if (!ready) this.loading = null;
          return ready;
        });
      }
      await resumed;
      return await this.loading;
    } catch { return false; }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.mix(this.active);
  }

  mix(active, time = this.context?.currentTime ?? 0) {
    this.active = active;
    if (!this.context) return;
    const audible = this.enabled && active;
    this.master.gain.cancelScheduledValues(time);
    this.master.gain.setTargetAtTime(audible ? 0.7 : 0, time, audible ? 0.04 : 0.008);
    if (!audible) {
      for (const source of this.voices.keys()) source.stop(time + 0.025);
      this.voices.clear();
      this.pendingImpact = [0, 0];
      this.nextImpact = [time, time];
      this.nextRoll = time;
    }
  }

  play(names, { time, volume, rate = 1, grain = 0, offset = 0, priority = false }) {
    const name = names[Math.floor(Math.random() * names.length)];
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    for (const [source, end] of this.voices) if (end <= time) this.voices.delete(source);
    if (this.voices.size >= 12) {
      if (!priority) return;
      const oldest = this.voices.keys().next().value;
      oldest.stop(time);
      this.voices.delete(oldest);
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = this.context.createGain();
    const duration = Math.min(grain || buffer.duration - offset, buffer.duration - offset) / rate;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.004);
    gain.gain.setValueAtTime(volume, time + Math.max(0.004, duration - 0.03));
    gain.gain.linearRampToValueAtTime(0, time + duration);
    source.connect(gain).connect(this.master);
    source.start(time, offset, duration * rate);
    source.stop(time + duration + 0.005);
    this.voices.set(source, time + duration + 0.005);
    source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
  }

  update(machine, events, time = this.context?.currentTime ?? 0) {
    if (!this.context || !this.enabled || !this.active || this.context.state === 'suspended') return;
    const { red, blue, traveling } = machine;
    const speed = Math.max(red.angularVelocity, blue.angularVelocity);
    const motorLevel = clamp(speed / (machine.mixingSpeed ?? 6), 0, 1);
    this.motor.gain.setTargetAtTime(motorLevel * 0.2, time, 0.12);
    this.motorSource?.playbackRate.setTargetAtTime(0.72 + motorLevel * 0.28, time, 0.16);
    for (const [index, chamber] of [red, blue].entries()) {
      this.pendingImpact[index] = Math.max(this.pendingImpact[index], chamber.impact);
      if (this.pendingImpact[index] > 0.8 && time >= this.nextImpact[index]) {
        const strength = clamp(this.pendingImpact[index] / 16, 0, 1);
        this.play(impacts, { time, volume: (0.12 + strength * 0.5) * (index ? 0.72 : 1),
          rate: (index ? 1.16 : 0.8) + Math.random() * 0.23 });
        this.pendingImpact[index] = 0;
        this.nextImpact[index] = time + 0.045 + Math.random() * 0.025;
      }
    }
    if (events.gateOpened) {
      this.play(['chip-lay-1'], { time, volume: 0.42, rate: 0.65, priority: true });
    }
    if (events.capture) {
      this.play(impacts, { time, volume: 0.55, rate: events.capture.blue ? 1.15 : 0.9, priority: true });
    }
    if (traveling !== this.lastTransit) {
      this.lastTransit = traveling;
      this.lastBounce = 0;
      this.nextRoll = time;
    }
    if (!traveling || traveling.done) return;
    if (traveling.bounces > this.lastBounce) {
      this.lastBounce = traveling.bounces;
      this.play(impacts, { time, volume: 0.75 * 0.5 ** (traveling.bounces - 1),
        rate: traveling.blue ? 1.2 : 0.82, priority: true });
    }
    if (!traveling.bounces && traveling.speed > 50 && time >= this.nextRoll) {
      this.play(rolls, { time, volume: clamp(traveling.speed / 650, 0, 1) * 0.32,
        rate: (traveling.blue ? 1.05 : 0.75) + Math.random() * 0.15,
        offset: Math.random() * 0.9, grain: 0.14 });
      this.nextRoll = time + 0.09 + Math.random() * 0.04;
    }
  }
}
