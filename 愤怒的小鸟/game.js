/* =========================================================
 * 愤怒的小鸟2 · 仿制版 —— 游戏主逻辑
 * 弹弓弹射 / 出鸟卡组 / 可破坏结构 / 摧毁率星级 / 关卡进度
 * 依赖：physics.js（全局 Physics）、levels.js（全局 ABLevels）
 * ========================================================= */
(() => {
'use strict';

const { Body, World } = Physics;
const { GY, MAT, BIRDS, PIG, TNT, levels } = ABLevels;

// ================= 常量 =================
const SLING = { x: 280, y: 950 };
const POUCH = { x: 282, y: 794 };          // 皮兜锚点
const MAX_STRETCH = 90;                    // 最大拉弓距离（px）
const LAUNCH_K = 19;                       // 拉满 → 1710 px/s
const BIRD_VALUE = 2000;                   // 每张鸟卡对摧毁率的贡献值

const DMG = { threshold: 350, k: 0.11, minSpeed: 130, pigVuln: 2.5 };
const MATCHUP = {
  bird_red:     { wood: 1,   ice: 1,   stone: 0.8, pig: 1   },
  bird_chuck:   { wood: 4,   ice: 1,   stone: 0.5, pig: 1.2 },
  bird_blues:   { wood: 0.6, ice: 5,   stone: 0.3, pig: 1   },
  bird_bomb:    { wood: 1.2, ice: 1.5, stone: 4,   pig: 1.2 },
  bird_matilda: { wood: 1.5, ice: 2,   stone: 1,   pig: 1.5 },
  egg:          { wood: 1.5, ice: 2,   stone: 1.2, pig: 2   },
  explosion:    { wood: 1.2, ice: 1.6, stone: 1.3, pig: 2, tnt: 3 },
  block:        { wood: 1, ice: 1, stone: 1, pig: 1 },
  pig:          { wood: 0.6, ice: 0.6, stone: 0.6, pig: 1 },
};
const EXPLODE = {
  bomb: { radius: 160, dmg: 300, dv: 750 },
  tnt:  { radius: 170, dmg: 340, dv: 800 },
  egg:  { radius: 110, dmg: 230, dv: 520 },
  cry:  { radius: 95,  dmg: 60,  dv: 260 },   // 大红的战吼
};
const STAR2 = 55, STAR3 = 80;              // 摧毁率星级门槛（%）

// ================= 工具 =================
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const hyp = Math.hypot;
// 简单可复现随机（背景装饰用）
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// ================= 音效（WebAudio 合成） =================
const Sfx = {
  ctx: null, master: null, noiseBuf: null,
  muted: localStorage.getItem('ab2_muted') === '1',
  last: {},
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.6;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { return false; }
  },
  setMuted(m) {
    this.muted = m;
    localStorage.setItem('ab2_muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  },
  tone({ freq = 440, freqEnd = null, dur = 0.15, type = 'sine', vol = 0.3, attack = 0.004, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  },
  noise({ dur = 0.15, vol = 0.3, freq = 800, freqEnd = null, type = 'lowpass', q = 0.8, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (freqEnd != null) f.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  },
  play(name, intensity = 0.5) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < 50) return;
    this.last[name] = now;
    const v = clamp(intensity, 0.12, 1);
    switch (name) {
      case 'launch': this.tone({ freq: 340, freqEnd: 90, dur: 0.2, type: 'triangle', vol: 0.5 }); this.noise({ dur: 0.1, vol: 0.2, freq: 1500 }); break;
      case 'stretch': this.tone({ freq: 80 + intensity * 130, dur: 0.04, type: 'sine', vol: 0.1 }); break;
      case 'woodHit': this.noise({ dur: 0.07, vol: 0.35 * v, freq: 500 }); this.tone({ freq: 140, freqEnd: 90, dur: 0.06, vol: 0.25 * v }); break;
      case 'woodBreak': this.noise({ dur: 0.18, vol: 0.5, freq: 900, freqEnd: 250 }); this.tone({ freq: 180, freqEnd: 70, dur: 0.14, vol: 0.35 }); break;
      case 'iceHit': this.tone({ freq: 1500, freqEnd: 900, dur: 0.06, vol: 0.2 * v }); break;
      case 'iceBreak': this.noise({ dur: 0.22, vol: 0.45, freq: 3500, type: 'highpass' }); this.tone({ freq: 2200, freqEnd: 500, dur: 0.16, vol: 0.3 }); break;
      case 'stoneHit': this.tone({ freq: 95, freqEnd: 55, dur: 0.09, vol: 0.4 * v }); this.noise({ dur: 0.06, vol: 0.25 * v, freq: 300 }); break;
      case 'stoneBreak': this.noise({ dur: 0.28, vol: 0.55, freq: 350, freqEnd: 90 }); this.tone({ freq: 70, freqEnd: 38, dur: 0.22, vol: 0.5 }); break;
      case 'pigHit': this.tone({ freq: 500, freqEnd: 850, dur: 0.09, type: 'square', vol: 0.15 * v }); break;
      case 'pigPop': this.tone({ freq: 850, freqEnd: 220, dur: 0.22, type: 'square', vol: 0.3 }); this.noise({ dur: 0.1, vol: 0.3, freq: 1200 }); this.tone({ freq: 320, freqEnd: 180, dur: 0.12, type: 'square', vol: 0.2, delay: 0.05 }); break;
      case 'boom': this.noise({ dur: 0.55, vol: 0.8, freq: 500, freqEnd: 60 }); this.tone({ freq: 70, freqEnd: 26, dur: 0.5, vol: 0.6 }); break;
      case 'whoosh': this.noise({ dur: 0.28, vol: 0.4, freq: 600, freqEnd: 2600, type: 'bandpass', q: 1.5 }); break;
      case 'poof': this.noise({ dur: 0.2, vol: 0.2, freq: 1000, freqEnd: 300 }); break;
      case 'card': this.tone({ freq: 700, dur: 0.05, type: 'triangle', vol: 0.2 }); this.tone({ freq: 950, dur: 0.05, type: 'triangle', vol: 0.15, delay: 0.04 }); break;
      case 'star': this.tone({ freq: 660 * (1 + intensity * 0.26), dur: 0.3, type: 'triangle', vol: 0.35 }); this.tone({ freq: (660 * (1 + intensity * 0.26)) * 2, dur: 0.25, vol: 0.15, delay: 0.03 }); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.3, delay: i * 0.12 })); break;
      case 'lose': this.tone({ freq: 300, freqEnd: 140, dur: 0.7, type: 'sawtooth', vol: 0.22 }); this.tone({ freq: 150, freqEnd: 70, dur: 0.7, type: 'sawtooth', vol: 0.18, delay: 0.05 }); break;
      case 'click': this.tone({ freq: 500, dur: 0.04, type: 'triangle', vol: 0.18 }); break;
    }
  },
};

// ================= 进度存档 =================
const Progress = {
  data: JSON.parse(localStorage.getItem('ab2_progress') || '{"unlocked":1,"stars":{},"best":{}}'),
  save() { localStorage.setItem('ab2_progress', JSON.stringify(this.data)); },
  record(idx, stars, score) {
    this.data.stars[idx] = Math.max(this.data.stars[idx] || 0, stars);
    this.data.best[idx] = Math.max(this.data.best[idx] || 0, score);
    this.data.unlocked = Math.max(this.data.unlocked, idx + 2);
    this.save();
  },
};

// ================= 画布与相机 =================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let cw = 0, ch = 0, dpr = 1, baseScale = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = window.innerWidth; ch = window.innerHeight;
  canvas.width = cw * dpr; canvas.height = ch * dpr;
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  baseScale = ch / 1080;
}
window.addEventListener('resize', resize);
resize();

const cam = {
  x: 800, y: 700, scale: 1,
  tx: 800, ty: 700, tscale: 1,
  manual: false, shake: 0,
};
function camClamp() {
  const lv = G.levelDef;
  const vw = cw / cam.scale, vh = ch / cam.scale;
  if (lv) {
    cam.x = clamp(cam.x, vw / 2 - 100, lv.width - vw / 2 + 150);
    cam.y = clamp(cam.y, vh / 2 - 420, GY + 300 - vh / 2);
  }
}
function camSnapTo(x, y, s) { cam.x = cam.tx = x; cam.y = cam.ty = y; cam.scale = cam.tscale = s ?? baseScale; }
function camUpdate(dt) {
  if (!cam.manual) {
    const k = 1 - Math.exp(-5 * dt);
    cam.x = lerp(cam.x, cam.tx, k);
    cam.y = lerp(cam.y, cam.ty, k);
    cam.scale = lerp(cam.scale, cam.tscale, k);
  }
  camClamp();
  cam.shake = Math.max(0, cam.shake - dt * 3.2);
}

// ================= 游戏状态 =================
const G = {
  scene: 'menu',            // menu / levels / play
  levelIdx: 0, levelDef: null, world: null,
  phase: 'intro',           // intro / aim / drag / fly / settle / over
  phaseT: 0,
  deck: [],                 // 剩余鸟卡（类型数组）
  activeBirds: [],          // 场上鸟刚体
  blocks: [], pigs: [], tnts: [],
  score: 0, destroyedValue: 0, totalValue: 0,
  floaters: [], particles: [],
  abilityUsed: false, abilityType: null,
  settleT: 0, winT: -1, loseT: -1,
  paused: false,
  drag: null,               // {px, py} 指针世界坐标
  pointers: new Map(),
  introFrom: null,
  decoSeed: 1,
};

