/* =========================================================
 * 愤怒的小鸟2 · 仿制版 —— 自研 2D 刚体物理引擎
 * 思路源自 Box2D-lite：SAT 碰撞检测 + 顺序冲量求解器
 * 支持圆形与矩形（OBB）、摩擦、弹性、自适应子步长防穿透
 * ========================================================= */
'use strict';

const Physics = (() => {

  // ---------- 向量小工具 ----------
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const crossSV = (s, v) => ({ x: -s * v.y, y: s * v.x });
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // ---------- 刚体 ----------
  class Body {
    constructor(o) {
      this.shape = o.shape;                    // 'box' | 'circle'
      this.pos = { x: o.x, y: o.y };
      this.vel = { x: 0, y: 0 };
      this.angle = o.angle || 0;
      this.angVel = 0;
      this.static = !!o.static;

      if (this.shape === 'box') {
        this.w = o.w; this.h = o.h;
        this.hw = o.w / 2; this.hh = o.h / 2;
        this.area = o.w * o.h;
      } else {
        this.r = o.r;
        this.area = Math.PI * o.r * o.r;
      }

      const density = o.density == null ? 0.002 : o.density;
      this.mass = this.static ? 0 : this.area * density;
      this.invMass = this.static ? 0 : 1 / this.mass;
      let I = 0;
      if (!this.static) {
        I = this.shape === 'box'
          ? this.mass * (o.w * o.w + o.h * o.h) / 12
          : this.mass * o.r * o.r * 0.5;
      }
      this.invI = this.static ? 0 : 1 / I;

      this.friction = o.friction == null ? 0.7 : o.friction;
      this.restitution = o.restitution == null ? 0.12 : o.restitution;
      this.linDamp = o.linDamp == null ? 0.04 : o.linDamp;   // 线性阻尼
      this.angDamp = o.angDamp == null ? 0.5 : o.angDamp;   // 角阻尼（滚动阻力）

      // 游戏层字段
      this.kind = o.kind || 'block';       // block / pig / bird / tnt / egg / ground
      this.material = o.material || null;  // wood / stone / ice / pig / bird 类型 / tnt
      this.hp = o.hp == null ? Infinity : o.hp;
      this.maxHp = this.hp;
      this.dead = false;
      this.id = Body._id = (Body._id || 0) + 1;
      this.gravityScale = o.gravityScale == null ? 1 : o.gravityScale;
      this.sleeping = false;   // 休眠：长时间低速时冻结，防止求解器蠕滑
      this._sleepT = 0;
    }

    wake() { this.sleeping = false; this._sleepT = 0; }

    containsPoint(p) {
      if (this.shape === 'circle') {
        return (p.x - this.pos.x) ** 2 + (p.y - this.pos.y) ** 2 <= this.r * this.r;
      }
      const dx = p.x - this.pos.x, dy = p.y - this.pos.y;
      const c = Math.cos(this.angle), s = Math.sin(this.angle);
      const lx = c * dx + s * dy, ly = -s * dx + c * dy;
      return Math.abs(lx) <= this.hw && Math.abs(ly) <= this.hh;
    }

    getAABB() {
      if (this.shape === 'circle') {
        return { x0: this.pos.x - this.r, y0: this.pos.y - this.r, x1: this.pos.x + this.r, y1: this.pos.y + this.r };
      }
      const c = Math.abs(Math.cos(this.angle)), s = Math.abs(Math.sin(this.angle));
      const ex = c * this.hw + s * this.hh, ey = s * this.hw + c * this.hh;
      return { x0: this.pos.x - ex, y0: this.pos.y - ey, x1: this.pos.x + ex, y1: this.pos.y + ey };
    }

    applyImpulse(px, py, at) {
      if (this.static) return;
      this.vel.x += px * this.invMass;
      this.vel.y += py * this.invMass;
      this.angVel += this.invI * cross(sub(at, this.pos), { x: px, y: py });
    }

    speed() { return Math.hypot(this.vel.x, this.vel.y); }
  }

  // ---------- 形状顶点 / 面 ----------
  function boxVerts(b) {
    const c = Math.cos(b.angle), s = Math.sin(b.angle);
    const P = [[-b.hw, -b.hh], [b.hw, -b.hh], [b.hw, b.hh], [-b.hw, b.hh]];
    return P.map(p => ({ x: b.pos.x + c * p[0] - s * p[1], y: b.pos.y + s * p[0] + c * p[1] }));
  }
  function boxFaces(b, verts) {
    // face i：顶点 i → i+1，外法线
    const ns = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const c = Math.cos(b.angle), s = Math.sin(b.angle);
    const faces = [];
    for (let i = 0; i < 4; i++) {
      const ln = ns[i];
      faces.push({
        n: { x: c * ln[0] - s * ln[1], y: s * ln[0] + c * ln[1] },
        p1: verts[i], p2: verts[(i + 1) % 4],
      });
    }
    return faces;
  }
  function incidentFace(faces, refN) {
    let best = null, bestD = Infinity;
    for (const f of faces) {
      const d = dot(f.n, refN);
      if (d < bestD) { bestD = d; best = f; }
    }
    return best;
  }
  // 用直线 (n, offset) 裁剪线段：保留满足 dot(n,p) <= offset 的部分
  function clipSeg(pts, n, offset) {
    const out = [];
    const d0 = dot(n, pts[0]) - offset, d1 = dot(n, pts[1]) - offset;
    if (d0 <= 0) out.push(pts[0]);
    if (d1 <= 0) out.push(pts[1]);
    if (d0 * d1 < 0) {
      const t = d0 / (d0 - d1);
      out.push({ x: pts[0].x + t * (pts[1].x - pts[0].x), y: pts[0].y + t * (pts[1].y - pts[0].y) });
    }
    return out;
  }

  // ---------- 碰撞检测 ----------
  function collideBoxBox(a, b) {
    const va = boxVerts(a), vb = boxVerts(b);
    const fa = boxFaces(a, va), fb = boxFaces(b, vb);

    // SAT：遍历 8 张面，取分离最大（穿透最小）的一张作参考面
    let ref = null, refIsA = true, bestSep = -Infinity;
    const consider = (faces, otherVerts, isA) => {
      for (const f of faces) {
        let sep = Infinity;
        for (const v of otherVerts) {
          const d = dot(f.n, sub(v, f.p1));
          if (d < sep) sep = d;
        }
        if (sep > 0) return true;             // 找到分离轴 → 不碰撞
        if (sep > bestSep) { bestSep = sep; ref = f; refIsA = isA; }
      }
      return false;
    };
    if (consider(fa, vb, true) || consider(fb, va, false)) return null;

    // 接触法线约定：由 A 指向 B
    const n = refIsA ? { ...ref.n } : { x: -ref.n.x, y: -ref.n.y };
    // 入射面：与【参考面外法线】最逆平行的对面上的脸
    const inc = incidentFace(refIsA ? fb : fa, ref.n);

    // 用参考面两侧的侧平面裁剪入射面线段（t 为沿参考面的切线方向）
    let tx = ref.p2.x - ref.p1.x, ty = ref.p2.y - ref.p1.y;
    const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
    const t = { x: tx, y: ty };
    const d1 = dot(t, ref.p1), d2 = dot(t, ref.p2);
    let pts = [inc.p1, inc.p2];
    if (d1 < d2) { pts = clipSeg(pts, t, d2); if (pts.length === 0) return null; pts = clipSeg(pts, { x: -t.x, y: -t.y }, -d1); }
    else { pts = clipSeg(pts, t, d1); if (pts.length === 0) return null; pts = clipSeg(pts, { x: -t.x, y: -t.y }, -d2); }
    if (pts.length === 0) return null;

    const front = dot(ref.n, ref.p1);
    const contacts = [];
    for (const p of pts) {
      const sep = dot(ref.n, p) - front;
      if (sep <= 0.5) contacts.push({ p, pen: Math.max(-sep, 0) });
    }
    if (contacts.length === 0) return null;
    return { n, contacts };
  }

  function collideCircleBox(c, b) {
    const cos = Math.cos(b.angle), sin = Math.sin(b.angle);
    const dx = c.pos.x - b.pos.x, dy = c.pos.y - b.pos.y;
    const lx = cos * dx + sin * dy, ly = -sin * dx + cos * dy; // 圆心在盒局部坐标
    const cx = clamp(lx, -b.hw, b.hw), cy = clamp(ly, -b.hh, b.hh);
    let nx, ny, pen, pLocal;
    if (cx === lx && cy === ly) {
      // 圆心在盒内：沿重叠最小的轴推出
      const ox = b.hw - Math.abs(lx), oy = b.hh - Math.abs(ly);
      if (ox < oy) { nx = lx >= 0 ? 1 : -1; ny = 0; pen = ox + c.r; pLocal = { x: nx * b.hw, y: ly }; }
      else { nx = 0; ny = ly >= 0 ? 1 : -1; pen = oy + c.r; pLocal = { x: lx, y: ny * b.hh }; }
    } else {
      const ddx = lx - cx, ddy = ly - cy;
      const dist2 = ddx * ddx + ddy * ddy;
      if (dist2 > c.r * c.r) return null;
      const dist = Math.sqrt(dist2) || 1e-6;
      nx = ddx / dist; ny = ddy / dist;       // 由接触点指向圆心 → 法线取反才指向盒
      nx = -nx; ny = -ny;
      pen = c.r - dist;
      pLocal = { x: cx, y: cy };
    }
    // 局部 → 世界
    const n = { x: cos * nx - sin * ny, y: sin * nx + cos * ny };
    const p = { x: b.pos.x + cos * pLocal.x - sin * pLocal.y, y: b.pos.y + sin * pLocal.x + cos * pLocal.y };
    return { n, contacts: [{ p, pen }] };
  }

  function collideCircleCircle(a, b) {
    const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
    const rSum = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 > rSum * rSum) return null;
    const d = Math.sqrt(d2) || 1e-6;
    const n = { x: dx / d, y: dy / d };
    const pen = rSum - d;
    const p = { x: a.pos.x + n.x * (a.r - pen / 2), y: a.pos.y + n.y * (a.r - pen / 2) };
    return { n, contacts: [{ p, pen }] };
  }

  function collide(a, b) {
    const ac = a.shape === 'circle', bc = b.shape === 'circle';
    if (ac && bc) return collideCircleCircle(a, b);
    if (ac && !bc) return collideCircleBox(a, b);
    if (!ac && bc) {
      const m = collideCircleBox(b, a);
      if (!m) return null;
      m.n = { x: -m.n.x, y: -m.n.y };
      return m;
    }
    return collideBoxBox(a, b);
  }

  // ---------- 接触点求解数据 ----------
  class ContactPoint {
    constructor(m, cp) {
      const a = m.a, b = m.b, n = m.n;
      this.p = cp.p;
      this.pen = cp.pen;
      this.rA = sub(cp.p, a.pos);
      this.rB = sub(cp.p, b.pos);
      const rnA = cross(this.rA, n), rnB = cross(this.rB, n);
      this.massN = 1 / (a.invMass + b.invMass + a.invI * rnA * rnA + b.invI * rnB * rnB);
      const t = { x: -n.y, y: n.x };
      m.t = t;
      const rtA = cross(this.rA, t), rtB = cross(this.rB, t);
      this.massT = 1 / (a.invMass + b.invMass + a.invI * rtA * rtA + b.invI * rtB * rtB);
      // 初始接近速度 → 回弹目标
      const vr = relVel(a, b, this);
      const vn0 = dot(vr, n);
      const e = Math.max(a.restitution, b.restitution);
      this.bounce = vn0 < -140 ? -e * vn0 : 0;
      // Baumgarte 位置修正偏置
      this.bias = Math.min(0.2 / m.h * Math.max(cp.pen - 0.5, 0), 900);
      this.Pn = 0; this.Pt = 0;
    }
  }

  function relVel(a, b, c) {
    const vA = { x: a.vel.x - a.angVel * c.rA.y, y: a.vel.y + a.angVel * c.rA.x };
    const vB = { x: b.vel.x - b.angVel * c.rB.y, y: b.vel.y + b.angVel * c.rB.x };
    return { x: vB.x - vA.x, y: vB.y - vA.y };
  }

  // ---------- 世界 ----------
  const GRAVITY = 1500;
  const ITER = 10;

  class World {
    constructor() {
      this.bodies = [];
      this.gravity = GRAVITY;
      this.events = [];       // 碰撞事件 {a,b,imp,relSpeed,p}
      this._acc = 0;
    }

    add(b) { this.bodies.push(b); return b; }
    remove(b) { const i = this.bodies.indexOf(b); if (i >= 0) this.bodies.splice(i, 1); }

    // 唤醒区域内所有刚体（破坏/爆炸时调用，防止上方结构悬浮冻结）
    wakeArea(x, y, r) {
      const r2 = r * r;
      for (const b of this.bodies) {
        if (!b.static && (b.pos.x - x) ** 2 + (b.pos.y - y) ** 2 < r2) b.wake();
      }
    }

    // 自适应子步长：高速时细分，防止穿墙
    update(dt) {
      this._acc += Math.min(dt, 0.05);
      let guard = 0;
      while (this._acc > 1e-6 && guard < 24) {
        let vMax = 0;
        for (const b of this.bodies) if (!b.static) { const s = b.speed(); if (s > vMax) vMax = s; }
        let h = 1 / 120;
        if (vMax > 800) h = Math.min(h, 7 / vMax);
        if (h > this._acc) h = this._acc;
        this.step(h);
        this._acc -= h;
        guard++;
      }
      if (guard >= 24) this._acc = 0;
    }

    step(h) {
      const bs = this.bodies;

      // 1. 积分外力（休眠刚体跳过）
      for (const b of bs) {
        if (b.static || b.sleeping) continue;
        b.vel.y += this.gravity * b.gravityScale * h;
        const dl = 1 - b.linDamp * h;
        b.vel.x *= dl; b.vel.y *= dl;
        b.angVel *= 1 - b.angDamp * h;
        const sp = b.speed();
        if (sp > 2600) { b.vel.x *= 2600 / sp; b.vel.y *= 2600 / sp; }
        b.angVel = clamp(b.angVel, -28, 28);
      }

      // 2. 碰撞检测（O(n²) + AABB 剪枝，量级足够）
      const manifolds = [];
      for (let i = 0; i < bs.length; i++) {
        const a = bs[i];
        const bbA = a.getAABB();
        for (let j = i + 1; j < bs.length; j++) {
          const b = bs[j];
          if (a.static && b.static) continue;
          if ((a.invMass === 0 && a.invI === 0) && (b.invMass === 0 && b.invI === 0)) continue;
          if (a.sleeping && b.sleeping) continue;
          const bbB = b.getAABB();
          if (bbA.x0 > bbB.x1 || bbB.x0 > bbA.x1 || bbA.y0 > bbB.y1 || bbB.y0 > bbA.y1) continue;
          const res = collide(a, b);
          if (!res) continue;
          // 唤醒传播：快速运动的一方唤醒静止的邻居
          const aFast = !a.static && !a.sleeping && a.speed() > 25;
          const bFast = !b.static && !b.sleeping && b.speed() > 25;
          if (aFast && b.sleeping) b.wake();
          if (bFast && a.sleeping) a.wake();
          const fr = Math.sqrt(a.friction * b.friction);
          manifolds.push({
            a, b, n: res.n, contacts: res.contacts, friction: fr, h,
            t: null, totalImp: 0, minRelSpeed: 0,
          });
        }
      }

      // 3. 预计算 + 迭代求解
      for (const m of manifolds) {
        m.points = m.contacts.map(cp => new ContactPoint(m, cp));
        m.minRelSpeed = Math.min(...m.points.map(c => dot(relVel(m.a, m.b, c), m.n)));
      }
      for (let it = 0; it < ITER; it++) {
        for (const m of manifolds) {
          for (const c of m.points) {
            // 法向冲量
            let vr = relVel(m.a, m.b, c);
            const vn = dot(vr, m.n);
            let dPn = c.massN * (c.bias + c.bounce - vn);
            const Pn0 = c.Pn;
            c.Pn = Math.max(Pn0 + dPn, 0);
            dPn = c.Pn - Pn0;
            applyPair(m, m.n, dPn, c);
            // 摩擦冲量
            vr = relVel(m.a, m.b, c);
            const vt = dot(vr, m.t);
            let dPt = c.massT * (-vt);
            const maxF = m.friction * c.Pn;
            const Pt0 = c.Pt;
            c.Pt = clamp(Pt0 + dPt, -maxF, maxF);
            dPt = c.Pt - Pt0;
            applyPair(m, m.t, dPt, c);
          }
        }
      }

      // 4. 积分位置（休眠刚体跳过）
      for (const b of bs) {
        if (b.static || b.sleeping) continue;
        b.pos.x += b.vel.x * h;
        b.pos.y += b.vel.y * h;
        b.angle += b.angVel * h;
      }

      // 4.5 休眠判定：持续低速 0.5s → 冻结
      for (const b of bs) {
        if (b.static || b.sleeping) continue;
        if (b.speed() < 20 && Math.abs(b.angVel) < 0.5) {
          b._sleepT += h;
          if (b._sleepT > 0.5) {
            b.sleeping = true;
            b.vel.x = 0; b.vel.y = 0; b.angVel = 0;
          }
        } else {
          b._sleepT = 0;
        }
      }

      // 5. 产出碰撞事件（供伤害系统使用）
      // imp 采用理想碰撞冲量 μ·v·(1+e)，排除静置支撑力/位置修正的噪声
      this._m = manifolds;
      for (const m of manifolds) {
        if (m.minRelSpeed >= -1) continue;
        const mu = 1 / (m.a.invMass + m.b.invMass);
        const e = Math.max(m.a.restitution, m.b.restitution);
        const p = m.points[0].p;
        this.events.push({
          a: m.a, b: m.b,
          imp: mu * (-m.minRelSpeed) * (1 + e),
          relSpeed: -m.minRelSpeed, x: p.x, y: p.y,
        });
      }
    }

    drainEvents() { const e = this.events; this.events = []; return e; }
  }

  function applyPair(m, dir, P, c) {
    const a = m.a, b = m.b;
    if (P === 0) return;
    const px = dir.x * P, py = dir.y * P;
    a.vel.x -= px * a.invMass; a.vel.y -= py * a.invMass;
    a.angVel -= a.invI * cross(c.rA, { x: px, y: py });
    b.vel.x += px * b.invMass; b.vel.y += py * b.invMass;
    b.angVel += b.invI * cross(c.rB, { x: px, y: py });
  }

  return { Body, World, clamp, dot, cross, sub };
})();

if (typeof module !== 'undefined') module.exports = Physics;
else window.Physics = Physics;
