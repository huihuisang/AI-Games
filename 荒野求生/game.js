"use strict";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const nightLayer = document.createElement("canvas");
const nightCtx = nightLayer.getContext("2d");
const TAU = Math.PI * 2;
const WORLD = 2600;
const DAY_SECONDS = 180;
const NIGHT_SECONDS = 180;
const CYCLE_SECONDS = DAY_SECONDS + NIGHT_SECONDS;
const TWILIGHT_SECONDS = 12;
const keys = new Set();
const ui = Object.fromEntries([...document.querySelectorAll("[id]")].map((el) => [el.id, el]));
const directions = ["front", "back", "left", "right"];
const sprites = { idle: {}, walk: {}, monster: new Image() };
directions.forEach((direction) => {
  sprites.idle[direction] = new Image();
  sprites.idle[direction].src = `assets/player-${direction}.png`;
  sprites.walk[direction] = Array.from({ length: 6 }, (_, frame) => {
    const image = new Image();
    image.src = `assets/player-walk/${direction}-${frame}.png`;
    return image;
  });
});
sprites.monster.src = "assets/monster.png";

const resourceInfo = {
  wood: ["🪵", "木材"], stone: ["◆", "石头"], fiber: ["≋", "纤维"],
  berry: ["●", "浆果"], water: ["◒", "净水"], scrap: ["⚙", "零件"]
};

const recipes = [
  { id: "axe", name: "石斧", cost: { wood: 3, stone: 2, fiber: 1 }, note: "更快地砍伐树木。" },
  { id: "spear", name: "木矛", cost: { wood: 4, stone: 2, fiber: 2 }, note: "扩大攻击范围，提高伤害。" },
  { id: "fire", name: "篝火", cost: { wood: 6, stone: 4 }, note: "建立温暖的安全区，可持续燃烧两天。" },
  { id: "shelter", name: "庇护所", cost: { wood: 10, fiber: 6, stone: 3 }, note: "在附近恢复生命和体温。" }
];

let state;
let lastTime = 0;
let animationId = 0;
let toastTimer = 0;
let joystick = { x: 0, y: 0, active: false };

function random(seed) {
  let value = seed >>> 0;
  return () => ((value = Math.imul(1664525, value) + 1013904223 >>> 0) / 4294967296);
}

function createState() {
  const rand = random(Date.now());
  const objects = [];
  const add = (type, count, margin = 100) => {
    for (let i = 0; i < count; i++) {
      const x = margin + rand() * (WORLD - margin * 2);
      const y = margin + rand() * (WORLD - margin * 2);
      if (Math.hypot(x - WORLD / 2, y - WORLD / 2) > 170) objects.push(makeObject(type, x, y, rand));
      else i--;
    }
  };
  add("tree", 150); add("rock", 82); add("bush", 56); add("pond", 18, 180); add("fiber", 72);
  add("crate", 12, 220);
  return {
    running: false, won: false, survivalTime: 0, day: 1, score: 0, nextMonster: 0, wasNight: false,
    player: { x: WORLD / 2, y: WORLD / 2, r: 14, speed: 190, health: 100, hunger: 100, thirst: 100, warmth: 100, facing: 0, direction: "right", moving: false, walkPhase: 0, walkBlend: 0, stepMark: 0, attack: 0, hurt: 0 },
    inventory: { wood: 0, stone: 0, fiber: 0, berry: 2, water: 1, scrap: 0 },
    gear: { axe: false, spear: false }, objects, structures: [], monsters: [], particles: [], popups: [], shake: 0,
    objective: "坚持生存 20 天，等待救援"
  };
}

function makeObject(type, x, y, rand = Math.random) {
  const data = {
    tree: [28, 3], rock: [22, 3], bush: [18, 2], pond: [44, Infinity], fiber: [13, 1], crate: [18, 2], tower: [48, Infinity]
  }[type];
  return { type, x, y, r: data[0], hp: data[1], maxHp: data[1], scale: .85 + rand() * .3, phase: rand() * TAU, depleted: false };
}

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  nightLayer.width = innerWidth;
  nightLayer.height = innerHeight;
}

function isNight() {
  return state.survivalTime % CYCLE_SECONDS >= DAY_SECONDS;
}

