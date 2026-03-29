// ===================== 题库 =====================

// 数学题生成器
function makeMathQuestion() {
  const ops = [
    () => {
      const a = randInt(2, 50), b = randInt(2, 50);
      return { text: `${a} + ${b} = ${a + b}`, correct: true };
    },
    () => {
      const a = randInt(2, 50), b = randInt(2, 50);
      const wrong = a + b + randInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
      return { text: `${a} + ${b} = ${wrong}`, correct: false };
    },
    () => {
      const a = randInt(20, 99), b = randInt(2, a);
      return { text: `${a} - ${b} = ${a - b}`, correct: true };
    },
    () => {
      const a = randInt(20, 99), b = randInt(2, a);
      const wrong = a - b + randInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
      return { text: `${a} - ${b} = ${wrong}`, correct: false };
    },
    () => {
      const a = randInt(2, 12), b = randInt(2, 12);
      return { text: `${a} × ${b} = ${a * b}`, correct: true };
    },
    () => {
      const a = randInt(2, 12), b = randInt(2, 12);
      const wrong = a * b + randInt(1, 6) * (Math.random() < 0.5 ? 1 : -1);
      return { text: `${a} × ${b} = ${wrong}`, correct: false };
    },
    () => {
      const b = randInt(2, 12), c = randInt(2, 12), a = b * c;
      return { text: `${a} ÷ ${b} = ${c}`, correct: true };
    },
    () => {
      const b = randInt(2, 12), c = randInt(2, 12), a = b * c;
      const wrong = c + randInt(1, 4) * (Math.random() < 0.5 ? 1 : -1);
      return { text: `${a} ÷ ${b} = ${wrong}`, correct: false };
    },
  ];
  return ops[randInt(0, ops.length - 1)]();
}

// 古诗题库（上句 → 正确下句 + 错误下句）
const POEMS = [
  { first: "床前明月光", right: "疑是地上霜", wrongs: ["春风吹又生", "处处闻啼鸟"] },
  { first: "举头望明月", right: "低头思故乡", wrongs: ["春风吹又生", "轻舟已过万重山"] },
  { first: "白日依山尽", right: "黄河入海流", wrongs: ["春风吹又生", "一行白鹭上青天"] },
  { first: "欲穷千里目", right: "更上一层楼", wrongs: ["春风不度玉门关", "处处闻啼鸟"] },
  { first: "春眠不觉晓", right: "处处闻啼鸟", wrongs: ["疑是地上霜", "低头思故乡"] },
  { first: "离离原上草", right: "一岁一枯荣", wrongs: ["黄河入海流", "疑是地上霜"] },
  { first: "野火烧不尽", right: "春风吹又生", wrongs: ["处处闻啼鸟", "低头思故乡"] },
  { first: "锄禾日当午", right: "汗滴禾下土", wrongs: ["春风吹又生", "粒粒皆辛苦"] },
  { first: "谁知盘中餐", right: "粒粒皆辛苦", wrongs: ["汗滴禾下土", "处处闻啼鸟"] },
  { first: "日照香炉生紫烟", right: "遥看瀑布挂前川", wrongs: ["轻舟已过万重山", "疑是银河落九天"] },
  { first: "飞流直下三千尺", right: "疑是银河落九天", wrongs: ["遥看瀑布挂前川", "一行白鹭上青天"] },
  { first: "两个黄鹂鸣翠柳", right: "一行白鹭上青天", wrongs: ["千里江陵一日还", "黄河入海流"] },
  { first: "朝辞白帝彩云间", right: "千里江陵一日还", wrongs: ["一行白鹭上青天", "黄河入海流"] },
  { first: "两岸猿声啼不住", right: "轻舟已过万重山", wrongs: ["千里江陵一日还", "处处闻啼鸟"] },
  { first: "黄河远上白云间", right: "一片孤城万仞山", wrongs: ["春风不度玉门关", "黄河入海流"] },
  { first: "羌笛何须怨杨柳", right: "春风不度玉门关", wrongs: ["一片孤城万仞山", "更上一层楼"] },
  { first: "好雨知时节", right: "当春乃发生", wrongs: ["润物细无声", "处处闻啼鸟"] },
  { first: "随风潜入夜", right: "润物细无声", wrongs: ["当春乃发生", "春风吹又生"] },
  { first: "千山鸟飞绝", right: "万径人踪灭", wrongs: ["独钓寒江雪", "处处闻啼鸟"] },
  { first: "孤舟蓑笠翁", right: "独钓寒江雪", wrongs: ["万径人踪灭", "轻舟已过万重山"] },
  { first: "墙角数枝梅", right: "凌寒独自开", wrongs: ["为有暗香来", "春风吹又生"] },
  { first: "遥知不是雪", right: "为有暗香来", wrongs: ["凌寒独自开", "疑是地上霜"] },
  { first: "鹅鹅鹅", right: "曲项向天歌", wrongs: ["白毛浮绿水", "红掌拨清波"] },
  { first: "白毛浮绿水", right: "红掌拨清波", wrongs: ["曲项向天歌", "一行白鹭上青天"] },
  { first: "小时不识月", right: "呼作白玉盘", wrongs: ["疑是地上霜", "低头思故乡"] },
  { first: "危楼高百尺", right: "手可摘星辰", wrongs: ["更上一层楼", "疑是银河落九天"] },
  { first: "返景入深林", right: "复照青苔上", wrongs: ["处处闻啼鸟", "独钓寒江雪"] },
  { first: "松下问童子", right: "言师采药去", wrongs: ["只在此山中", "独钓寒江雪"] },
  { first: "移舟泊烟渚", right: "日暮客愁新", wrongs: ["低头思故乡", "处处闻啼鸟"] },
  { first: "慈母手中线", right: "游子身上衣", wrongs: ["粒粒皆辛苦", "低头思故乡"] },
];

