import test from 'node:test';
import assert from 'node:assert/strict';
import { playRitualVideo } from '../ritual-video.mjs';

function scene(play = () => Promise.resolve()) {
  const video = Object.assign(new EventTarget(), { muted: true, currentTime: 3, duration: 5, pauses: 0, plays: 0,
    play() { this.plays++; return play(this); }, pause() { this.pauses++; } });
  const visibility = Object.assign(new EventTarget(), { hidden: false });
  const jobs = new Map(); let id = 0;
  const timers = { setTimeout(fn) { jobs.set(++id, fn); return id; }, clearTimeout(key) { jobs.delete(key); } };
  return { video, visibility, timers, jobs, start: options => playRitualVideo(video, { visibility, timers, ...options }),
    expire() { const fn = jobs.values().next().value; assert.ok(fn); fn(); } };
}

test('video completion waits for ended and settles once after skip or late events', async () => {
  const s = scene(); const run = s.start({ muted: false });
  assert.equal(s.video.muted, false); assert.equal(s.video.currentTime, 0); assert.equal(s.video.plays, 1);
  s.video.dispatchEvent(new Event('playing'));
  s.video.dispatchEvent(new Event('ended'));
  assert.equal(await run.finished, 'ended');
  run.cancel(); s.video.dispatchEvent(new Event('error'));
  assert.equal(await run.finished, 'ended'); assert.equal(s.jobs.size, 0);
});

test('skip stops video and resolves the handoff without waiting for media', async () => {
  const s = scene(() => new Promise(() => {})); const run = s.start();
  run.cancel();
  assert.equal(await run.finished, 'skipped'); assert.equal(s.video.pauses, 1); assert.equal(s.jobs.size, 0);
});

test('a blocked audible play retries muted, while unsupported video falls back', async () => {
  const s = scene(video => video.muted ? Promise.resolve() : Promise.reject(new Error('Autoplay blocked')));
  const run = s.start({ muted: false });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(s.video.muted, true); assert.equal(s.video.plays, 2);
  s.video.dispatchEvent(new Event('ended')); assert.equal(await run.finished, 'ended');
  const broken = scene(() => Promise.reject(new Error('Unsupported media'))); const failure = broken.start();
  assert.equal(await failure.finished, 'failed'); assert.equal(broken.jobs.size, 0);
});

test('load errors and stalled playback return control to the static ceremony', async () => {
  const error = scene(); const first = error.start(); error.video.dispatchEvent(new Event('error'));
  assert.equal(await first.finished, 'failed');
  const stalled = scene(); const second = stalled.start();
  stalled.video.dispatchEvent(new Event('playing')); stalled.video.dispatchEvent(new Event('waiting')); stalled.expire();
  assert.equal(await second.finished, 'failed');
});

test('backgrounding pauses playback and deadlines; resuming keeps the same position', async () => {
  const s = scene(); const run = s.start(); s.video.currentTime = 2;
  s.visibility.hidden = true; s.visibility.dispatchEvent(new Event('visibilitychange'));
  assert.equal(s.video.pauses, 1); assert.equal(s.jobs.size, 0);
  s.visibility.hidden = false; s.visibility.dispatchEvent(new Event('visibilitychange'));
  assert.equal(s.video.plays, 2); assert.equal(s.video.currentTime, 2);
  run.cancel(); await run.finished;
  s.visibility.dispatchEvent(new Event('visibilitychange'));
  assert.equal(s.video.plays, 2);
});

test('a late rejected play promise cannot restart a skipped video', async () => {
  let reject;
  const s = scene(() => new Promise((_, fail) => { reject = fail; })); const run = s.start({ muted: false });
  run.cancel(); reject(new Error('Late rejection')); await Promise.resolve();
  assert.equal(await run.finished, 'skipped'); assert.equal(s.video.plays, 1);
});
