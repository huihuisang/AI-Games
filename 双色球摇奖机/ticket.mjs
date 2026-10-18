import { validateDraw } from './draw.mjs';
import { RITUALS } from './rituals.mjs?v=front-2';

export const TICKET_SIZE = Object.freeze({ width: 900, height: 1700 });
export const TICKET_PAPER = Object.freeze({ x: 18, y: 1260, width: 864, height: 422.4 });
const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';

export function createSelectionTicket(entry) {
  if (!validateDraw(entry) || !Number.isFinite(entry.at) || Math.abs(entry.at) > 8.64e15) {
    throw new TypeError('Invalid selection record');
  }
  const ritual = RITUALS.find(item => item.id === entry.ritualId) ?? RITUALS.at(-1);
  const date = new Date(entry.at);
  const pad = value => String(value).padStart(2, '0');
  return Object.freeze({
    red: Object.freeze([...entry.red].sort((a, b) => a - b)), blue: entry.blue, at: entry.at,
    id: `XY-${entry.at.toString(36).toUpperCase()}`,
    time: `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`,
    mode: typeof entry.presetName === 'string' ? entry.presetName.slice(0, 20) : '完全随机',
    ritual, line: typeof entry.line === 'string' && entry.line.length > 0 ? entry.line.slice(0, 80) : '这一组，送给今天的你。',
  });
}

function text(ctx, value, x, y, size, color = '#64391c', weight = 500, align = 'left', family = FONT) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

export function layoutTicketQuote(value, measure, { width = 798, height = 224, maxSize = 90, minSize = 28 } = {}) {
  const comma = value.search(/[，。！？：]/);
  const parts = comma > 0 && comma < value.length - 1 ? [value.slice(0, comma + 1), value.slice(comma + 1)] : null;
  if (parts) {
    for (let size = maxSize; size >= minSize; size -= 2) {
      if (parts.every(part => measure(part, size) <= width) && size * 1.2 * 2 <= height) {
        return { lines: parts, size, lineHeight: size * 1.2 };
      }
    }
  }
  for (let size = maxSize; size >= minSize; size -= 2) {
    let lines = [];
    if (parts && parts.every(part => measure(part, size) <= width)) lines = parts;
    else {
      let line = '';
      for (const char of value) {
        if (line && measure(line + char, size) > width) {
          if (/[，。！？、；：]/.test(char) && line.length > 1) {
            lines.push(line.slice(0, -1)); line = line.at(-1);
          } else { lines.push(line); line = ''; }
        }
        line += char;
      }
      if (line) lines.push(line);
    }
    const lineHeight = size * 1.2;
    if (lines.length * lineHeight <= height || size === minSize) return { lines, size, lineHeight };
  }
}

function contain(ctx, image, x, y, width, height) {
  const scale = Math.min(width / image.width, height / image.height);
  const w = image.width * scale, h = image.height * scale;
  ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
}

export function drawSelectionTicket(ctx, ticket, art = {}) {
  if (!art.backdrop || !art.paper || !art.red || !art.blue || !(art.mascot || art.neutral)) {
    throw new Error('Selection slip artwork is not ready');
  }
  const { width, height } = TICKET_SIZE;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.drawImage(art.backdrop, 0, 0, width, height);
  if (art.mascot && ticket.ritual.id === 'caishen') contain(ctx, art.mascot, -50, 0, 1000, 1000);
  else contain(ctx, art.mascot ?? art.neutral, 0, 25, 900, 960);
  const brush = art.brushReady ? '"Lucky Brush", ' + FONT : FONT;
  const quote = layoutTicketQuote(ticket.line, (value, size) => {
    ctx.font = `${art.brushReady ? 700 : 850} ${size}px ${brush}`;
    return ctx.measureText(value).width;
  });
  const top = 1010 + (224 - quote.lines.length * quote.lineHeight) / 2;
  quote.lines.forEach((line, index) => text(ctx, line, 450, top + quote.size + index * quote.lineHeight,
    quote.size, '#6e330e', art.brushReady ? 700 : 850, 'center', brush));
  text(ctx, `—— ${ticket.ritual.art ? ticket.ritual.name : '自己也很棒'}`, 820, 1244, 30, '#895027', 600, 'right');

  drawSelectionPaper(ctx, ticket, art.paper, art.red, art.blue);
  ctx.restore();
}

export function drawSelectionPaper(ctx, ticket, paper, red, blue) {
  ctx.save();
  // The generated plate contains its paper grain, gold edge, and real perforation.
  ctx.drawImage(paper, TICKET_PAPER.x, TICKET_PAPER.y, TICKET_PAPER.width, TICKET_PAPER.height);
  text(ctx, '双色球 · 单式选号', 450, 1335, 31, '#6f4729', 750, 'center');
  [...ticket.red, ticket.blue].forEach((number, index) => {
    const x = 99 + index * 102, y = 1368, size = 90;
    ctx.drawImage(index === 6 ? blue : red, x - 3, y - 3, size + 6, size + 6);
    text(ctx, String(number).padStart(2, '0'), x + size / 2, y + 61, 43, '#fff', 850, 'center');
  });
  // Align the stub to the measured perforation endpoints on the scaled paper.
  const stubLeft = 78, stubRight = 822;
  text(ctx, ticket.time, stubLeft, 1526, 23, '#997252');
  text(ctx, ticket.id, stubLeft, 1568, 23, '#997252');
  const mode = `选号模式 · ${ticket.mode}`;
  let modeSize = 18;
  while (modeSize > 12) {
    ctx.font = `500 ${modeSize}px ${FONT}`;
    if (ctx.measureText(mode).width <= 356) break;
    modeSize--;
  }
  text(ctx, mode, stubRight, 1594, modeSize, '#a18462', 500, 'right');
  // This identifier pattern is decorative; it cannot be used to purchase or redeem a ticket.
  const bars = [...ticket.id].flatMap(char => [...char.charCodeAt(0).toString(2).padStart(7, '0')]);
  const barcodeWidth = 358;
  const unit = barcodeWidth / (bars.reduce((sum, bit) => sum + (bit === '1' ? 3 : 2), 0) + (bars.length - 1) * 2);
  let x = stubRight - barcodeWidth;
  for (const bit of bars) {
    const bar = (bit === '1' ? 3 : 2) * unit;
    ctx.fillStyle = '#765030'; ctx.fillRect(x, 1516, bar, 54); x += bar + 2 * unit;
  }
  text(ctx, '仅供模拟选号 · 非真实彩票', stubLeft, 1632, 18, '#a18462');
  text(ctx, '角色祝福不改变概率', stubRight, 1632, 18, '#a18462', 500, 'right');
  ctx.restore();
}
