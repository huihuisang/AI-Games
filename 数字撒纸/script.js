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

// 两个矩形是否相交
function intersects(a, b) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

// ===== 生成散布的数字 =====
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

  // 准备「不重复」的取值器：范围不大时打乱整池顺序取，范围很大时随机+去重
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

  const page = $("scatterPage");
  page.innerHTML = "";

  // 真实 A4 像素尺寸（transform 缩放不影响 clientWidth/Height）
  const W = page.clientWidth;
  const H = page.clientHeight;
  const pad = 28; // 页边距（px）

  // 最多能放的数量：受「数量设置」和「范围内不重复数字总数」共同限制
  const maxCount = target === Infinity ? rangeSize : Math.min(target, rangeSize);

  const placed = [];
  let count = 0;
  let exhausted = false; // 范围内不重复数字是否已用完
  let pageFull = false; // 页面是否已铺满放不下

  while (count < maxCount) {
    const value = nextUnique();
    if (value === null) {
      exhausted = true;
      break;
    }

    const digits = String(value).length;
    let placedThis = false;

    // 给当前数字尝试多次随机大小/角度/位置，放得下才落子
    for (let attempt = 0; attempt < 200; attempt++) {
      const fs = rndInt(fMin, fMax);
      const w = fs * 0.62 * digits; // 文字未旋转时的包围盒
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

      // 加上间距后的占位矩形
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

      const el = document.createElement("span");
      el.className = "num";
      el.textContent = value;
      el.style.left = x + bw / 2 + "px";
      el.style.top = y + bh / 2 + "px";
      el.style.fontSize = fs + "px";
      el.style.transform = `translate(-50%, -50%) rotate(${angle.toFixed(1)}deg)`;
      if (colorful) {
        el.style.color = COLORS[rndInt(0, COLORS.length - 1)];
      }
      page.appendChild(el);
      placedThis = true;
      count++;
      break;
    }

    // 试了 200 次都放不下，说明页面已经铺满
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
}

// ===== 构建自定义行列方格 =====
function buildGrid() {
  let rows = parseInt($("gridRows").value, 10);
  let cols = parseInt($("gridCols").value, 10);
  if (Number.isNaN(rows) || rows < 1) rows = 1;
  if (Number.isNaN(cols) || cols < 1) cols = 1;
  rows = Math.min(rows, 50);
  cols = Math.min(cols, 50);

  const grid = $("gridPage");
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  grid.innerHTML = "";
  for (let i = 0; i < rows * cols; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    grid.appendChild(cell);
  }

  // 同步标签文案
  $("gridLabel").textContent = `${rows} × ${cols} 方格纸（A4）`;
}

// ===== 预览缩放：自适应屏幕宽度（尤其手机） =====
function fitScale() {
  const A4_PX = 793.7; // 210mm @96dpi
  const avail = window.innerWidth - 28; // 预留左右内边距
  // 桌面最大 0.62；手机按可用宽度缩放，最小 0.28
  const scale = Math.max(0.28, Math.min(0.62, avail / A4_PX));
  document.documentElement.style.setProperty("--scale", scale.toFixed(3));
}

window.addEventListener("resize", fitScale);

// ===== 打印 =====
// 用内联样式（而非动态 class）控制打印哪一页，兼容 iOS：
// iOS Safari 在 window.print() 时不一定识别刚加到 body 上的 class，
// 但一定会读取元素的内联 display。
function printPage(which) {
  const scatter = $("scatterWrap");
  const grid = $("gridWrap");

  if (which === "grid") {
    scatter.style.display = "none";
    grid.style.display = "flex";
  } else {
    scatter.style.display = "flex";
    grid.style.display = "none";
  }

  // 关键：不要用定时器恢复显示！
  // iOS 的打印预览会跟随页面 DOM 实时重绘，如果在打印面板还开着时
  // 把显示状态恢复成默认（数字纸），预览就会变回数字纸。
  // 因此只在「用户从打印面板回到页面后」才恢复：afterprint / 重新获得焦点 / 重新可见。
  let restored = false;
  const onVisible = () => {
    if (document.visibilityState === "visible") restore();
  };
  function restore() {
    if (restored) return;
    restored = true;
    scatter.style.display = "";
    grid.style.display = "";
    window.removeEventListener("afterprint", restore);
    window.removeEventListener("focus", restore);
    document.removeEventListener("visibilitychange", onVisible);
  }
  window.addEventListener("afterprint", restore);
  window.addEventListener("focus", restore);
  document.addEventListener("visibilitychange", onVisible);

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

// 初始化
fitScale();
buildGrid();
generateScatter();
