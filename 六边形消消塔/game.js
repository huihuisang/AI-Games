// ===================== 六边形消消塔 =====================
// 塔由多层六边形积木组成，点击消除，上方坠落，消一块1分，50层一关

const COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#fd79a8",
];

class HexTower {
  constructor() {
    this.canvas = document.getElementById("c");
    this.ctx = this.canvas.getContext("2d");
    this.highScore = parseInt(localStorage.getItem("hextower_high") || "0");

    this.W = 0; this.H = 0;
    this.hexR = 0; // 六边形半径
    this.cols = 7; // 每行最多7个
    this.rows = 0;
    this.grid = []; // grid[row][col] = {color, falling, fy, ...} | null
    this.score = 0;
    this.level = 1;
    this.totalRows = 50;
    this.scrollY = 0; // 视口滚动（向下看塔）
    this.targetScrollY = 0;
    this.animating = false;
    this.particles = [];
    this.running = false;

    this.resize();
    window.addEventListener("resize", () => { this.resize(); if (this.running) this.draw(); });

    this.canvas.addEventListener("click", (e) => this.onClick(e.clientX, e.clientY));
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.onClick(e.touches[0].clientX, e.touches[0].clientY);
    });

    this.drawBg();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.canvas.style.width = this.W + "px";
    this.canvas.style.height = this.H + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 六边形大小：适配屏幕宽度放7.5个
    this.hexR = Math.min(this.W / (this.cols + 1.5) / Math.sqrt(3) * 1.1, 28);
    this.hexW = this.hexR * Math.sqrt(3);   // 宽
    this.hexH = this.hexR * 2;              // 高
    this.rowH = this.hexR * 1.55;           // 行间距
  }

  // ===================== 生成塔 =====================

  buildTower() {
    this.grid = [];
    for (let r = 0; r < this.totalRows; r++) {
      const isOdd = r % 2 === 1;
      const numCols = isOdd ? this.cols - 1 : this.cols;
      const row = [];
      for (let c = 0; c < numCols; c++) {
        // 随机是否有积木（上层更稀疏）
        const density = Math.max(0.5, 1 - r * 0.005);
        if (Math.random() < density) {
          row.push({
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            falling: false,
            fy: 0,   // 坠落动画偏移
            removing: false,
            removeT: 0,
            alive: true,
          });
        } else {
          row.push(null);
        }
      }
      this.grid.push(row);
    }
  }

  // 获取格子的屏幕坐标（中心点）
  cellPos(row, col) {
    const isOdd = row % 2 === 1;
    const numCols = isOdd ? this.cols - 1 : this.cols;
    const totalW = numCols * this.hexW;
    const offsetX = (this.W - totalW) / 2 + this.hexW / 2;
    const shiftX = isOdd ? this.hexW / 2 : 0;

    const x = offsetX + col * this.hexW + shiftX;
    // 塔底在屏幕下方，向上堆叠
    const y = this.H - 60 - row * this.rowH + this.scrollY;
    return { x, y };
  }

  // ===================== 游戏流程 =====================

  start() {
    this.hideAll();
    this.score = 0;
    this.level = 1;
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.particles = [];
    this.buildTower();
    this.running = true;
    this.loop();
  }

  nextLevel() {
    this.hideAll();
    this.level++;
    this.totalRows = 50 + (this.level - 1) * 10; // 每关多10层
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.particles = [];
    this.buildTower();
    this.running = true;
    this.loop();
  }

  hideAll() {
    document.getElementById("start-overlay").classList.remove("active");
    document.getElementById("level-overlay").classList.remove("active");
    document.getElementById("over-overlay").classList.remove("active");
  }

  checkLevelClear() {
    // 所有积木都消除了
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell && cell.alive) return false;
      }
    }
    return true;
  }

  showLevelClear() {
    this.running = false;
    document.getElementById("level-title").textContent = `第 ${this.level} 关 通过！`;
    document.getElementById("level-score").textContent = `当前得分: ${this.score}`;
    document.getElementById("level-overlay").classList.add("active");
  }

  showGameOver() {
    this.running = false;
    const isNew = this.score > this.highScore;
    if (isNew) {
      this.highScore = this.score;
      localStorage.setItem("hextower_high", String(this.score));
    }
    document.getElementById("final-score").textContent = `得分: ${this.score}`;
    document.getElementById("final-record").textContent =
      isNew ? "🎉 新纪录！" : `最高纪录: ${this.highScore}`;
    document.getElementById("over-overlay").classList.add("active");
  }

  // ===================== 点击 =====================

  onClick(cx, cy) {
    if (!this.running || this.animating) return;

    // 找到点击的格子
    let bestDist = Infinity, bestR = -1, bestC = -1;
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        const cell = this.grid[r][c];
        if (!cell || !cell.alive) continue;
        const pos = this.cellPos(r, c);
        // 加上坠落偏移
        const py = pos.y - cell.fy;
        const dx = cx - pos.x, dy = cy - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.hexR * 1.1 && dist < bestDist) {
          bestDist = dist;
          bestR = r;
          bestC = c;
        }
      }
    }

    if (bestR < 0) return;

    // 消除
    const cell = this.grid[bestR][bestC];
    cell.alive = false;
    cell.removing = true;
    cell.removeT = 1;
    this.score++;

    // 粒子
    const pos = this.cellPos(bestR, bestC);
    this.spawnParticles(pos.x, pos.y, cell.color);

    // 坠落检测：上方积木掉下来
    setTimeout(() => {
      this.applyGravity();
      // 检查是否清关
      setTimeout(() => {
        if (this.checkLevelClear()) {
          this.showLevelClear();
        }
        // 自动滚动视口到有积木的地方
        this.autoScroll();
      }, 400);
    }, 150);
  }

  // ===================== 重力 =====================

  applyGravity() {
    // 对每一列，让积木下坠填充空位
    // 由于六边形是交错排列，"列"的概念比较复杂
    // 简化：逐行从下往上，如果某格为空，看正上方一行对应位置是否有积木
    let moved = true;
    while (moved) {
      moved = false;
      for (let r = 0; r < this.grid.length - 1; r++) {
        for (let c = 0; c < this.grid[r].length; c++) {
          if (this.grid[r][c] && this.grid[r][c].alive) continue;
          if (this.grid[r][c] && this.grid[r][c].removing) continue;

          // 这个位置是空的，找上方对应位置
          const above = this.findAbove(r, c);
          if (above) {
            const { row: ar, col: ac } = above;
            if (this.grid[ar][ac] && this.grid[ar][ac].alive) {
              // 移下来
              this.grid[r][c] = this.grid[ar][ac];
              this.grid[r][c].falling = true;
              this.grid[r][c].fy = this.rowH; // 从上方位置开始动画
              this.grid[ar][ac] = null;
              moved = true;
            }
          }
        }
      }
    }
  }

  findAbove(row, col) {
    // 六边形交错：偶数行有 cols 个，奇数行有 cols-1 个
    const isOdd = row % 2 === 1;
    const aboveRow = row + 1;
    if (aboveRow >= this.grid.length) return null;
    const aboveIsOdd = aboveRow % 2 === 1;

    // 偶数行→奇数行：col对应上方的 col 或 col-1
    // 奇数行→偶数行：col对应上方的 col 或 col+1
    let candidates = [];
    if (!isOdd) {
      // 当前偶数行(7格)，上方奇数行(6格)
      // 偶数行col对应奇数行col和col-1
      if (col < this.grid[aboveRow].length) candidates.push(col);
      if (col - 1 >= 0 && col - 1 < this.grid[aboveRow].length) candidates.push(col - 1);
    } else {
      // 当前奇数行(6格)，上方偶数行(7格)
      if (col < this.grid[aboveRow].length) candidates.push(col);
      if (col + 1 < this.grid[aboveRow].length) candidates.push(col + 1);
    }

    // 直接上方（同列索引）优先
    const directAbove = aboveRow < this.grid.length && col < this.grid[aboveRow].length ? col : -1;
    if (directAbove >= 0 && this.grid[aboveRow][directAbove] && this.grid[aboveRow][directAbove].alive) {
      return { row: aboveRow, col: directAbove };
    }
    // 其他候选
    for (const cc of candidates) {
      if (this.grid[aboveRow][cc] && this.grid[aboveRow][cc].alive) {
        return { row: aboveRow, col: cc };
      }
    }
    return null;
  }

  autoScroll() {
    // 找到最高有积木的行
    let topRow = 0;
    for (let r = this.grid.length - 1; r >= 0; r--) {
      for (const cell of this.grid[r]) {
        if (cell && cell.alive) { topRow = r; break; }
      }
      if (topRow > 0) break;
    }
    // 滚动让最高行可见
    const topY = this.H - 60 - topRow * this.rowH;
    if (topY < 80) {
      this.targetScrollY = -(topY - 120);
    }
  }

  // ===================== 粒子 =====================

  spawnParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 3;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
        life: 25 + Math.random() * 15, color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  // ===================== 主循环 =====================

  loop() {
    if (!this.running) return;
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }

  update() {
    // 平滑滚动
    this.scrollY += (this.targetScrollY - this.scrollY) * 0.1;

    // 坠落动画
    for (const row of this.grid) {
      for (const cell of row) {
        if (!cell) continue;
        if (cell.falling && cell.fy > 0) {
          cell.fy = Math.max(0, cell.fy - 3);
          if (cell.fy <= 0) cell.falling = false;
        }
        if (cell.removing) {
          cell.removeT -= 0.08;
          if (cell.removeT <= 0) {
            cell.removing = false;
          }
        }
      }
    }

    // 粒子
    this.particles = this.particles.filter((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.1;
      p.life--;
      return p.life > 0;
    });
  }

  // ===================== 绘制 =====================

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#0b0b1e";
    ctx.fillRect(0, 0, this.W, this.H);

    // 背景网格装饰
    ctx.strokeStyle = "rgba(255,255,255,0.02)";
    ctx.lineWidth = 1;
    for (let r = 0; r < this.totalRows; r++) {
      const isOdd = r % 2 === 1;
      const numCols = isOdd ? this.cols - 1 : this.cols;
      for (let c = 0; c < numCols; c++) {
        const pos = this.cellPos(r, c);
        if (pos.y < -this.hexR * 2 || pos.y > this.H + this.hexR * 2) continue;
        this.drawHex(ctx, pos.x, pos.y, this.hexR * 0.95);
        ctx.stroke();
      }
    }

    // 积木
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        const cell = this.grid[r][c];
        if (!cell) continue;
        if (!cell.alive && !cell.removing) continue;

        const pos = this.cellPos(r, c);
        let x = pos.x;
        let y = pos.y - cell.fy;

        if (y < -this.hexR * 2 || y > this.H + this.hexR * 2) continue;

        let scale = 1;
        let alpha = 1;
        if (cell.removing) {
          scale = cell.removeT;
          alpha = cell.removeT;
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;

        // 六边形积木
        const r2 = this.hexR * 0.9;
        this.drawHex(ctx, 0, 0, r2);
        ctx.fillStyle = cell.color;
        ctx.fill();

        // 边框
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1.5;
        this.drawHex(ctx, 0, 0, r2);
        ctx.stroke();

        // 高光
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        this.drawHex(ctx, -1, -2, r2 * 0.5);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // HUD
    this.drawHUD();
  }

  drawHex(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 6 + (i / 6) * Math.PI * 2; // 平顶六边形
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  drawHUD() {
    const ctx = this.ctx;

    // 半透明背景条
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, this.W, 48);

    ctx.textBaseline = "middle";
    ctx.font = "bold 16px sans-serif";

    // 分数
    ctx.fillStyle = "#ffd200";
    ctx.textAlign = "left";
    ctx.fillText(`分数: ${this.score}`, 14, 24);

    // 关卡
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(`第 ${this.level} 关`, this.W / 2, 24);

    // 最高
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "right";
    ctx.font = "13px sans-serif";
    ctx.fillText(`最高: ${this.highScore}`, this.W - 14, 24);
  }

  drawBg() {
    const ctx = this.ctx;
    ctx.fillStyle = "#0b0b1e";
    ctx.fillRect(0, 0, this.W, this.H);
  }
}

const game = new HexTower();
