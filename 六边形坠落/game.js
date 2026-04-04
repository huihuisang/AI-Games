// ======================== 六边形坠落 ========================
// 核心玩法：屏幕中心有一个小球，六边形环从外向中心收缩，
// 每个环有一个缺口，玩家左右移动小球的角度位置来穿过缺口。

const TAU = Math.PI * 2;

class HexFallGame {
  constructor() {
    this.canvas = document.getElementById("c");
    this.ctx = this.canvas.getContext("2d");
    this.running = false;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem("hexfall_high") || "0");
    this.rings = [];
    this.playerAngle = 0; // 玩家在中心的角度位置
    this.playerRadius = 30; // 小球离中心的距离
    this.moveDir = 0; // -1左 0停 1右
    this.moveSpeed = 3.5; // 角度速度（度/帧）
    this.ringSpeed = 1.0;
    this.ringSpawnDist = 0;
    this.ringSpawnInterval = 0;
    this.nextSpawn = 0;
    this.time = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.particles = [];
    this.bgHue = 0;
    this.combo = 0;

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.setupInput();
    this.drawStartScreen();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w;
    this.H = h;
    this.cx = w / 2;
    this.cy = h / 2;
    this.maxRingRadius = Math.max(w, h) * 0.75;
  }

  setupInput() {
    // 键盘
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a") this.moveDir = -1;
      if (e.key === "ArrowRight" || e.key === "d") this.moveDir = 1;
    });
    window.addEventListener("keyup", (e) => {
      if ((e.key === "ArrowLeft" || e.key === "a") && this.moveDir === -1) this.moveDir = 0;
      if ((e.key === "ArrowRight" || e.key === "d") && this.moveDir === 1) this.moveDir = 0;
    });

    // 触摸/鼠标
    const onDown = (x) => {
      if (!this.running) return;
      this.moveDir = x < this.W / 2 ? -1 : 1;
    };
    const onUp = () => { this.moveDir = 0; };

    this.canvas.addEventListener("mousedown", (e) => onDown(e.clientX));
    this.canvas.addEventListener("mouseup", onUp);
    this.canvas.addEventListener("mouseleave", onUp);
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      onDown(e.touches[0].clientX);
    });
    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      onUp();
    });
  }

  // ===================== 游戏流程 =====================

  begin() {
    document.getElementById("start-overlay").classList.remove("active");
    document.getElementById("over-overlay").classList.remove("active");

    this.score = 0;
    this.playerAngle = -90; // 从顶部开始
    this.moveDir = 0;
    this.rings = [];
    this.particles = [];
    this.time = 0;
    this.ringSpeed = 1.0;
    this.combo = 0;
    this.bgHue = 200;
    this.nextSpawn = 0;

    // 预生成一些环
    for (let i = 0; i < 5; i++) {
      this.spawnRing(this.maxRingRadius - i * -80);
    }

    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  gameOver() {
    this.running = false;
    this.shake(8);

    const isNew = this.score > this.highScore;
    if (isNew) {
      this.highScore = this.score;
      localStorage.setItem("hexfall_high", String(this.score));
    }

    document.getElementById("final-score").textContent = `得分: ${this.score}`;
    document.getElementById("final-record").textContent =
      isNew ? "🎉 新纪录！" : `最高纪录: ${this.highScore}`;

    setTimeout(() => {
      document.getElementById("over-overlay").classList.add("active");
    }, 600);
  }

  // ===================== 环 =====================

  spawnRing(radius) {
    const sides = 6;
    // 缺口：随机一个边不画
    const gapSide = Math.floor(Math.random() * sides);
    // 环自身的旋转偏移
    const rotationOffset = Math.random() * 60;
    // 旋转方向和速度
    const rotSpeed = (Math.random() < 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4);

    const r = radius || this.maxRingRadius;

    this.rings.push({
      radius: r,
      gapSide,
      rotation: rotationOffset,
      rotSpeed,
      sides,
      color: `hsl(${(this.bgHue + this.rings.length * 30) % 360}, 70%, 55%)`,
      passed: false,
      thickness: 8,
    });
  }

  // ===================== 主循环 =====================

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(now - this.lastTime, 33) / 16;
    this.lastTime = now;

    this.update(dt);
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.time++;
    this.bgHue = (this.bgHue + 0.15 * dt) % 360;

    // 难度渐增
    this.ringSpeed = 1.0 + this.score * 0.015;

    // 移动玩家
    this.playerAngle += this.moveDir * this.moveSpeed * dt;

    // 环向中心收缩
    for (const ring of this.rings) {
      ring.radius -= this.ringSpeed * dt;
      ring.rotation += ring.rotSpeed * dt;
    }

    // 生成新环
    this.nextSpawn -= this.ringSpeed * dt;
    if (this.nextSpawn <= 0) {
      this.spawnRing();
      this.nextSpawn = 100 + Math.max(0, 40 - this.score * 0.5);
    }

    // 碰撞检测 & 得分
    for (const ring of this.rings) {
      if (ring.passed) continue;

      // 环到达玩家半径附近
      if (ring.radius <= this.playerRadius + ring.thickness / 2 + 4 &&
          ring.radius >= this.playerRadius - ring.thickness / 2 - 4) {
        // 检查玩家是否在缺口内
        if (this.isInGap(ring)) {
          ring.passed = true;
          this.score++;
          this.combo++;
          this.spawnPassParticles(ring);
        } else {
          // 撞到了
          this.spawnCrashParticles();
          this.gameOver();
          return;
        }
      }

      // 环收缩到太小就移除
      if (ring.radius < 5) {
        ring.passed = true;
      }
    }

    // 清理已通过的环
    this.rings = this.rings.filter((r) => r.radius > 5 && !(r.passed && r.radius < this.playerRadius - 20));

    // 更新粒子
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });

    // 震动衰减
    this.shakeX *= 0.85;
    this.shakeY *= 0.85;
  }

  isInGap(ring) {
    // 计算玩家相对于环的角度
    let pAngle = ((this.playerAngle - ring.rotation) % 360 + 360) % 360;
    // 每边 60°，缺口边的角度范围
    const sideAngle = 360 / ring.sides; // 60°
    const gapStart = ring.gapSide * sideAngle;
    const gapEnd = gapStart + sideAngle;

    // 给缺口加点容差
    const tolerance = 8;
    return pAngle > gapStart + tolerance && pAngle < gapEnd - tolerance;
  }

  // ===================== 粒子 =====================

  spawnPassParticles(ring) {
    const angle = this.playerAngle * Math.PI / 180;
    const px = this.cx + Math.cos(angle) * this.playerRadius;
    const py = this.cy + Math.sin(angle) * this.playerRadius;
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * TAU;
      const sp = 1 + Math.random() * 3;
      this.particles.push({
        x: px, y: py,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 20 + Math.random() * 15,
        color: ring.color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  spawnCrashParticles() {
    const angle = this.playerAngle * Math.PI / 180;
    const px = this.cx + Math.cos(angle) * this.playerRadius;
    const py = this.cy + Math.sin(angle) * this.playerRadius;
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * TAU;
      const sp = 2 + Math.random() * 5;
      this.particles.push({
        x: px, y: py,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 25 + Math.random() * 20,
        color: `hsl(${Math.random() * 60}, 100%, 60%)`,
        size: 3 + Math.random() * 4,
      });
    }
  }

  shake(amount) {
    this.shakeX = (Math.random() - 0.5) * amount * 2;
    this.shakeY = (Math.random() - 0.5) * amount * 2;
  }

  // ===================== 绘制 =====================

  draw() {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const cx = this.cx + this.shakeX;
    const cy = this.cy + this.shakeY;

    // 背景
    ctx.fillStyle = `hsl(${this.bgHue}, 15%, 6%)`;
    ctx.fillRect(0, 0, W, H);

    // 背景格纹（微妙的六边形网格暗示）
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = `hsl(${this.bgHue}, 50%, 50%)`;
    ctx.lineWidth = 1;
    for (let r = 50; r < this.maxRingRadius; r += 80) {
      this.drawHexPath(ctx, cx, cy, r, 0);
      ctx.stroke();
    }
    ctx.restore();

    // 画环
    for (const ring of this.rings) {
      this.drawRing(ctx, cx, cy, ring);
    }

    // 画中心小圆（装饰）
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, TAU);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();

    // 画玩家
    this.drawPlayer(ctx, cx, cy);

    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x + this.shakeX, p.y + this.shakeY, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // HUD
    this.drawHUD(ctx, W);
  }

  drawHexPath(ctx, cx, cy, radius, rotationDeg) {
    const rot = rotationDeg * Math.PI / 180;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = rot + (i / 6) * TAU;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  drawRing(ctx, cx, cy, ring) {
    const rot = ring.rotation * Math.PI / 180;
    const sideAngle = TAU / ring.sides;

    ctx.lineWidth = ring.thickness;
    ctx.lineCap = "round";

    // 画每条边（跳过缺口边）
    for (let i = 0; i < ring.sides; i++) {
      if (i === ring.gapSide) continue;

      const a1 = rot + i * sideAngle;
      const a2 = rot + (i + 1) * sideAngle;
      const x1 = cx + Math.cos(a1) * ring.radius;
      const y1 = cy + Math.sin(a1) * ring.radius;
      const x2 = cx + Math.cos(a2) * ring.radius;
      const y2 = cy + Math.sin(a2) * ring.radius;

      // 越近中心越亮
      const dist = ring.radius / this.maxRingRadius;
      const alpha = 0.3 + (1 - dist) * 0.7;

      ctx.strokeStyle = ring.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // 缺口高亮提示（微弱的虚线）
    const ga1 = rot + ring.gapSide * sideAngle;
    const ga2 = rot + (ring.gapSide + 1) * sideAngle;
    const gx1 = cx + Math.cos(ga1) * ring.radius;
    const gy1 = cy + Math.sin(ga1) * ring.radius;
    const gx2 = cx + Math.cos(ga2) * ring.radius;
    const gy2 = cy + Math.sin(ga2) * ring.radius;

    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = ring.color;
    ctx.beginPath();
    ctx.moveTo(gx1, gy1);
    ctx.lineTo(gx2, gy2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  drawPlayer(ctx, cx, cy) {
    const angle = this.playerAngle * Math.PI / 180;
    const px = cx + Math.cos(angle) * this.playerRadius;
    const py = cy + Math.sin(angle) * this.playerRadius;
    const r = 7;

    // 光晕
    const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
    grad.addColorStop(0, "rgba(255,220,100,0.4)");
    grad.addColorStop(1, "rgba(255,220,100,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, r * 3, 0, TAU);
    ctx.fill();

    // 球体
    ctx.fillStyle = "#ffd200";
    ctx.beginPath();
    ctx.arc(px, py, r, 0, TAU);
    ctx.fill();

    // 高光
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(px - 2, py - 2, r * 0.35, 0, TAU);
    ctx.fill();

    // 轨道线（玩家运动轨迹圆）
    ctx.strokeStyle = "rgba(255,210,0,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, this.playerRadius, 0, TAU);
    ctx.stroke();
  }

  drawHUD(ctx, W) {
    // 分数（左上）
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`分数: ${this.score}`, 16, 16);

    // 最高纪录（右上）
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`最高: ${this.highScore}`, W - 16, 18);

    // 连击
    if (this.combo > 2) {
      ctx.fillStyle = "#ffd200";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${this.combo} 连击!`, W / 2, 18);
    }
  }

  drawStartScreen() {
    const ctx = this.ctx;
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, this.W, this.H);

    // 装饰六边形
    ctx.strokeStyle = "rgba(100,100,200,0.15)";
    ctx.lineWidth = 2;
    for (let r = 60; r < 400; r += 70) {
      this.drawHexPath(ctx, this.cx, this.cy, r, r * 0.3);
      ctx.stroke();
    }
  }
}

const game = new HexFallGame();
