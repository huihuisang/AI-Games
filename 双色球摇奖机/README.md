# Double Color Number Picker

A mobile-first local number selection simulator. It uses the selected cream toy design. It selects number combinations for fun; it does not conduct an official lottery.

## Run

From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/双色球摇奖机/` in a browser.

## Behavior

- Select six distinct red numbers from 1 to 33, then one blue number from 1 to 16.
- Pick a short opening ceremony: the wealth god, a future self, a lucky cat, or a koi. The last choice is saved on this device. Each character has a generated transparent 3D collectible render. The cat plays its approved five-second H.264 spell video before mixing starts; the other characters retain the 2.6-second image scene. Video audio follows the page sound setting, with a muted retry for autoplay restrictions. Video failure falls back to the image scene. Skip or Escape starts the existing selection after preset preparation. Direct selection bypasses the ceremony. Reduced motion uses a short image fade; page hiding pauses the scene or video. Ceremony selection does not read or change number sampling, physics, presets, or history.
- In fully random mode, use `crypto.getRandomValues` with rejection sampling to shuffle physical ball labels. Physics does not read labels, so every remaining number has the same chance of reaching the outlet.
- Show the current preset in one row, with a small fixed-number badge when required numbers are active. Tap it to open the preset picker, inspect fixed numbers, or open the manager. Select a saved preset before a selection. Red presets accept 0–6 fixed numbers; blue presets accept one fixed number or remain random. Required numbers appear in the result, and all remaining positions are sampled without replacement.
- Create, edit, and delete up to 20 named presets. Three editable examples are included. Presets and the last selection are saved on this device. Preset controls are locked during a selection.
- Seed each selection with a fresh value from `crypto.getRandomValues`. Randomize initial ball slots, chamber rotation, velocity, and spin. The seeded motion generator never selects number labels.
- Mix at 6 radians per second in normal mode, about 3.6 times the previous speed. Mix red balls for 8 seconds before the first gate, blue balls for 6 seconds, and red balls for 1.5 seconds between releases.
- Drive the balls by contact with three rotating paddle arms. Gravity, wall collisions, friction, and spin make the balls lift, tumble, and fall.
- Open the bottom gate for one ball. Start its tube motion at its actual capture position. Reveal its number only after it rolls down the tube, bumps the tray, and settles.
- Block a second selection until all seven balls arrive.
- Pause the animation when the page is hidden. Resume without skipping balls.
- Use a recorded motor loop and hard-object collision samples. Contact strength drives ball impacts, motor speed drives the low mechanical layer, and actual gate, tube, and tray events drive release sounds. Mute and page hiding stop transient voices; failed audio loading does not block a selection.
- Show a selection slip after the seventh ball settles. Dim the original page and reveal a transparent reward scene with the mascot, its blessing, and a compact paper slip. Export the complete 900 × 1700 PNG for download and native file sharing. Keep the actual numbers, time, preset name, mascot, and completed line together. Red numbers on the slip are sorted without changing physical or history order.
- Reopen slips from the current result or any of the last 20 history records. Old records remain readable without inventing a previous mascot. Native file sharing uses a user gesture; unsupported browsers download the image instead. Cancellation does not start a download. The compact paper image supports the browser’s long-press image menu; the Save and Share buttons use the complete illustrated slip.
- Keep up to 20 completed selections in local storage. Storage and audio are optional.
- Fit the main mobile controls in one small viewport height. Shrink the machine to the available space without stretching it, hide the extra title caption, and keep history and the return link in one footer row. Preset and history dialogs can scroll on their own. Very short viewports and enlarged text can still scroll instead of clipping controls.
- Put the generated sound switch in the upper-left margin and the selected mascot in the upper-right open area. Use the full stage width for their horizontal positions and the fitted artwork height for vertical placement. Keep a 12 px outer inset and at least 14 px below the heading for the sound control. The mascot opens the existing ceremony picker; direct selection uses a neutral emblem. Keep the preset row full width below the results.
- At widths of 960 px and above, show a persistent history board on the right with its own scroll area. New selections appear at the top. Smaller screens use the history dialog. Both views use the same stored records.
- Respect reduced motion with a slow motor and no result bounce. Keep essential outlet movement readable and allow the hopper to feed without stalling.

## Structure

- `draw.mjs`: random sampling and stored data validation.
- `physics.mjs`: chamber boundaries and ball collisions.
- `sequence.mjs`: selection phases and ordered ball release.
- `transit.mjs`: tube arc length, downhill acceleration, rolling angle, and tray impact.
- `simulation.mjs`: shared physical machine updates at a fixed 120 Hz step.
- `presets.mjs`: preset validation, persistence format, conditional sampling, and pre-selection label planning.
- `preset-worker.mjs`: per-selection preset planning outside the main UI thread.
- `preset-ui.mjs`: preset selection and mobile editor controls.
- `rituals.mjs`: character identities, number selection copy, and saved character recovery.
- `mascot-lines.mjs`: four pools of 20 personality lines, independent shuffled cycles, and optional local persistence.
- `ritual-ui.mjs`: compact character picker, interruptible opening scenes, and completion handoff.
- `ritual.css`: character picker and ceremony scene styles.
- `machine-audio.mjs`: local sample loading, motor loop, contact and outlet sounds, gain control, and bounded transient voices.
- `app.mjs`: canvas rendering, controls, audio integration, and history.
- `style.css`: responsive page and dialog styles.
- `ritual-video.mjs`: optional inline video playback, skip/end handoff, visibility pause, autoplay retry, and bounded failure handling.
- `ticket.mjs`: immutable selection-slip snapshot and shared Canvas paper rendering for the transparent preview and complete PNG export.
- `ticket-ui.mjs` and `ticket.css`: native result dialog, history reopening, download, and file-share fallbacks.
- `game-motion.mjs` and `game-feel.css`: bounded completion particles, machine recoil, embossed controls, panel overshoot, and reduced-motion variants.

## Check

```sh
node --test 双色球摇奖机/tests/*.test.mjs
node --check 双色球摇奖机/app.mjs
node 双色球摇奖机/qa/randomness-check.mjs
```

## Assets

The machine, mixing paddle, and ball sprites were generated with the built-in imagegen tool from the selected visual reference. The small WebP files are delivery copies. The PNG machine, paddle, and ball atlas are source assets. Chamber and outlet coordinates are in `assets/machine-layout.json`. The visible canvas crops 85 px from the left of the source and uses a 1140 × 1224 view box without image stretching.

The paddle uses source coordinates `(625, 715)` as its rotation center. It rotates behind the balls in the active chamber.

The four ceremony mascots use glossy resin, porcelain, clear acrylic, and champagne-gold details to match the machine. Source PNGs and transparent WebP delivery copies are in `assets/mascots/`; the picker loads 256 px thumbnails and the ceremony decodes its 640 px image before opening. These raster scenes use gentle whole-figure motion and light effects. Previous vector assets remain as design history. Generation prompts are in `assets/mascots/README.md`.

The sound control uses two generated physical switch states with the same cream resin and gold bezel. The on state has speaker waves and a lit amber indicator; mute has a crossed speaker and an unlit indicator. Source images, delivery files, and prompts are in `assets/controls/`.

The sound samples use CC0 recordings from Kenney and supersnd. See `assets/audio/README.md` for source links and delivery edits. The WAV assets total about 530 KiB and load only after an enabled user gesture.

The play and speaker icons come from Phosphor Icons Core 2.1.1. See `assets/PHOSPHOR-LICENSE.txt`.

## Preset Selections

Preset mode forecasts the physical capture slots with the same fixed-step solver used for playback. It assigns securely sampled labels to those slots before the animation starts. Every red and blue ball remains in the machine, and no label changes during a selection. The forecast uses the same per-selection seed and motion mode as playback. It runs in a module worker so a new random physical layout does not freeze the main UI. Browsers without worker support use the same solver on the main thread. A selection holds its starting motion mode until completion so that a settings change cannot invalidate the plan. Unselected positions remain random. The example mixed preset deliberately fixes red 06 and 16 and blue 08; use Fully random to remove all required numbers. History stores the preset name as it was at selection time.

## Motion Capture

Open `qa/motion-capture.html` on the same local server. Its Record selection button records the actual app canvas and exports the video plus phase measurements. This page is a QA tool and is not linked from the product.

## Character Dialogue

The wealth god boasts about guarding wealth, the future self brings lucky hints from tomorrow, the proud lucky cat casts paw spells, and the koi lends its luck aura. Their exaggerated blessings are fictional role dialogue. The ceremony and page footer state that these lines do not change actual probabilities. Each character has exactly 20 lines. A ceremony and its completed selection each use one line. The line deck is shuffled per character, exhausted before reuse, and never repeats at a cycle boundary. Progress survives a reload when local storage is available. Corrupt or unavailable storage does not stop number selection. Dialogue state is independent of number sampling and saved number presets.

Visible Chinese copy describes number selection throughout the page, history, accessible labels, and the home card. Existing route and storage keys remain compatible. The selected visual target is `../design/lottery-ticket/mascot-focus/01-guardian-slip.png`. The result now puts the full mascot and its brush-lettered blessing above a compact paper ticket and detachable stub. It removes the generic headline and machine thumbnail. Production background and blank paper assets are in `assets/ticket/`; the subset brush font and license are in `assets/fonts/`. The original design images are historical concepts. Live selection slips, PNG export, and native file sharing are now implemented with the original machine and mascot assets. Slips are simulation souvenirs, not valid lottery tickets.

## Game Motion

Press feedback uses 160 ms transform transitions. Panels enter in 280 ms with a small overshoot, ball labels land in 280 ms, and the machine recoils by only 2 px after a transfer. After the result images are ready, reveal the mascot with a 500 ms overshoot, a single 500 ms flash, a 1200 ms ray sweep, a staggered blessing, and a 500 ms paper landing. Release 24 local decoration particles for 950 ms. There is no persistent animation loop. Reopening a record replays the sequence; closing or replacing it cancels all effects. The motor button has a transform-based light sweep only during selection. Motion uses native CSS and WAAPI; no runtime library was added. Reduced motion removes recoil and reward movement and uses one 200 ms content fade. Visibility changes pause active WAAPI effects. Dialog closure cancels them.

The same renderer handles all four original mascots. Direct selection and old records without a mascot use a neutral gold-ingot artwork. Every quote preserves its complete text and prefers its spoken pause when wrapping; the actual-font QA fixture checks all 80 lines. Font loading has a bounded wait and a system-font fallback. Missing required artwork offers an image-generation retry without blocking the completed selection. The transparent reward layer has a primary Save image button, secondary Share action, and a compact Select again control. Browser cache version parameters keep the result module and styles in step.