function daylight() {
  const phase = state.survivalTime % CYCLE_SECONDS;
  if (phase < DAY_SECONDS - TWILIGHT_SECONDS) return 1;
  if (phase < DAY_SECONDS) return (DAY_SECONDS - phase) / TWILIGHT_SECONDS;
  if (phase < CYCLE_SECONDS - TWILIGHT_SECONDS) return 0;
  if (phase < CYCLE_SECONDS) return (phase - (CYCLE_SECONDS - TWILIGHT_SECONDS)) / TWILIGHT_SECONDS;
  return 0;
}

function camera() {
  return { x: state.player.x - innerWidth / 2, y: state.player.y - innerHeight / 2 };
}

function nearObject() {
  let closest = null;
  let distance = 80;
  for (const object of state.objects) {
    if (object.depleted) continue;
    const d = Math.hypot(object.x - state.player.x, object.y - state.player.y) - object.r;
    if (d < distance) { distance = d; closest = object; }
  }
  return closest;
}

function collides(x, y, radius) {
  for (const object of state.objects) {
    if (object.depleted || !["tree", "rock", "pond", "tower"].includes(object.type)) continue;
    if (Math.hypot(x - object.x, y - object.y) < radius + object.r * object.scale) return true;
  }
  return false;
}

function update(dt) {
  if (!state.running) return;
  state.survivalTime += dt;
  if (state.survivalTime >= CYCLE_SECONDS * 20) { endGame(true); return; }
  const currentDay = Math.floor(state.survivalTime / CYCLE_SECONDS) + 1;
  if (currentDay !== state.day) { state.day = currentDay; showToast(`第 ${state.day} 天 — 你熬过了黑夜`); }
  const nightNow = isNight();
  if (nightNow !== state.wasNight) {
    state.wasNight = nightNow;
    showToast(nightNow ? "夜幕降临，怪物开始出没" : "天亮了，怪物正在退去");
  }

  let burnedOut = 0;
  state.structures = state.structures.filter((structure) => {
    if (structure.type !== "fire" || state.survivalTime < structure.expiresAt) return true;
    burnedOut++;
    burst(structure.x, structure.y, "#665a49", 12);
    return false;
  });
  if (burnedOut > 0) showToast(burnedOut > 1 ? `${burnedOut} 堆篝火燃尽了` : "篝火燃尽了");
  state.structures.forEach((structure) => {
    if (structure.type === "fire" && !structure.warned && structure.expiresAt - state.survivalTime <= CYCLE_SECONDS / 4) {
      structure.warned = true;
      showToast("篝火快要燃尽了");
    }
  });

  const p = state.player;
  const previousX = p.x;
  const previousY = p.y;
  let dx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + joystick.x;
  let dy = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) + joystick.y;
  const magnitude = Math.hypot(dx, dy);
  if (magnitude > 0) {
    dx /= Math.max(1, magnitude); dy /= Math.max(1, magnitude); p.facing = Math.atan2(dy, dx);
    if (Math.abs(dx) > Math.abs(dy)) p.direction = dx < 0 ? "left" : "right";
    else p.direction = dy < 0 ? "back" : "front";
    const nx = Math.max(25, Math.min(WORLD - 25, p.x + dx * p.speed * dt));
    const ny = Math.max(25, Math.min(WORLD - 25, p.y + dy * p.speed * dt));
    if (!collides(nx, p.y, p.r)) p.x = nx;
    if (!collides(p.x, ny, p.r)) p.y = ny;
  }
  p.moving = Math.hypot(p.x - previousX, p.y - previousY) > .05;
  p.walkBlend = Math.max(0, Math.min(1, p.walkBlend + dt * (p.moving ? 8 : -10)));
  if (p.moving) {
    p.walkPhase += dt * 10.5;
    const currentStep = Math.floor(p.walkPhase / Math.PI);
    if (currentStep !== p.stepMark) {
      p.stepMark = currentStep;
      footstepDust(p);
    }
  }

  p.hunger = Math.max(0, p.hunger - dt * .24);
  p.thirst = Math.max(0, p.thirst - dt * .36);
  const safe = state.structures.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < (s.type === "fire" ? 125 : 80));
  if (isNight() && !safe) p.warmth = Math.max(0, p.warmth - dt * 1.15);
  else p.warmth = Math.min(100, p.warmth + dt * (safe ? 5 : .3));
  if (!p.hunger || !p.thirst || !p.warmth) p.health -= dt * 3.2;
  else if (safe && p.hunger > 40 && p.thirst > 40) p.health = Math.min(100, p.health + dt * .5);
  p.attack = Math.max(0, p.attack - dt); p.hurt = Math.max(0, p.hurt - dt);
  state.shake = Math.max(0, state.shake - dt * 1.8);

  if (isNight()) {
    state.nextMonster -= dt;
    if (state.nextMonster <= 0 && state.monsters.length < Math.min(8, 2 + state.day)) {
      spawnMonster(); state.nextMonster = Math.max(2.8, 6.5 - state.day * .3);
    }
  } else {
    state.monsters.forEach((m) => m.health -= dt * 18);
  }
  updateMonsters(dt, safe);
  state.particles.forEach((q) => { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; });
  state.particles = state.particles.filter((q) => q.life > 0);
  state.popups.forEach((q) => { q.y -= 28 * dt; q.life -= dt; });
  state.popups = state.popups.filter((q) => q.life > 0);
  state.monsters = state.monsters.filter((m) => m.health > 0);

  if (p.health <= 0) endGame(false);
  updateUI();
}