// ================= 刚体工厂 =================
function makeBlock(def) {
  const m = MAT[def.mat];
  return G.world.add(new Body({
    shape: 'box', x: def.x, y: def.y, w: def.w, h: def.h, angle: def.angle || 0,
    density: m.density, friction: m.friction, restitution: m.restitution,
    kind: 'block', material: def.mat, hp: m.hp,
  }));
}
function makeTnt(def) {
  return G.world.add(new Body({
    shape: 'box', x: def.x, y: def.y, w: def.w, h: def.h,
    density: TNT.density, friction: 0.6, restitution: 0.1,
    kind: 'tnt', material: 'tnt', hp: TNT.hp,
  }));
}
function makePig(def) {
  return G.world.add(new Body({
    shape: 'circle', x: def.x, y: def.y, r: def.r,
    density: def.helmet ? PIG.helmetDensity : PIG.density,
    friction: 0.85, restitution: 0.25,
    kind: 'pig', material: 'pig', hp: def.helmet ? PIG.helmetHp : PIG.hp,
    helmet: def.helmet,
  }));
}
function makeBird(type, x, y) {
  const b = BIRDS[type];
  const body = new Body({
    shape: 'circle', x, y, r: b.r,
    density: b.density, friction: 0.62, restitution: 0.28,
    kind: 'bird', material: 'bird_' + type,
  });
  body.birdType = type;
  body.slowT = 0; body.age = 0; body.fuse = -1; body.fade = 1;
  return body;
}

// ================= 关卡装载 =================
function loadLevel(idx) {
  G.levelIdx = idx;
  G.levelDef = levels[idx];
  G.world = new World();
  G.blocks = []; G.pigs = []; G.tnts = [];
  G.activeBirds = []; G.floaters = []; G.particles = [];
  G.score = 0; G.destroyedValue = 0; G.totalValue = 0;
  G.abilityUsed = false; G.settleT = 0; G.winT = -1; G.loseT = -1;
  G.paused = false; G.drag = null; G.egg = null;
  G.shotsFired = 0;
  G.decoSeed = 1234 + idx * 77;
  buildDeco();
  G.deck = G.levelDef.birds.slice();

  for (const def of G.levelDef.build()) {
    if (def.t === 'b') { G.blocks.push(makeBlock(def)); G.totalValue += MAT[def.mat].points; }
    else if (def.t === 'x') { G.tnts.push(makeTnt(def)); G.totalValue += TNT.points; }
    else { G.pigs.push(makePig(def)); G.totalValue += def.helmet ? PIG.helmetPoints : PIG.points; }
  }

  // 静态地形
  const W = G.levelDef.width;
  G.world.add(new Body({ shape: 'box', x: W / 2, y: GY + 200, w: W + 1600, h: 400, static: true, friction: 0.85, kind: 'ground' }));
  G.world.add(new Body({ shape: 'box', x: -80, y: GY - 500, w: 160, h: 2000, static: true, kind: 'ground' }));
  G.world.add(new Body({ shape: 'box', x: W + 80, y: GY - 500, w: 160, h: 2000, static: true, kind: 'ground' }));

  // 相机开场：从猪群平移回弹弓
  let px = 0; for (const p of G.pigs) px += p.pos.x; px /= Math.max(G.pigs.length, 1);
  G.introFrom = { x: px + 150, y: 640 };
  cam.manual = false;
  camSnapTo(G.introFrom.x, G.introFrom.y, baseScale * 0.92);
  cam.tx = SLING.x + 500; cam.ty = 690; cam.tscale = baseScale;

  G.scene = 'play';
  G.phase = 'intro'; G.phaseT = 0;
  showScreen(null);
  hud.style.display = '';
  banner.textContent = `第 ${idx + 1} 关 · ${G.levelDef.name}`;
  banner.classList.remove('show');
  void banner.offsetWidth;
  banner.classList.add('show');
  buildCards();
  updateHud();
}

// ================= 鸟卡 UI =================
const hud = document.getElementById('hud');
const cardsEl = document.getElementById('cards');
function buildCards() {
  cardsEl.innerHTML = '';
  G.deck.forEach((type, i) => {
    const el = document.createElement('div');
    el.className = 'card' + (i === 0 ? ' active' : '');
    const cv = document.createElement('canvas');
    cv.width = 72; cv.height = 84;
    const c = cv.getContext('2d');
    c.translate(36, 44);
    drawBird(c, type, 21, { portrait: true });
    el.appendChild(cv);
    const name = document.createElement('span');
    name.textContent = BIRDS[type].name;
    el.appendChild(name);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (G.phase !== 'aim' || i === 0) return;
      Sfx.ensure(); Sfx.play('card');
      const t = G.deck.splice(i, 1)[0];
      G.deck.unshift(t);
      buildCards();
      loadNextBird();
    });
    cardsEl.appendChild(el);
  });
  updateHud();
}

// ================= 弹弓与出鸟 =================
function loadNextBird() {
  if (G.deck.length === 0) return;
  const old = G.activeBirds[0];
  if (old && !old.launched) G.world.remove(old);
  G.activeBirds = [];
  const type = G.deck[0];
  const body = makeBird(type, POUCH.x, POUCH.y - BIRDS[type].r - 2);
  body.gravityScale = 0;   // 上膛的鸟钉在皮兜上，发射时恢复重力
  G.activeBirds = [body];
  G.world.add(body);
  G.abilityUsed = false;
  G.phase = 'aim';
  cam.manual = false;
  cam.tx = SLING.x + 500; cam.ty = 690; cam.tscale = baseScale;
  buildCards();
}
function unloadBird() { // 把弹弓上的鸟放回卡组（换卡时）
  const b = G.activeBirds[0];
  if (b && !b.launched) G.world.remove(b);
  G.activeBirds = [];
}

function stretchVec() {
  // 当前拉伸向量：皮兜指向鸟
  const b = G.activeBirds[0];
  if (!b) return { x: 0, y: 0, len: 0 };
  return { x: b.pos.x - POUCH.x, y: b.pos.y - POUCH.y, len: hyp(b.pos.x - POUCH.x, b.pos.y - POUCH.y) };
}
function launchVel() {
  const s = stretchVec();
  const k = Math.min(s.len, MAX_STRETCH) * LAUNCH_K;
  const l = s.len || 1;
  return { x: -s.x / l * k, y: -s.y / l * k };
}
function launch() {
  const b = G.activeBirds[0];
  if (!b) return;
  const v = launchVel();
  b.vel.x = v.x; b.vel.y = v.y;
  b.gravityScale = 1;
  b.launched = true;
  G.phase = 'fly'; G.phaseT = 0;
  G.abilityUsed = false;
  G.deck.shift();
  G.shotsFired++;
  buildCards();
  Sfx.play('launch');
  for (let i = 0; i < 6; i++) {
    G.particles.push({ type: 'feather', x: b.pos.x, y: b.pos.y, vx: rand(-60, 60), vy: rand(-80, 20), life: 0.8, max: 0.8, size: rand(3, 5), color: '#fff', rot: rand(0, 6.3), vr: rand(-3, 3), grav: 120 });
  }
}

// ================= 技能 =================
function tryAbility() {
  if (G.phase !== 'fly' || G.abilityUsed) return;
  const b = G.activeBirds[0];
  if (!b || !b.launched) return;
  const type = b.birdType;
  if (type === 'red') {
    G.abilityUsed = true;
    explode(b.pos.x, b.pos.y, EXPLODE.cry, 'cry');
    Sfx.play('whoosh');
  } else if (type === 'chuck') {
    G.abilityUsed = true;
    const sp = b.speed();
    const k = clamp(sp * 1.85, 900, 2500) / (sp || 1);
    b.vel.x *= k; b.vel.y *= k;
    Sfx.play('whoosh');
    for (let i = 0; i < 10; i++) G.particles.push({ type: 'streak', x: b.pos.x - rand(0, 30), y: b.pos.y + rand(-8, 8), vx: -b.vel.x * 0.3, vy: -b.vel.y * 0.3, life: 0.35, max: 0.35, size: rand(6, 14), color: '#ffe66e', grav: 0 });
  } else if (type === 'blues') {
    G.abilityUsed = true;
    const sp = b.speed();
    const ang = Math.atan2(b.vel.y, b.vel.x);
    G.world.remove(b);
    G.activeBirds = [];
    for (const off of [-0.21, 0, 0.21]) {
      const nb = makeBird('blues', b.pos.x + rand(-4, 4), b.pos.y + rand(-10, 10));
      nb.vel.x = Math.cos(ang + off) * sp;
      nb.vel.y = Math.sin(ang + off) * sp;
      nb.launched = true;
      G.world.add(nb);
      G.activeBirds.push(nb);
    }
    Sfx.play('whoosh');
  } else if (type === 'bomb') {
    G.abilityUsed = true;
    b.fuse = 0.001; // 立即引爆（在 update 中处理）
  } else if (type === 'matilda') {
    G.abilityUsed = true;
    const egg = new Body({
      shape: 'circle', x: b.pos.x, y: b.pos.y + b.r + 6, r: 9,
      density: 0.004, friction: 0.5, restitution: 0.05,
      kind: 'egg', material: 'egg', gravityScale: 1.25,
    });
    egg.vel.x = b.vel.x * 0.55; egg.vel.y = Math.max(b.vel.y, 0) + 250;
    G.world.add(egg);
    G.egg = egg;
    b.vel.y = Math.min(b.vel.y, -520);   // 白公主向上弹开
    b.vel.x *= 1.1;
    Sfx.play('whoosh');
  }
}

