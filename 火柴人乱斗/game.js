// ===================== 火柴人乱斗 =====================

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
let W, H, GROUND;
const GRAVITY = 0.55;
const JUMP_FORCE = -11;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  GROUND = H - 60;
}
resize();
window.addEventListener("resize", resize);

// ===================== 火柴人类 =====================
class Stickman {
  constructor(x, color, isPlayer) {
    this.x = x;
    this.y = GROUND;
    this.vx = 0;
    this.vy = 0;
    this.w = 30;
    this.h = 60;
    this.color = color;
    this.isPlayer = isPlayer;
    this.hp = isPlayer ? 100 : 30;
    this.maxHp = this.hp;
    this.dir = 1; // 1右 -1左
    this.grounded = false;
    this.attacking = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.hitTimer = 0;
    this.dead = false;
    this.combo = 0;
    this.speed = isPlayer ? 4 : 1.5;
    this.damage = isPlayer ? 10 : 5;
    this.attackRange = 50;
    // 动画
    this.walkPhase = 0;
    this.flashTimer = 0;
  }

  update() {
    if (this.dead) return;

    // 重力
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    // 地面碰撞
    if (this.y >= GROUND) {
      this.y = GROUND;
      this.vy = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    // 边界
    this.x = Math.max(20, Math.min(W - 20, this.x));

    // 走路动画
    if (Math.abs(this.vx) > 0.5) {
      this.walkPhase += 0.15;
    } else {
      this.walkPhase *= 0.8;
    }

    // 攻击计时
    if (this.attackTimer > 0) {
      this.attackTimer--;
      if (this.attackTimer <= 0) this.attacking = false;
    }
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.hitTimer > 0) this.hitTimer--;
    if (this.flashTimer > 0) this.flashTimer--;
  }

  jump() {
    if (this.grounded && !this.dead) {
      this.vy = JUMP_FORCE;
      this.grounded = false;
    }
  }

  attack() {
    if (this.attackCooldown > 0 || this.dead) return;
    this.attacking = true;
    this.attackTimer = 12;
    this.attackCooldown = 20;
  }

