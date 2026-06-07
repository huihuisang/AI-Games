// ===== 工具函数 =====
const $ = (id) => document.getElementById(id);
const rnd = (a, b) => Math.random() * (b - a) + a;
const rndInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// 彩色模式下可选的颜色（适合打印的较深颜色）
const COLORS = [
  "#111827", // 近黑
  "#dc2626", // 红
  "#2563eb", // 蓝
  "#16a34a", // 绿
  "#d97706", // 橙
  "#7c3aed", // 紫
  "#0891b2", // 青
];

// A4 基准像素（96dpi）与超采样倍率（让打印更清晰）
const A4_W = 794;
const A4_H = 1123;
const SS = 2;
const FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif';

// 两张纸渲染成的图片（data URL）。打印时直接用，保证点击即同步打印（兼容 iOS）。
let scatterURL = "";
let gridURL = "";
const preloader = new Image(); // 预解码，使切换打印图近乎瞬时

// 两个矩形是否相交
function intersects(a, b) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

// 取得一个画布的 2D 上下文，并按 A4 基准 + 超采样初始化
function setupCanvas(canvas) {
  canvas.width = A4_W * SS;
  canvas.height = A4_H * SS;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(SS, 0, 0, SS, 0, 0); // 之后用基准坐标绘制
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, A4_W, A4_H);
  return ctx;
}

