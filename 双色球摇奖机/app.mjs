import { createBallPool, randomInt, restoreHistory } from './draw.mjs';
import { DrawSequence } from './sequence.mjs';
import { createMachine, stepMachine, FIXED_STEP } from './simulation.mjs';
import { createPresetPools } from './presets.mjs';
import { createPresetUI } from './preset-ui.mjs';
import { MachineAudio } from './machine-audio.mjs';
import { createRitualUI } from './ritual-ui.mjs';
import { createMascotVoice } from './mascot-lines.mjs';
import { createTicketUI } from './ticket-ui.mjs?v=guardian-6';
import { createGameMotion } from './game-motion.mjs';

const canvas = document.querySelector('#machine');
const context = canvas.getContext('2d');
const drawButton = document.querySelector('#draw-button');
const buttonLabel = drawButton.querySelector('span');
const status = document.querySelector('#status');
const progressLabel = document.querySelector('#draw-progress');
const soundButton = document.querySelector('#sound-toggle');
const slots = [...document.querySelectorAll('#result-balls > li')];
const historyDialog = document.querySelector('#history-dialog');
const HISTORY_KEY = 'double-color-machine.history.v1';
const SOUND_KEY = 'double-color-machine.sound.v1';
const sequence = new DrawSequence();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const formatNumber = number => String(number).padStart(2, '0');
const readStorage = key => { try { return localStorage.getItem(key); } catch { return null; } };
const writeStorage = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Storage is optional. */ } };
const presetUI = createPresetUI({ readStorage, writeStorage });
const mascotVoice = createMascotVoice({ readStorage, writeStorage });
const ticketUI = createTicketUI({ onAgain: () => drawButton.click(), canSelect: () => !drawButton.disabled });
const motion = createGameMotion();
const ritualUI = createRitualUI({ readStorage, writeStorage,
  onChange: ritual => { buttonLabel.textContent = ritual.buttonLabel; } });
let history = restoreHistory(readStorage(HISTORY_KEY));
let soundEnabled = readStorage(SOUND_KEY) === 'true';
let sprites;
let geometry;
let redChamber;
let blueChamber;
let traveling = null;
let frame = 0;
let lastFrame = 0;
let settleRemaining = 3;
let ready = false;
let machine;
let accumulator = 0;
let preparing = false;
let activePresetName = null;
let activeRitual = null;

const audio = new MachineAudio();
audio.setEnabled(soundEnabled);

function updateSoundButton() {
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  soundButton.setAttribute('aria-label', soundEnabled ? '关闭音效' : '开启音效');
  soundButton.title = soundEnabled ? '关闭音效' : '开启音效';
  soundButton.querySelector('img').src = `assets/controls/sound-${soundEnabled ? 'on' : 'off'}.webp`;
}
updateSoundButton();
soundButton.addEventListener('click', async () => {
  soundEnabled = !soundEnabled;
  updateSoundButton();
  writeStorage(SOUND_KEY, String(soundEnabled));
  audio.setEnabled(soundEnabled);
  audio.mix(sequence.active && !document.hidden);
  await audio.prepare();
});

function resetChambers(plan = null, motionMode = reducedMotion.matches) {
  machine = createMachine(geometry, { sequence, reducedMotion: motionMode,
    seed: plan?.seed ?? randomInt(0x100000000),
    redNumbers: plan?.redNumbers ?? createBallPool(33), blueNumbers: plan?.blueNumbers ?? createBallPool(16) });
  redChamber = machine.red;
  blueChamber = machine.blue;
  traveling = null;
  accumulator = 0;
}

function drawBall(ball, blue, alpha = 1) {
  const image = blue ? sprites.blue : sprites.red;
  const radius = ball.radius * 1.05;
  context.save();
  context.globalAlpha = alpha;
  context.drawImage(image, ball.x - radius, ball.y - radius, radius * 2, radius * 2);
  context.translate(ball.x, ball.y);
  context.rotate(ball.angle || 0);
  context.fillStyle = '#fff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `800 ${ball.radius * 0.95}px ui-rounded, -apple-system, sans-serif`;
  context.fillText(formatNumber(ball.number), 0, ball.radius * 0.07);
  context.restore();
}