  takeDamage(dmg, fromX) {
    if (this.dead) return;
    this.hp -= dmg;
    this.hitTimer = 10;
    this.flashTimer = 15;
    // 击退
    const knockDir = this.x > fromX ? 1 : -1;
    this.vx = knockDir * 6;
    this.vy = -4;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.vy = -8;
      this.vx = knockDir * 4;
    }
  }

  getAttackBox() {
    // 攻击判定框
    const ax = this.dir === 1 ? this.x + 10 : this.x - this.attackRange - 10;
    return { x: ax, y: this.y - 50, w: this.attackRange, h: 40 };
  }

  // ===================== 绘制火柴人 =====================
  draw(ctx) {
    if (this.dead && this.y > GROUND + 100) return;

    ctx.save();
    const flashOn = this.flashTimer > 0 && Math.floor(this.flashTimer / 3) % 2 === 0;

    const x = this.x;
    const y = this.y;
    const s = 1; // 缩放

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = flashOn ? "#fff" : this.color;
    ctx.fillStyle = flashOn ? "#fff" : this.color;

    if (this.dead) {
      // 死亡：倒地
      ctx.globalAlpha = Math.max(0, 1 - (this.y - GROUND) / 100);
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 2 * this.dir);
      this.drawBody(ctx, 0, 0, s);
      ctx.restore();
      return;
    }

    ctx.translate(x, y);

    // 攻击动作
    if (this.attacking) {
      this.drawAttackPose(ctx, s);
    } else {
      this.drawBody(ctx, 0, 0, s);
    }

    ctx.restore();

    // 血条
    if (!this.dead) {
      const barW = 40;
      const barH = 5;
      const bx = x - barW / 2;
      const by = y - 72;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
      const ratio = this.hp / this.maxHp;
      ctx.fillStyle = ratio > 0.5 ? "#2ecc71" : ratio > 0.25 ? "#f39c12" : "#e74c3c";
      ctx.fillRect(bx, by, barW * ratio, barH);
    }
  }

  drawBody(ctx, ox, oy, s) {
    const walk = Math.sin(this.walkPhase) * 0.35;
    const dir = this.dir;

    // 头
    ctx.beginPath();
    ctx.arc(ox, oy - 52 * s, 8 * s, 0, Math.PI * 2);
    ctx.stroke();

    // 身体
    ctx.beginPath();
    ctx.moveTo(ox, oy - 44 * s);
    ctx.lineTo(ox, oy - 20 * s);
    ctx.stroke();

    // 胳膊
    const armSwing = walk * 20;
    ctx.beginPath();
    ctx.moveTo(ox, oy - 40 * s);
    ctx.lineTo(ox - 16 * s, oy - 28 * s + armSwing);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, oy - 40 * s);
    ctx.lineTo(ox + 16 * s, oy - 28 * s - armSwing);
    ctx.stroke();

    // 腿
    const legSwing = walk * 18;
    ctx.beginPath();
    ctx.moveTo(ox, oy - 20 * s);
    ctx.lineTo(ox - 12 * s + legSwing, oy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, oy - 20 * s);
    ctx.lineTo(ox + 12 * s - legSwing, oy);
    ctx.stroke();
  }

  drawAttackPose(ctx, s) {
    const dir = this.dir;
    const progress = 1 - this.attackTimer / 12;

    // 头
    ctx.beginPath();
    ctx.arc(0, -52 * s, 8 * s, 0, Math.PI * 2);
    ctx.stroke();

    // 身体（前倾）
    ctx.beginPath();
    ctx.moveTo(0, -44 * s);
    ctx.lineTo(dir * 4, -20 * s);
    ctx.stroke();

    // 攻击手臂（出拳！）
    const punchExtend = Math.sin(progress * Math.PI) * 30;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -40 * s);
    ctx.lineTo(dir * (18 + punchExtend) * s, -36 * s);
    ctx.stroke();

    // 拳头
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(dir * (18 + punchExtend) * s, -36 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 3;

    // 另一只手
    ctx.beginPath();
    ctx.moveTo(0, -40 * s);
    ctx.lineTo(-dir * 14 * s, -26 * s);
    ctx.stroke();

    // 腿（马步）
    ctx.beginPath();
    ctx.moveTo(dir * 4, -20 * s);
    ctx.lineTo(dir * 16 * s, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dir * 4, -20 * s);
    ctx.lineTo(-dir * 10 * s, 0);
    ctx.stroke();

    // 出拳特效
    if (progress > 0.3 && progress < 0.7) {
      ctx.strokeStyle = "rgba(255,220,50,0.6)";
      ctx.lineWidth = 2;
      const ex = dir * (28 + punchExtend) * s;
      const ey = -36 * s;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + progress * 5;
        ctx.beginPath();
        ctx.moveTo(ex + Math.cos(a) * 6, ey + Math.sin(a) * 6);
        ctx.lineTo(ex + Math.cos(a) * 14, ey + Math.sin(a) * 14);
        ctx.stroke();
      }
    }
  }
}

// ===================== AI =====================
class EnemyAI {
  constructor(enemy) {
    this.enemy = enemy;
    this.thinkTimer = 0;
    this.action = "idle";
  }

  update(player) {
    const e = this.enemy;
    if (e.dead) { e.vx *= 0.9; return; }

    this.thinkTimer--;
    if (this.thinkTimer <= 0) {
      this.think(player);
      this.thinkTimer = 15 + Math.random() * 20;
    }

    const dx = player.x - e.x;
    const dist = Math.abs(dx);
    e.dir = dx > 0 ? 1 : -1;

    switch (this.action) {
      case "chase":
        e.vx = e.dir * e.speed;
        if (dist < e.attackRange + 15) {
          e.attack();
          e.vx = 0;
        }
        break;
      case "retreat":
        e.vx = -e.dir * e.speed;
        break;
      case "jump":
        e.jump();
        e.vx = e.dir * e.speed * 0.8;
        this.action = "chase";
        break;
      default:
        e.vx *= 0.8;
    }
  }

  think(player) {
    const dist = Math.abs(player.x - this.enemy.x);
    const r = Math.random();

    if (dist > 200) {
      this.action = "chase";
    } else if (dist < 40 && r < 0.3) {
      this.action = "retreat";
    } else if (r < 0.15 && this.enemy.grounded) {
      this.action = "jump";
    } else {
      this.action = "chase";
    }
  }
}

// ===================== 游戏主体 =====================
class Game {
  constructor() {
    this.player = null;
    this.enemies = [];
    this.ais = [];
    this.particles = [];
    this.shakeX = 0;
    this.shakeY = 0;
    this.wave = 0;
    this.running = false;
    this.highScore = parseInt(localStorage.getItem("stickfight_high") || "0");
    this.input = { left: false, right: false, up: false, attack: false };
    this.touchJoy = { active: false, sx: 0, sy: 0, dx: 0, dy: 0 };
    this.touchAtk = false;
    this.touchJump = false;

    this.setupInput();
    this.drawBg();
  }

  begin() {
    this.wave = 0;
    this.hideAll();
    this.nextWave();
  }