// ===== 生成「数字纸」到 canvas =====
function generateScatter() {
  const min = parseInt($("minVal").value, 10);
  const max = parseInt($("maxVal").value, 10);
  const status = $("status");

  if (Number.isNaN(min) || Number.isNaN(max)) {
    status.textContent = "请输入有效的最小值和最大值";
    return;
  }
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);

  let fMin = parseInt($("fontMin").value, 10) || 26;
  let fMax = parseInt($("fontMax").value, 10) || 70;
  if (fMin > fMax) [fMin, fMax] = [fMax, fMin];
  fMin = Math.max(8, fMin);

  const gap = Math.max(0, parseInt($("gapVal").value, 10) || 0);
  const colorful = $("colorChk").checked;

  let target = parseInt($("countVal").value, 10);
  if (Number.isNaN(target) || target <= 0) target = Infinity; // 留空 = 铺满

  // 范围内不重复数字的总数
  const rangeSize = hi - lo + 1;

  // 「不重复」取值器：范围不大时打乱整池顺序取，范围很大时随机+去重
  const useShuffledPool = rangeSize <= 200000;
  let pool = null;
  let poolIdx = 0;
  const used = new Set();
  if (useShuffledPool) {
    pool = new Array(rangeSize);
    for (let i = 0; i < rangeSize; i++) pool[i] = lo + i;
    for (let i = rangeSize - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }
  const nextUnique = () => {
    if (useShuffledPool) {
      if (poolIdx >= pool.length) return null;
      return pool[poolIdx++];
    }
    if (used.size >= rangeSize) return null;
    let v;
    let t = 0;
    do {
      v = rndInt(lo, hi);
      t++;
    } while (used.has(v) && t < 60);
    if (used.has(v)) return null;
    used.add(v);
    return v;
  };

  const ctx = setupCanvas($("scatterCanvas"));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const W = A4_W;
  const H = A4_H;
  const pad = 28; // 页边距

  const maxCount = target === Infinity ? rangeSize : Math.min(target, rangeSize);

  const placed = [];
  let count = 0;
  let exhausted = false;
  let pageFull = false;

  while (count < maxCount) {
    const value = nextUnique();
    if (value === null) {
      exhausted = true;
      break;
    }
    const s = String(value);
    let placedThis = false;

    for (let attempt = 0; attempt < 200; attempt++) {
      const fs = rndInt(fMin, fMax);
      ctx.font = `700 ${fs}px ${FONT_FAMILY}`;
      const w = ctx.measureText(s).width; // 精确文字宽度
      const h = fs;

      const angle = rnd(-58, 58);
      const rad = Math.abs((angle * Math.PI) / 180);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // 旋转后的轴对齐包围盒
      const bw = w * cos + h * sin;
      const bh = w * sin + h * cos;

      if (bw > W - 2 * pad || bh > H - 2 * pad) continue;

      const x = rnd(pad, W - pad - bw);
      const y = rnd(pad, H - pad - bh);

      const rect = { x: x - gap / 2, y: y - gap / 2, w: bw + gap, h: bh + gap };

      let hit = false;
      for (let i = 0; i < placed.length; i++) {
        if (intersects(rect, placed[i])) {
          hit = true;
          break;
        }
      }
      if (hit) continue;

      placed.push(rect);

      // 在包围盒中心绘制旋转后的数字
      ctx.save();
      ctx.translate(x + bw / 2, y + bh / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.fillStyle = colorful
        ? COLORS[rndInt(0, COLORS.length - 1)]
        : "#111827";
      ctx.font = `700 ${fs}px ${FONT_FAMILY}`;
      ctx.fillText(s, 0, 0);
      ctx.restore();

      placedThis = true;
      count++;
      break;
    }

    if (!placedThis) {
      pageFull = true;
      break;
    }
  }

  let msg = `已生成 ${count} 个不重复数字（范围 ${lo} ~ ${hi}）`;
  if (exhausted) {
    msg += `，已用完范围内全部 ${rangeSize} 个数字`;
  } else if (pageFull) {
    msg += `，纸面已铺满`;
  }
  status.textContent = msg;

  // 同步生成图片并设为默认打印图（数字纸）
  scatterURL = $("scatterCanvas").toDataURL("image/png");
  $("printImg").src = scatterURL;
}

// ===== 生成「方格纸」到 canvas（行列可自定义）=====
function buildGrid() {
  let rows = parseInt($("gridRows").value, 10);
  let cols = parseInt($("gridCols").value, 10);
  if (Number.isNaN(rows) || rows < 1) rows = 1;
  if (Number.isNaN(cols) || cols < 1) cols = 1;
  rows = Math.min(rows, 50);
  cols = Math.min(cols, 50);

  const ctx = setupCanvas($("gridCanvas"));

  const pad = 45; // ≈12mm 页边距
  const gw = A4_W - 2 * pad;
  const gh = A4_H - 2 * pad;
  const cw = gw / cols;
  const ch = gh / rows;

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let c = 0; c <= cols; c++) {
    const x = pad + c * cw;
    ctx.moveTo(x, pad);
    ctx.lineTo(x, pad + gh);
  }
  for (let r = 0; r <= rows; r++) {
    const y = pad + r * ch;
    ctx.moveTo(pad, y);
    ctx.lineTo(pad + gw, y);
  }
  ctx.stroke();

  $("gridLabel").textContent = `${rows} × ${cols} 方格纸（A4）`;

  // 生成方格纸图片并预解码，确保点击「打印方格纸」时能瞬时切换
  gridURL = $("gridCanvas").toDataURL("image/png");
  preloader.src = gridURL;
}

// ===== 预览缩放：自适应屏幕宽度（尤其手机）=====
function fitScale() {
  const avail = window.innerWidth - 28; // 预留左右内边距
  const scale = Math.max(0.28, Math.min(0.62, avail / A4_W));
  document.documentElement.style.setProperty("--scale", scale.toFixed(3));
}

window.addEventListener("resize", fitScale);

// ===== 打印 =====
// @media print 只显示 #printArea 里的这张图片（静态规则），不依赖任何动态
// 显示切换；这里只需把图片 src 换成所选的那张（图片已预先生成好），
// 然后在用户点击的同一手势里同步调用 print()，兼容 iOS、不会串页。
function printPage(which) {
  $("printImg").src = which === "grid" ? gridURL : scatterURL;
  window.print();
}

// ===== 绑定事件 =====
$("genBtn").addEventListener("click", (e) => {
  e.preventDefault();
  generateScatter();
});
$("printScatterBtn").addEventListener("click", (e) => {
  e.preventDefault();
  printPage("scatter");
});
$("printGridBtn").addEventListener("click", (e) => {
  e.preventDefault();
  printPage("grid");
});
$("gridRows").addEventListener("input", buildGrid);
$("gridCols").addEventListener("input", buildGrid);

// ===== 初始化 =====
fitScale();
buildGrid();
generateScatter();
