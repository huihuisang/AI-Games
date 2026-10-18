# Reward overlay verification

Verified on 2026-10-18 in the native in-app browser.

- A full physical selection completed seven transfers and opened the reward overlay automatically. The cat, its stored blessing, and the sorted paper numbers matched the completed selection.
- The original page stays visible under an 85% dark backdrop. The dialog has a transparent background. The compact paper has transparent outer edges; the complete export keeps its cream illustration.
- `entry-mobile.png` captures a real reopening during the mascot/particle phase. `complete-mobile.png` captures the settled 390 × 664 scene after the full selection. These are browser screenshots, not generated previews.
- Measured 320 × 568, 390 × 664, 430 × 932, and 1280 × 900 layouts. Content and action bounds fit each viewport. The 844 × 390 landscape layout uses a separate mascot column and fits the paper above its actions after the animation settles.
- The Save button downloaded a complete 900 × 1700 PNG, verified with `sips`. Preview and export share the same paper renderer and immutable selection record.
- Backdrop click, Escape, close/focus return, and reopening worked. Console warnings and errors were empty.
- All 53 Node tests passed. Added motion tests cover image-ready reveal timing, cancellation on close/replacement, reduced-motion fade, hidden-page pause/resume, and a preference change during playback.
- No real-device performance measurement or native iPhone share-sheet delivery was performed. The prior file-sharing implementation was retained.

## Front-facing mascots

On 2026-10-18 all four characters received front-view source images and 640 px / 256 px WebP copies. Each 1254 px PNG and every delivery copy retains alpha. The mobile picker displayed all four front views at their original aspect ratio (`../front-mascots-picker.png`). Reopening the saved cat record loaded `cat-front.webp`; Save downloaded a complete PNG with the new frontal cat, visually inspected (`../front-mascot-result.png`). All 53 Node tests passed and browser error/warning logs were empty. Source images and exact imagegen edit prompts are in `assets/mascots/`.

The user then kept the original side-view koi; its active paths are `koi.webp` and `koi-small.webp`. The earlier four-front-view screenshot records the preceding design. Nine focused ritual/ticket tests passed after this path change. The browser connection timed out during the follow-up visual check.