function drawChamber(chamber, blue) {
  const bounds = blue ? geometry.blueChamber : geometry.redChamber;
  context.save();
  context.beginPath();
  context.ellipse(bounds.centerX, bounds.centerY, bounds.radiusX, bounds.radiusY, 0, 0, Math.PI * 2);
  context.clip();
  const scale = blue ? 0.15 : 0.46;
  context.save();
  context.translate(bounds.centerX, bounds.centerY);
  context.rotate(chamber.angle);
  context.drawImage(sprites.paddle, -625 * scale, -715 * scale, 1254 * scale, 1254 * scale);
  context.restore();
  for (const ball of chamber.balls) drawBall(ball, blue);
  // The source glass reflections sit above the moving sprites.
  context.globalAlpha = 0.17;
  context.drawImage(sprites.machine, 0, 0, geometry.width, geometry.height);
  context.restore();
}

function paint() {
  if (!ready) return;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / 1140, canvas.height / geometry.height);
  context.setTransform(scale, 0, 0, scale, (canvas.width - 1140 * scale) / 2 - 85 * scale,
    (canvas.height - geometry.height * scale) / 2);
  context.drawImage(sprites.machine, 0, 0, geometry.width, geometry.height);
  drawChamber(redChamber, false);
  drawChamber(blueChamber, true);
  if (traveling) {
    const ball = traveling.ball;
    drawBall({ ...ball, angle: reducedMotion.matches ? 0 : ball.angle }, traveling.blue);
    context.save();
    context.beginPath();
    context.arc(ball.x, ball.y, ball.radius * 1.05, 0, Math.PI * 2);
    context.clip();
    context.globalAlpha = 0.15;
    context.drawImage(sprites.machine, 0, 0, geometry.width, geometry.height);
    context.restore();
  }
  canvas.dataset.phase = sequence.phase;
  canvas.dataset.mixingSeed = machine.seed;
  canvas.dataset.motorSpeed = Math.max(redChamber.angularVelocity, blueChamber.angularVelocity).toFixed(2);
  canvas.dataset.redCount = redChamber.balls.length;
  canvas.dataset.blueCount = blueChamber.balls.length;
  canvas.dataset.revealed = slots.filter(slot => !slot.classList.contains('is-empty')).length;
  canvas.dataset.outletDistance = traveling ? traveling.distance.toFixed(1) : '';
  canvas.dataset.outletBounces = traveling ? traveling.bounces : 0;
}