function spawnMonster() {
  const angle = Math.random() * TAU;
  const distance = Math.max(innerWidth, innerHeight) * .55 + 100;
  const x = Math.max(40, Math.min(WORLD - 40, state.player.x + Math.cos(angle) * distance));
  const y = Math.max(40, Math.min(WORLD - 40, state.player.y + Math.sin(angle) * distance));
  state.monsters.push({ x, y, r: 17, speed: 72 + state.day * 4 + Math.random() * 18, health: 32 + state.day * 4, attack: 0, phase: Math.random() * TAU });
}

function updateMonsters(dt, playerSafe) {
  const p = state.player;
  for (const m of state.monsters) {
    const angle = Math.atan2(p.y - m.y, p.x - m.x);
    m.facing = angle;
    const nearFire = state.structures.some((s) => s.type === "fire" && Math.hypot(s.x - m.x, s.y - m.y) < 120);
    const direction = nearFire ? -1 : 1;
    m.x += Math.cos(angle) * m.speed * dt * direction;
    m.y += Math.sin(angle) * m.speed * dt * direction;
    m.attack -= dt;
    if (Math.hypot(p.x - m.x, p.y - m.y) < p.r + m.r + 4 && m.attack <= 0 && !playerSafe) {
      p.health -= 9; p.hurt = .35; m.attack = 1.1; burst(p.x, p.y, "#c44f48", 8); showToast("夜行怪物击中了你");
    }
  }
}

function interact() {
  if (!state.running || !ui.craftPanel.classList.contains("hidden")) return;
  const object = nearObject();
  if (!object) { consume(); return; }
  if (object.type === "pond") {
    state.inventory.water = Math.min(5, state.inventory.water + 1); state.player.thirst = Math.min(100, state.player.thirst + 18);
    showToast("装满水壶 · 口渴得到缓解"); burst(object.x, object.y, "#71bfd0", 7); return;
  }
  object.hp -= object.type === "tree" && state.gear.axe ? 2 : 1;
  state.shake = .35;
  burst(object.x, object.y, object.type === "tree" ? "#d7a55f" : "#d7dac8", 12);
  floatText(object.x, object.y - object.r, "采集中…", "#f2df9b");
  if (object.hp > 0) { showToast(state.gear.axe ? "有力的一击" : "继续采集"); return; }
  object.depleted = true;
  const rewards = {
    tree: { wood: state.gear.axe ? 5 : 3 }, rock: { stone: 3 }, bush: { berry: 3 },
    fiber: { fiber: 3 }, crate: { scrap: 2, water: 1 }
  }[object.type];
  for (const [item, amount] of Object.entries(rewards)) state.inventory[item] += amount;
  burst(object.x, object.y, "#f1d176", 26);
  floatText(object.x, object.y - object.r - 8, Object.entries(rewards).map(([k, v]) => `+${v} ${resourceInfo[k][1]}`).join("  "), "#ffe38d", 1.15);
  showToast(`获得 ${Object.entries(rewards).map(([k, v]) => `${resourceInfo[k][1]} ×${v}`).join(" · ")}`);
}

function consume() {
  const inv = state.inventory;
  if (state.player.hunger < 80 && inv.berry > 0) { inv.berry--; state.player.hunger = Math.min(100, state.player.hunger + 24); showToast("吃下浆果 · 饥饿得到缓解"); }
  else if (state.player.thirst < 80 && inv.water > 0) { inv.water--; state.player.thirst = Math.min(100, state.player.thirst + 32); showToast("喝下净水 · 口渴得到缓解"); }
}

