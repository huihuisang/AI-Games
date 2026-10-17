const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function sampleCurve(points) {
  const samples = [];
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    for (let step = 0; step < 16; step++) {
      const t = step / 16;
      const interpolate = axis => 0.5 * (2 * p1[axis] + (-p0[axis] + p2[axis]) * t
        + (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t * t
        + (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t * t * t);
      samples.push({ x: interpolate(0), y: interpolate(1), distance: 0 });
    }
  }
  const last = points.at(-1);
  samples.push({ x: last[0], y: last[1], distance: 0 });
  for (let i = 1; i < samples.length; i++) {
    samples[i].distance = samples[i - 1].distance
      + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
  }
  return samples;
}

export class BallTransit {
  constructor(ball, outlet) {
    this.ball = { ...ball };
    this.samples = sampleCurve([[ball.x, ball.y], ...outlet.slice(1)]);
    this.length = this.samples.at(-1).distance;
    this.distance = 0;
    this.speed = clamp(Math.hypot(ball.vx, ball.vy), 40, 180);
    this.done = false;
    this.bounces = 0;
    this.restTime = 0;
  }

  position(distance) {
    const value = clamp(distance, 0, this.length);
    const index = this.samples.findIndex(sample => sample.distance >= value);
    const next = this.samples[Math.max(1, index)];
    const previous = this.samples[Math.max(0, index - 1)];
    const span = next.distance - previous.distance;
    const t = span > 0 ? (value - previous.distance) / span : 0;
    return { x: previous.x + (next.x - previous.x) * t,
      y: previous.y + (next.y - previous.y) * t,
      slope: span > 0 ? (next.y - previous.y) / span : 0 };
  }

  step(dt) {
    if (this.done) return;
    if (this.restTime > 0) {
      this.restTime += dt;
      if (this.restTime >= 0.22) this.done = true;
      return;
    }
    const previous = this.distance;
    const position = this.position(this.distance);
    // Solid-sphere rolling acceleration follows the local downhill slope.
    const acceleration = this.bounces > 0
      ? (this.length - this.distance) * 60 - this.speed * 9 + 160 * position.slope
      : 1100 * (5 / 7) * position.slope;
    this.speed += acceleration * dt;
    this.speed *= Math.exp(-0.28 * dt);
    this.distance += this.speed * dt;
    if (this.distance >= this.length) {
      this.distance = this.length;
      this.bounces++;
      if (Math.abs(this.speed) < 65 || this.bounces >= 3) {
        this.speed = 0;
        this.restTime = dt;
      } else this.speed = -this.speed * 0.23;
    }
    this.distance = Math.max(0, this.distance);
    const point = this.position(this.distance);
    this.ball.x = point.x;
    this.ball.y = point.y;
    this.ball.angle += (this.distance - previous) / this.ball.radius;
  }
}
