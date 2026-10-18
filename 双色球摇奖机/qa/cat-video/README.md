# Cat spell integration verification

Verified on 2026-10-18 in the native in-app browser.

- Selected the cat, tapped the existing selection button, and observed the actual inline MP4 playing before the physical draw. The source was `assets/video/cat-spell.mp4` and its browser-reported duration was 5.041667 seconds.
- Let the video finish. The stage closed, physical mixing started, all seven balls arrived, and the result slip appeared. The browser console had no warnings or errors.
- Turned sound off, ran the ceremony at 320 x 568, and measured `muted: true`, `paused: false`, and an advancing current time. The 44 px Skip button and full stage fit inside the viewport.
- Tapped Skip during playback. The stage closed, video paused, and the original draw progressed to `0 / 7` without a second handoff.
- `mobile.png` captures the actual video ceremony at 390 x 664; `mobile-320.png` captures the smaller layout.
- All 59 Node tests passed. Six new tests cover ended/skip completion, audible autoplay retry, playback failure and stalls, hidden-page pause/resume, listener cleanup, and late rejected promises after cancellation.
- The runtime MP4 is byte-identical to the approved clean preview (SHA-256 `0bcc5d514b611cd72195a78b848e16365fd38b066ce3d2af04186c9992b49e92`).

No physical iPhone/Safari test was performed. Hidden-page failures and autoplay rejection were tested with controlled media objects; actual normal and muted playback, Skip, and the complete draw were checked in the browser. Other characters keep their current image ceremonies. Nothing was pushed in this task.
