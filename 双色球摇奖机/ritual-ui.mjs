import { RITUALS, restoreRitual } from './rituals.mjs';

const STORAGE_KEY = 'double-color-machine.ritual.v1';
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_MOVE = 'cubic-bezier(0.77, 0, 0.175, 1)';

export function createRitualUI({ readStorage, writeStorage, onChange }) {
  let selected = restoreRitual(readStorage(STORAGE_KEY));
  let finishPlayback = null;
  let playbackVersion = 0;
  const animations = new Set();
  const trigger = document.querySelector('#ritual-trigger');
  const picker = document.querySelector('#ritual-picker');
  const stage = document.querySelector('#ritual-stage');
  const card = document.querySelector('#ritual-card');
  const hero = document.querySelector('#ritual-hero');
  const options = document.querySelector('#ritual-options');
  const direct = document.querySelector('#ritual-direct');
  const artwork = new Map();

  async function loadArtwork(ritual) {
    if (!artwork.has(ritual.id)) {
      const image = new Image();
      image.src = ritual.art;
      image.alt = '';
      let timeout;
      const decoded = image.decode().then(() => image, () => null);
      const deadline = new Promise(resolve => { timeout = setTimeout(() => resolve(null), 3000); });
      artwork.set(ritual.id, Promise.race([decoded, deadline]).then(result => {
        clearTimeout(timeout);
        if (!result) artwork.delete(ritual.id);
        return result;
      }));
    }
    return artwork.get(ritual.id);
  }

  function render() {
    const art = document.querySelector('#current-ritual-art');
    art.hidden = !selected.art;
    if (selected.art) art.src = selected.thumbnail ?? selected.art;
    document.querySelector('#current-ritual').textContent = selected.name;
    trigger.setAttribute('aria-label', `选号搭子：${selected.name}，点击更换`);
    options.querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.ritual === selected.id));
    });
    direct.setAttribute('aria-pressed', String(selected.id === 'direct'));
    onChange(selected);
  }

  function select(ritual) {
    selected = ritual;
    writeStorage(STORAGE_KEY, ritual.id);
    render();
    picker.close();
  }

  for (const ritual of RITUALS.filter(item => item.art)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.ritual = ritual.id;
    button.className = 'ritual-option';
    const art = document.createElement('img');
    art.src = ritual.thumbnail ?? ritual.art;
    art.alt = '';
    art.width = 100;
    art.height = 100;
    const name = document.createElement('strong');
    name.textContent = ritual.name;
    const description = document.createElement('span');
    description.textContent = ritual.description;
    const mark = document.createElement('i');
    mark.textContent = '✓';
    mark.setAttribute('aria-hidden', 'true');
    button.append(art, name, description, mark);
    button.addEventListener('click', () => select(ritual));
    options.append(button);
  }
  direct.addEventListener('click', () => select(restoreRitual('direct')));
  trigger.addEventListener('click', () => {
    picker.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    picker.querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
  });
  picker.addEventListener('close', () => trigger.setAttribute('aria-expanded', 'false'));
  document.querySelector('#close-ritual-picker').addEventListener('click', () => picker.close());
  picker.addEventListener('click', event => {
    if (event.target !== picker) return;
    const rect = picker.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) picker.close();
  });

  document.querySelector('#skip-ritual').addEventListener('click', () => finishPlayback?.());
  stage.addEventListener('cancel', event => { event.preventDefault(); finishPlayback?.(); });
  stage.addEventListener('close', () => finishPlayback?.());
  document.addEventListener('visibilitychange', () => {
    for (const animation of animations) {
      if (document.hidden) animation.pause();
      else animation.play();
    }
  });

  function animate(element, frames, timing) {
    const animation = element.animate(frames, { fill: 'both', ...timing });
    animations.add(animation);
    if (document.hidden) animation.pause();
    return animation;
  }

  async function play({ reducedMotion = false, line = '' } = {}) {
    if (!selected.art) return Promise.resolve();
    finishPlayback?.();
    const version = ++playbackVersion;
    const ritual = selected;
    const image = await loadArtwork(ritual);
    if (version !== playbackVersion || !image) return;
    hero.replaceChildren(image.cloneNode());
    card.dataset.ritual = ritual.id;
    for (const name of ['eyebrow', 'title', 'seal']) {
      document.querySelector(`#ritual-${name}`).textContent = ritual[name];
    }
    document.querySelector('#ritual-caption').textContent = line;
    card.querySelectorAll('.ritual-token').forEach(token => { token.textContent = ritual.token; });
    stage.showModal();

    return new Promise(resolve => {
      let finished = false;
      finishPlayback = () => {
        if (finished) return;
        finished = true;
        finishPlayback = null;
        for (const animation of animations) animation.cancel();
        animations.clear();
        stage.close();
        resolve();
      };
      try {
        // The scene's finished promise owns the handoff; skipping uses the same completion path.
        const duration = reducedMotion ? 700 : 2600;
        const timeline = animate(card, [
          { opacity: 0, offset: 0 }, { opacity: 1, offset: .08 },
          { opacity: 1, offset: .92 }, { opacity: 0, offset: 1 },
        ], { duration, easing: 'linear' });
        if (!reducedMotion) {
          animate(hero, heroFrames(ritual.id), { duration, easing: EASE_MOVE });
          animate(card.querySelector('.ritual-aura'), [
            { transform: 'scale(.95)', opacity: 0 }, { transform: 'scale(1)', opacity: .8, offset: .3 },
            { transform: 'scale(1.08)', opacity: 0 },
          ], { duration, easing: EASE_OUT });
          card.querySelectorAll('.ritual-token').forEach((token, index) => {
            const direction = index === 1 ? 1 : -1;
            animate(token, [
              { transform: `translate(0, 18px) rotate(${direction * 12}deg)`, opacity: 0 },
              { transform: `translate(${direction * 12}px, -12px) rotate(${direction * 8}deg)`, opacity: 1, offset: .3 },
              { transform: `translate(${direction * 22}px, -54px) rotate(${direction * -10}deg)`, opacity: 0 },
            ], { duration: 1800, delay: 200 + index * 80, easing: EASE_OUT });
          });
          card.querySelectorAll('.ritual-spark, .ritual-dots i').forEach((spark, index) => {
            animate(spark, [{ opacity: .2 }, { opacity: 1 }, { opacity: .2 }],
              { duration: 700, delay: index * 60, iterations: 3, easing: 'ease' });
          });
          card.querySelectorAll('.ritual-orbit').forEach((orbit, index) => {
            animate(orbit, [
              { transform: `rotate(${index ? -18 : 15}deg) scale(.95)`, opacity: 0 },
              { transform: `rotate(${index ? 0 : -8}deg) scale(1)`, opacity: 1, offset: .35 },
              { transform: `rotate(${index ? 12 : -20}deg) scale(1.04)`, opacity: 0 },
            ], { duration, easing: EASE_MOVE });
          });
          animate(card.querySelector('.ritual-seal'), [
            { transform: 'translateY(8px) rotate(-6deg) scale(.95)', opacity: 0 },
            { transform: 'translateY(0) rotate(-6deg) scale(1)', opacity: 1 },
          ], { duration: 200, delay: 1100, easing: EASE_OUT });
        }
        timeline.finished.then(() => finishPlayback?.(), () => {});
      } catch {
        // An optional ceremony must never prevent the existing draw from starting.
        finishPlayback();
      }
    });
  }

  render();
  return {
    getSelected: () => selected,
    setLocked(locked) {
      trigger.disabled = locked;
      if (locked && picker.open) picker.close();
    },
    play,
    cancel() { playbackVersion++; finishPlayback?.(); },
  };
}

function heroFrames(id) {
  const poses = {
    caishen: ['translateY(10px) scale(.95)', 'translateY(0) rotate(-1.5deg)', 'translateY(-5px) rotate(1.5deg)', 'translateY(0)'],
    future: ['translateY(12px) scale(.95)', 'translateY(-3px) rotate(1.5deg)', 'translateY(-8px) rotate(-1.5deg)', 'translateY(-3px)'],
    cat: ['translateY(10px) scale(.95)', 'translateY(0) rotate(-2deg)', 'translateY(-3px) rotate(2deg)', 'translateY(0) rotate(-1deg)'],
    koi: ['translate(-24px, 18px) rotate(-12deg) scale(.95)', 'translate(8px, -16px) rotate(6deg)', 'translate(0, -24px) rotate(-6deg)', 'translate(0, 0) rotate(0deg)'],
  };
  return poses[id].map((transform, index) => ({ transform, opacity: index === 0 ? 0 : 1,
    offset: [0, .12, .55, 1][index] }));
}