function makePoemQuestion() {
  const poem = POEMS[randInt(0, POEMS.length - 1)];
  if (Math.random() < 0.5) {
    // 正确的
    return { text: `${poem.first}，${poem.right}`, correct: true };
  } else {
    const wrong = poem.wrongs[randInt(0, poem.wrongs.length - 1)];
    return { text: `${poem.first}，${wrong}`, correct: false };
  }
}

// 生成一堵墙的两个选项（保证一正一错）
function makeWall() {
  // 随机组合：正确数学+错误古诗, 正确古诗+错误数学, 正确数学+错误数学, 正确古诗+错误古诗
  const types = [
    () => [makeCorrectMath(), makeWrongPoem()],
    () => [makeCorrectPoem(), makeWrongMath()],
    () => [makeCorrectMath(), makeWrongMath()],
    () => [makeCorrectPoem(), makeWrongPoem()],
  ];
  const pair = types[randInt(0, types.length - 1)]();
  // 随机左右
  if (Math.random() < 0.5) pair.reverse();
  return pair;
}

function makeCorrectMath() {
  let q;
  do { q = makeMathQuestion(); } while (!q.correct);
  return q;
}
function makeWrongMath() {
  let q;
  do { q = makeMathQuestion(); } while (q.correct);
  return q;
}
function makeCorrectPoem() {
  let q;
  do { q = makePoemQuestion(); } while (!q.correct);
  return q;
}
function makeWrongPoem() {
  let q;
  do { q = makePoemQuestion(); } while (q.correct);
  return q;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===================== 游戏主体 =====================

class RunnerGame {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.ctx = null;
    this.highScore = parseInt(localStorage.getItem("runner_high") || "0");
    this.updateHighScoreDisplay();

    this.running = false;
    this.count = 4;
    this.timeLeft = 60;
    this.walls = [];
    this.runners = [];
    this.scrollY = 0;
    this.speed = 0;
    this.choosing = false;
    this.flashEffect = null;
    this.lastTime = 0;
    this.timerId = null;

    // 游戏区域逻辑尺寸
    this.W = 400;
    this.H = 700;
  }

  start() {
    this.count = 4;
    this.timeLeft = 60;
    this.scrollY = 0;
    this.speed = 1.2; // pixels per frame (慢速)
    this.choosing = false;
    this.flashEffect = null;
    this.walls = [];
    this.runners = [];

    this.setupCanvas();
    this.generateRunners();
    this.generateInitialWalls();
    this.showScreen("game-screen");
    this.updateHUD();

    // 计时器
    clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.timeLeft--;
      this.updateHUD();
      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);

    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));

    // 输入
    this.canvas.onclick = (e) => this.handleClick(e);
    this.canvas.ontouchstart = (e) => {
      e.preventDefault();
      this.handleClick(e.touches[0]);
    };
  }

  setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";
    this.ctx = this.canvas.getContext("2d");
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.displayW = rect.width;
    this.displayH = rect.height;
    this.scaleX = this.displayW / this.W;
    this.scaleY = this.displayH / this.H;
  }

  generateRunners() {
    this.runners = [];
    const max = Math.min(this.count, 50); // 最多画50个
    for (let i = 0; i < max; i++) {
      this.runners.push({
        x: this.W / 2 + (Math.random() - 0.5) * 100,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 1.5 + Math.random() * 1.5,
        color: `hsl(${randInt(0, 360)}, 70%, 60%)`,
      });
    }
  }

  generateInitialWalls() {
    this.walls = [];
    // 墙在画面上方，小人从下方走上去碰到墙
    // wallY 是相对于世界坐标
    let y = -250; // 第一堵墙
    for (let i = 0; i < 5; i++) {
      this.walls.push(this.createWall(y));
      y -= 300;
    }
  }

  createWall(y) {
    const pair = makeWall();
    return {
      y: y,
      options: pair,
      passed: false,
      chosen: -1,
    };
  }

  // 游戏循环
  loop(now) {
    if (!this.running) return;
    const dt = Math.min(now - this.lastTime, 32); // cap delta
    this.lastTime = now;

    this.update(dt);
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (this.choosing) return;

    // 向上滚动
    this.scrollY -= this.speed * (dt / 16);

    // 小人摆动
    this.runners.forEach((r) => {
      r.wobble += r.wobbleSpeed * (dt / 300);
    });

    // 检查是否碰到墙
    const runnerWorldY = this.scrollY + this.H * 0.7; // 小人在屏幕 70% 位置
    for (const wall of this.walls) {
      if (!wall.passed && runnerWorldY <= wall.y + 30 && runnerWorldY >= wall.y - 10) {
        // 到达这堵墙，暂停让玩家选
        this.choosing = true;
        return;
      }
    }

    // 回收远离的墙，生成新墙
    if (this.walls.length > 0) {
      const lastWall = this.walls[this.walls.length - 1];
      if (lastWall.y - this.scrollY > -100) {
        // 需要更多墙
        this.walls.push(this.createWall(lastWall.y - 300));
      }
    }

    // 回收通过的墙
    this.walls = this.walls.filter((w) => w.y - this.scrollY < this.H + 100);
  }

  handleClick(e) {
    if (!this.choosing) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const midX = this.displayW / 2;
    const side = x < midX ? 0 : 1;

    // 找到当前要选的墙
    const wall = this.walls.find((w) => !w.passed);
    if (!wall) return;

    wall.chosen = side;
    wall.passed = true;
    const chosen = wall.options[side];

    if (chosen.correct) {
      this.count = Math.min(this.count * 2, 999999);
      this.flashEffect = { type: "correct", timer: 30 };
    } else {
      this.count = Math.max(Math.floor(this.count / 2), 1);
      this.flashEffect = { type: "wrong", timer: 30 };
    }

    this.generateRunners();
    this.updateHUD();

    // 短暂延迟后继续
    setTimeout(() => {
      this.choosing = false;
    }, 600);
  }

  // ===================== 绘制 =====================

  draw() {
    const ctx = this.ctx;
    const W = this.displayW;
    const H = this.displayH;
    const sx = this.scaleX;
    const sy = this.scaleY;

    // 背景
    ctx.fillStyle = "#1a2a1a";
    ctx.fillRect(0, 0, W, H);

    // 草地纹理线
    ctx.strokeStyle = "rgba(50,120,50,0.15)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const y = ((i * 50 + this.scrollY * 0.3) % H + H) % H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 道路
    const roadL = W * 0.1;
    const roadR = W * 0.9;
    ctx.fillStyle = "#2a2a3a";
    ctx.fillRect(roadL, 0, roadR - roadL, H);

    // 道路中线（虚线）
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 15]);
    const dashOffset = (this.scrollY * sy * 0.5) % 35;
    ctx.lineDashOffset = dashOffset;
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

    // 闪光效果
    if (this.flashEffect && this.flashEffect.timer > 0) {
      const alpha = this.flashEffect.timer / 30 * 0.3;
      ctx.fillStyle = this.flashEffect.type === "correct"
        ? `rgba(50,255,100,${alpha})`
        : `rgba(255,50,50,${alpha})`;
      ctx.fillRect(0, 0, W, H);
      this.flashEffect.timer--;
    }
  }

  drawWall(wall) {
    const ctx = this.ctx;
    const W = this.displayW;
    const sx = this.scaleX;
    const sy = this.scaleY;

    const screenY = (wall.y - this.scrollY) * sy;
    if (screenY < -100 || screenY > this.displayH + 50) return;

    const roadL = W * 0.1;
    const roadR = W * 0.9;
    const roadW = roadR - roadL;
    const midX = W / 2;
    const wallH = 70 * sy;
    const gap = 4 * sx;

    for (let side = 0; side < 2; side++) {
      const x = side === 0 ? roadL : midX + gap / 2;
      const w = roadW / 2 - gap / 2;
      const opt = wall.options[side];

      let bgColor, borderColor;
      if (wall.passed) {
        if (opt.correct) {
          bgColor = "rgba(39,174,96,0.85)";
          borderColor = "#6bff9e";
        } else {
          bgColor = "rgba(192,57,43,0.85)";
          borderColor = "#ff6b6b";
        }
      } else {
        bgColor = "rgba(80,70,140,0.9)";
        borderColor = "rgba(255,255,255,0.3)";
      }

      // 墙体
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      roundRect(ctx, x, screenY - wallH / 2, w, wallH, 10);
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      roundRect(ctx, x, screenY - wallH / 2, w, wallH, 10);
      ctx.stroke();

      // 选中标记
      if (wall.passed && wall.chosen === side) {
        ctx.strokeStyle = "#ffd200";
        ctx.lineWidth = 3;
        ctx.beginPath();
        roundRect(ctx, x - 2, screenY - wallH / 2 - 2, w + 4, wallH + 4, 12);
        ctx.stroke();
      }

      // 文字
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const text = opt.text;
      // 自适应字号
      const maxW = w - 16;
      let fontSize = Math.min(15 * sx, 16);
      ctx.font = `bold ${fontSize}px "PingFang SC","Microsoft YaHei",sans-serif`;
      while (ctx.measureText(text).width > maxW && fontSize > 8) {
        fontSize -= 0.5;
        ctx.font = `bold ${fontSize}px "PingFang SC","Microsoft YaHei",sans-serif`;
      }
      ctx.fillText(text, x + w / 2, screenY, maxW);

      // 已通过的显示✅❌
      if (wall.passed) {
        ctx.font = `${18 * sx}px sans-serif`;
        ctx.fillText(opt.correct ? "✅" : "❌", x + w / 2, screenY - wallH / 2 + 14 * sy);
      }
    }
  }

  drawRunners() {
    const ctx = this.ctx;
    const W = this.displayW;
    const sx = this.scaleX;
    const sy = this.scaleY;

    const baseY = this.displayH * 0.72;
    const max = Math.min(this.runners.length, 50);

    for (let i = 0; i < max; i++) {
      const r = this.runners[i];
      const px = r.x * sx;
      const wobbleX = Math.sin(r.wobble) * 3 * sx;
      const wobbleY = Math.abs(Math.sin(r.wobble * 2)) * 4 * sy;
      const x = px + wobbleX;
      const y = baseY - wobbleY - (i % 3) * 6 * sy;

      const size = 10 * sx;

      // 身体
      ctx.fillStyle = r.color;
      // 头
      ctx.beginPath();
      ctx.arc(x, y - size * 1.6, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      // 躯干
      ctx.fillRect(x - size * 0.2, y - size * 1.15, size * 0.4, size * 0.8);
      // 腿（走路摆动）
      const legAngle = Math.sin(r.wobble * 2.5) * 0.4;
      ctx.lineWidth = size * 0.2;
      ctx.strokeStyle = r.color;
      ctx.lineCap = "round";
      // 左腿
      ctx.beginPath();
      ctx.moveTo(x - size * 0.1, y - size * 0.35);
      ctx.lineTo(x - size * 0.1 + Math.sin(legAngle) * size * 0.5, y + size * 0.2);
      ctx.stroke();
      // 右腿
      ctx.beginPath();
      ctx.moveTo(x + size * 0.1, y - size * 0.35);
      ctx.lineTo(x + size * 0.1 + Math.sin(-legAngle) * size * 0.5, y + size * 0.2);
      ctx.stroke();
      // 胳膊
      ctx.lineWidth = size * 0.15;
      ctx.beginPath();
      ctx.moveTo(x - size * 0.2, y - size * 0.9);
      ctx.lineTo(x - size * 0.5 + Math.sin(-legAngle) * size * 0.3, y - size * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + size * 0.2, y - size * 0.9);
      ctx.lineTo(x + size * 0.5 + Math.sin(legAngle) * size * 0.3, y - size * 0.4);
      ctx.stroke();
    }

    // 人数太多时显示数字
    if (this.count > 50) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      roundRect(ctx, W / 2 - 50 * sx, baseY + 12 * sy, 100 * sx, 28 * sy, 14 * sx);
      ctx.fill();
      ctx.fillStyle = "#ffd200";
      ctx.font = `bold ${14 * sx}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`共 ${this.count} 人`, W / 2, baseY + 26 * sy);
    }
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
      isNew ? `🎉 新纪录！打破了之前的最高分！` : `最高纪录: ${this.highScore} 人`;

    this.updateHighScoreDisplay();
    this.showScreen("result-screen");
  }

  // ===================== 工具 =====================

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
    const screen = document.getElementById(id);
    screen.classList.remove("hidden");
    screen.style.animation = "none";
    screen.offsetHeight;
    screen.style.animation = "";
  }
}

// 圆角矩形辅助
function roundRect(ctx, x, y, w, h, r) {
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

const game = new RunnerGame();