// ================= 爆炸与伤害 =================
function explode(x, y, spec, kind) {
  Sfx.play('boom');
  cam.shake = Math.min(cam.shake + (spec.radius > 130 ? 1 : 0.5), 1.4);
  G.particles.push({ type: 'flash', x, y, life: 0.18, max: 0.18, size: spec.radius });
  for (let i = 0; i < 26; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(60, spec.dv * 0.7);
    G.particles.push({ type: 'smoke', x: x + Math.cos(a) * rand(0, 20), y: y + Math.sin(a) * rand(0, 20), vx: Math.cos(a) * sp * 0.4, vy: Math.sin(a) * sp * 0.4 - 60, life: rand(0.5, 1), max: 1, size: rand(10, 26), color: i % 3 ? '#63666d' : '#f2a541', grav: -60 });
  }
  G.world.wakeArea(x, y, spec.radius * 1.4);
  const all = [...G.blocks, ...G.pigs, ...G.tnts, ...G.activeBirds];
  for (const b of all) {
    if (b.dead) continue;
    const dx = b.pos.x - x, dy = b.pos.y - y;
    const d = hyp(dx, dy);
    if (d > spec.radius) continue;
    const fall = 1 - d / spec.radius;
    const dv = spec.dv * fall * (2.2 / (1 + (b.mass || 1) * 0.22));
    const l = d || 1;
    b.vel.x += dx / l * dv;
    b.vel.y += dy / l * dv - dv * 0.35;
    if (b.kind !== 'bird') {
      let mult = (MATCHUP.explosion[b.material] || 1);
      if (b.kind === 'pig') mult *= DMG.pigVuln;
      damage(b, spec.dmg * fall * mult, b.pos.x, b.pos.y, true);
    } else if (b.kind === 'bird' && b.birdType === 'bomb') {
      b.fuse = Math.min(b.fuse < 0 ? 0.3 : b.fuse, 0.25); // 炸弹鸟被波及引信缩短
    }
  }
  if (kind !== 'tnt' && kind !== 'cry') cam.tx = x; // 镜头短暂看向爆点
}

function damage(body, dmg, x, y, silent) {
  if (body.dead || body.kind === 'ground' || body.kind === 'bird') return;
  if (body.hp === Infinity) return;
  body.wake();
  body.hp -= dmg;
  body._hurtT = 0.15;
  if (body.kind === 'block') body._crackLevel = Math.max(body._crackLevel || 0, body.hp / body.maxHp < 0.66 ? 1 : 0);
  if (!silent) {
    G.score += Math.round(dmg);
    if (dmg > 40) addFloater(x, y, '+' + Math.round(dmg / 10) * 10, '#fff', 15);
    if (body.kind === 'pig') Sfx.play('pigHit', dmg / 200);
  }
  if (body.hp <= 0) destroy(body);
}

function destroy(body) {
  if (body.dead) return;
  body.dead = true;
  G.world.wakeArea(body.pos.x, body.pos.y, 150);
  const x = body.pos.x, y = body.pos.y;

  if (body.kind === 'pig') {
    const pts = body.helmet ? PIG.helmetPoints : PIG.points;
    G.score += pts; G.destroyedValue += pts;
    addFloater(x, y - 20, '+' + pts, '#ffd83d', 24);
    Sfx.play('pigPop');
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(80, 320);
      G.particles.push({ type: 'circle', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: rand(0.4, 0.8), max: 0.8, size: rand(3, 7), color: i % 2 ? '#7ec850' : '#a5e06f', grav: 700 });
    }
    G.particles.push({ type: 'pop', x, y, life: 0.3, max: 0.3, size: body.r });
    const i = G.pigs.indexOf(body); if (i >= 0) G.pigs.splice(i, 1);
  } else if (body.kind === 'tnt') {
    G.score += TNT.points; G.destroyedValue += TNT.points;
    addFloater(x, y - 20, '+' + TNT.points, '#ff8f6b', 20);
    const i = G.tnts.indexOf(body); if (i >= 0) G.tnts.splice(i, 1);
    G.world.remove(body);
    explode(x, y, EXPLODE.tnt, 'tnt');
    return;
  } else {
    const pts = MAT[body.material].points;
    G.score += pts; G.destroyedValue += pts;
    addFloater(x, y - 14, '+' + pts, '#fff', 16);
    const snd = { wood: 'woodBreak', stone: 'stoneBreak', ice: 'iceBreak' }[body.material];
    if (snd) Sfx.play(snd);
    const colors = { wood: ['#b97f3e', '#8a5a2b', '#d29a55'], stone: ['#a8adb4', '#7c838a', '#c8cdd2'], ice: ['#bfe6f7', '#8fd0ee', '#e8f7ff'] }[body.material];
    const n = clamp(Math.round(body.area / 900), 5, 14);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(60, 300);
      G.particles.push({ type: 'rect', x: x + rand(-body.hw, body.hw) * 0.6, y: y + rand(-body.hh, body.hh) * 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: rand(0.5, 1.1), max: 1.1, size: rand(4, 9), color: colors[i % 3], grav: 900, rot: rand(0, 6.3), vr: rand(-8, 8) });
    }
    const i = G.blocks.indexOf(body); if (i >= 0) G.blocks.splice(i, 1);
  }
  G.world.remove(body);
}

function processEvents() {
  for (const e of G.world.drainEvents()) {
    if (e.relSpeed < DMG.minSpeed) continue;
    // 撞击反馈
    const intensity = e.imp / 2600;
    if (e.imp > 380) {
      const mats = [e.a.material, e.b.material];
      const sndPair = mats.includes('stone') ? 'stoneHit' : mats.includes('ice') ? 'iceHit' : 'woodHit';
      if (e.a.kind !== 'ground' && e.b.kind !== 'ground') Sfx.play(sndPair, intensity);
      else Sfx.play(sndPair, intensity * 0.6);
      if (e.imp > 900) {
        for (let i = 0; i < 4; i++) G.particles.push({ type: 'circle', x: e.x, y: e.y, vx: rand(-90, 90), vy: rand(-120, 20), life: 0.4, max: 0.4, size: rand(2, 4), color: '#d9c9a8', grav: 800 });
      }
    }
    // 鸟撞击羽毛
    for (const t of [e.a, e.b]) if (t.kind === 'bird' && e.imp > 700 && t.fade >= 1) {
      for (let i = 0; i < 5; i++) G.particles.push({ type: 'feather', x: e.x, y: e.y, vx: rand(-70, 70), vy: rand(-100, 10), life: 0.9, max: 0.9, size: rand(3, 6), color: '#fff', rot: rand(0, 6.3), vr: rand(-4, 4), grav: 150 });
    }
    // 伤害
    for (const [t, other] of [[e.a, e.b], [e.b, e.a]]) {
      if (t.dead || t.kind === 'ground' || t.kind === 'bird') continue;
      if (t.hp === Infinity) continue;
      let atk = other.kind === 'bird' ? other.material : other.kind === 'egg' ? 'egg' : other.kind === 'pig' ? 'pig' : other.kind === 'tnt' ? 'explosion' : 'block';
      let mult = (MATCHUP[atk] && MATCHUP[atk][t.material]) || 1;
      if (t.kind === 'pig') mult *= DMG.pigVuln;
      const dmg = (e.imp - DMG.threshold) * DMG.k * mult;
      if (dmg > 4) damage(t, dmg, e.x, e.y);
    }
    // 炸弹鸟撞到东西 → 点火
    for (const t of [e.a, e.b]) {
      if (t.kind === 'bird' && t.birdType === 'bomb' && e.imp > 300 && t.fuse < 0) {
        t.fuse = 0.5;
        Sfx.play('iceHit', 0.5);
      }
    }
    // 蛋落地即炸
    for (const t of [e.a, e.b]) {
      if (t.kind === 'egg' && !t.dead && e.imp > 60) {
        t.dead = true; G.world.remove(t); G.egg = null;
        explode(t.pos.x, t.pos.y, EXPLODE.egg, 'egg');
      }
    }
  }
}

// ================= 漂浮文字与粒子 =================
function addFloater(x, y, text, color, size) {
  G.floaters.push({ x, y, text, color, size, t: 0, life: 1.1 });
}
function updateFx(dt) {
  for (let i = G.floaters.length - 1; i >= 0; i--) {
    const f = G.floaters[i];
    f.t += dt; f.y -= 45 * dt;
    if (f.t > f.life) G.floaters.splice(i, 1);
  }
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    if (p.life <= 0) { G.particles.splice(i, 1); continue; }
    if (p.type !== 'flash' && p.type !== 'pop') {
      p.vy += (p.grav || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.rot != null) p.rot += (p.vr || 0) * dt;
      if (p.type === 'smoke') p.size += 26 * dt;
    }
  }
}