function attack() {
  const p = state.player;
  if (!state.running || p.attack > 0 || !ui.craftPanel.classList.contains("hidden")) return;
  p.attack = state.gear.spear ? .38 : .55;
  const reach = state.gear.spear ? 88 : 56;
  let hit = false;
  for (const m of state.monsters) {
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    const a = Math.atan2(m.y - p.y, m.x - p.x);
    const delta = Math.atan2(Math.sin(a - p.facing), Math.cos(a - p.facing));
    if (d < reach && Math.abs(delta) < 1.05) { m.health -= state.gear.spear ? 26 : 12; m.x += Math.cos(a) * 24; m.y += Math.sin(a) * 24; burst(m.x, m.y, "#8eb27c", 8); hit = true; }
  }
  if (hit) showToast("怪物受伤了");
}

function canAfford(cost) { return Object.entries(cost).every(([item, amount]) => state.inventory[item] >= amount); }
function spend(cost) { for (const [item, amount] of Object.entries(cost)) state.inventory[item] -= amount; }
function formatCost(cost) { return Object.entries(cost).map(([k, v]) => `${resourceInfo[k][1]} ×${v}`).join(" · "); }

function craft(id) {
  const recipe = recipes.find((item) => item.id === id);
  if (!recipe || !canAfford(recipe.cost)) return;
  spend(recipe.cost);
  if (id === "axe" || id === "spear") state.gear[id] = true;
  else state.structures.push({
    type: id,
    x: state.player.x,
    y: state.player.y,
    phase: Math.random() * TAU,
    expiresAt: id === "fire" ? state.survivalTime + CYCLE_SECONDS * 2 : Infinity,
    warned: false
  });
  showToast(`已制作：${recipe.name}`); renderRecipes(); updateUI();
}

function toggleCraft(force) {
  if (!state.running) return;
  const open = force ?? ui.craftPanel.classList.contains("hidden");
  ui.craftPanel.classList.toggle("hidden", !open);
  if (open) renderRecipes();
}

function renderRecipes() {
  ui.recipes.innerHTML = recipes.map((recipe) => {
    const owned = (recipe.id === "axe" || recipe.id === "spear") && state.gear[recipe.id];
    return `<button class="recipe" data-recipe="${recipe.id}" ${!canAfford(recipe.cost) || owned ? "disabled" : ""}><strong>${owned ? "✓ " : ""}${recipe.name}</strong><span>${formatCost(recipe.cost)}</span><small>${recipe.note}</small></button>`;
  }).join("");
  ui.recipes.querySelectorAll("[data-recipe]").forEach((button) => button.addEventListener("click", () => craft(button.dataset.recipe)));
}

function updateUI() {
  const p = state.player;
  for (const name of ["health", "hunger", "thirst", "warmth"]) {
    const value = Math.max(0, Math.round(p[name])); ui[`${name}Bar`].style.width = `${value}%`; ui[`${name}Value`].textContent = value;
  }
  ui.clock.textContent = `第 ${state.day} 天 · ${isNight() ? "夜晚" : "白天"}`;
  ui.objective.textContent = state.objective;
  const night = isNight();
  const periodSource = night ? "assets/night-camp.png" : "assets/day-camp.png";
  if (!ui.periodImage.src.endsWith(periodSource)) ui.periodImage.src = periodSource;
  ui.periodImage.alt = night ? "夜晚的荒野营地" : "白天的荒野营地";
  ui.periodLabel.textContent = night ? "☾ 夜晚 · 怪物出没" : "☀ 白天 · 抓紧准备";
  ui.dayCount.textContent = `第 ${Math.min(state.day, 20)} / 20 天`;
  ui.rescueProgress.style.width = `${Math.min(100, state.survivalTime / (CYCLE_SECONDS * 20) * 100)}%`;
  ui.dayCounter.classList.toggle("night", night);
  ui.dayCounter.classList.toggle("day", !night);
  const itemSlots = Object.entries(resourceInfo).map(([id, [icon, label]]) => ({ icon, label, count: state.inventory[id] }));
  itemSlots.push(
    { icon: "🪓", label: "石斧", count: state.gear.axe ? 1 : 0, dim: !state.gear.axe },
    { icon: "🔱", label: "木矛", count: state.gear.spear ? 1 : 0, dim: !state.gear.spear }
  );
  while (itemSlots.length < 12) itemSlots.push(null);
  ui.resources.innerHTML = itemSlots.map((item) => item
    ? `<div class="resource ${item.dim ? "empty" : ""}"><i>${item.icon}</i><span>${item.label}</span><b>${item.count}</b></div>`
    : `<div class="resource empty-slot"><i>＋</i><span>空格</span></div>`).join("");
  const object = nearObject();
  let text = "";
  if (object) {
    const actions = { tree: "砍伐树木", rock: "开采石头", bush: "采摘浆果", pond: "装满水壶", fiber: "收集纤维", crate: "搜索木箱" };
    text = `<kbd>E</kbd> ${actions[object.type]}`;
  } else if ((p.hunger < 80 && state.inventory.berry) || (p.thirst < 80 && state.inventory.water)) text = `<kbd>E</kbd> 进食或饮水`;
  ui.prompt.innerHTML = text; ui.prompt.classList.toggle("hidden", !text);
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) { const a = Math.random() * TAU; state.particles.push({ x, y, vx: Math.cos(a) * (30 + Math.random() * 60), vy: Math.sin(a) * (30 + Math.random() * 60), life: .35 + Math.random() * .35, color }); }
}