  nextWave() {
    this.hideAll();
    this.wave++;
    this.enemies = [];
    this.ais = [];
    this.particles = [];

    // 玩家
    if (!this.player || this.player.dead) {
      this.player = new Stickman(W / 2, "#00d4ff", true);
    }
    // 回血
    this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp);

    // 生成敌人
    const count = Math.min(2 + this.wave, 8);
    const colors = ["#e74c3c","#e67e22","#9b59b6","#e91e63","#ff5252","#ff9800","#ab47bc","#f44336"];
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const ex = this.player.x + side * (150 + Math.random() * 200);
      const enemy = new Stickman(
        Math.max(40, Math.min(W - 40, ex)),
        colors[i % colors.length],
        false
      );
      enemy.hp = 20 + this.wave * 5;
      enemy.maxHp = enemy.hp;
      enemy.speed = 1.2 + this.wave * 0.15;
      enemy.damage = 4 + this.wave;
      this.enemies.push(enemy);
      this.ais.push(new EnemyAI(enemy));
    }

    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  // ===================== 循环 =====================

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(now - this.lastTime, 33) / 16;
    this.lastTime = now;
    this.update(dt);
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const p = this.player;

    // 玩家输入
    let moveX = 0;
    if (this.input.left || this.touchJoy.dx < -15) moveX = -1;
    if (this.input.right || this.touchJoy.dx > 15) moveX = 1;
    p.vx = moveX * p.speed;
    if (moveX !== 0) p.dir = moveX;

    if (this.input.up || this.touchJump) { p.jump(); this.touchJump = false; }
    if (this.input.attack || this.touchAtk) { p.attack(); this.touchAtk = false; }

    p.update();

    // 敌人AI
    for (let i = 0; i < this.enemies.length; i++) {
      this.ais[i].update(p);
      this.enemies[i].update();
    }

    // 攻击检测：玩家打敌人
    if (p.attacking && p.attackTimer === 10) {
      const box = p.getAttackBox();
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (this.boxHit(box, e)) {
          e.takeDamage(p.damage, p.x);
          this.spawnHitFx(e.x, e.y - 30);
          this.shake(4);
          if (e.dead) {
            this.spawnDeathFx(e.x, e.y - 25, e.color);
          }
        }
      }
    }

    // 敌人打玩家
    for (const e of this.enemies) {
      if (e.dead || !e.attacking || e.attackTimer !== 10) continue;
      const box = e.getAttackBox();
      if (this.boxHit(box, p)) {
        p.takeDamage(e.damage, e.x);
        this.spawnHitFx(p.x, p.y - 30);
        this.shake(3);
      }
    }

    // 粒子
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.2;
      p.life -= dt;
      return p.life > 0;
    });

    // 震动衰减
    this.shakeX *= 0.8;
    this.shakeY *= 0.8;

    // 胜负判定
    if (p.dead) {
      setTimeout(() => this.showLose(), 800);
      this.running = false;
      return;
    }
    if (this.enemies.every((e) => e.dead)) {
      setTimeout(() => this.showWin(), 600);
      this.running = false;
    }
  }

  boxHit(box, target) {
    const tx = target.x - 15;
    const ty = target.y - 55;
    const tw = 30;
    const th = 55;
    return box.x < tx + tw && box.x + box.w > tx && box.y < ty + th && box.y + box.h > ty;
  }

  // ===================== 特效 =====================

  spawnHitFx(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 4;
      this.particles.push({
        x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 2,
        life: 12 + Math.random()*8,
        color: `hsl(${40+Math.random()*30},100%,${60+Math.random()*20}%)`,
        size: 2 + Math.random()*3,
      });
    }
  }

  spawnDeathFx(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 5;
      this.particles.push({
        x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 3,
        life: 20 + Math.random()*15,
        color: i < 8 ? color : "#fff",
        size: 2 + Math.random()*4,
      });
    }
  }

  shake(amount) {
    this.shakeX += (Math.random() - 0.5) * amount * 2;
    this.shakeY += (Math.random() - 0.5) * amount * 2;
  }

  // ===================== 绘制 =====================

  draw() {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // 地面
    const grad = ctx.createLinearGradient(0, GROUND, 0, H);
    grad.addColorStop(0, "#2a2a4a");
    grad.addColorStop(1, "#1a1a30");
    ctx.fillStyle = grad;
    ctx.fillRect(0, GROUND, W, H - GROUND);

    // 地面线
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    ctx.lineTo(W, GROUND);
    ctx.stroke();

    // 背景装饰
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let x = 30; x < W; x += 80) {
      ctx.fillRect(x, GROUND - 2, 2, 4);
    }

    // 绘制所有角色
    for (const e of this.enemies) e.draw(ctx);
    this.player.draw(ctx);

    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 25);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // HUD
    this.drawHUD();

    // 虚拟摇杆
    this.drawTouchControls();
  }

  drawHUD() {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, W, 40);

    ctx.textBaseline = "middle";
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#00d4ff";
    ctx.textAlign = "left";
    ctx.fillText(`HP: ${this.player.hp}/${this.player.maxHp}`, 12, 20);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(`第 ${this.wave} 波`, W / 2, 20);

    const alive = this.enemies.filter((e) => !e.dead).length;
    ctx.fillStyle = "#e74c3c";
    ctx.textAlign = "right";
    ctx.fillText(`敌人: ${alive}`, W - 12, 20);
  }

  drawTouchControls() {
    // 只在触摸设备显示
    if (!("ontouchstart" in window)) return;

    // 左侧摇杆区域
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.arc(80, H - 100, 50, 0, Math.PI * 2);
    ctx.fill();

    if (this.touchJoy.active) {
      const jx = Math.max(-30, Math.min(30, this.touchJoy.dx));
      const jy = Math.max(-30, Math.min(30, this.touchJoy.dy));
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.arc(80 + jx, H - 100 + jy, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // 右侧按钮
    // 跳跃
    ctx.fillStyle = "rgba(100,200,255,0.12)";
    ctx.beginPath();
    ctx.arc(W - 70, H - 140, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(100,200,255,0.5)";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("跳", W - 70, H - 140);

    // 攻击
    ctx.fillStyle = "rgba(255,100,100,0.12)";
    ctx.beginPath();
    ctx.arc(W - 70, H - 65, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,100,100,0.5)";
    ctx.fillText("打", W - 70, H - 65);
  }

  // ===================== 输入 =====================

  setupInput() {
    // 键盘
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a") this.input.left = true;
      if (e.key === "ArrowRight" || e.key === "d") this.input.right = true;
      if (e.key === "ArrowUp" || e.key === "w") this.input.up = true;
      if (e.key === "j" || e.key === "J") this.input.attack = true;
      if (e.key === "k" || e.key === "K") this.input.up = true;
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a") this.input.left = false;
      if (e.key === "ArrowRight" || e.key === "d") this.input.right = false;
      if (e.key === "ArrowUp" || e.key === "w") this.input.up = false;
      if (e.key === "j" || e.key === "J") this.input.attack = false;
      if (e.key === "k" || e.key === "K") this.input.up = false;
    });

    // 触摸
    const touches = {};
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const x = t.clientX, y = t.clientY;
        if (x < W / 2) {
          // 左侧 → 摇杆
          this.touchJoy.active = true;
          this.touchJoy.sx = x;
          this.touchJoy.sy = y;
          this.touchJoy.dx = 0;
          this.touchJoy.dy = 0;
          touches[t.identifier] = "joy";
        } else {
          // 右侧 → 判断是跳跃还是攻击
          if (y < H / 2 + 40) {
            this.touchJump = true;
          } else {
            this.touchAtk = true;
          }
          touches[t.identifier] = "btn";
        }
      }
    });
    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (touches[t.identifier] === "joy") {
          this.touchJoy.dx = t.clientX - this.touchJoy.sx;
          this.touchJoy.dy = t.clientY - this.touchJoy.sy;
        }
      }
    });
    canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (touches[t.identifier] === "joy") {
          this.touchJoy.active = false;
          this.touchJoy.dx = 0;
          this.touchJoy.dy = 0;
        }
        delete touches[t.identifier];
      }
    });
  }

  // ===================== UI =====================

  showWin() {
    document.getElementById("win-wave").textContent = `第 ${this.wave} 波 通过！`;
    document.getElementById("win").classList.add("on");
  }

  showLose() {
    const totalWaves = this.wave;
    const isNew = totalWaves > this.highScore;
    if (isNew) {
      this.highScore = totalWaves;
      localStorage.setItem("stickfight_high", String(totalWaves));
    }
    document.getElementById("lose-score").textContent = `闯到第 ${totalWaves} 波`;
    document.getElementById("lose-rec").textContent =
      isNew ? "🎉 新纪录！" : `最高纪录: 第 ${this.highScore} 波`;
    document.getElementById("lose").classList.add("on");
  }

  hideAll() {
    document.querySelectorAll(".ov").forEach((o) => o.classList.remove("on"));
  }

  drawBg() {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, W, H);
  }
}

const game = new Game();
