// ===================== 题库 =====================

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeMathQuestion() {
  const ops = [
    () => { const a = randInt(2,50), b = randInt(2,50); return { text: `${a}+${b}=${a+b}`, correct: true }; },
    () => { const a = randInt(2,50), b = randInt(2,50); return { text: `${a}+${b}=${a+b+randInt(1,5)*(Math.random()<0.5?1:-1)}`, correct: false }; },
    () => { const a = randInt(20,99), b = randInt(2,a); return { text: `${a}-${b}=${a-b}`, correct: true }; },
    () => { const a = randInt(20,99), b = randInt(2,a); return { text: `${a}-${b}=${a-b+randInt(1,5)*(Math.random()<0.5?1:-1)}`, correct: false }; },
    () => { const a = randInt(2,12), b = randInt(2,12); return { text: `${a}×${b}=${a*b}`, correct: true }; },
    () => { const a = randInt(2,12), b = randInt(2,12); return { text: `${a}×${b}=${a*b+randInt(1,6)*(Math.random()<0.5?1:-1)}`, correct: false }; },
    () => { const b = randInt(2,12), c = randInt(2,12), a = b*c; return { text: `${a}÷${b}=${c}`, correct: true }; },
    () => { const b = randInt(2,12), c = randInt(2,12), a = b*c; return { text: `${a}÷${b}=${c+randInt(1,4)*(Math.random()<0.5?1:-1)}`, correct: false }; },
  ];
  return ops[randInt(0, ops.length - 1)]();
}

const POEMS = [
  { first: "床前明月光", right: "疑是地上霜", wrongs: ["春风吹又生","处处闻啼鸟"] },
  { first: "举头望明月", right: "低头思故乡", wrongs: ["春风吹又生","轻舟已过万重山"] },
  { first: "白日依山尽", right: "黄河入海流", wrongs: ["春风吹又生","一行白鹭上青天"] },
  { first: "欲穷千里目", right: "更上一层楼", wrongs: ["春风不度玉门关","处处闻啼鸟"] },
  { first: "春眠不觉晓", right: "处处闻啼鸟", wrongs: ["疑是地上霜","低头思故乡"] },
  { first: "离离原上草", right: "一岁一枯荣", wrongs: ["黄河入海流","疑是地上霜"] },
  { first: "野火烧不尽", right: "春风吹又生", wrongs: ["处处闻啼鸟","低头思故乡"] },
  { first: "锄禾日当午", right: "汗滴禾下土", wrongs: ["春风吹又生","粒粒皆辛苦"] },
  { first: "谁知盘中餐", right: "粒粒皆辛苦", wrongs: ["汗滴禾下土","处处闻啼鸟"] },
  { first: "日照香炉生紫烟", right: "遥看瀑布挂前川", wrongs: ["轻舟已过万重山","疑是银河落九天"] },
  { first: "飞流直下三千尺", right: "疑是银河落九天", wrongs: ["遥看瀑布挂前川","一行白鹭上青天"] },
  { first: "两个黄鹂鸣翠柳", right: "一行白鹭上青天", wrongs: ["千里江陵一日还","黄河入海流"] },
  { first: "朝辞白帝彩云间", right: "千里江陵一日还", wrongs: ["一行白鹭上青天","黄河入海流"] },
  { first: "两岸猿声啼不住", right: "轻舟已过万重山", wrongs: ["千里江陵一日还","处处闻啼鸟"] },
  { first: "黄河远上白云间", right: "一片孤城万仞山", wrongs: ["春风不度玉门关","黄河入海流"] },
  { first: "羌笛何须怨杨柳", right: "春风不度玉门关", wrongs: ["一片孤城万仞山","更上一层楼"] },
  { first: "好雨知时节", right: "当春乃发生", wrongs: ["润物细无声","处处闻啼鸟"] },
  { first: "随风潜入夜", right: "润物细无声", wrongs: ["当春乃发生","春风吹又生"] },
  { first: "千山鸟飞绝", right: "万径人踪灭", wrongs: ["独钓寒江雪","处处闻啼鸟"] },
  { first: "孤舟蓑笠翁", right: "独钓寒江雪", wrongs: ["万径人踪灭","轻舟已过万重山"] },
  { first: "墙角数枝梅", right: "凌寒独自开", wrongs: ["为有暗香来","春风吹又生"] },
  { first: "遥知不是雪", right: "为有暗香来", wrongs: ["凌寒独自开","疑是地上霜"] },
  { first: "鹅鹅鹅", right: "曲项向天歌", wrongs: ["白毛浮绿水","红掌拨清波"] },
  { first: "白毛浮绿水", right: "红掌拨清波", wrongs: ["曲项向天歌","一行白鹭上青天"] },
  { first: "小时不识月", right: "呼作白玉盘", wrongs: ["疑是地上霜","低头思故乡"] },
  { first: "危楼高百尺", right: "手可摘星辰", wrongs: ["更上一层楼","疑是银河落九天"] },
  { first: "松下问童子", right: "言师采药去", wrongs: ["只在此山中","独钓寒江雪"] },
  { first: "慈母手中线", right: "游子身上衣", wrongs: ["粒粒皆辛苦","低头思故乡"] },
  { first: "独在异乡为异客", right: "每逢佳节倍思亲", wrongs: ["低头思故乡","处处闻啼鸟"] },
  { first: "葡萄美酒夜光杯", right: "欲饮琵琶马上催", wrongs: ["春风不度玉门关","千里江陵一日还"] },
];