function reveal(event) {
  const slot = slots[event.index];
  slot.querySelector('span').textContent = formatNumber(event.number);
  slot.className = 'result-ball is-new';
  slot.setAttribute('aria-label', `${event.blue ? '蓝' : '红'}球 ${formatNumber(event.number)}`);
  motion.reveal(slot);
  progressLabel.textContent = `${event.index + 1} / 7`;
  if (sequence.phase === 'complete') {
    const line = mascotVoice.next(activeRitual?.id);
    const draw = { ...sequence.draw, at: Date.now(), ritualId: activeRitual?.id ?? 'direct',
      ...(line ? { line } : {}), ...(activePresetName ? { presetName: activePresetName } : {}) };
    history = [draw, ...history].slice(0, 20);
    writeStorage(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
    document.querySelector('#history-board-list').scrollTop = 0;
    drawButton.disabled = false;
    presetUI.setLocked(false);
    ritualUI.setLocked(false);
    buttonLabel.textContent = ritualUI.getSelected().buttonLabel;
    progressLabel.textContent = '号码已选齐';
    status.classList.toggle('is-mascot-line', Boolean(line));
    status.textContent = line ? `${activeRitual.name}：${line}` : '这组号码选好了，想换一组也可以';
    canvas.setAttribute('aria-label', `选号完成，红球 ${draw.red.map(formatNumber).join('、')}，蓝球 ${formatNumber(draw.blue)}`);
    audio.mix(false);
    motion.complete();
    ticketUI.show(draw);
    settleRemaining = 3;
  } else {
    slots[event.index + 1].classList.add('is-next');
    status.textContent = event.index === 5 ? '红球已选齐，接下来选蓝球' : `红球 ${formatNumber(event.number)} 已选，继续看下一颗`;
  }
}

function animate(timestamp) {
  frame = 0;
  if (document.hidden) return;
  const dt = Math.min((timestamp - (lastFrame || timestamp)) / 1000, 1 / 30);
  lastFrame = timestamp;
  const active = sequence.active;
  accumulator += dt;
  while (accumulator + 1e-9 >= FIXED_STEP) {
    const events = stepMachine(machine, FIXED_STEP);
    accumulator -= FIXED_STEP;
    traveling = machine.traveling;
    audio.update(machine, events);
    if (events.gateOpened) {
      status.textContent = sequence.blue ? '蓝球出口打开，等待小球落入管道…' : '出口打开，等待小球落入滑道…';
    }
    if (events.capture) {
      status.textContent = events.capture.blue ? '蓝球沿管道滚落中…' : `第 ${events.capture.index + 1} 颗红球沿滑道滚落中…`;
    }
    if (events.reveal) reveal(events.reveal);
  }
  if (!active) settleRemaining -= dt;
  paint();
  if (sequence.active || settleRemaining > 0) requestFrame();
}

function requestFrame() { if (!frame && !document.hidden) frame = requestAnimationFrame(animate); }

function resize() {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  if (geometry) {
    const fit = Math.min(rect.width / 1140, rect.height / geometry.height);
    const accessories = document.querySelector('#machine-accessories');
    const artworkTop = rect.top + (rect.height - geometry.height * fit) / 2;
    const headingBottom = document.querySelector('.intro').getBoundingClientRect().bottom;
    accessories.style.width = `${rect.width}px`;
    accessories.style.height = `${geometry.height * fit}px`;
    accessories.style.setProperty('--heading-clearance', `${headingBottom + 14 - artworkTop}px`);
    accessories.style.setProperty('--mascot-clearance', `${8 - artworkTop}px`);
  }
  paint();
}
new ResizeObserver(resize).observe(canvas);

async function preparePreset(preset, motionMode) {
  const seed = randomInt(0x100000000);
  let worker;
  try {
    worker = new Worker(new URL('./preset-worker.mjs', import.meta.url), { type: 'module' });
    return await new Promise((resolve, reject) => {
      worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data);
      worker.onerror = () => reject(new Error('Preset worker could not be loaded'));
      worker.postMessage({ geometry, preset, reducedMotion: motionMode, seed });
    });
  } catch {
    return createPresetPools(geometry, preset, motionMode, seed);
  } finally { worker?.terminate(); }
}

drawButton.addEventListener('click', async () => {
  if (!ready || sequence.active || preparing) return;
  audio.prepare();
  preparing = true;
  drawButton.disabled = true;
  presetUI.setLocked(true);
  ritualUI.setLocked(true);
  const preset = presetUI.getSelected();
  const ritual = ritualUI.getSelected();
  const motionMode = reducedMotion.matches;
  status.classList.remove('is-mascot-line');
  status.textContent = '正在准备本次选号…';
  try {
    const ceremony = ritualUI.play({ reducedMotion: motionMode, line: mascotVoice.next(ritual.id) });
    let planReady = Promise.resolve(null);
    if (preset) {
      buttonLabel.textContent = '准备中…';
      status.textContent = '正在准备号码预设…';
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
      planReady = preparePreset(preset, motionMode);
    }
    const [plan] = await Promise.all([planReady, ceremony]);
    resetChambers(plan, motionMode);
    activePresetName = preset?.name ?? null;
    activeRitual = ritual;
  } catch {
    ritualUI.cancel();
    status.textContent = '选号准备失败，请重试';
    drawButton.disabled = false;
    presetUI.setLocked(false);
    ritualUI.setLocked(false);
    buttonLabel.textContent = ritualUI.getSelected().buttonLabel;
    preparing = false;
    return;
  }
  preparing = false;
  sequence.start();
  motion.start();
  slots.forEach((slot, index) => {
    slot.className = `result-ball is-empty${index === 0 ? ' is-next' : ''}`;
    slot.querySelector('span').textContent = '?';
    slot.removeAttribute('aria-label');
  });
  progressLabel.textContent = '0 / 7';
  status.textContent = preset ? `使用「${preset.name}」，先混球再选号` : '正在混球，稍后逐个选出号码';
  canvas.setAttribute('aria-label', '选号中，小球在透明球舱内滚动碰撞');
  drawButton.disabled = true;
  buttonLabel.textContent = '选号中…';
  audio.mix(!document.hidden);
  lastFrame = 0;
  requestFrame();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && sequence.active) audio.prepare();
  audio.mix(sequence.active && !document.hidden);
  if (document.hidden) {
    cancelAnimationFrame(frame);
    frame = 0;
  } else {
    lastFrame = 0;
    if (sequence.active || settleRemaining > 0) requestFrame();
  }
});

