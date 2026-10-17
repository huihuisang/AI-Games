export class DrawSequence {
  constructor() {
    this.phase = 'idle';
    this.elapsed = 0;
    this.index = 0;
    this.draw = { red: [], blue: null };
  }

  get active() { return this.phase !== 'idle' && this.phase !== 'complete'; }
  get blue() { return this.index === 6; }

  start() {
    if (this.active) return false;
    this.draw = { red: [], blue: null };
    this.phase = 'mixing';
    this.index = 0;
    this.elapsed = 0;
    return true;
  }

  step(dt) {
    if (!this.active) return;
    this.elapsed += Math.max(0, Math.min(dt, 0.05));
    if (this.phase === 'settling' && this.elapsed >= 0.6) {
      this.phase = 'mixing';
      this.elapsed = 0;
    }
    const duration = this.index === 0 ? 2.8 : this.blue ? 1.7 : 0.7;
    if (this.phase === 'mixing' && this.elapsed >= duration) {
      this.phase = 'capturing';
      this.elapsed = 0;
    }
  }

  capture(number) {
    if (this.phase !== 'capturing') return false;
    this.number = number;
    this.phase = 'travel';
    this.elapsed = 0;
    return true;
  }

  deliver() {
    if (this.phase !== 'travel') return null;
    const event = { type: 'reveal', index: this.index, blue: this.blue, number: this.number };
    if (this.blue) this.draw.blue = this.number;
    else this.draw.red.push(this.number);
    this.index++;
    this.phase = this.index === 7 ? 'complete' : 'settling';
    this.elapsed = 0;
    return event;
  }
}
