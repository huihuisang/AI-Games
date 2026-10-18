# Guardian Slip Design QA

final result: passed

## Target and Evidence

- Selected visual truth: `../design/lottery-ticket/mascot-focus/01-guardian-slip.png`, the first generated image displayed to the user.
- Application: `http://127.0.0.1:4173/双色球摇奖机/`.
- Browser: Codex in-app browser, operated through CUA. No external browser fallback was used in this iteration.
- Full application screenshot: `../design/lottery-ticket/mascot-focus/implementation-mobile.png`.
- Full-view source/application comparison: `../design/lottery-ticket/mascot-focus/implementation-full-comparison.png`.
- Focused artifact comparison with matching sample quote and numbers: `../design/lottery-ticket/mascot-focus/implementation-comparison.png`.
- Five renderer states: `../design/lottery-ticket/mascot-focus/implementation-roles.png`.

## Normalization and State

The reference is 853 × 1844 pixels and targets a 390 × 844 mobile viewport. The full application capture is 390 × 844 at 1× density. The full-view comparison normalizes the reference to that same viewport. Its live quote, number combination, time, and generated identifier differ because this is an actual completed selection; these are intentionally variable content.

The focused comparison removes the external controls from the source and normalizes its artifact region to 390 × 737. A temporary local renderer fixture used the exact production renderer, original mascot assets, actual brush font, source sample quote, red 07/08/21/26/29/30, and blue 15. Its image was captured at 390 × 737 CSS pixels. That fixture did not modify user history or presets. The record ID follows the application's real identifier scheme rather than the concept's hand-written sample.

## Comparison History

1. Initial browser capture showed the cached previous renderer and styles. The local HTTP files were checked against the workspace. Explicit result-module and stylesheet versions resolved the stale resources. The final application and downloaded image use the new 900 × 1700 composition.
2. The first new-layout comparison found P2 issues: a quote could split a spoken phrase after the comma, and the final stub disclaimer touched the paper edge. The quote layout now prefers the spoken pause before reducing font size, and stub metadata was moved inward. A regression test covers the phrase boundary; all 80 lines were checked using the real loaded font in the renderer fixture.
3. The original Caishen render was smaller than the selected composition. Its proportional hero box was enlarged without changing the source aspect ratio. The final matching-content and full-view comparisons show the corrected mascot/quote/ticket hierarchy.
4. Responsive verification first exposed that the browser's viewport override was affecting the separate fixture tab. That tab was closed, and every final viewport measurement was checked against `innerWidth` and `innerHeight` before accepting the captures.

## Required Fidelity Surfaces

- Typography: the large generic heading, filler slogan, and machine thumbnail are absent. An OFL Ma Shan Zheng subset gives the blessing its brush style; every current character line fits completely. Number labels remain bold and clear. Source font strokes are not reproduced pixel-for-pixel; the real font supports all changing quotes.
- Spacing and hierarchy: large complete mascot above the blessing, then compact number ticket and lower perforated stub. Controls sit outside the exported image. Save is primary; Share is secondary. Select again is a compact corner control retained from the functional application.
- Colors and materials: cream background, champagne-gold halo/coins, porcelain clouds, original glossy mascot and ball textures, warm-brown quote, coral primary action. The production paper and backdrop are generated raster assets, not CSS substitutes for the reference illustrations.
- Image quality: the four existing mascots retain their original proportions. The neutral ingot is used for direct selection and legacy records, without inventing a historical mascot. Source PNGs, delivery WebP files, prompts, and licenses are retained under `assets/`.
- Copy and content: exactly six sorted red numbers and one blue number, actual selection time, record ID, preset name, and attributed stored blessing. The simulation/probability context remains inside the exported artifact. The algorithm and stored physical number order remain separate from the sorted slip display.

## Interaction and Responsive Checks

- Real seven-ball selection completed and opened the new result dialog automatically after the final blue ball settled.
- The completed slip matched its visible numbers and the final stored role dialogue.
- History reopening retained the completed role and dialogue; Select again returned to the existing ceremony and selection flow.
- Save image downloaded a real PNG; Pillow verified 900 × 1700 dimensions. The same blob is used for native file sharing.
- Measured 320 × 568, 390 × 664, 430 × 932, and 1280 × 900. Dialog bounds and save/share buttons stayed inside the viewport, with no horizontal overflow. Targets were at least 44 px high.
- Five renderer states were inspected: Caishen, future self, cat, koi, and direct selection.
- Browser console errors and warnings: none in the final application and renderer fixture.
- Automated tests: 50 passed, including all mascot quote bounds and spoken-pause wrapping.

## Follow-up Polish and Boundaries

- P3: the concept's gold underline flourish is not reproduced; the production composition keeps the large brush quote and original mascot artwork. Generated cloud/coin placement and paper trim vary slightly from the flattened concept.
- Native iPhone share-sheet delivery remains a real-device test gap. This iteration verifies actual download and preserves the existing native-sharing implementation and fallbacks; it does not claim a share was sent to another app or person.
- No deployment was requested or performed. Unrelated project work remains in the workspace.

## Latest Number-Row Refinement

The user requested more horizontal breathing room after visual selection. Ball diameter changed from 106 to 90 canvas units, with the row centered between x99 and x801 instead of x43 and x857. Number labels scale with the ball. The 390 × 844 app view and an actual saved 900 × 1700 PNG were inspected again; the same seven numbers remain clear and both sides have equal inset. Current evidence: `../design/lottery-ticket/mascot-focus/implementation-mobile.png`; focused downloaded-image crop: `/tmp/guardian-balls-spacing-detail.png`. This intentional spacing update supersedes the wider row in the original concept and older comparison images. Syntax and whitespace checks passed; browser errors/warnings: none.

## Roomier Lower Stub

The user identified crowded timestamp/ID/preset and context text. The original generated paper with its higher perforation was reused, creating more stub height without changing the image size or increasing the ball row. Metadata now has two columns: time/ID at left and barcode/preset at right. Bottom simulation/probability context has separate left/right alignment with clear space above and below. The actual 390 × 844 browser view and saved 900 × 1700 PNG were inspected, and no browser errors were observed. Latest evidence: `../design/lottery-ticket/mascot-focus/implementation-mobile.png` and `/tmp/guardian-roomy-stub-detail.png`.

## Stub Alignment Refinement

The user requested alignment against the perforation. Measured paper dash endpoints x63..836 map to approximately x78..822 after the existing x18 placement and 0.96 scale. Time, ID, and left context now share x78. Barcode, preset, and right context share the x822 right edge; the barcode denominator excludes its final blank gap so the last ink bar reaches that edge. The 390 × 844 browser view and actual PNG download were inspected, with no browser errors. Latest focused evidence: `/tmp/guardian-stub-aligned-detail.png`.
