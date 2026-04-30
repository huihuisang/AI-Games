const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W, H, dpr;
function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// Game state
const STATE = { MENU: 0, PLAYING: 1, OVER: 2 };
let state = STATE.MENU;
let score = 0;
let highScore = parseInt(localStorage.getItem('moneyTreeHigh') || '0');
let timeLeft = 30;
let timer = null;
let shakeAmount = 0;
let clickCombo = 0;
let lastClickTime = 0;
let totalClicks = 0;

// Coins / money
const coins = [];
const sparkles = [];
const floatingTexts = [];

// Tree parameters (recalculated on draw)
function getTreeParams() {
  const scale = Math.min(W, H) / 800;
  const trunkX = W / 2;
  const trunkBottom = H * 0.82;
  const trunkTop = H * 0.35;
  const trunkW = 30 * scale;
  const canopyX = W / 2;
  const canopyY = H * 0.3;
  const canopyR = 120 * scale;
  return { scale, trunkX, trunkBottom, trunkTop, trunkW, canopyX, canopyY, canopyR };
}

// Coin class
class Coin {
  constructor(x, y, value) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = -(Math.random() * 3 + 1);
    this.gravity = 0.15 + Math.random() * 0.1;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
    this.size = (12 + Math.random() * 8) * (Math.min(W, H) / 800);
    this.alpha = 1;
    this.grounded = false;
    this.groundY = H + 50;
    this.bounced = 0;
    this.type = Math.random() < 0.15 ? 'bill' : 'coin';
    if (this.type === 'bill') {
      this.size *= 1.5;
      this.value *= 2;
    }
  }

  update() {
    if (!this.grounded) {
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.rotation += this.rotSpeed;
      this.vx *= 0.995;

      if (this.y >= H * 0.85 && this.bounced < 2) {
        this.vy *= -0.4;
        this.vx *= 0.7;
        this.bounced++;
        if (this.bounced >= 2) this.grounded = true;
      }
      if (this.y > H + 50) this.grounded = true;
    } else {
      this.alpha -= 0.015;
    }
    return this.alpha > 0;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.type === 'coin') {
      // Gold coin
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
      g.addColorStop(0, '#fff7a1');
      g.addColorStop(0.5, '#ffd700');
      g.addColorStop(1, '#b8860b');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size, this.size * Math.abs(Math.cos(this.rotation)), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // $ sign
      ctx.fillStyle = '#8B6914';
      ctx.font = `bold ${this.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
    } else {
      // Bill (paper money)
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(-this.size, -this.size * 0.5, this.size * 2, this.size);
      ctx.strokeStyle = '#2E7D32';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-this.size, -this.size * 0.5, this.size * 2, this.size);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${this.size * 0.6}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
    }

    ctx.restore();
  }
}

// Sparkle
class Sparkle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.life = 1;
    this.decay = 0.02 + Math.random() * 0.03;
    this.size = 2 + Math.random() * 3;
    this.color = ['#ffd700', '#fff7a1', '#ff6b6b', '#4ecdc4', '#ffe66d'][Math.floor(Math.random() * 5)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    return this.life > 0;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Floating text
class FloatingText {
  constructor(x, y, text, color, size) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size || 20;
    this.life = 1;
    this.vy = -2;
  }

  update() {
    this.y += this.vy;
    this.vy *= 0.97;
    this.life -= 0.02;
    return this.life > 0;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// Draw the tree
function drawTree() {
  const t = getTreeParams();
  const ox = shakeAmount * (Math.random() - 0.5) * 2;
  const oy = shakeAmount * (Math.random() - 0.5);

  ctx.save();
  ctx.translate(ox, oy);

  // Shadow on ground
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(t.trunkX, t.trunkBottom + 10, t.canopyR * 0.8, 15 * t.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Trunk
  const trunkGrad = ctx.createLinearGradient(t.trunkX - t.trunkW, 0, t.trunkX + t.trunkW, 0);
  trunkGrad.addColorStop(0, '#5D4037');
  trunkGrad.addColorStop(0.3, '#8D6E63');
  trunkGrad.addColorStop(0.7, '#8D6E63');
  trunkGrad.addColorStop(1, '#4E342E');
  ctx.fillStyle = trunkGrad;
  ctx.beginPath();
  ctx.moveTo(t.trunkX - t.trunkW * 1.2, t.trunkBottom);
  ctx.lineTo(t.trunkX - t.trunkW * 0.7, t.trunkTop + t.canopyR * 0.3);
  ctx.lineTo(t.trunkX + t.trunkW * 0.7, t.trunkTop + t.canopyR * 0.3);
  ctx.lineTo(t.trunkX + t.trunkW * 1.2, t.trunkBottom);
  ctx.fill();

  // Branches
  ctx.strokeStyle = '#6D4C41';
  ctx.lineWidth = 6 * t.scale;
  ctx.lineCap = 'round';
  // Left branch
  ctx.beginPath();
  ctx.moveTo(t.trunkX - 5, t.trunkTop + t.canopyR * 0.5);
  ctx.quadraticCurveTo(t.trunkX - 60 * t.scale, t.trunkTop + t.canopyR * 0.1, t.trunkX - 80 * t.scale, t.canopyY - 10);
  ctx.stroke();
  // Right branch
  ctx.beginPath();
  ctx.moveTo(t.trunkX + 5, t.trunkTop + t.canopyR * 0.5);
  ctx.quadraticCurveTo(t.trunkX + 60 * t.scale, t.trunkTop + t.canopyR * 0.1, t.trunkX + 80 * t.scale, t.canopyY - 10);
  ctx.stroke();

  // Canopy layers (back)
  drawCanopyBlob(t.canopyX - 50 * t.scale, t.canopyY + 20 * t.scale, t.canopyR * 0.7, '#2E7D32');
  drawCanopyBlob(t.canopyX + 50 * t.scale, t.canopyY + 20 * t.scale, t.canopyR * 0.7, '#2E7D32');
  // Canopy main
  drawCanopyBlob(t.canopyX, t.canopyY, t.canopyR, '#388E3C');
  // Canopy highlights
  drawCanopyBlob(t.canopyX - 30 * t.scale, t.canopyY - 20 * t.scale, t.canopyR * 0.6, '#43A047');
  drawCanopyBlob(t.canopyX + 25 * t.scale, t.canopyY - 15 * t.scale, t.canopyR * 0.5, '#4CAF50');

  // Gold coins hanging on tree
  if (state === STATE.PLAYING) {
    const coinPositions = [
      [-0.6, -0.3], [-0.3, -0.7], [0, -0.9], [0.3, -0.6], [0.6, -0.2],
      [-0.4, 0.2], [0.4, 0.3], [-0.7, 0.1], [0.7, 0], [0, -0.4],
      [-0.2, 0.5], [0.2, 0.4], [-0.5, -0.5], [0.5, -0.4], [0, 0.1]
    ];
    const pulse = Math.sin(Date.now() / 300) * 0.1 + 0.9;
    coinPositions.forEach(([px, py]) => {
      const cx = t.canopyX + px * t.canopyR;
      const cy = t.canopyY + py * t.canopyR * 0.8;
      const sz = 8 * t.scale * pulse;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz);
      g.addColorStop(0, '#fff7a1');
      g.addColorStop(0.5, '#ffd700');
      g.addColorStop(1, '#b8860b');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, sz, 0, Math.PI * 2);
      ctx.fill();
      // Glow
      ctx.save();
      ctx.globalAlpha = 0.3 * pulse;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(cx, cy, sz * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // Ground
  const groundGrad = ctx.createLinearGradient(0, H * 0.82, 0, H);
  groundGrad.addColorStop(0, '#4a7c59');
  groundGrad.addColorStop(1, '#2d5a3f');
  ctx.fillStyle = groundGrad;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.85);
  // Wavy ground
  for (let x = 0; x <= W; x += 20) {
    ctx.lineTo(x, H * 0.85 + Math.sin(x / 60 + Date.now() / 2000) * 5);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();

  ctx.restore();
}

function drawCanopyBlob(x, y, r, color) {
  const grad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, shadeColor(color, -30));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return `rgb(${R},${G},${B})`;
}

// Draw background
function drawBackground() {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.85);
  if (state === STATE.PLAYING) {
    const urgency = 1 - timeLeft / 30;
    skyGrad.addColorStop(0, lerpColor('#0f0c29', '#4a0e0e', urgency * 0.3));
    skyGrad.addColorStop(0.5, lerpColor('#302b63', '#7b2d26', urgency * 0.3));
    skyGrad.addColorStop(1, lerpColor('#24243e', '#5a2020', urgency * 0.3));
  } else {
    skyGrad.addColorStop(0, '#0f0c29');
    skyGrad.addColorStop(0.5, '#302b63');
    skyGrad.addColorStop(1, '#24243e');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Stars
  if (!drawBackground.stars) {
    drawBackground.stars = [];
    for (let i = 0; i < 60; i++) {
      drawBackground.stars.push({
        x: Math.random(),
        y: Math.random() * 0.6,
        size: Math.random() * 2 + 0.5,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }
  drawBackground.stars.forEach(s => {
    const alpha = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() / 1000 + s.twinkle));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function lerpColor(a, b, t) {
  const ah = parseInt(a.replace('#', ''), 16);
  const bh = parseInt(b.replace('#', ''), 16);
  const ar = ah >> 16, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = bh >> 16, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}

// Draw HUD
function drawHUD() {
  const scale = Math.min(W, H) / 800;
  const fontSize = Math.max(18, 28 * scale);

  // Score
  ctx.save();
  ctx.fillStyle = '#ffd700';
  ctx.font = `bold ${fontSize * 1.4}px Arial`;
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 6;
  ctx.fillText(`$ ${score}`, 20, 45 * scale);
  ctx.restore();

  // High score
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = `${fontSize * 0.7}px Arial`;
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(`最高: $ ${Math.max(highScore, score)}`, 20, 75 * scale);
  ctx.restore();

  // Timer
  if (state === STATE.PLAYING) {
    const timerSize = fontSize * 1.8;
    ctx.save();
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6;
    if (timeLeft <= 5) {
      ctx.fillStyle = '#ff4444';
      const pulse = 1 + Math.sin(Date.now() / 150) * 0.15;
      ctx.font = `bold ${timerSize * pulse}px Arial`;
    } else if (timeLeft <= 10) {
      ctx.fillStyle = '#ff9800';
      ctx.font = `bold ${timerSize}px Arial`;
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${timerSize}px Arial`;
    }
    ctx.fillText(Math.ceil(timeLeft) + 's', W - 20, 50 * scale);
    ctx.restore();

    // Timer bar
    const barW = W - 40;
    const barH = 8 * scale;
    const barY = 65 * scale;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(20, barY, barW, barH);
    const pct = timeLeft / 30;
    const barColor = pct > 0.3 ? '#4CAF50' : pct > 0.15 ? '#ff9800' : '#ff4444';
    ctx.fillStyle = barColor;
    ctx.fillRect(20, barY, barW * pct, barH);

    // Combo indicator
    if (clickCombo > 3) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff6b6b';
      const comboSize = fontSize * (0.8 + Math.min(clickCombo, 20) * 0.03);
      ctx.font = `bold ${comboSize}px Arial`;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 10;
      ctx.fillText(`${clickCombo}x 连击!`, W / 2, H * 0.15);
      ctx.restore();
    }

    // Click hint
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${fontSize * 0.6}px Arial`;
    ctx.fillText('疯狂点击摇钱树!', W / 2, H * 0.95);
    ctx.restore();
  }
}

// Draw menu
function drawMenu() {
  ctx.save();
  ctx.textAlign = 'center';
  const scale = Math.min(W, H) / 800;
  const titleSize = Math.max(28, 50 * scale);

  // Title
  ctx.fillStyle = '#ffd700';
  ctx.font = `bold ${titleSize}px Arial`;
  ctx.shadowColor = '#ff8c00';
  ctx.shadowBlur = 20;
  ctx.fillText('摇钱树', W / 2, H * 0.12);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.font = `${titleSize * 0.45}px Arial`;
  ctx.fillText('拼手速挑战', W / 2, H * 0.18);

  // High score display
  if (highScore > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${titleSize * 0.5}px Arial`;
    ctx.fillText(`最高纪录: $ ${highScore}`, W / 2, H * 0.92);
  }

  // Start button
  const btnW = 220 * scale;
  const btnH = 60 * scale;
  const btnX = W / 2 - btnW / 2;
  const btnY = H * 0.88 - btnH - 20 * scale;

  const pulse = 1 + Math.sin(Date.now() / 400) * 0.05;
  ctx.save();
  ctx.translate(W / 2, btnY + btnH / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-W / 2, -(btnY + btnH / 2));

  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  btnGrad.addColorStop(0, '#ff6b6b');
  btnGrad.addColorStop(1, '#ee5a24');
  ctx.fillStyle = btnGrad;
  roundRect(btnX, btnY, btnW, btnH, 15 * scale);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${titleSize * 0.5}px Arial`;
  ctx.fillText('开始挑战', W / 2, btnY + btnH / 2 + titleSize * 0.17);
  ctx.restore();

  // Instructions
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `${titleSize * 0.32}px Arial`;
  ctx.fillText('30秒内疯狂点击摇钱树', W / 2, btnY + btnH + 30 * scale);
  ctx.fillText('点得越快，掉的钱越多!', W / 2, btnY + btnH + 55 * scale);

  ctx.restore();
}

// Draw game over
function drawGameOver() {
  ctx.save();
  // Overlay
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  const scale = Math.min(W, H) / 800;
  const titleSize = Math.max(24, 44 * scale);

  // Results panel
  const panelW = Math.min(400 * scale, W * 0.85);
  const panelH = 320 * scale;
  const panelX = W / 2 - panelW / 2;
  const panelY = H / 2 - panelH / 2;

  ctx.fillStyle = 'rgba(30, 30, 60, 0.95)';
  roundRect(panelX, panelY, panelW, panelH, 20 * scale);
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  roundRect(panelX, panelY, panelW, panelH, 20 * scale);
  ctx.stroke();

  const isNewRecord = score >= highScore && score > 0;

  // Title
  ctx.fillStyle = isNewRecord ? '#ff6b6b' : '#ffd700';
  ctx.font = `bold ${titleSize}px Arial`;
  ctx.fillText(isNewRecord ? '新纪录!' : '时间到!', W / 2, panelY + 55 * scale);

  // Score
  ctx.fillStyle = '#ffd700';
  ctx.font = `bold ${titleSize * 1.2}px Arial`;
  ctx.fillText(`$ ${score}`, W / 2, panelY + 120 * scale);

  // Stats
  ctx.fillStyle = '#aaa';
  ctx.font = `${titleSize * 0.45}px Arial`;
  ctx.fillText(`总点击: ${totalClicks} 次`, W / 2, panelY + 165 * scale);
  ctx.fillText(`每秒点击: ${(totalClicks / 30).toFixed(1)} 次`, W / 2, panelY + 195 * scale);
  ctx.fillText(`最高纪录: $ ${highScore}`, W / 2, panelY + 225 * scale);

  // Restart button
  const btnW = 180 * scale;
  const btnH = 50 * scale;
  const btnX = W / 2 - btnW / 2;
  const btnY2 = panelY + panelH - 70 * scale;

  const btnGrad = ctx.createLinearGradient(btnX, btnY2, btnX, btnY2 + btnH);
  btnGrad.addColorStop(0, '#4CAF50');
  btnGrad.addColorStop(1, '#388E3C');
  ctx.fillStyle = btnGrad;
  roundRect(btnX, btnY2, btnW, btnH, 12 * scale);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${titleSize * 0.5}px Arial`;
  ctx.fillText('再来一次', W / 2, btnY2 + btnH / 2 + titleSize * 0.15);

  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// Spawn coins from tree
