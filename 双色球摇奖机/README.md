# Double Color Ball Machine

A mobile-first, local lottery draw simulator. It uses the selected cream toy design. There are no purchases or live lottery results.

## Run

From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/双色球摇奖机/` in a browser.

## Behavior

- Draw six distinct red numbers from 1 to 33, then one blue number from 1 to 16.
- In fully random mode, use `crypto.getRandomValues` with rejection sampling to shuffle physical ball labels. Physics does not read labels, so every remaining number has the same chance of reaching the outlet.
- Show only the current preset in the main view. Tap it to open the preset picker, inspect fixed numbers, or open the manager. Select a saved preset before a draw. Red presets accept 0–6 fixed numbers; blue presets accept one fixed number or remain random. Required numbers appear in the result, and all remaining positions are sampled without replacement.
- Create, edit, and delete up to 20 named presets. Three editable examples are included. Presets and the last selection are saved on this device. Preset controls are locked during a draw.
- Drive the balls by contact with three rotating paddle arms. Gravity, wall collisions, friction, and spin make the balls lift, tumble, and fall.
- Open the bottom gate for one ball. Start its tube motion at its actual capture position. Reveal its number only after it rolls down the tube, bumps the tray, and settles.
- Block a second draw until all seven balls arrive.
- Pause the animation when the page is hidden. Resume without skipping balls.
- Use a recorded motor loop and hard-object collision samples. Contact strength drives ball impacts, motor speed drives the low mechanical layer, and actual gate, tube, and tray events drive release sounds. Mute and page hiding stop transient voices; failed audio loading does not block a draw.
- Keep up to 20 completed draws in local storage. Storage and audio are optional.
- Fit the main mobile controls in one small viewport height. Shrink the machine to the available space without stretching it, hide the extra title caption, and keep history and the return link in one footer row. Preset and history dialogs can scroll on their own. Very short viewports and enlarged text can still scroll instead of clipping controls.
- At widths of 960 px and above, show a persistent history board on the right with its own scroll area. New draws appear at the top. Smaller screens use the history dialog. Both views use the same stored records.
- Respect reduced motion with a slow motor and no result bounce. Keep essential outlet movement readable and allow the hopper to feed without stalling.

## Structure

- `draw.mjs`: random sampling and stored data validation.
- `physics.mjs`: chamber boundaries and ball collisions.
- `sequence.mjs`: draw phases and ordered ball release.
- `transit.mjs`: tube arc length, downhill acceleration, rolling angle, and tray impact.
- `simulation.mjs`: shared physical machine updates at a fixed 120 Hz step.
- `presets.mjs`: preset validation, persistence format, conditional sampling, and pre-draw label planning.
- `preset-ui.mjs`: preset selection and mobile editor controls.
- `machine-audio.mjs`: local sample loading, motor loop, contact and outlet sounds, gain control, and bounded transient voices.
- `app.mjs`: canvas rendering, controls, audio integration, and history.
- `style.css`: responsive page and dialog styles.

## Check

```sh
node --test 双色球摇奖机/tests/*.test.mjs
node --check 双色球摇奖机/app.mjs
```

## Assets

The machine, mixing paddle, and ball sprites were generated with the built-in imagegen tool from the selected visual reference. The small WebP files are delivery copies. The PNG machine, paddle, and ball atlas are source assets. Chamber and outlet coordinates are in `assets/machine-layout.json`. The visible canvas crops 85 px from the left of the source and uses a 1140 × 1224 view box without image stretching.

The paddle uses source coordinates `(625, 715)` as its rotation center. It rotates behind the balls in the active chamber.

The sound samples use CC0 recordings from Kenney and supersnd. See `assets/audio/README.md` for source links and delivery edits. The WAV assets total about 530 KiB and load only after an enabled user gesture.

The play and speaker icons come from Phosphor Icons Core 2.1.1. See `assets/PHOSPHOR-LICENSE.txt`.

## Preset Draws

Preset mode forecasts the physical capture slots with the same fixed-step solver used for playback. It assigns securely sampled labels to those slots before the animation starts. Every red and blue ball remains in the machine, and no label changes during a draw. The forecast is cached per geometry and motion mode. A draw holds its starting motion mode until completion so that a settings change cannot invalidate the plan. Unselected positions remain random. History stores the preset name as it was at draw time.

## Motion Capture

Open `qa/motion-capture.html` on the same local server. Its Record draw button records the actual app canvas and exports the video plus phase measurements. This page is a QA tool and is not linked from the product.
