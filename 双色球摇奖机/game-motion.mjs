const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

export function createGameMotion() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = document.querySelector('#machine');
  const ticket = document.querySelector('#ticket-dialog');
  const burst = ticket.querySelector('.result-burst');
  const active = new Set();
  let recoil;
  function animate(element, frames, timing, gentle = false) {
    if (reduce.matches && !gentle) return;
    const effect = element.animate(frames, { easing: EASE_OUT, ...timing });
    active.add(effect);
    if (document.hidden) effect.pause();
    effect.finished.then(() => active.delete(effect), () => active.delete(effect));
    return effect;
  }
  function cancel() {
    for (const effect of active) effect.cancel();
    active.clear();
  }
  for (let i = 0; i < 24; i++) burst.append(document.createElement('i'));
  ticket.addEventListener('close', cancel);
  ticket.addEventListener('ticketreset', cancel);
  document.addEventListener('visibilitychange', () => {
    for (const effect of active) document.hidden ? effect.pause() : effect.play();
  });
  reduce.addEventListener('change', () => { if (reduce.matches) cancel(); });
  ticket.addEventListener('ticketreveal', () => {
    cancel();
    const content = ticket.querySelector('.reward-content');
    if (reduce.matches) {
      animate(content, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 }, true);
      return;
    }
    animate(ticket.querySelector('.reward-flash'), [
      { opacity: 0, transform: 'scale(.95)' },
      { opacity: .8, transform: 'scale(1.04)', offset: .15 },
      { opacity: 0, transform: 'scale(1.15)' },
    ], { duration: 500 });
    animate(ticket.querySelector('.reward-rays'), [
      { opacity: 0, transform: 'rotate(-18deg) scale(.95)' },
      { opacity: 1, offset: .18 },
      { opacity: 1, transform: 'rotate(18deg) scale(1)' },
    ], { duration: 1200 });
    animate(ticket.querySelector('.reward-ring'), [
      { opacity: 0, transform: 'scale(.95)' },
      { opacity: 1, transform: 'scale(1.12)', offset: .55 },
      { opacity: 1, transform: 'scale(1)' },
    ], { duration: 500 });
    animate(ticket.querySelector('#reward-mascot'), [
      { opacity: 0, transform: 'translateY(22px) scale(.92)' },
      { opacity: 1, transform: 'translateY(-7px) scale(1.045)', offset: .65 },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ], { duration: 500, fill: 'backwards' });
    animate(ticket.querySelector('.reward-blessing'), [
      { opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' },
    ], { duration: 250, delay: 120, fill: 'backwards' });
    animate(ticket.querySelector('.reward-ticket'), [
      { opacity: 0, transform: 'translateY(24px) rotate(-3deg) scale(.95)' },
      { opacity: 1, transform: 'translateY(-4px) rotate(1deg) scale(1.015)', offset: .65 },
      { opacity: 1, transform: 'none' },
    ], { duration: 500, delay: 180, fill: 'backwards' });
    animate(ticket.querySelector('.ticket-actions'), [
      { opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' },
    ], { duration: 250, delay: 260, fill: 'backwards' });
    burst.querySelectorAll('i').forEach((piece, index) => {
      const angle = index / 24 * Math.PI * 2;
      const distance = Math.min(ticket.clientWidth * .48, 180) + (index % 3) * 10;
      animate(piece, [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 0 },
        { opacity: 1, offset: .12 },
        { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance + 32}px) rotate(${index % 2 ? 160 : -160}deg)`, opacity: 0 },
      ], { duration: 950, delay: 60 + index % 3 * 35 });
    });
  });
  return {
    start() { document.body.classList.add('is-selecting'); },
    reveal() {
      recoil?.cancel();
      recoil = animate(stage, [{ transform: 'translateY(0)' }, { transform: 'translateY(2px)', offset: .35 }, { transform: 'translateY(0)' }], { duration: 160 });
    },
    complete() { document.body.classList.remove('is-selecting'); },
  };
}