function spawnCoins(x, y) {
  const t = getTreeParams();
  const now = Date.now();
  const dt = now - lastClickTime;
  lastClickTime = now;

  if (dt < 500) {
    clickCombo++;
  } else {
    clickCombo = 1;
  }

  totalClicks++;

  const baseCoins = 1 + Math.floor(clickCombo / 5);
  const numCoins = Math.min(baseCoins + Math.floor(Math.random() * 2), 8);
  const baseValue = 1 + Math.floor(clickCombo / 3);

  for (let i = 0; i < numCoins; i++) {
    const cx = t.canopyX + (Math.random() - 0.5) * t.canopyR * 1.5;
    const cy = t.canopyY + (Math.random() - 0.3) * t.canopyR * 0.8;
    const value = baseValue + Math.floor(Math.random() * 3);
    coins.push(new Coin(cx, cy, value));
    score += value;
  }

  // Sparkles from click point
  for (let i = 0; i < 6; i++) {
    sparkles.push(new Sparkle(x || t.canopyX, y || t.canopyY));
  }

  // Floating score text
  const gained = coins.slice(-numCoins).reduce((s, c) => s + c.value, 0);
  const color = clickCombo > 10 ? '#ff6b6b' : clickCombo > 5 ? '#ff9800' : '#ffd700';
  const size = Math.min(18 + clickCombo * 0.8, 40) * (Math.min(W, H) / 800);
  floatingTexts.push(new FloatingText(
    x || t.canopyX,
    (y || t.canopyY) - 30,
    `+$${gained}`,
    color,
    size
  ));

  // Shake tree
  shakeAmount = Math.min(5 + clickCombo * 0.5, 20);
}