function renderHistory() {
  const list = document.querySelector('#history-list');
  const board = document.querySelector('#history-board-list');
  list.replaceChildren();
  board.replaceChildren();
  document.querySelector('#history-empty').hidden = history.length > 0;
  document.querySelector('#history-board-empty').hidden = history.length > 0;
  document.querySelector('#history-board-count').textContent = `${history.length} 组`;
  for (const entry of history) {
    const item = document.createElement('li');
    item.className = 'history-item';
    const time = document.createElement('time');
    time.dateTime = new Date(entry.at).toISOString();
    time.textContent = new Date(entry.at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const label = document.createElement('span');
    label.className = 'history-preset';
    label.textContent = entry.presetName ? ` · 预设：${entry.presetName}` : ' · 完全随机';
    const balls = document.createElement('ol');
    balls.className = 'result-balls';
    [...entry.red, entry.blue].forEach((number, index) => {
      const ball = document.createElement('li');
      ball.className = 'result-ball';
      ball.dataset.color = index === 6 ? 'blue' : 'red';
      ball.textContent = formatNumber(number);
      ball.setAttribute('aria-label', `${index === 6 ? '蓝' : '红'}球 ${formatNumber(number)}`);
      balls.append(ball);
    });
    const view = document.createElement('button');
    view.type = 'button'; view.className = 'history-ticket'; view.textContent = '选号单 ↗';
    view.setAttribute('aria-label', `查看 ${time.textContent} 的选号单`);
    view.addEventListener('click', () => { historyDialog.close(); ticketUI.show(entry); });
    item.append(time, label, balls, view);
    list.append(item);
    const boardItem = item.cloneNode(true);
    boardItem.querySelector('.history-ticket').addEventListener('click', () => ticketUI.show(entry));
    board.append(boardItem);
  }
}
renderHistory();

matchMedia('(min-width: 960px)').addEventListener('change', event => {
  if (event.matches && historyDialog.open) historyDialog.close();
});

document.querySelector('#history-button').addEventListener('click', () => {
  renderHistory();
  historyDialog.showModal();
});
document.querySelector('#close-history').addEventListener('click', () => historyDialog.close());
historyDialog.addEventListener('click', event => {
  if (event.target !== historyDialog) return;
  const rect = historyDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) historyDialog.close();
});

async function loadImage(source) {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

async function initialize() {
  try {
    const response = await fetch('assets/machine-layout.json');
    if (!response.ok) throw new Error('Geometry could not be loaded');
    geometry = await response.json();
    const [machine, red, blue, paddle] = await Promise.all([
      loadImage('assets/machine.webp'), loadImage('assets/red-ball-small.webp'), loadImage('assets/blue-ball-small.webp'),
      loadImage('assets/paddle-small.webp'),
    ]);
    sprites = { machine, red, blue, paddle };
    ticketUI.prepare();
    resetChambers();
    ready = true;
    document.querySelector('#load-message').hidden = true;
    drawButton.disabled = false;
    resize();
    requestFrame();
  } catch {
    document.querySelector('#load-message').textContent = '素材加载失败，请刷新重试';
    status.textContent = '请检查网络后刷新页面';
  }
}
initialize();