function floatText(x, y, text, color = "#ffffff", life = .65) {
  state.popups.push({ x, y, text, color, life, maxLife: life });
}

function footstepDust(player) {
  for (let i = 0; i < 4; i++) {
    state.particles.push({
      x: player.x + (Math.random() - .5) * 16,
      y: player.y + 19 + Math.random() * 5,
      vx: (Math.random() - .5) * 22,
      vy: -5 - Math.random() * 12,
      life: .22 + Math.random() * .16,
      color: "#a49a78"
    });
  }
}

function showToast(text) {
  ui.toast.textContent = text; ui.toast.classList.remove("hidden"); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.add("hidden"), 1700);
}

function draw() {
  const now = performance.now();
  const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
  lastTime = now;
  if (state) update(dt);
  const cam = state ? camera() : { x: 0, y: 0 };
  if (state?.shake > 0) { cam.x += (Math.random() - .5) * state.shake * 18; cam.y += (Math.random() - .5) * state.shake * 18; }
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  drawGround(cam);
  if (state) {
    const visible = (o) => o.x > cam.x - 100 && o.x < cam.x + innerWidth + 100 && o.y > cam.y - 100 && o.y < cam.y + innerHeight + 100;
    state.objects.filter((o) => !o.depleted && visible(o)).sort((a, b) => a.y - b.y).forEach(drawObject);
    state.structures.filter(visible).forEach(drawStructure);
    state.monsters.filter(visible).sort((a, b) => a.y - b.y).forEach(drawMonster);
    drawPlayer(state.player);
    state.particles.forEach((p) => { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; circle(p.x, p.y, 2 + p.life * 3); });
    ctx.textAlign = "center"; ctx.font = "800 13px system-ui"; state.popups.forEach((p) => { ctx.globalAlpha = Math.min(1, p.life / Math.min(.25, p.maxLife)); ctx.strokeStyle = "#09100c"; ctx.lineWidth = 4; ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y); }); ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (state) drawNight();
  animationId = requestAnimationFrame(draw);
}

function drawGround(cam) {
  ctx.fillStyle = "#263a2a"; ctx.fillRect(0, 0, WORLD, WORLD);
  const grid = 90; const startX = Math.max(0, Math.floor(cam.x / grid) * grid); const startY = Math.max(0, Math.floor(cam.y / grid) * grid);
  for (let x = startX; x < Math.min(WORLD, cam.x + innerWidth + grid); x += grid) for (let y = startY; y < Math.min(WORLD, cam.y + innerHeight + grid); y += grid) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
    ctx.fillStyle = n > 0 ? "#2b412e" : "#223526"; ctx.globalAlpha = .4; ctx.beginPath(); ctx.arc(x + n * 24, y + n * 31, 24 + Math.abs(n) * 26, 0, TAU); ctx.fill();
    ctx.globalAlpha = .32; ctx.strokeStyle = "#678060"; ctx.beginPath(); ctx.moveTo(x + 15, y + 14); ctx.lineTo(x + 18, y + 7); ctx.moveTo(x + 18, y + 14); ctx.lineTo(x + 24, y + 9); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.strokeStyle = "#71805855"; ctx.lineWidth = 5; ctx.strokeRect(4, 4, WORLD - 8, WORLD - 8);
}

