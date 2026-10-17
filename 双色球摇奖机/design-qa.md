# Design QA

final result: passed

## Wide-Screen History Board

- At 960 px and above, the page uses a two-column workspace: the drawing machine on the left and a persistent record board on the right. Smaller screens retain the history button and dialog.
- Both views use the same renderer and history data. The board is populated on page load and refreshed immediately after a completed draw.
- Actual browser verification at 1280 × 900: history increased from 14 to 15 rows after a real draw. The newest right-side row matched all seven numbers in the main result: 25, 03, 33, 08, 15, 06, and blue 16.
- The board has its own scroll area. Keyboard PageDown changed its scroll offset while the page offset stayed unchanged. Its header remains in place.
- At 390 × 844, the board is hidden, the history button remains visible, and the dialog shows the same 15 records. Crossing back to wide layout closes the dialog automatically.
- Screenshots: `qa/history-board-wide.jpg` and `qa/history-board-mobile.jpg`.
- The existing 25 logic tests pass. Module syntax and whitespace checks pass.

## Evidence

- Source visual truth: `qa/reference.png`, the first selected Image Gen result.
- Source size: 853 × 1844 px, normalized to 390 × 844 for comparison.
- Implementation: `qa/mobile-complete.jpg`, 390 × 844 px at a 390 × 844 CSS viewport. Browser DPR is 2; the screenshot API exports CSS pixel dimensions, so no additional density scaling was applied.
- State: completed draw with six red balls and one blue ball. Real random values and remaining chamber balls differ from the static concept.
- Full-view comparison: `qa/comparison.jpg`, source on the left and browser capture on the right.
- Focused controls comparison: `qa/controls-comparison.jpg`.
- Other states: `qa/mobile-idle.jpg`, `qa/mobile-drawing.jpg`, `qa/mobile-first-exit.jpg`, `qa/mobile-history.jpg`, and `qa/mobile-320.jpg`.

## Findings and Fixes

1. P2, initial machine composition: the first integration lacked the visible mixing paddle. Added a generated transparent paddle and rotate it behind the balls in the active chamber. The final paired comparison shows the restored mechanism.
2. P2, narrow viewport: the canvas extended 2 px beyond a 320 px viewport. Reduced the small-screen stage expansion to match its 16 px page gutters. The final browser check reports `innerWidth = 320`, `scrollWidth = 320`, and stage edges at 0 and 320.
3. P2, initial scale and hierarchy: the first integration had a smaller machine and title than the selected concept. Increased the title scale and cropped the source image margins without stretching it. The final paired comparison shows the larger hero and the primary action in the lower part of the phone viewport.

No actionable P0, P1, or P2 findings remain.

## Fidelity Surfaces

- Typography: bold Chinese heading, muted subtitle, tabular result numbers, and a clear primary action. System Chinese fonts are used. Their shape differs slightly from the generated type; this is P3 polish.
- Layout: the selected hierarchy is preserved: header, machine, seven result slots, primary action, history, and footer. The live status line and progress label add useful draw feedback. At 390 × 844, the primary button is fully visible at y=689–753. At 320 × 568, the page scrolls vertically with no horizontal overflow.
- Colors: cream page, butter-yellow machine, coral action and red balls, blue final ball. Speaker icons use the coral accent.
- Images: generated machine, paddle, and ball sprites preserve the toy material and glass chambers. Raster assets are used for the illustration. Ball positions and counts are dynamic. The smaller chamber balls allow all 16 blue numbers to exist in the simulation.
- Copy: the selected heading, subtitle, result label, history action, and simulation note are retained. After completion the button changes to “再摇一组”. Random results remain in draw order.

## Behavior Checks

