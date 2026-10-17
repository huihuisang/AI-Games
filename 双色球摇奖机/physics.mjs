const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 0x100000000;
  };
}

export function resolveCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const diameter = a.radius + b.radius;
  if (distance >= diameter) return;
  const nx = distance > 0.001 ? dx / distance : 1;
  const ny = distance > 0.001 ? dy / distance : 0;
  const overlap = (diameter - distance) / 2;
  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;
  const speed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (speed >= 0) return;
  const impulse = -speed * 0.78;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;
  const tx = -ny;
  const ty = nx;
  const slip = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty
    - (a.spin || 0) * a.radius - (b.spin || 0) * b.radius;
  const friction = clamp(-slip / 6, -impulse * 0.16, impulse * 0.16);
  a.vx -= friction * tx;
  a.vy -= friction * ty;
  b.vx += friction * tx;
  b.vy += friction * ty;
  a.spin = (a.spin || 0) - 2 * friction / a.radius;
  b.spin = (b.spin || 0) - 2 * friction / b.radius;
  return impulse;
}

export class Chamber {
  constructor(bounds, count, ballRadius, options = {}) {
    this.bounds = bounds;
    this.angle = 0;
    this.angularVelocity = 0;
    this.impact = 0;
    this.gravity = bounds.radius * 4.3;
    this.gateY = options.gateY ?? bounds.y + bounds.radius - ballRadius;
    this.balls = [];
    const spacing = ballRadius * 2.08;
    const candidates = [];
    for (let row = -12; row <= 12; row++) {
      for (let column = -12; column <= 12; column++) {
        const x = (column + (row & 1) * 0.5) * spacing;
        const y = row * spacing * 0.87;
        if (Math.hypot(x, y) < bounds.radius - ballRadius - 2) candidates.push({ x, y });
      }
    }
    candidates.sort((a, b) => b.y - a.y || a.x - b.x);
    const random = options.seed === undefined ? null : seededRandom(options.seed);
    let rotation = 0;
    if (random) {
      this.angle = random() * TAU;
      rotation = random() * TAU;
      for (let index = candidates.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
      }
    }
    const numbers = options.numbers ?? Array.from({ length: count }, (_, index) => index + 1);
    for (let i = 0; i < count; i++) {
      const point = candidates[i];
      if (!point) throw new RangeError('Chamber is too small');
      const x = point.x * Math.cos(rotation) - point.y * Math.sin(rotation);
      const y = point.x * Math.sin(rotation) + point.y * Math.cos(rotation);
      this.balls.push({ number: numbers[i], x: bounds.x + x, y: bounds.y + y,
        vx: random ? (random() - 0.5) * bounds.radius : 0,
        vy: random ? (random() - 0.5) * bounds.radius : 0, radius: ballRadius,
        angle: random ? random() * TAU : 0, spin: random ? (random() - 0.5) * 8 : 0 });
    }
  }

  step(dt, mixing, gateOpen = false) {
    this.impact = 0;
    const { radius } = this.bounds;
    const targetSpeed = typeof mixing === 'number' ? mixing : mixing ? 1.65 : 0;
    this.angularVelocity += (targetSpeed - this.angularVelocity) * Math.min(1, dt * 2.5);
    this.angle = (this.angle + this.angularVelocity * dt) % TAU;
    for (const ball of this.balls) {
      ball.vy += this.gravity * dt;
      const drag = Math.exp(-0.12 * dt);
      ball.vx *= drag;
      ball.vy *= drag;
      ball.spin *= Math.exp(-0.4 * dt);
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed > radius * 3) {
        ball.vx *= radius * 3 / speed;
        ball.vy *= radius * 3 / speed;
      }
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.angle = (ball.angle + ball.spin * dt) % TAU;
    }
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < this.balls.length; i++) {
        for (let j = i + 1; j < this.balls.length; j++) {
          const impulse = resolveCollision(this.balls[i], this.balls[j]) || 0;
          this.impact = Math.max(this.impact, impulse / this.balls[i].radius);
        }
      }
      for (const ball of this.balls) {
        this.contactPaddle(ball);
        this.contain(ball, gateOpen);
      }
    }
    if (gateOpen) {
      const index = this.balls.findIndex(ball => Math.abs(ball.x - this.bounds.x) < ball.radius * 0.85
        && ball.y >= this.gateY && ball.vy >= 0);
      if (index >= 0) return this.balls.splice(index, 1)[0];
    }
    return null;
  }

  contactPaddle(ball) {
    const { x, y, radius } = this.bounds;
    const hub = radius * 0.27;
    this.contactSurface(ball, x, y, hub);
    for (let arm = 0; arm < 3; arm++) {
      const angle = this.angle - Math.PI / 2 + arm * TAU / 3;
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const projection = clamp((ball.x - x) * ux + (ball.y - y) * uy, hub * 0.65, radius * 0.81);
      this.contactSurface(ball, x + ux * projection, y + uy * projection, radius * 0.07);
    }
  }

  contactSurface(ball, x, y, radius) {
    const dx = ball.x - x;
    const dy = ball.y - y;
    const distance = Math.hypot(dx, dy);
    const limit = ball.radius + radius;
    if (distance >= limit) return;
    const nx = distance > 0.001 ? dx / distance : 0;
    const ny = distance > 0.001 ? dy / distance : 1;
    ball.x = x + nx * limit;
    ball.y = y + ny * limit;
    const surfaceVX = -this.angularVelocity * (y - this.bounds.y);
    const surfaceVY = this.angularVelocity * (x - this.bounds.x);
    const relativeVX = ball.vx - surfaceVX;
    const relativeVY = ball.vy - surfaceVY;
    const normalSpeed = relativeVX * nx + relativeVY * ny;
    if (normalSpeed >= 0) return;
    const impulse = -normalSpeed * 1.35;
    this.impact = Math.max(this.impact, impulse / ball.radius);
    ball.vx += impulse * nx;
    ball.vy += impulse * ny;
    const tx = -ny;
    const ty = nx;
    const slip = relativeVX * tx + relativeVY * ty + ball.spin * ball.radius;
    const friction = clamp(-slip / 3, -impulse * 0.3, impulse * 0.3);
    ball.vx += friction * tx;
    ball.vy += friction * ty;
    ball.spin += 2 * friction / ball.radius;
  }

  contain(ball, gateOpen) {
    const { x, y, radius } = this.bounds;
    const dx = ball.x - x;
    const dy = ball.y - y;
    const distance = Math.hypot(dx, dy);
    const limit = radius - ball.radius;
    const inMouth = gateOpen && Math.abs(dx) < ball.radius * 0.85 && dy > radius * 0.7;
    if (distance <= limit || inMouth) return;
    const nx = dx / distance;
    const ny = dy / distance;
    ball.x = x + nx * limit;
    ball.y = y + ny * limit;
    const outward = ball.vx * nx + ball.vy * ny;
    if (outward <= 0) return;
    const impulse = 1.48 * outward;
    this.impact = Math.max(this.impact, impulse / ball.radius);
    ball.vx -= impulse * nx;
    ball.vy -= impulse * ny;
    const tx = -ny;
    const ty = nx;
    const slip = ball.vx * tx + ball.vy * ty + ball.spin * ball.radius;
    const friction = clamp(-slip / 3, -impulse * 0.2, impulse * 0.2);
    ball.vx += friction * tx;
    ball.vy += friction * ty;
    ball.spin += 2 * friction / ball.radius;
  }

}