// ================= 主更新 =================
function update(dt) {
  G.phaseT += dt;
  processEvents();

  // 鸟的状态
  for (let i = G.activeBirds.length - 1; i >= 0; i--) {
    const b = G.activeBirds[i];
    b.age += dt;
    if (b.fuse > 0) {
      b.fuse -= dt;
      if (b.fuse <= 0) {
        const x = b.pos.x, y = b.pos.y;
        G.world.remove(b); G.activeBirds.splice(i, 1);
        explode(x, y, EXPLODE.bomb, 'bomb');
        continue;
      }
    }
    if (b.launched && b.speed() < 55) b.slowT += dt; else b.slowT = 0;
    const out = b.pos.x < -150 || b.pos.x > G.levelDef.width + 250 || b.pos.y > GY + 420;
    if ((b.launched && (b.slowT > 0.9 || b.age > 8)) || out) {
      if (!out) {
        Sfx.play('poof');
        for (let k = 0; k < 8; k++) G.particles.push({ type: 'smoke', x: b.pos.x + rand(-8, 8), y: b.pos.y + rand(-8, 8), vx: rand(-30, 30), vy: rand(-50, -10), life: 0.5, max: 0.5, size: rand(6, 12), color: '#fff', grav: -40 });
      }
      G.world.remove(b);
      G.activeBirds.splice(i, 1);
    } else if (b.launched && b.speed() > 260 && Math.random() < 0.5) {
      G.particles.push({ type: 'trail', x: b.pos.x, y: b.pos.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: b.r * 0.55, color: '#ffffff', grav: 0 });
    }
  }

  // 蛋出界
  if (G.egg && (G.egg.pos.y > GY + 420 || G.egg.pos.x < -100)) { G.world.remove(G.egg); G.egg = null; }

  // 出界清理 & 猪落出世界=消灭
  for (const b of [...G.blocks]) if (b.pos.y > GY + 500) { b.dead = true; G.world.remove(b); const i = G.blocks.indexOf(b); if (i >= 0) G.blocks.splice(i, 1); }
  for (const b of [...G.tnts]) if (b.pos.y > GY + 500) { G.world.remove(b); const i = G.tnts.indexOf(b); if (i >= 0) G.tnts.splice(i, 1); }
  for (const b of [...G.pigs]) if (b.pos.y > GY + 500) destroy(b);

  // 相机
  if (!cam.manual) {
    if (G.phase === 'fly' && G.activeBirds.length) {
      let bx = 0, by = 0, n = 0, lead = G.activeBirds[0];
      for (const b of G.activeBirds) { bx += b.pos.x; by += b.pos.y; n++; if (b.speed() > lead.speed()) lead = b; }
      cam.tx = lerp(cam.tx, lead.pos.x + 230, 0.12);
      cam.ty = lerp(cam.ty, Math.min(lead.pos.y, 760) + 60, 0.12);
      cam.tscale = baseScale * 0.92;
    }
  }
  camUpdate(dt);

  // 拉弓看门狗：拖拽指针意外消失（pointerup 丢失 / 切走窗口）→ 按当前拉伸自动松手
  if (G.phase === 'drag' && G.drag && !G.drag.pan && G.drag.id != null && !G.pointers.has(G.drag.id)) {
    releaseDrag();
  }

  // 拉弓中的鸟跟随指针；瞄准时钉在皮兜上
  if (G.phase === 'drag' && G.drag && !G.drag.pan) {
    applyDragToBird();
  } else if (G.phase === 'aim' && G.activeBirds[0]) {
    const b = G.activeBirds[0];
    b.pos.x = POUCH.x; b.pos.y = POUCH.y - BIRDS[b.birdType].r - 2;
    b.angle = 0;
    b.vel.x = 0; b.vel.y = 0; b.angVel = 0;
  }

  // 阶段推进
  if (G.phase === 'intro') {
    if (G.phaseT > 2.1) { G.phase = 'aim'; loadNextBird(); }
  } else if (G.phase === 'fly') {
    if (G.activeBirds.length === 0) { G.phase = 'settle'; G.settleT = 0; }
  } else if (G.phase === 'settle') {
    G.settleT += dt;
    let calm = G.settleT > 0.7;
    for (const b of G.world.bodies) if (!b.static && !b.sleeping && b.speed() > 45) { calm = false; break; }
    if ((calm && G.settleT > 1.2) || G.settleT > 3.2) {
      if (G.pigs.length > 0 && G.deck.length > 0) loadNextBird();
      else if (G.pigs.length > 0) { G.phase = 'over'; endLevel(false); }
      // 猪全灭由下方 winT 处理
    }
  }

  // 胜利判定
  if (G.winT < 0 && G.pigs.length === 0 && G.phase !== 'over' && G.scene === 'play') {
    G.winT = 1.3; // 延迟庆祝，让残骸飞完
  }
  if (G.winT > 0) {
    G.winT -= dt;
    if (G.winT <= 0 && G.phase !== 'over') { G.phase = 'over'; endLevel(true); }
  }
  // 失败判定（settle 已无法出鸟）
  if (G.loseT > 0) {
    G.loseT -= dt;
    if (G.loseT <= 0 && G.phase !== 'over') { G.phase = 'over'; endLevel(false); }
  }

  updateFx(dt);
  updateHud();
}

// ================= 结算 =================
function destructionPct() {
  const remaining = G.deck.length * BIRD_VALUE + (G.phase === 'aim' || G.phase === 'drag' ? BIRD_VALUE : 0);
  return clamp((G.destroyedValue + remaining) / (G.totalValue + G.levelDef.birds.length * BIRD_VALUE) * 100, 0, 100);
}
function endLevel(win) {
  const pct = destructionPct();
  let stars = win ? 1 : 0;
  if (win && pct >= STAR2) stars = 2;
  if (win && pct >= STAR3) stars = 3;
  if (win) {
    Progress.record(G.levelIdx, stars, G.score);
    showWin(stars, pct);
    Sfx.play('win');
  } else {
    showLose();
    Sfx.play('lose');
  }
}

// ================= 渲染 =================
function worldToScreen(x, y, f = 1) {
  return {
    x: (x - cam.x * f) * cam.scale + cw / 2,
    y: (y - cam.y * f) * cam.scale + ch / 2,
  };
}
function applyCam(f = 1) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (cam.shake > 0) {
    ctx.translate(rand(-1, 1) * cam.shake * 9, rand(-1, 1) * cam.shake * 9);
  }
  ctx.translate(cw / 2, ch / 2);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.x * f, -cam.y * f);
}

let deco = null;
function buildDeco() {
  const rnd = seededRandom(G.decoSeed);
  const W = G.levelDef ? G.levelDef.width : 2600;
  deco = { clouds: [], tufts: [], flowers: [], hills: [] };
  for (let i = 0; i < 10; i++) deco.clouds.push({ x: rnd() * (W + 900) - 300, y: 90 + rnd() * 330, s: 0.7 + rnd() * 1.1, l: rnd() < 0.5 ? 0 : 1 });
  for (let x = 40; x < W + 200; x += 55 + rnd() * 90) deco.tufts.push({ x, h: 8 + rnd() * 12, lean: rnd() * 0.8 - 0.4 });
  for (let x = 100; x < W + 100; x += 170 + rnd() * 260) deco.flowers.push({ x, c: ['#ff8fb3', '#ffd83d', '#ff9c6b', '#c0a8ff'][Math.floor(rnd() * 4)] });
  for (let x = -300; x < W + 500; x += 260 + rnd() * 300) deco.hills.push({ x, r: 150 + rnd() * 220 });
}

function drawSky() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, ch);
  g.addColorStop(0, '#5db9ea'); g.addColorStop(0.55, '#9ed7f5'); g.addColorStop(1, '#d8f3fc');
  ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  // 太阳
  const s = worldToScreen(-160 * 0.1 - 60, 60);
  ctx.save();
  const grad = ctx.createRadialGradient(cw * 0.82, ch * 0.16, 10, cw * 0.82, ch * 0.16, ch * 0.3);
  grad.addColorStop(0, 'rgba(255,244,180,0.95)'); grad.addColorStop(1, 'rgba(255,244,180,0)');
  ctx.fillStyle = grad; ctx.fillRect(cw * 0.5, 0, cw * 0.5, ch * 0.5);
  ctx.fillStyle = '#fff6c9';
  ctx.beginPath(); ctx.arc(cw * 0.82, ch * 0.16, ch * 0.055, 0, 7); ctx.fill();
  ctx.restore();
}

function drawCloud(x, y, s, alpha) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, 7); ctx.arc(30, -12, 22, 0, 7); ctx.arc(58, 0, 24, 0, 7); ctx.arc(30, 10, 22, 0, 7);
  ctx.fill();
  ctx.restore();
}