- Complete draw observed in the browser: six distinct red values in 1–33 and one blue value in 1–16.
- First outlet transfer observed with 32 red balls remaining and zero revealed numbers. The button was disabled during the transfer.
- Final state observed with 27 red balls, 15 blue balls, seven revealed numbers, and an enabled repeat button.
- Mixing and travel screenshots show movement inside the chamber and through the front chute.
- History opens and closes. Stored completed results remain after navigation and reload.
- Sound toggle changes its pressed state from true to false and back to true.
- The root game card opens the tool.
- Browser console: no warning or error entries in the checked final page.
- Twenty-five Node tests pass. They cover draw constraints, rejection sampling, malformed storage, paddle contacts, gravity, chamber gates, label-independent capture, tube acceleration, tray impacts, ordered release, delayed frames, complete draws with both normal and reduced motion, and preset validation and physical playback.

## Number Presets

- The requested selection row sits between the result balls and start action. This is an intentional addition to the selected visual. At 390 × 844 the start action remains visible.
- Three editable examples cover red-only, blue-only, and combined presets. The default remains fully random. Users can save up to 20 named presets on this device.
- Browser evidence: `qa/preset-editor.jpg`, `qa/preset-editor-320.jpg`, and `qa/preset-result.jpg`.
- A real browser draw with required reds 03, 08, 33 and blue 16 produced reds 03, 31, 05, 33, 08, 30 and blue 16. All required values were included, and the remaining red values were filled randomly.
- Selection and management controls were disabled during the draw and enabled on completion.
- Browser checks confirmed creation, editing, restoration after reload, deletion, and changing the selected preset. A sixth selected red disabled a seventh choice. Choosing a new blue cleared the previous blue; choosing it again returned to random blue.
- History retained the name “我的幸运号” with its completed result after reload.
- Narrow-screen fix: the native dialog maximum width reduced the number target width below 44 px. An explicit 24 px viewport inset now gives 45 px targets at 320 × 568. The save footer is fully visible at y=467–540, and the page has no horizontal overflow.
- The same 120 Hz solver is used for planning and playback. Integration tests verify exact preset results at 30, 60, and 120 render frames per second, including reduced motion. Numbers are assigned before playback and do not change during motion.

## Physical Motion Revision

- Actual browser canvas recording: `qa/machine-motion.webm`, converted to `qa/machine-motion.mp4` for playback. The complete recorded draw took about 23 seconds.
- Contact sheet from the recording: `qa/motion-frames.jpg`, sampled every three seconds. It shows the paddle lifting local ball piles and balls falling between the paddle arms rather than forming a uniform orbit.
- Updated phone screenshot: `qa/motion-mobile.jpg`. The cream machine design and mobile layout are retained.
- Capture starts at the actual bottom ball position. The old remote-ball interpolation has been removed.
- Outlet progress uses arc length and gravity projected onto the tube slope. Ball rotation follows its travel distance. The ball hits the receiving tray, rebounds, and settles before the result is revealed.
- Random labels are assigned with secure rejection sampling. The motion solver never reads labels; a test verifies that changing the labels leaves physical capture unchanged.
- Final main-page browser check: phase complete, 27 red balls, 15 blue balls, seven revealed results, two final tray contacts, no horizontal overflow at 390 × 844, and no console warnings or errors.
- The capture helper completed successfully. Its browser log included one unattributed MutationObserver error; the application does not use MutationObserver, and the main application page reported none.

## Limits and Follow-up Polish

- Verification used the desktop in-app browser at mobile viewport sizes. No physical iOS or Android device test was performed.
- Reduced motion, optional storage failure, and page visibility pause are implemented. Complete reduced-motion draws pass the physics integration test. Background/resume and physical-device behavior were not exercised on a physical device.
- P3: generated artwork and system Chinese type are close to the chosen concept but are not pixel-identical.

## Implementation Checklist

- [x] Restore the selected visual hierarchy and raster assets.
- [x] Run the full random draw and ordered outlet animation.
- [x] Check narrow-screen overflow and practical touch controls.
- [x] Test history, sound state, and the collection entry point.
- [x] Compare the final browser capture against the selected concept.
- [x] Pass the logic tests and module syntax check.
