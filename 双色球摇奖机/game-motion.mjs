const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

export function createGameMotion() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = document.querySelector('#machine');
  const ticket = document.querySelector('#ticket-dialog');
  const burst = ticket.querySelector('.result-burst');
  const active = new Set();
  let recoil;
  function animate(element, frames, timing) {
    if (reduce.matches || document.hidden) return;
    const effect = element.animate(frames, { easing: EASE_OUT, ...timing });
    active.add(effect);
    effect.finished.then(() => active.delete(effect), () => active.delete(effect));
    return effect;
  }
  for (let i = 0; i < 24; i++) {
    const piece = document.createElement('i');
    burst.append(piece);
  }
  ticket.addEventListener('close', () => { for (const effect of active) effect.cancel(); active.clear(); });
  document.addEventListener('visibilitychange', () => {
    for (const effect of active) document.hidden ? effect.pause() : effect.play();
  });
  reduce.addEventListener('change', () => { if (reduce.matches) for (const effect of active) effect.cancel(); });
  return {
    start() { document.body.classList.add('is-selecting'); },
    reveal() {
      recoil?.cancel();
      recoil = animate(stage, [{ transform: 'translateY(0)' }, { transform: 'translateY(2px)', offset: .35 }, { transform: 'translateY(0)' }], { duration: 160 });
    },
    complete() {
      document.body.classList.remove('is-selecting');
      // The dialog opens in the same task; particles stay bounded to its decoration layer.
      burst.querySelectorAll('i').forEach((piece, index) => {
        const angle = (index / 24) * Math.PI * 2;
        const distance = 170 + (index % 4) * 35;
        animate(piece, [
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 0 },
          { opacity: 1, offset: .08 },
          { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance + 50}px) rotate(${index % 2 ? 220 : -220}deg)`, opacity: 0 },
        ], { duration: 950, delay: index % 3 * 35 });
      });
    },
  };
}