function shadow(x, y, rx, ry) { ctx.fillStyle = "#07100a55"; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }

function drawObject(o) {
  const s = o.scale;
  if (o.type === "tree") {
    shadow(o.x + 7, o.y + 18, 31 * s, 10 * s); ctx.fillStyle = "#694b31"; ctx.fillRect(o.x - 6 * s, o.y - 2, 12 * s, 31 * s);
    ctx.fillStyle = "#17311f"; circle(o.x, o.y - 19 * s, 26 * s); ctx.fillStyle = "#2f5734"; circle(o.x - 12 * s, o.y - 13 * s, 19 * s); circle(o.x + 14 * s, o.y - 12 * s, 18 * s); ctx.fillStyle = "#477047"; circle(o.x - 7, o.y - 29 * s, 13 * s);
  } else if (o.type === "rock") {
    shadow(o.x + 4, o.y + 12, 25 * s, 8 * s); ctx.fillStyle = "#768079"; polygon([[o.x-22*s,o.y+11*s],[o.x-14*s,o.y-15*s],[o.x+8*s,o.y-20*s],[o.x+24*s,o.y+4*s],[o.x+14*s,o.y+16*s]]); ctx.fillStyle="#a1a79d"; polygon([[o.x-14*s,o.y-15*s],[o.x+8*s,o.y-20*s],[o.x+2*s,o.y-3*s],[o.x-10*s,o.y]]);
  } else if (o.type === "bush") {
    shadow(o.x, o.y + 10, 22, 7); ctx.fillStyle = "#315b32"; circle(o.x - 9, o.y, 13); circle(o.x + 8, o.y - 3, 15); circle(o.x, o.y - 10, 13); ctx.fillStyle="#b44f52"; for(let i=0;i<5;i++) circle(o.x+Math.cos(o.phase+i*2.1)*13,o.y-4+Math.sin(o.phase+i*1.7)*8,3);
  } else if (o.type === "pond") {
    ctx.fillStyle = "#365f61"; ctx.beginPath(); ctx.ellipse(o.x,o.y,52*o.scale,34*o.scale,o.phase*.1,0,TAU);ctx.fill();ctx.strokeStyle="#83a99888";ctx.lineWidth=2;ctx.beginPath();ctx.arc(o.x-6,o.y,20,3.5,5.8);ctx.stroke();
  } else if (o.type === "fiber") {
    ctx.strokeStyle="#8ba85e";ctx.lineWidth=3;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(o.x+i*3,o.y+12);ctx.quadraticCurveTo(o.x+i*6,o.y,o.x+i*5,o.y-15-Math.abs(i)*2);ctx.stroke();}
  } else if (o.type === "crate") {
    shadow(o.x,o.y+14,20,7);ctx.fillStyle="#765638";ctx.fillRect(o.x-17,o.y-15,34,30);ctx.strokeStyle="#b28b55";ctx.lineWidth=3;ctx.strokeRect(o.x-17,o.y-15,34,30);ctx.beginPath();ctx.moveTo(o.x-15,o.y-13);ctx.lineTo(o.x+15,o.y+13);ctx.stroke();
  } else if (o.type === "tower") drawTower(o);
}

function drawTower(o) {
  shadow(o.x,o.y+37,48,14);ctx.strokeStyle="#89948b";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(o.x-31,o.y+34);ctx.lineTo(o.x,o.y-62);ctx.lineTo(o.x+31,o.y+34);ctx.moveTo(o.x-20,o.y);ctx.lineTo(o.x+20,o.y);ctx.moveTo(o.x-27,o.y+22);ctx.lineTo(o.x+27,o.y+22);ctx.stroke();ctx.fillStyle=state.repair===3?"#e95e50":"#6f7a72";circle(o.x,o.y-64,7);if(state.repair===3){ctx.strokeStyle="#e95e5088";ctx.lineWidth=2;for(let r=14;r<38;r+=10){ctx.beginPath();ctx.arc(o.x,o.y-64,r,-.8,.8);ctx.stroke();}}
}