function drawBackground() {
  drawSky();
  const t = performance.now() / 1000;
  // 云（两层视差）
  for (const c of deco.clouds) {
    const f = c.l ? 0.35 : 0.18;
    const p = worldToScreen(c.x + t * (c.l ? 7 : 4), c.y, f);
    drawCloud(p.x, p.y, c.s * cam.scale, c.l ? 0.95 : 0.65);
  }
  // 远山
  applyCam(0.45);
  ctx.fillStyle = '#b5dd8f';
  for (const h of deco.hills) { ctx.beginPath(); ctx.arc(h.x, GY + 60, h.r, Math.PI, 0); ctx.fill(); }
  ctx.fillStyle = '#9ed077';
  for (const h of deco.hills) { ctx.beginPath(); ctx.arc(h.x + 140, GY + 130, h.r * 0.8, Math.PI, 0); ctx.fill(); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawGround() {
  const W = G.levelDef.width;
  ctx.fillStyle = '#8bc34a';
  ctx.fillRect(-400, GY, W + 800, 26);
  ctx.fillStyle = '#7cb342';
  ctx.fillRect(-400, GY + 26, W + 800, 14);
  const g = ctx.createLinearGradient(0, GY + 40, 0, GY + 400);
  g.addColorStop(0, '#a5764a'); g.addColorStop(1, '#7c5433');
  ctx.fillStyle = g;
  ctx.fillRect(-400, GY + 40, W + 800, 400);
  // 草丛与小花
  ctx.strokeStyle = '#5b9a36'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (const tf of deco.tufts) {
    ctx.beginPath();
    ctx.moveTo(tf.x, GY + 3);
    ctx.quadraticCurveTo(tf.x + tf.lean * 8, GY - tf.h * 0.6, tf.x + tf.lean * 14, GY - tf.h);
    ctx.stroke();
  }
  for (const fl of deco.flowers) {
    ctx.fillStyle = fl.c;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      ctx.beginPath(); ctx.arc(fl.x + Math.cos(a) * 4.5, GY - 10 + Math.sin(a) * 4.5, 3, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#fff2b0';
    ctx.beginPath(); ctx.arc(fl.x, GY - 10, 2.6, 0, 7); ctx.fill();
  }
}

function drawBlock(b) {
  ctx.save();
  ctx.translate(b.pos.x, b.pos.y);
  ctx.rotate(b.angle);
  const w = b.w, h = b.h, hw = b.hw, hh = b.hh;
  const ratio = b.hp / b.maxHp;

  if (b.kind === 'tnt') {
    ctx.fillStyle = '#d64533';
    ctx.fillRect(-hw, -hh, w, h);
    ctx.strokeStyle = '#8c2418'; ctx.lineWidth = 3;
    ctx.strokeRect(-hw + 1.5, -hh + 1.5, w - 3, h - 3);
    ctx.fillStyle = '#f6c14a';
    ctx.fillRect(-hw + 3, -6, w - 6, 12);
    ctx.fillStyle = '#7a1f14';
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('TNT', 0, 1);
  } else if (b.material === 'wood') {
    const g = ctx.createLinearGradient(-hw, -hh, hw, hh);
    g.addColorStop(0, '#d8a35c'); g.addColorStop(0.5, '#c08a48'); g.addColorStop(1, '#a97438');
    ctx.fillStyle = g;
    ctx.fillRect(-hw, -hh, w, h);
    ctx.strokeStyle = '#82552a'; ctx.lineWidth = 2.5;
    ctx.strokeRect(-hw + 1, -hh + 1, w - 2, h - 2);
    ctx.strokeStyle = 'rgba(110,70,30,0.4)'; ctx.lineWidth = 1.5;
    if (w >= h) { for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-hw + 5, -hh + h * i / 3); ctx.lineTo(hw - 5, -hh + h * i / 3); ctx.stroke(); } }
    else { for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-hw + w * i / 3, -hh + 5); ctx.lineTo(-hw + w * i / 3, hh - 5); ctx.stroke(); } }
  } else if (b.material === 'ice') {
    ctx.globalAlpha = 0.88;
    const g = ctx.createLinearGradient(-hw, -hh, hw, hh);
    g.addColorStop(0, '#d8f2fd'); g.addColorStop(0.5, '#a8dcf5'); g.addColorStop(1, '#c4eafc');
    ctx.fillStyle = g;
    ctx.fillRect(-hw, -hh, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#7fc3e6'; ctx.lineWidth = 2.5;
    ctx.strokeRect(-hw + 1, -hh + 1, w - 2, h - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-hw * 0.5, hh * 0.55); ctx.lineTo(hw * 0.35, -hh * 0.6); ctx.stroke();
  } else { // stone
    const g = ctx.createLinearGradient(0, -hh, 0, hh);
    g.addColorStop(0, '#c2c7cd'); g.addColorStop(0.5, '#aab0b7'); g.addColorStop(1, '#969ca4');
    ctx.fillStyle = g;
    ctx.fillRect(-hw, -hh, w, h);
    ctx.strokeStyle = '#787f87'; ctx.lineWidth = 2.5;
    ctx.strokeRect(-hw + 1, -hh + 1, w - 2, h - 2);
    ctx.strokeStyle = 'rgba(90,96,104,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (w > h) { ctx.moveTo(-hw + 6, 0); ctx.lineTo(hw - 6, 0); ctx.moveTo(-hw + w * 0.38, -hh + 5); ctx.lineTo(-hw + w * 0.38, 0); ctx.moveTo(-hw + w * 0.66, 0); ctx.lineTo(-hw + w * 0.66, hh - 5); }
    else { ctx.moveTo(0, -hh + 6); ctx.lineTo(0, hh - 6); ctx.moveTo(-hw + 5, -hh + h * 0.4); ctx.lineTo(hw - 5, -hh + h * 0.4); ctx.moveTo(-hw + 5, -hh + h * 0.72); ctx.lineTo(hw - 5, -hh + h * 0.72); }
    ctx.stroke();
  }

  // 裂纹
  if (ratio < 0.66) drawCracks(b, hw, hh, ratio < 0.33 ? 2 : 1);
  // 受击闪白
  if (b._hurtT > 0) {
    ctx.globalAlpha = Math.min(b._hurtT * 4, 0.55);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-hw, -hh, w, h);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCracks(b, hw, hh, level) {
  if (!b._cracks) {
    const rnd = seededRandom(b.id * 991);
    b._cracks = [[], []];
    for (let c = 0; c < 2; c++) {
      const pts = [];
      let x = (rnd() - 0.5) * hw, y = (rnd() - 0.5) * hh;
      let a = rnd() * Math.PI * 2;
      for (let i = 0; i < 5; i++) {
        pts.push({ x, y });
        a += (rnd() - 0.5) * 1.6;
        x += Math.cos(a) * (hw + hh) * 0.22;
        y += Math.sin(a) * (hw + hh) * 0.22;
      }
      b._cracks[c] = pts;
    }
  }
  ctx.strokeStyle = 'rgba(40,25,10,0.55)';
  ctx.lineWidth = 1.6;
  for (let c = 0; c < level; c++) {
    ctx.beginPath();
    const pts = b._cracks[c];
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
}

function drawPigBody(c, r, opts = {}) {
  // 以原点为中心画猪（供场景与 UI 复用）
  const hp = opts.hp == null ? 1 : opts.hp;
  const t = opts.t || 0;
  const look = opts.look || { x: 1, y: 0 };
  const hurt = hp < 0.99;
  // 耳朵
  c.fillStyle = '#6db54a';
  c.strokeStyle = '#3c7a26'; c.lineWidth = 2;
  for (const s of [-1, 1]) {
    c.beginPath(); c.arc(s * r * 0.62, -r * 0.78, r * 0.26, 0, 7); c.fill(); c.stroke();
  }
  // 身体
  const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.2, 0, 0, r * 1.15);
  g.addColorStop(0, '#9ada68'); g.addColorStop(0.7, '#6db54a'); g.addColorStop(1, '#559e3a');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.strokeStyle = '#3c7a26'; c.lineWidth = 2.2; c.stroke();
  // 淤伤
  if (hp < 0.66) {
    c.fillStyle = 'rgba(60,110,50,0.5)';
    c.beginPath(); c.arc(-r * 0.45, r * 0.3, r * 0.22, 0, 7); c.fill();
    if (hp < 0.33) { c.beginPath(); c.arc(r * 0.5, -r * 0.1, r * 0.18, 0, 7); c.fill(); }
  }
  // 鼻子
  c.fillStyle = '#8fd45e';
  c.strokeStyle = '#4a8a30'; c.lineWidth = 2;
  c.beginPath(); c.ellipse(0, r * 0.12, r * 0.34, r * 0.26, 0, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#41762a';
  c.beginPath(); c.ellipse(-r * 0.13, r * 0.12, r * 0.06, r * 0.09, 0, 0, 7); c.fill();
  c.beginPath(); c.ellipse(r * 0.13, r * 0.12, r * 0.06, r * 0.09, 0, 0, 7); c.fill();
  // 眼睛（看向 look 方向）
  const blink = hurt ? 0.75 : (Math.sin(t * 1.7 + (opts.seed || 0)) > 0.96 ? 0.15 : 1);
  for (const s of [-1, 1]) {
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(s * r * 0.38, -r * 0.28, r * 0.21, 0, 7); c.fill();
    c.strokeStyle = '#4a8a30'; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = '#1c2b16';
    c.beginPath(); c.arc(s * r * 0.38 + look.x * r * 0.08, -r * 0.28 + look.y * r * 0.08, r * 0.095 * blink + 0.01, 0, 7); c.fill();
    if (hp < 0.66) { // 生气的眉毛
      c.strokeStyle = '#33601f'; c.lineWidth = 2.4; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(s * r * 0.18, -r * 0.52 - s * 0);
      c.lineTo(s * r * 0.56, -r * 0.44);
      c.stroke();
    }
  }
  // 头盔
  if (opts.helmet) {
    c.fillStyle = '#aeb4bd';
    c.strokeStyle = '#787f88'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, -r * 0.1, r * 0.92, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#8d939c';
    c.fillRect(-r * 0.98, -r * 0.32, r * 1.96, r * 0.16);
    c.fillStyle = '#6d747d';
    for (const a of [-0.6, -0.25, 0.25, 0.6]) {
      c.beginPath(); c.arc(Math.cos(Math.PI + a) * r * 0.75, -r * 0.1 + Math.sin(Math.PI + a) * r * 0.75, r * 0.055, 0, 7); c.fill();
    }
  }
}

function drawPig(b) {
  ctx.save();
  ctx.translate(b.pos.x, b.pos.y);
  const look = { x: clamp((POUCH.x - b.pos.x) * 0.01, -1, 1), y: clamp((POUCH.y - 120 - b.pos.y) * 0.005, -1, 1) };
  drawPigBody(ctx, b.r, { hp: b.hp / b.maxHp, helmet: b.helmet, t: performance.now() / 1000, look, seed: b.id });
  if (b._hurtT > 0) {
    ctx.globalAlpha = Math.min(b._hurtT * 4, 0.5);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawBird(c, type, r, opts = {}) {
  // 以原点为中心画鸟，朝向 +x（供场景、卡牌、菜单复用）
  const fuse = opts.fuse;
  c.save();
  if (type === 'red') {
    // 尾羽
    c.strokeStyle = '#26221f'; c.lineWidth = 4; c.lineCap = 'round';
    for (const a of [-0.35, 0, 0.35]) {
      c.beginPath(); c.moveTo(-r * 0.85, 0); c.lineTo(-r * 1.35, a * r); c.stroke();
    }
    const g = c.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r * 1.2);
    g.addColorStop(0, '#f2594a'); g.addColorStop(0.65, '#dc3527'); g.addColorStop(1, '#b02020');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.strokeStyle = '#8c1712'; c.lineWidth = 2; c.stroke();
    // 肚皮
    c.save();
    c.beginPath(); c.arc(0, 0, r - 1, 0, 7); c.clip();
    c.fillStyle = '#f8e7c5';
    c.beginPath(); c.ellipse(r * 0.1, r * 0.62, r * 0.62, r * 0.5, 0, 0, 7); c.fill();
    c.restore();
    // 头冠
    c.fillStyle = '#dc3527'; c.strokeStyle = '#8c1712'; c.lineWidth = 1.6;
    for (const [dx, ang] of [[-r * 0.1, -0.5], [r * 0.15, -0.1]]) {
      c.save(); c.translate(dx, -r * 0.92); c.rotate(ang);
      c.beginPath(); c.ellipse(0, -r * 0.16, r * 0.13, r * 0.26, 0, 0, 7); c.fill(); c.stroke();
      c.restore();
    }
    birdFace(c, r, { beak: '#f7b231', brow: '#5e0e0a' });
  } else if (type === 'chuck') {
    c.strokeStyle = '#26221f'; c.lineWidth = 3.5; c.lineCap = 'round';
    for (const a of [-0.3, 0.1]) { c.beginPath(); c.moveTo(-r * 0.6, 0); c.lineTo(-r * 1.1, a * r); c.stroke(); }
    const g = c.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#ffe066'); g.addColorStop(1, '#f0b400');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(r * 1.25, 0);
    c.quadraticCurveTo(r * 0.5, -r * 1.05, -r * 0.85, -r * 0.8);
    c.quadraticCurveTo(-r * 1.15, 0, -r * 0.85, r * 0.8);
    c.quadraticCurveTo(r * 0.5, r * 1.05, r * 1.25, 0);
    c.closePath(); c.fill();
    c.strokeStyle = '#c28a00'; c.lineWidth = 2; c.stroke();
    // 黑色顶冠
    c.fillStyle = '#2b2620';
    c.beginPath(); c.moveTo(-r * 0.3, -r * 0.82); c.lineTo(-r * 0.05, -r * 1.25); c.lineTo(r * 0.2, -r * 0.8); c.closePath(); c.fill();
    birdFace(c, r, { beak: '#f7b231', brow: '#c22525', eyeAt: r * 0.5 });
  } else if (type === 'blues') {
    const g = c.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r * 1.2);
    g.addColorStop(0, '#7cc4f2'); g.addColorStop(0.65, '#4a9fe0'); g.addColorStop(1, '#2f7fc4');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.strokeStyle = '#1f619c'; c.lineWidth = 2; c.stroke();
    c.save();
    c.beginPath(); c.arc(0, 0, r - 1, 0, 7); c.clip();
    c.fillStyle = '#eaf6ff';
    c.beginPath(); c.ellipse(0, r * 0.65, r * 0.6, r * 0.45, 0, 0, 7); c.fill();
    c.restore();
    c.fillStyle = '#4a9fe0'; c.strokeStyle = '#1f619c'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-r * 0.05, -r * 0.95); c.lineTo(-r * 0.25, -r * 1.4); c.lineTo(r * 0.18, -r * 1.02); c.closePath(); c.fill(); c.stroke();
    birdFace(c, r, { beak: '#f7b231', brow: '#144a7c', eyeAt: r * 0.42 });
  } else if (type === 'bomb') {
    // 引信
    c.strokeStyle = '#3a3f46'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -r * 0.9); c.quadraticCurveTo(r * 0.15, -r * 1.35, r * 0.4, -r * 1.3); c.stroke();
    if (fuse != null && fuse >= 0) {
      const fl = 4 + Math.random() * 5;
      c.fillStyle = '#ffb347';
      c.beginPath(); c.arc(r * 0.42, -r * 1.3, fl, 0, 7); c.fill();
      c.fillStyle = '#fff3b0';
      c.beginPath(); c.arc(r * 0.42, -r * 1.3, fl * 0.5, 0, 7); c.fill();
    }
    const g = c.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r * 1.25);
    g.addColorStop(0, '#565c66'); g.addColorStop(0.6, '#33383f'); g.addColorStop(1, '#1a1d22');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.strokeStyle = '#101215'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#8d949c';
    c.beginPath(); c.ellipse(0, r * 0.6, r * 0.55, r * 0.4, 0, 0, 7); c.fill();
    birdFace(c, r, { beak: '#f7b231', brow: '#0c0e11', eyeAt: r * 0.4, eyeR: 1.15 });
  } else { // matilda
    c.strokeStyle = '#26221f'; c.lineWidth = 3.5; c.lineCap = 'round';
    for (const a of [-0.3, 0.15]) { c.beginPath(); c.moveTo(-r * 0.8, r * 0.1); c.lineTo(-r * 1.25, r * 0.1 + a * r); c.stroke(); }
    const g = c.createRadialGradient(-r * 0.25, -r * 0.4, r * 0.2, 0, 0, r * 1.3);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.75, '#f2f0e6'); g.addColorStop(1, '#d8d4c4');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(0, 0, r * 0.95, r * 1.08, 0, 0, 7); c.fill();
    c.strokeStyle = '#b8b2a0'; c.lineWidth = 2; c.stroke();
    // 红色顶饰
    c.fillStyle = '#dc3527';
    for (const [dx, dy] of [[-r * 0.18, -r * 0.95], [r * 0.08, -r * 1.05], [r * 0.3, -r * 0.9]]) {
      c.beginPath(); c.arc(dx, dy, r * 0.12, 0, 7); c.fill();
    }
    // 腮红
    c.fillStyle = 'rgba(245,150,130,0.55)';
    c.beginPath(); c.arc(-r * 0.34, r * 0.18, r * 0.16, 0, 7); c.fill();
    c.beginPath(); c.arc(r * 0.42, r * 0.18, r * 0.16, 0, 7); c.fill();
    birdFace(c, r, { beak: '#f08030', brow: '#8a8577', eyeAt: r * 0.42 });
  }
  c.restore();
}

