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

  const page = $("scatterPage");
  page.innerHTML = "";

  // 真实 A4 像素尺寸（transform 缩放不影响 clientWidth/Height）
  const W = page.clientWidth;
  const H = page.clientHeight;
  const pad = 28; // 页边距（px）

  const placed = [];
  let count = 0;
  let consecutiveFail = 0;
  const maxConsecutiveFail = 600; // 连续这么多次放不下，视为已铺满
  const hardCap = target === Infinity ? 4000 : target;

  while (count < hardCap && consecutiveFail < maxConsecutiveFail) {
    const value = rndInt(lo, hi);
    const fs = rndInt(fMin, fMax);
    const digits = String(value).length;

    // 估算文字未旋转时的包围盒
    const w = fs * 0.62 * digits;
    const h = fs;

    // 旋转角度
    const angle = rnd(-58, 58);
    const rad = Math.abs((angle * Math.PI) / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // 旋转后的轴对齐包围盒
    const bw = w * cos + h * sin;
    const bh = w * sin + h * cos;

    if (bw > W - 2 * pad || bh > H - 2 * pad) {
      consecutiveFail++;
      continue;
    }

    const x = rnd(pad, W - pad - bw);
    const y = rnd(pad, H - pad - bh);

    // 加上间距后的占位矩形
    const rect = {
      x: x - gap / 2,
      y: y - gap / 2,
      w: bw + gap,
      h: bh + gap,
    };

    let hit = false;
    for (let i = 0; i < placed.length; i++) {
      if (intersects(rect, placed[i])) {
        hit = true;
        break;
      }
    }
    if (hit) {
      consecutiveFail++;
      continue;
    }

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

    count++;
    consecutiveFail = 0;
  }

  status.textContent = `已生成 ${count} 个数字（范围 ${lo} ~ ${hi}）`;
}

// ===== 构建 6×6 方格 =====
function buildGrid() {
  const grid = $("gridPage");
  grid.innerHTML = "";
  for (let i = 0; i < 36; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    grid.appendChild(cell);
  }
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
function printPage(which) {
  const body = document.body;
  body.classList.remove("print-scatter", "print-grid");
  body.classList.add(which === "scatter" ? "print-scatter" : "print-grid");
  window.print();
}

window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-scatter", "print-grid");
});

// ===== 绑定事件 =====
$("genBtn").addEventListener("click", generateScatter);
$("printScatterBtn").addEventListener("click", () => printPage("scatter"));
$("printGridBtn").addEventListener("click", () => printPage("grid"));

// 初始化
fitScale();
buildGrid();
generateScatter();