function drawStructure(s) {
  if (s.type === "fire") {
    const fuel = Math.max(0, Math.min(1, (s.expiresAt - state.survivalTime) / (CYCLE_SECONDS * 2)));
    const intensity = .65 + fuel * .35;
    shadow(s.x, s.y + 10, 22, 7);
    ctx.strokeStyle = "#7a5b3b";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(s.x - 14, s.y + 8); ctx.lineTo(s.x + 14, s.y - 4);
    ctx.moveTo(s.x - 14, s.y - 4); ctx.lineTo(s.x + 14, s.y + 8);
    ctx.stroke();
    const flicker = Math.sin(performance.now() * .012 + s.phase) * 3;
    ctx.fillStyle = "#e65c3f";
    polygon([[s.x - 11, s.y + 2], [s.x, s.y - (24 + flicker) * intensity], [s.x + 11, s.y + 2]]);
    ctx.fillStyle = "#ffd273";
    polygon([[s.x - 6, s.y + 2], [s.x + 2, s.y - (14 - flicker) * intensity], [s.x + 6, s.y + 2]]);
    ctx.fillStyle = "#151d16cc";
    ctx.fillRect(s.x - 18, s.y + 20, 36, 4);
    ctx.fillStyle = fuel > .2 ? "#e8c66a" : "#df6855";
    ctx.fillRect(s.x - 18, s.y + 20, 36 * fuel, 4);
  } else {
    shadow(s.x, s.y + 20, 34, 10);
    ctx.fillStyle = "#786345";
    polygon([[s.x - 34, s.y + 19], [s.x, s.y - 28], [s.x + 34, s.y + 19]]);
    ctx.fillStyle = "#9b8357";
    polygon([[s.x - 34, s.y + 19], [s.x, s.y - 28], [s.x - 3, s.y + 19]]);
    ctx.fillStyle = "#171d16";
    ctx.fillRect(s.x - 7, s.y + 2, 14, 17);
  }
}

function drawMonster(m) {
  const bob=Math.sin(performance.now()*.008+m.phase)*2;shadow(m.x,m.y+18,31,10);ctx.save();ctx.translate(m.x,m.y+bob);ctx.rotate(m.facing||0);if(sprites.monster.complete&&sprites.monster.naturalWidth)ctx.drawImage(sprites.monster,-66,-66,132,132);else{ctx.fillStyle="#17251c";circle(0,0,18);ctx.fillStyle="#d45d4e";circle(8,-5,3);}ctx.restore();
}

function drawPlayer(p) {
  const stride = Math.sin(p.walkPhase);
  const lift = Math.abs(stride) * 4 * p.walkBlend;
  const sway = stride * .035 * p.walkBlend;
  const stretch = 1 + Math.abs(stride) * .025 * p.walkBlend;
  shadow(p.x, p.y + 23, 24 - lift * 1.2, 9 - lift * .35);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = "#e8c66a99";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 18, 28, 12, 0, 0, TAU);
  ctx.stroke();

  // Animate a readable walking rhythm while keeping every sprite upright.
  ctx.translate(0, -lift);
  ctx.rotate(sway);
  ctx.scale(1 / stretch, stretch);
  if (p.hurt > 0) ctx.globalAlpha = .45;
  const frame = Math.floor((p.walkPhase % TAU) / TAU * 6) % 6;
  const sprite = p.moving ? sprites.walk[p.direction][frame] : sprites.idle[p.direction];
  if (sprite.complete && sprite.naturalWidth) {
    ctx.shadowColor = "#f3d98d";
    ctx.shadowBlur = 12;
    ctx.drawImage(sprite, -64, -64, 128, 128);
  } else {
    ctx.fillStyle = "#d5c69e";
    circle(0, 0, 13);
  }
  ctx.shadowBlur = 0;

  // The attack arc still follows the full movement direction.
  if (p.attack > 0) {
    ctx.rotate(p.facing);
    ctx.strokeStyle = "#f5e3a4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, state.gear.spear ? 70 : 52, -.85, .85);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNight() {
  const darkness = .46 * (1 - daylight());
  if (darkness <= .01) return;
  const cam = camera();
  const lights = [{ x: state.player.x - cam.x, y: state.player.y - cam.y, core: 70, radius: 260 }];
  state.structures.forEach((structure) => {
    if (structure.type === "fire") lights.push({ x: structure.x - cam.x, y: structure.y - cam.y, core: 75, radius: 280, fire: true });
    if (structure.type === "shelter") lights.push({ x: structure.x - cam.x, y: structure.y - cam.y, core: 65, radius: 175 });
  });

  // Build darkness on its own layer so light holes never erase game objects.
  nightCtx.clearRect(0, 0, innerWidth, innerHeight);
  nightCtx.globalCompositeOperation = "source-over";
  nightCtx.fillStyle = `rgba(7, 16, 24, ${darkness})`;
  nightCtx.fillRect(0, 0, innerWidth, innerHeight);
  nightCtx.globalCompositeOperation = "destination-out";
  lights.forEach((light) => {
    const glow = nightCtx.createRadialGradient(light.x, light.y, light.core, light.x, light.y, light.radius);
    glow.addColorStop(0, "rgba(0,0,0,1)");
    glow.addColorStop(.35, "rgba(0,0,0,.92)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    nightCtx.fillStyle = glow;
    nightCtx.beginPath();
    nightCtx.arc(light.x, light.y, light.radius, 0, TAU);
    nightCtx.fill();
  });
  nightCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(nightLayer, 0, 0, innerWidth, innerHeight);

  // Give campfires a warm glow above the darkness layer.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  lights.filter((light) => light.fire).forEach((light) => {
    const warmth = ctx.createRadialGradient(light.x, light.y, 8, light.x, light.y, 150);
    warmth.addColorStop(0, "rgba(255, 190, 82, .46)");
    warmth.addColorStop(.35, "rgba(232, 106, 48, .18)");
    warmth.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = warmth;
    ctx.beginPath();
    ctx.arc(light.x, light.y, 150, 0, TAU);
    ctx.fill();
  });
  ctx.restore();

  if (state.player.hurt > 0) {
    ctx.fillStyle = `rgba(145,20,20,${state.player.hurt * .35})`;
    ctx.fillRect(0, 0, innerWidth, innerHeight);
  }
}

