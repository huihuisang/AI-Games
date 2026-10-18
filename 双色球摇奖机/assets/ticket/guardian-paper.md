# Guardian Ticket Paper

Generated with the built-in `image_gen` tool. This plate follows the lower ticket region in `design/lottery-ticket/mascot-focus/01-guardian-slip.png`.

- Source: `guardian-paper-source.png`, 1794 × 877 RGBA.
- Delivery: `guardian-paper.png` and lossless `guardian-paper.webp`, 900 × 440 RGBA.
- The delivery uses proportional Lanczos downsampling and transparent padding. No stretching or drawn additions were used.
- Both delivery files retain alpha. The PNG has 53,704 fully transparent pixels. The perforation is near y = 281 (64% of height); place live content around the rendered plate.
- The plate contains no text, numbers, barcode, balls, mascot, or logo. All semantic content must remain live and editable.

## Generation Prompt

Use case: product-mockup. Asset type: reusable blank paper ticket background for a web app. Reference image: use ONLY the lower ivory perforated ticket region below the mascot quote as the paper material and trim reference. Generate ONE isolated blank ticket plate, landscape 900 x 440 aspect ratio, straight-on orthographic view with no perspective distortion. Warm ivory fibrous paper, beautifully refined thin champagne-gold edge, very small delicate folded ornamental corners. Ticket silhouette occupies almost entire canvas with only a 5px transparent outer gutter and a small soft contact shadow. Left and right edges have matching half-circle tear notches centered at y=270 (61.4% of full height). A visible fine horizontal dashed cut perforation crosses at y=270 between the notches. Preserve maximum usable blank interior space: upper area y20..245 completely blank, lower stub y285..425 completely blank. No additional internal rules. Exactly this single flat paper plate with its edge, corner detail, grain, notches, perforation and subtle shadow. NO text, numbers, letters, label, balls, icons, barcode, logo, character, machine, coins, clouds, sunburst, watermark, scenes or hands. Fully transparent background outside the paper silhouette and shadow; no opaque cream backdrop. Match the sophisticated tactile warm cream and gold material of the reference.

First output: `/Users/huisang/.codex/generated_images/01a14d94-d665-7741-a4fa-455fe87cf5d3/exec-e8a068dd-6af5-4854-adbd-39ab5aa032e6.png`.

## Refinement Prompt

Use case: precise-object-edit. Keep this exact single blank ivory paper ticket plate, its landscape ratio, gold edge, folds, subtle paper texture and transparent surroundings. Change ONLY the tear notch and perforation position. Move both side half-circle notches and the dashed horizontal perforation LOWER, from the current near center to exactly 61.4% down the full canvas. This creates a clearly taller upper blank region (about 60% height) and a shorter lower blank stub (about 35% height). Straight-on orthographic, no perspective. Maintain maximum empty usable area. NO text, numbers, balls, barcode, characters, icons, additional lines or other decoration. Keep fully transparent background outside paper silhouette and shadow. Retain original aspect ratio approximately 900:440.

Selected output: `/Users/huisang/.codex/generated_images/01a14d94-d665-7741-a4fa-455fe87cf5d3/exec-8ff69aff-6114-4298-8741-0368a0712625.png`.

## Roomier Stub Variant

After user feedback about crowded lower metadata, the original first generated output was reused as `guardian-paper-roomy-source.png` and converted proportionally to `guardian-paper-roomy.webp` (900 × 440 RGBA). This uses its higher perforation near y239, giving the lower stub more height while keeping the overall plate dimensions. The previous delivery stays available as design history. Conversion only; no new image generation or painted modifications. Active semantic layout: time/ID at left, barcode/preset at right, then a separate bottom context row.