function birdFace(c, r, o = {}) {
  const ex = o.eyeAt == null ? r * 0.4 : o.eyeAt;
  const er = (o.eyeR || 1) * r * 0.22;
  // 眼白
  for (const s of [-1, 0.55]) {
    c.fillStyle = '#fff';
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(ex + s * er * 0.85, -r * 0.18, er, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#151210';
    c.beginPath(); c.arc(ex + s * er * 0.85 + er * 0.3, -r * 0.18, er * 0.42, 0, 7); c.fill();
  }
  // 粗眉毛（怒）
  c.strokeStyle = o.brow; c.lineWidth = r * 0.16; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(ex - er * 1.7, -r * 0.5);
  c.lineTo(ex + er * 0.1, -r * 0.36);
  c.moveTo(ex + er * 0.6, -r * 0.38);
  c.lineTo(ex + er * 2.2, -r * 0.52);
  c.stroke();
  // 喙
  c.fillStyle = o.beak;
  c.strokeStyle = 'rgba(120,70,0,0.7)'; c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(ex + r * 0.18, -r * 0.02);
  c.lineTo(ex + r * 0.85, r * 0.1);
  c.lineTo(ex + r * 0.15, r * 0.3);
  c.closePath(); c.fill(); c.stroke();
  c.beginPath();
  c.moveTo(ex + r * 0.18, r * 0.26);
  c.lineTo(ex + r * 0.6, r * 0.24);
  c.lineTo(ex + r * 0.16, r * 0.42);
  c.closePath(); c.fill(); c.stroke();
}

function drawSling(front) {
  ctx.lineCap = 'round';
  if (!front) {
    // 后支柱与后皮筋
    ctx.strokeStyle = '#6d4423'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(SLING.x - 2, GY + 4); ctx.lineTo(SLING.x - 4, GY - 96); ctx.stroke();
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(SLING.x - 4, GY - 92); ctx.quadraticCurveTo(SLING.x - 20, GY - 130, SLING.x - 22, GY - 148); ctx.stroke();
    const b = G.activeBirds[0];
    if (b && (G.phase === 'aim' || G.phase === 'drag')) {
      ctx.strokeStyle = '#4a241d'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(SLING.x - 22, GY - 148); ctx.lineTo(b.pos.x, b.pos.y); ctx.stroke();
    }
  } else {
    // 前支柱与前皮筋
    const b = G.activeBirds[0];
    if (b && (G.phase === 'aim' || G.phase === 'drag')) {
      ctx.strokeStyle = '#5d2f26'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(SLING.x + 18, GY - 142); ctx.lineTo(b.pos.x, b.pos.y); ctx.stroke();
      // 皮兜
      const s = stretchVec();
      const a = Math.atan2(s.y, s.x);
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y); ctx.rotate(a);
      ctx.fillStyle = '#3a1d17';
      ctx.fillRect(-5, -b.r - 5, 10, b.r * 2 + 10);
      ctx.restore();
    }
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(SLING.x + 2, GY + 4); ctx.lineTo(SLING.x + 4, GY - 92); ctx.stroke();
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(SLING.x + 4, GY - 92); ctx.quadraticCurveTo(SLING.x + 20, GY - 128, SLING.x + 18, GY - 142); ctx.stroke();
    // 木纹高光
    ctx.strokeStyle = 'rgba(255,220,160,0.25)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(SLING.x - 4, GY); ctx.lineTo(SLING.x - 6, GY - 88); ctx.stroke();
  }
}