function circle(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
function polygon(points){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.closePath();ctx.fill();}

function startGame() {
  state=createState();state.running=true;ui.startScreen.classList.add("hidden");ui.endScreen.classList.add("hidden");updateUI();showToast("在天黑前找到水源");
}

function endGame(won) {
  if(!state.running)return;state.running=false;state.won=won;
  const survivedDays=Math.min(20,state.day);const best=Math.max(Number(localStorage.getItem("wildboundBestDay")||0),survivedDays);localStorage.setItem("wildboundBestDay",best);
  ui.endEyebrow.textContent=won?"远处传来了直升机的轰鸣":"荒野又留下了一位旅人";ui.endTitle.textContent=won?"救援抵达":"生存失败";
  ui.endText.textContent=won?"你坚持生存了整整 20 天，终于等来了救援！":`你坚持到了第 ${survivedDays} 天。最佳纪录：${best} 天。`;ui.endScreen.classList.remove("hidden");
}

addEventListener("resize",resize);resize();
addEventListener("keydown",(event)=>{keys.add(event.code);if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(event.code))event.preventDefault();if(event.repeat)return;if(event.code==="KeyE")interact();if(event.code==="Space")attack();if(event.code==="KeyC")toggleCraft();if(event.code==="Escape")toggleCraft(false);});
addEventListener("keyup",(event)=>keys.delete(event.code));
ui.startButton.addEventListener("click",startGame);ui.restartButton.addEventListener("click",startGame);ui.craftButton.addEventListener("click",()=>toggleCraft(true));ui.craftPanel.querySelector("[data-close]").addEventListener("click",()=>toggleCraft(false));ui.interactButton.addEventListener("pointerdown",interact);ui.attackButton.addEventListener("pointerdown",attack);

const stick=ui.joystick;const knob=stick.querySelector("i");
function moveStick(event){const rect=stick.getBoundingClientRect();let x=event.clientX-(rect.left+rect.width/2),y=event.clientY-(rect.top+rect.height/2);const d=Math.hypot(x,y),limit=36;if(d>limit){x=x/d*limit;y=y/d*limit;}joystick.x=x/limit;joystick.y=y/limit;knob.style.transform=`translate(${x}px,${y}px)`;}
stick.addEventListener("pointerdown",(event)=>{joystick.active=true;stick.setPointerCapture(event.pointerId);moveStick(event);});stick.addEventListener("pointermove",(event)=>{if(joystick.active)moveStick(event);});stick.addEventListener("pointerup",()=>{joystick={x:0,y:0,active:false};knob.style.transform="";});

state=createState();updateUI();draw();
