export function playRitualVideo(video, { muted = true, visibility = document, timers = globalThis } = {}) {
  let settled = false, timeout, resolve;
  const finished = new Promise(done => { resolve = done; });
  const clearDeadline = () => timers.clearTimeout(timeout);
  function deadline(delay = 5000) {
    clearDeadline();
    if (!visibility.hidden) timeout = timers.setTimeout(() => finish('failed'), delay);
  }
  function finish(result) {
    if (settled) return;
    settled = true;
    clearDeadline();
    video.removeEventListener('ended', ended);
    video.removeEventListener('error', failed);
    video.removeEventListener('playing', playing);
    video.removeEventListener('waiting', waiting);
    visibility.removeEventListener('visibilitychange', visibilityChanged);
    video.pause();
    resolve(result);
  }
  const ended = () => finish('ended');
  const failed = () => finish('failed');
  const playing = () => deadline(12000);
  const waiting = () => deadline();
  function attempt() {
    if (settled || visibility.hidden) return;
    deadline();
    try { Promise.resolve(video.play()).catch(rejected); }
    catch { rejected(); }
  }
  function rejected() {
    if (settled || visibility.hidden) return;
    if (!video.muted) { video.muted = true; attempt(); }
    else finish('failed');
  }
  function visibilityChanged() {
    if (visibility.hidden) { clearDeadline(); video.pause(); }
    else attempt();
  }
  video.muted = muted;
  try { video.currentTime = 0; } catch { /* Unloaded media starts at zero. */ }
  video.addEventListener('ended', ended);
  video.addEventListener('error', failed);
  video.addEventListener('playing', playing);
  video.addEventListener('waiting', waiting);
  visibility.addEventListener('visibilitychange', visibilityChanged);
  attempt();
  return { finished, cancel: () => finish('skipped') };
}