function drawTrajectory() {
  const v = launchVel();
  if (hyp(v.x, v.y) < 100) return;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 1; i <= 17; i++) {
    const t = i * 0.055;
    const x = POUCH.x + v.x * t;
    const y = POUCH.y + v.y * t + 0.5 * 1500 * t * t;
    if (y > GY - 4) break;
    ctx.globalAlpha = 0.75 * (1 - i / 19);
    ctx.beginPath(); ctx.arc(x, y, 4.2 - i * 0.13, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawParticles() {
  for (const p of G.particles) {
    const k = p.life / p.max;
    if (p.type === 'flash') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (1.6 - k * 0.6));
      g.addColorStop(0, `rgba(255,240,190,${0.85 * k})`);
      g.addColorStop(0.5, `rgba(255,160,60,${0.5 * k})`);
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, 7); ctx.fill();
    } else if (p.type === 'pop') {
      ctx.strokeStyle = `rgba(126,200,80,${k})`;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2.4 - k * 1.4), 0, 7); ctx.stroke();
    } else if (p.type === 'smoke') {
      ctx.globalAlpha = k * 0.55;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.type === 'trail') {
      ctx.globalAlpha = k * 0.45;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.type === 'streak') {
      ctx.globalAlpha = k * 0.8;
      ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.type === 'feather') {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, 7); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    } else if (p.type === 'rect') {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(k * 1.6, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = Math.min(k * 1.6, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawFloaters() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of G.floaters) {
    const k = 1 - f.t / f.life;
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.font = `bold ${f.size}px system-ui, sans-serif`;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3.5;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function render() {
  if (G.scene === 'menu') { renderMenu(); return; }
  drawBackground();
  applyCam(1);
  drawGround();
  drawSling(false);
  for (const b of G.blocks) drawBlock(b);
  for (const b of G.tnts) drawBlock(b);
  for (const p of G.pigs) drawPig(p);
  // 蛋
  if (G.egg) {
    ctx.save();
    ctx.translate(G.egg.pos.x, G.egg.pos.y); ctx.rotate(G.egg.angle);
    ctx.fillStyle = '#fdfdf8';
    ctx.strokeStyle = '#c9c4b2'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 9.5, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // 鸟
  for (const b of G.activeBirds) {
    ctx.save();
    ctx.translate(b.pos.x, b.pos.y);
    ctx.rotate(b.angle || 0);
    drawBird(ctx, b.birdType, b.r, { fuse: b.fuse });
    ctx.restore();
  }
  drawSling(true);
  if (G.phase === 'drag') drawTrajectory();
  // 首次操作提示
  if (G.shotsFired === 0 && (G.phase === 'aim' || G.phase === 'drag')) {
    const bob = Math.sin(performance.now() / 300) * 6;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(30,20,5,0.55)'; ctx.lineJoin = 'round';
    ctx.strokeText('按住小鸟向后拉，松手发射！', SLING.x + 40, POUCH.y - 150 + bob);
    ctx.fillStyle = '#fff';
    ctx.fillText('按住小鸟向后拉，松手发射！', SLING.x + 40, POUCH.y - 150 + bob);
  }
  drawParticles();
  drawFloaters();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ================= 菜单场景 =================
const menuBirds = [
  { type: 'red', x: -100, y: 0.3, s: 1, v: 90 },
  { type: 'chuck', x: -400, y: 0.55, s: 0.8, v: 130 },
  { type: 'blues', x: -700, y: 0.42, s: 0.7, v: 110 },
  { type: 'bomb', x: -1000, y: 0.62, s: 0.9, v: 80 },
];
function renderMenu() {
  drawSky();
  const t = performance.now() / 1000;
  // 地面
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const gy = ch * 0.78;
  ctx.fillStyle = '#8bc34a'; ctx.fillRect(0, gy, cw, ch - gy);
  ctx.fillStyle = '#7cb342'; ctx.fillRect(0, gy, cw, 10);
  // 山
  ctx.fillStyle = '#b5dd8f';
  ctx.beginPath(); ctx.arc(cw * 0.18, gy + 40, ch * 0.28, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.arc(cw * 0.75, gy + 60, ch * 0.34, Math.PI, 0); ctx.fill();
  // 云
  drawCloud(((t * 18) % (cw + 300)) - 150, ch * 0.14, 1.4, 0.9);
  drawCloud(((t * 12 + 500) % (cw + 300)) - 150, ch * 0.3, 1, 0.7);
  // 飞行的鸟
  for (const mb of menuBirds) {
    const x = ((t * mb.v + mb.x) % (cw + 500)) - 250;
    const y = ch * mb.y + Math.sin(t * 2 + mb.x) * 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(mb.s, mb.s);
    drawBird(ctx, mb.type, 26, {});
    ctx.restore();
  }
  // 弹弓上的大红 + 坐在地上的猪（分列面板两侧）
  ctx.save();
  ctx.translate(cw * 0.09, gy - 150);
  ctx.scale(2.6, 2.6);
  drawBird(ctx, 'red', 26, {});
  ctx.restore();
  ctx.save();
  ctx.translate(cw * 0.91, gy - 40);
  ctx.scale(2.2, 2.2);
  drawPigBody(ctx, 26, { hp: 1, t, look: { x: -1, y: 0 }, seed: 7 });
  ctx.restore();
  ctx.save();
  ctx.translate(cw * 0.82, gy - 108);
  ctx.scale(1.7, 1.7);
  drawBird(ctx, 'chuck', 24, {});
  ctx.restore();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ================= HUD =================
const scoreEl = document.getElementById('score');
const destrFill = document.getElementById('destr-fill');
const pigsEl = document.getElementById('pigs-left');
const banner = document.getElementById('banner');
function updateHud() {
  if (G.scene !== 'play') return;
  scoreEl.textContent = G.score.toLocaleString();
  const pct = G.phase === 'over' ? destructionPct() : destructionPct();
  destrFill.style.width = pct + '%';
  destrFill.classList.toggle('full', pct >= STAR2);
  pigsEl.textContent = '🐷 × ' + G.pigs.length;
}

// ================= 输入 =================
function screenToWorld(sx, sy) {
  return { x: (sx - cw / 2) / cam.scale + cam.x, y: (sy - ch / 2) / cam.scale + cam.y };
}

// 把鸟贴到当前拖拽位置（指针事件里立即调用，不等下一帧，避免丢帧时位置不同步）
function applyDragToBird() {
  const b = G.activeBirds[0];
  if (!b) return;
  let dx = G.drag.x - POUCH.x, dy = G.drag.y - POUCH.y;
  const l = hyp(dx, dy);
  if (l > MAX_STRETCH) { dx = dx / l * MAX_STRETCH; dy = dy / l * MAX_STRETCH; }
  b.pos.x = POUCH.x + dx; b.pos.y = POUCH.y + dy;
  b.angle = Math.atan2(-dy, -dx);
  b.vel.x = 0; b.vel.y = 0; b.angVel = 0;
}

// 松手：拉力足够就发射，否则弹回皮兜
function releaseDrag() {
  if (!G.drag) return;
  if (G.drag.pan) { G.drag = null; return; }
  const v = launchVel();
  if (hyp(v.x, v.y) > 220) {
    launch();
  } else {
    const b = G.activeBirds[0];
    if (b) { b.pos.x = POUCH.x; b.pos.y = POUCH.y - BIRDS[b.birdType].r - 2; b.angle = 0; b.vel.x = 0; b.vel.y = 0; }
    G.phase = 'aim';
  }
  G.drag = null;
}

canvas.addEventListener('pointerdown', (e) => {
  Sfx.ensure();
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  if (G.scene !== 'play' || G.paused) return;
  G.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (G.pointers.size > 1) return; // 双指缩放不触发其它逻辑

  const w = screenToWorld(e.clientX, e.clientY);
  if (G.phase === 'intro') { G.phase = 'aim'; loadNextBird(); return; }
  if (G.phase === 'aim') {
    const b = G.activeBirds[0];
    const d = hyp(w.x - POUCH.x, w.y - POUCH.y);
    // 抓取半径按屏幕像素计算，缩放后依旧好抓
    const grabR = Math.max(175, 190 / cam.scale);
    if (b && d < grabR) {
      G.phase = 'drag';
      G.drag = { id: e.pointerId, x: w.x, y: w.y };
      applyDragToBird();
      return;
    }
  }
  if (G.phase === 'fly') {
    if (!G.abilityUsed) { tryAbility(); if (G.abilityUsed) return; }
  }
  // 开始平移相机
  G.drag = { pan: true, id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: cam.tx, cy: cam.ty };
  cam.manual = true;
});

window.addEventListener('pointermove', (e) => {
  const prev = G.pointers.get(e.pointerId);
  if (!prev) return;
  const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
  G.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (G.pointers.size === 2) { // 双指捏合缩放
    const pts = [...G.pointers.values()];
    const d = hyp(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (G._pinchD) {
      cam.manual = true;
      cam.scale = cam.tscale = clamp(cam.scale * (d / G._pinchD), baseScale * 0.55, baseScale * 2.6);
    }
    G._pinchD = d;
    return;
  }
  if (G.phase === 'drag' && G.drag && !G.drag.pan && e.pointerId === G.drag.id) {
    G.drag.x = screenToWorld(e.clientX, e.clientY).x;
    G.drag.y = screenToWorld(e.clientX, e.clientY).y;
    applyDragToBird();
    const s = stretchVec();
    if (hyp(s.x, s.y) > 8) Sfx.play('stretch', Math.min(s.len / MAX_STRETCH, 1));
  } else if (G.drag && G.drag.pan && e.pointerId === G.drag.id) {
    cam.x -= dx / cam.scale;
    cam.y -= dy / cam.scale;
    cam.tx = cam.x; cam.ty = cam.y;
    camClamp();
  }
});

function pointerUp(e) {
  const wasDrag = G.phase === 'drag' && G.drag && !G.drag.pan && G.drag.id === e.pointerId;
  G.pointers.delete(e.pointerId);
  if (G.pointers.size < 2) G._pinchD = null;
  if (wasDrag) releaseDrag();
  else if (G.drag && G.drag.pan && G.drag.id === e.pointerId) G.drag = null;
}
// 绑在 window 上：指针捕获失效或移出画布松手也能收到
window.addEventListener('pointerup', pointerUp);
window.addEventListener('pointercancel', pointerUp);
window.addEventListener('blur', () => { if (G.phase === 'drag') releaseDrag(); });

canvas.addEventListener('wheel', (e) => {
  if (G.scene !== 'play') return;
  e.preventDefault();
  cam.manual = true;
  cam.scale = cam.tscale = clamp(cam.scale * Math.exp(-e.deltaY * 0.0012), baseScale * 0.55, baseScale * 2.6);
  camClamp();
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (G.scene !== 'play') return;
  if (e.key === 'r' || e.key === 'R') restartLevel();
  else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') togglePause();
  else if (e.key === 'm' || e.key === 'M') { Sfx.ensure(); Sfx.setMuted(!Sfx.muted); syncMuteBtn(); }
});

// ================= 界面流转 =================
const scrMenu = document.getElementById('screen-menu');
const scrLevels = document.getElementById('screen-levels');
const ovWin = document.getElementById('overlay-win');
const ovLose = document.getElementById('overlay-lose');
const ovPause = document.getElementById('overlay-pause');

function showScreen(el) {
  for (const s of [scrMenu, scrLevels, ovWin, ovLose, ovPause]) s.classList.add('hidden');
  if (el) el.classList.remove('hidden');
  if (el === scrMenu || el === scrLevels) hud.style.display = 'none';
}

function showMenu() {
  G.scene = 'menu';
  showScreen(scrMenu);
  hud.style.display = 'none';
}

function showLevels() {
  G.scene = 'levels';
  const grid = document.getElementById('level-grid');
  grid.innerHTML = '';
  levels.forEach((lv, i) => {
    const stars = Progress.data.stars[i] || 0;
    const locked = i + 1 > Progress.data.unlocked;
    const el = document.createElement('button');
    el.className = 'level-btn' + (locked ? ' locked' : '');
    el.innerHTML = locked
      ? `<div class="lv-num">🔒</div>`
      : `<div class="lv-num">${i + 1}</div><div class="lv-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><div class="lv-name">${lv.name}</div>`;
    if (!locked) el.addEventListener('click', () => { Sfx.ensure(); Sfx.play('click'); loadLevel(i); });
    grid.appendChild(el);
  });
  showScreen(scrLevels);
}

function showWin(stars, pct) {
  const el = document.getElementById('win-stars');
  el.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.textContent = i < stars ? '★' : '☆';
    s.className = 'star' + (i < stars ? ' on' : '');
    s.style.animationDelay = (0.25 + i * 0.3) + 's';
    el.appendChild(s);
    if (i < stars) setTimeout(() => Sfx.play('star', i), 300 + i * 300);
  }
  document.getElementById('win-score').textContent = G.score.toLocaleString();
  document.getElementById('win-pct').textContent = `摧毁率 ${Math.round(pct)}%`;
  document.getElementById('btn-next').style.display = G.levelIdx + 1 < levels.length ? '' : 'none';
  showScreen(ovWin);
}
function showLose() {
  document.getElementById('lose-text').textContent =
    G.deck.length === 0 ? '鸟卡用完了，小猪还在得意！' : '小猪还没被消灭！';
  showScreen(ovLose);
}
function togglePause() {
  if (G.scene !== 'play') return;
  G.paused = !G.paused;
  if (G.paused) showScreen(ovPause);
  else showScreen(null);
}
function restartLevel() { loadLevel(G.levelIdx); }

function syncMuteBtn() {
  document.getElementById('btn-mute').textContent = Sfx.muted ? '🔇' : '🔊';
}

// 按钮绑定
document.getElementById('btn-play').addEventListener('click', () => { Sfx.ensure(); Sfx.play('click'); showLevels(); });
document.getElementById('btn-back-menu').addEventListener('click', () => { Sfx.play('click'); showMenu(); });
document.getElementById('btn-pause').addEventListener('click', () => { Sfx.play('click'); togglePause(); });
document.getElementById('btn-restart').addEventListener('click', () => { Sfx.play('click'); restartLevel(); });
document.getElementById('btn-mute').addEventListener('click', () => { Sfx.ensure(); Sfx.setMuted(!Sfx.muted); syncMuteBtn(); });
document.getElementById('btn-resume').addEventListener('click', () => { Sfx.play('click'); togglePause(); });
document.getElementById('btn-pause-restart').addEventListener('click', () => { Sfx.play('click'); G.paused = false; restartLevel(); });
document.getElementById('btn-pause-levels').addEventListener('click', () => { Sfx.play('click'); G.paused = false; showLevels(); });
document.getElementById('btn-retry').addEventListener('click', () => { Sfx.play('click'); restartLevel(); });
document.getElementById('btn-lose-levels').addEventListener('click', () => { Sfx.play('click'); showLevels(); });
document.getElementById('btn-next').addEventListener('click', () => { Sfx.play('click'); loadLevel(G.levelIdx + 1); });
document.getElementById('btn-win-retry').addEventListener('click', () => { Sfx.play('click'); restartLevel(); });
document.getElementById('btn-win-levels').addEventListener('click', () => { Sfx.play('click'); showLevels(); });

// ================= 主循环 =================
let lastT = 0;
function stepOnce(dt) {
  if (G.scene === 'play' && !G.paused && G.phase !== 'over') {
    G.world.update(dt);
    update(dt);
  } else if (G.scene === 'play' && G.phase === 'over') {
    // 结算后世界继续演完残余动画
    G.world.update(dt);
    processEvents();
    updateFx(dt);
    camUpdate(dt);
  }
  render();
  if (G.scene === 'play') {
    // 受击闪烁计时
    for (const b of [...G.blocks, ...G.pigs]) if (b._hurtT > 0) b._hurtT -= dt;
  }
}
function frame(t) {
  requestAnimationFrame(frame);
  lastRafAt = performance.now();
  stepOnce(Math.min((t - lastT) / 1000 || 0.016, 0.05));
  lastT = t;
}
buildDeco();
showMenu();
syncMuteBtn();
requestAnimationFrame(frame);

// 兜底循环：部分内嵌浏览器会把 rAF 完全挂起（页面 visible 也不给帧），
// 此时用定时器追帧驱动游戏保证可玩；rAF 正常时本循环自动空转
let lastRafAt = performance.now(), lastFallbackAt = 0;
setInterval(() => {
  const now = performance.now();
  if (now - lastRafAt < 350) return;
  let elapsed = Math.min(now - (lastFallbackAt || now), 2000);
  lastFallbackAt = now;
  while (elapsed > 0) {
    stepOnce(Math.min(elapsed, 50) / 1000);
    elapsed -= 50;
  }
}, 250);

// 调试句柄（不影响游戏；step 可在标签页被节流时手动驱动帧）
window.__AB2 = {
  v: 5,
  G, cam, loadLevel,
  step(dt = 1 / 60) { G.world.update(dt); update(dt); render(); },
  launch, tryAbility, damage,
  state() {
    return {
      scene: G.scene, phase: G.phase, deck: G.deck.length,
      birds: G.activeBirds.length, pigs: G.pigs.length, blocks: G.blocks.length,
      score: G.score, destroyed: G.destroyedValue, total: G.totalValue,
      cam: { x: Math.round(cam.x), y: Math.round(cam.y) },
    };
  },
};

})();
