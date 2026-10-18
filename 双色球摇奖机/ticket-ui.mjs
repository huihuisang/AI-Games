import { createSelectionTicket, drawSelectionTicket, TICKET_SIZE } from './ticket.mjs?v=guardian-6';

export function createTicketUI({ onAgain, canSelect = () => true }) {
  const dialog = document.querySelector('#ticket-dialog');
  const image = document.querySelector('#ticket-image');
  const status = document.querySelector('#ticket-status');
  const save = document.querySelector('#save-ticket');
  const share = document.querySelector('#share-ticket');
  const again = document.querySelector('#ticket-again');
  const reopen = document.querySelector('#view-ticket');
  const artCache = new Map();
  let brushPromise;
  let latest = null, blob = null, url = null, version = 0;
  let pending = Promise.resolve();

  function load(source) {
    if (!artCache.has(source)) {
      const art = new Image(); art.src = source;
      let timeout;
      artCache.set(source, Promise.race([
        art.decode().then(() => art, () => null),
        new Promise(resolve => { timeout = setTimeout(() => resolve(null), 3000); }),
      ]).then(result => { clearTimeout(timeout); if (!result) artCache.delete(source); return result; }));
    }
    return artCache.get(source);
  }

  const sources = ['assets/ticket/guardian-backdrop.webp', 'assets/ticket/guardian-paper-roomy.webp',
    'assets/red-ball-small.webp', 'assets/blue-ball-small.webp', 'assets/ticket/guardian-neutral.webp'];
  function prepare() { return Promise.all(sources.map(load)); }

  function prepareBrush() {
    if (typeof FontFace !== 'function' || !document.fonts) return Promise.resolve(false);
    if (!brushPromise) {
      let timeout;
      const face = new FontFace('Lucky Brush', 'url(assets/fonts/lucky-brush.woff2)');
      const ready = face.load().then(font => { document.fonts.add(font); return true; }, () => false);
      brushPromise = Promise.race([ready, new Promise(resolve => { timeout = setTimeout(() => resolve(false), 3000); })])
        .then(value => { clearTimeout(timeout); if (!value) brushPromise = null; return value; });
    }
    return brushPromise;
  }

  function present() {
    again.disabled = !canSelect();
    again.title = again.disabled ? '请等待本次选号完成' : '';
    if (!dialog.open) dialog.showModal();
  }

  async function render(ticket, request) {
    try {
      const [[backdrop, paper, red, blue, neutral], brushReady] = await Promise.all([prepare(), prepareBrush()]);
      const mascot = ticket.ritual.art ? await load(ticket.ritual.art) : null;
      const canvas = document.createElement('canvas');
      Object.assign(canvas, TICKET_SIZE);
      drawSelectionTicket(canvas.getContext('2d'), ticket, { backdrop, paper, red, blue, neutral, mascot, brushReady });
      const next = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image export failed')), 'image/png'));
      if (request !== version) return;
      if (url) URL.revokeObjectURL(url);
      blob = next; url = URL.createObjectURL(blob);
      image.src = url; image.hidden = false;
      image.alt = `我的选号单，红球 ${ticket.red.join('、')}，蓝球 ${ticket.blue}。${ticket.ritual.name}：${ticket.line}`;
      document.querySelector('#ticket-loading').hidden = true;
      save.disabled = false; share.disabled = false;
      status.textContent = '可保存图片，也可长按选号单保存';
    } catch {
      if (request !== version) return;
      document.querySelector('#ticket-loading').hidden = true;
      status.textContent = '选号单图片生成失败，请点击重试';
      document.querySelector('#retry-ticket').hidden = false;
    }
  }

  function show(entry) {
    latest = createSelectionTicket(entry);
    const request = ++version;
    blob = null; save.disabled = true; share.disabled = true; image.hidden = true;
    document.querySelector('#ticket-loading').hidden = false;
    document.querySelector('#retry-ticket').hidden = true;
    document.querySelector('#ticket-summary').textContent = `红球 ${latest.red.join('、')}；蓝球 ${latest.blue}。${latest.ritual.name}：${latest.line}`;
    status.textContent = '正在装好你的这一份好运…';
    reopen.hidden = false;
    present();
    pending = render(latest, request);
    return pending;
  }

  function download() {
    if (!blob || !url) return;
    const link = document.createElement('a');
    link.href = url; link.download = `${latest.id}.png`; link.click();
    status.textContent = '已发起保存；手机也可长按选号单存入相册';
  }

  share.addEventListener('click', async () => {
    if (!blob) return;
    const file = new File([blob], `${latest.id}.png`, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: '我的选号单' });
        status.textContent = '好运已分享，愿你今天顺顺利利';
      } else {
        download();
        status.textContent = '此浏览器不支持图片分享，已改为保存图片';
      }
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = '分享未完成，可保存图片后分享';
    }
  });
  save.addEventListener('click', download);
  document.querySelector('#close-ticket').addEventListener('click', () => dialog.close());
  again.addEventListener('click', () => { dialog.close(); onAgain(); });
  reopen.addEventListener('click', present);
  document.querySelector('#retry-ticket').addEventListener('click', () => { if (latest) show({ ...latest, ritualId: latest.ritual.id, presetName: latest.mode }); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => reopen.focus({ preventScroll: true }));
  return { show, prepare, waitForImage: () => pending };
}