function makePoemQuestion() {
  const poem = POEMS[randInt(0, POEMS.length - 1)];
  if (Math.random() < 0.5) {
    return { text: `${poem.first}，${poem.right}`, correct: true };
  } else {
    return { text: `${poem.first}，${poem.wrongs[randInt(0, poem.wrongs.length - 1)]}`, correct: false };
  }
}

function makeCorrect() {
  if (Math.random() < 0.5) {
    let q; do { q = makeMathQuestion(); } while (!q.correct); return q;
  } else {
    let q; do { q = makePoemQuestion(); } while (!q.correct); return q;
  }
}

function makeWrong() {
  if (Math.random() < 0.5) {
    let q; do { q = makeMathQuestion(); } while (q.correct); return q;
  } else {
    let q; do { q = makePoemQuestion(); } while (q.correct); return q;
  }
}

function makeWallPair() {
  const pair = [makeCorrect(), makeWrong()];
  if (Math.random() < 0.5) pair.reverse();
  return pair;
}

// ===================== 游戏 =====================

class RunnerGame {
  constructor() {
    this.highScore = parseInt(localStorage.getItem("runner_high") || "0");
    this.updateHighScoreDisplay();
    this.running = false;
  }

  start() {
    this.count = 4;
    this.timeLeft = 60;
    this.running = false;

    this.showScreen("game-screen");

    // 延迟初始化确保布局完成
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.initCanvas();
        this.initGame();
        this.running = true;

        clearInterval(this.timerId);
        this.timerId = setInterval(() => {
          this.timeLeft--;
          this.updateHUD();
          if (this.timeLeft <= 0) this.endGame();
        }, 1000);

        this.updateHUD();
        this.lastTime = performance.now();
        this.loop(this.lastTime);
      });
    });
  }

  initCanvas() {
    const canvas = document.getElementById("game-canvas");
    this.canvas = canvas;
    const parent = canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    this.ctx = canvas.getContext("2d");
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.W = w;
    this.H = h;

    canvas.onclick = (e) => this.handleClick(e.clientX, e.clientY);
    canvas.ontouchstart = (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.handleClick(t.clientX, t.clientY);
    };
  }

  initGame() {
    // 小人位于屏幕底部 75% 处
    this.runnerY = this.H * 0.75;

    // 墙从屏幕上方进入，间隔固定像素
    this.wallGap = this.H * 0.35; // 墙之间距离
    this.wallSpeed = 0.8;         // 每帧向下移动像素（慢速）

    // 生成第一批墙
    this.walls = [];
    for (let i = 0; i < 4; i++) {
      this.walls.push({
        y: -i * this.wallGap - 60,   // 从屏幕上方外开始
        options: makeWallPair(),
        passed: false,
        chosen: -1,
        revealed: false,
      });
    }

    this.choosing = false;
    this.flashTimer = 0;
    this.flashType = "";
    this.runners = this.makeRunners();
  }

  makeRunners() {
    const arr = [];
    const n = Math.min(this.count, 40);
    for (let i = 0; i < n; i++) {
      arr.push({
        offsetX: (Math.random() - 0.5) * this.W * 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 1.5,
        hue: randInt(0, 360),
      });
    }
    return arr;
  }

  // ===================== 循环 =====================

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(now - this.lastTime, 33);
    this.lastTime = now;

    this.update(dt);
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const factor = dt / 16;

    // 小人摆动
    this.runners.forEach((r) => { r.phase += r.speed * (dt / 300); });

    if (this.choosing) return;

    // 墙向下移动
    for (const wall of this.walls) {
      wall.y += this.wallSpeed * factor;
    }

    // 检测墙到达小人位置
    for (const wall of this.walls) {
      if (!wall.passed && wall.y >= this.runnerY - 40 && wall.y <= this.runnerY) {
        this.choosing = true;
        return;
      }
    }

    // 回收掉出画面的墙
    this.walls = this.walls.filter((w) => w.y < this.H + 100);

    // 补充新墙
    const topWall = this.walls.reduce((min, w) => w.y < min ? w.y : min, 9999);
    if (topWall > -this.wallGap * 0.5) {
      this.walls.push({
        y: topWall - this.wallGap,
        options: makeWallPair(),
        passed: false,
        chosen: -1,
        revealed: false,
      });
    }

    // 闪光倒计时
    if (this.flashTimer > 0) this.flashTimer--;
  }

  handleClick(cx, cy) {
    if (!this.choosing) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = cx - rect.left;
    const side = x < this.W / 2 ? 0 : 1;

    const wall = this.walls.find((w) => !w.passed);
    if (!wall) return;

    wall.chosen = side;
    wall.passed = true;
    wall.revealed = true;

    const chosen = wall.options[side];
    if (chosen.correct) {
      this.count = Math.min(this.count * 2, 999999);
      this.flashType = "correct";
    } else {
      this.count = Math.max(Math.floor(this.count / 2), 1);
      this.flashType = "wrong";
    }
    this.flashTimer = 25;
    this.runners = this.makeRunners();
    this.updateHUD();

    // 短暂暂停后继续
    setTimeout(() => {
      this.choosing = false;
    }, 700);
  }

  // ===================== 绘制 =====================

  draw() {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;

    // 背景
    ctx.fillStyle = "#1a2a1a";
    ctx.fillRect(0, 0, W, H);

    // 道路
    const roadL = W * 0.08;
    const roadR = W * 0.92;
    ctx.fillStyle = "#2a2a3e";
    ctx.fillRect(roadL, 0, roadR - roadL, H);

    // 道路边线
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(roadL, 0); ctx.lineTo(roadL, H);
    ctx.moveTo(roadR, 0); ctx.lineTo(roadR, H);
    ctx.stroke();

    // 中间虚线
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // 画墙
    for (const wall of this.walls) {
      this.drawWall(wall);
    }

    // 画小人
    this.drawRunners();

    // 闪光
    if (this.flashTimer > 0) {
      const a = (this.flashTimer / 25) * 0.25;
      ctx.fillStyle = this.flashType === "correct"
        ? `rgba(50,255,100,${a})`
        : `rgba(255,50,50,${a})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawWall(wall) {
    const ctx = this.ctx;
    const W = this.W;
    const y = wall.y;

    if (y < -80 || y > this.H + 50) return;

    const roadL = W * 0.08;
    const roadR = W * 0.92;
    const roadW = roadR - roadL;
    const midX = W / 2;
    const wallH = 56;
    const gap = 6;

    for (let side = 0; side < 2; side++) {
      const x = side === 0 ? roadL + 2 : midX + gap / 2;
      const w = roadW / 2 - gap / 2 - 2;
      const opt = wall.options[side];

      let bg, border;
      if (wall.revealed) {
        if (opt.correct) {
          bg = "rgba(39,174,96,0.88)"; border = "#6bff9e";
        } else {
          bg = "rgba(192,57,43,0.88)"; border = "#ff6b6b";
        }
      } else {
        bg = "rgba(80,70,150,0.92)"; border = "rgba(255,255,255,0.25)";
      }

      // 墙体
      const wy = y - wallH / 2;
      ctx.fillStyle = bg;
      ctx.beginPath();
      this.roundRect(x, wy, w, wallH, 10);
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      this.roundRect(x, wy, w, wallH, 10);
      ctx.stroke();

      // 选中标记
      if (wall.revealed && wall.chosen === side) {
        ctx.strokeStyle = "#ffd200";
        ctx.lineWidth = 3;
        ctx.beginPath();
        this.roundRect(x - 2, wy - 2, w + 4, wallH + 4, 12);
        ctx.stroke();
      }

      // 文字
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const maxTW = w - 12;
      let fs = Math.min(14, W * 0.035);
      ctx.font = `bold ${fs}px "PingFang SC","Microsoft YaHei",sans-serif`;
      while (ctx.measureText(opt.text).width > maxTW && fs > 7) {
        fs -= 0.5;
        ctx.font = `bold ${fs}px "PingFang SC","Microsoft YaHei",sans-serif`;
      }
      ctx.fillText(opt.text, x + w / 2, y, maxTW);

      // ✅ ❌
      if (wall.revealed) {
        ctx.font = "16px sans-serif";
        ctx.fillText(opt.correct ? "✅" : "❌", x + w / 2, wy + 12);
      }
    }
  }

  drawRunners() {
    const ctx = this.ctx;
    const W = this.W;
    const centerX = W / 2;
    const baseY = this.runnerY;
    const n = this.runners.length;

    for (let i = 0; i < n; i++) {
      const r = this.runners[i];
      const x = centerX + r.offsetX + Math.sin(r.phase) * 4;
      const y = baseY + Math.abs(Math.sin(r.phase * 2)) * 5 + (i % 3) * 8;

      const s = Math.min(W * 0.025, 12); // 小人大小

      ctx.fillStyle = `hsl(${r.hue},70%,60%)`;
      ctx.strokeStyle = `hsl(${r.hue},70%,60%)`;
      ctx.lineCap = "round";

      // 头
      ctx.beginPath();
      ctx.arc(x, y - s * 2, s * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // 身体
      ctx.lineWidth = s * 0.35;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.5);
      ctx.lineTo(x, y - s * 0.3);
      ctx.stroke();

      // 腿
      const leg = Math.sin(r.phase * 2.5) * s * 0.5;
      ctx.lineWidth = s * 0.25;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.3);
      ctx.lineTo(x - s * 0.3 + leg, y + s * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.3);
      ctx.lineTo(x + s * 0.3 - leg, y + s * 0.3);
      ctx.stroke();

      // 胳膊
      ctx.lineWidth = s * 0.2;
      const arm = Math.sin(r.phase * 2.5 + 1) * s * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.2);
      ctx.lineTo(x - s * 0.5 + arm, y - s * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.2);
      ctx.lineTo(x + s * 0.5 - arm, y - s * 0.5);
      ctx.stroke();
    }

    // 人数标签
    if (this.count > 40) {
      const tw = 80;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.beginPath();
      this.roundRect(centerX - tw / 2, baseY + 20, tw, 24, 12);
      ctx.fill();
      ctx.fillStyle = "#ffd200";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`共 ${this.count} 人`, centerX, baseY + 32);
    }
  }

  roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ===================== 结算 =====================

  endGame() {
    this.running = false;
    clearInterval(this.timerId);

    const score = this.count;
    const isNew = score > this.highScore;
    if (isNew) {
      this.highScore = score;
      localStorage.setItem("runner_high", String(score));
    }

    let icon, title;
    if (score >= 1000) { icon = "🏆"; title = "太强了！"; }
    else if (score >= 100) { icon = "🔥"; title = "厉害！"; }
    else if (score >= 20) { icon = "👍"; title = "还不错！"; }
    else { icon = "😅"; title = "再接再厉！"; }

    document.getElementById("result-icon").textContent = icon;
    document.getElementById("result-title").textContent = title;
    document.getElementById("result-score").textContent = `最终人数: ${score} 人`;
    document.getElementById("result-record").textContent =
      isNew ? "🎉 新纪录！打破了之前的最高分！" : `最高纪录: ${this.highScore} 人`;

    this.updateHighScoreDisplay();
    this.showScreen("result-screen");
  }

  // ===================== UI =====================

  updateHUD() {
    document.getElementById("hud-count").textContent = this.count;
    document.getElementById("hud-time").textContent = this.timeLeft;
    document.getElementById("hud-high").textContent = this.highScore;
  }

  updateHighScoreDisplay() {
    const el = document.getElementById("high-score-start");
    if (el) el.textContent = this.highScore;
  }

  showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
    const el = document.getElementById(id);
    el.classList.remove("hidden");
    el.style.animation = "none";
    el.offsetHeight;
    el.style.animation = "";
  }
}

const game = new RunnerGame();