// Start game
function startGame() {
  state = STATE.PLAYING;
  score = 0;
  timeLeft = 30;
  clickCombo = 0;
  totalClicks = 0;
  lastClickTime = 0;
  coins.length = 0;
  sparkles.length = 0;
  floatingTexts.length = 0;
  shakeAmount = 0;

  if (timer) clearInterval(timer);
  const startTime = Date.now();
  timer = setInterval(() => {
    timeLeft = 30 - (Date.now() - startTime) / 1000;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame();
    }
  }, 50);
}

function endGame() {
  state = STATE.OVER;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('moneyTreeHigh', highScore.toString());
  }
}

// Input handling
function handleClick(x, y) {
  if (state === STATE.MENU) {
    startGame();
  } else if (state === STATE.PLAYING) {
    spawnCoins(x, y);
  } else if (state === STATE.OVER) {
    // Check if restart button clicked
    const scale = Math.min(W, H) / 800;
    const panelH = 320 * scale;
    const panelY = H / 2 - panelH / 2;
    const btnW = 180 * scale;
    const btnH = 50 * scale;
    const btnX = W / 2 - btnW / 2;
    const btnY = panelY + panelH - 70 * scale;

    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      startGame();
    }
  }
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  handleClick(e.clientX - rect.left, e.clientY - rect.top);
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  for (let i = 0; i < e.touches.length; i++) {
    handleClick(e.touches[i].clientX - rect.left, e.touches[i].clientY - rect.top);
  }
}, { passive: false });

// Main loop
let lastTime = 0;
function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  // Update
  shakeAmount *= 0.85;
  if (shakeAmount < 0.1) shakeAmount = 0;

  for (let i = coins.length - 1; i >= 0; i--) {
    if (!coins[i].update()) coins.splice(i, 1);
  }
  for (let i = sparkles.length - 1; i >= 0; i--) {
    if (!sparkles[i].update()) sparkles.splice(i, 1);
  }
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    if (!floatingTexts[i].update()) floatingTexts.splice(i, 1);
  }

  // Draw
  drawBackground();
  drawTree();

  coins.forEach(c => c.draw());
  sparkles.forEach(s => s.draw());
  floatingTexts.forEach(f => f.draw());

  drawHUD();

  if (state === STATE.MENU) drawMenu();
  if (state === STATE.OVER) drawGameOver();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
