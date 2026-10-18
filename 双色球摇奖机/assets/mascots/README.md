# Ceremony Mascots

Generated with the built-in `imagegen` tool. The existing `../machine.webp` is the material and lighting reference. Both generations use genuine RGBA transparency and 1254 × 1254 px PNG sources. The original outputs were copied without edits. WebP delivery copies preserve alpha and only change dimensions and encoding: 640 px for the ceremony and 256 px for selection thumbnails, quality 90.

| Character | PNG source | Ceremony | Thumbnail |
| --- | --- | --- | --- |
| Wealth god | `caishen-front.png` | `caishen-front.webp` | `caishen-front-small.webp` |
| Future self | `future-front.png` | `future-front.webp` | `future-front-small.webp` |
| Lucky cat | `cat-front.png` | `cat-front.webp` | `cat-front-small.webp` |
| Koi | `koi.png` | `koi.webp` | `koi-small.webp` |

## Front Views

On 2026-10-18 the user requested direct front views of all four existing characters. The built-in imagegen tool edited each prior WebP as its identity reference. The new sources were copied without image edits; delivery copies only resize and encode. Both face and torso face the viewer. The koi presents both eyes and pectoral fins while its tail flows below. The original images remain unchanged as design history.

The user then chose to keep the original side-view koi. Its front-view variant remains an unused design asset; only the other three front views are active.

Exact edit prompts are in `front-prompts.json`. The app, ceremony, result overlay, and saved slips use the active delivery images listed above. Original prompts below describe the earlier side-view generation.

## Original Wealth God Prompt

Reference: the lottery machine. Transparent background enabled.

```text
Use case: stylized-concept. Create ONE production-ready standalone transparent mascot cutout for a lottery machine app. The provided lottery machine is STYLE AND MATERIAL REFERENCE ONLY; do not include the machine. Subject: Caishen, the Chinese wealth god, as a refined collectible designer figurine, compact full body, dignified friendly adult face and beautifully sculpted ivory beard, vermilion lacquer robe with restrained fine embossed cloud patterns and champagne-gold trim, classic black-and-gold official hat with curved side wings, holding one polished gold yuanbao ingot in both hands at waist height. Elegant, premium and auspicious, not a flat cute cartoon. Match the reference's physically rendered glossy cream resin, luminous polished surfaces, clear optical highlights, meticulously rounded edges, sophisticated material transitions and warm soft product-studio lighting from upper left. Slightly three-quarter front view, entire figure with hat, hands and feet visible, centered in a square canvas with 12% safe transparent margin all around, figure occupies 76% of canvas height. No platform, no base, no room, no backdrop, no words or letters, no watermark. True transparent alpha background. No thick outlines, no vector illustration, no low-poly, no clay texture, no exaggerated huge eyes. A real high-end art toy photographed with an 85mm lens, soft warm fill light, fine craftsmanship and realistic specular reflections.
```

## Future Self Prompt

References: the lottery machine and generated wealth god. Transparent background enabled.

```text
Use case: stylized-concept. Generate ONE standalone transparent collectible mascot for 'a future version of myself delivering a lucky letter'. Image 1 is STYLE/MATERIAL reference only: glossy cream lottery machine, transparent acrylic and champagne gold. Image 2 is the collection's matching Caishen figurine: match its premium physically rendered resin finish, fine craftsmanship, natural warm studio highlights and three-quarter product photography, but use a distinctly different character. Subject: friendly androgynous young ADULT future traveler with neatly sculpted short dark hair, subtle kind smile, proportionate facial features, wearing a refined pearl-ivory futuristic exploration suit with muted jade enamel panels, small brushed champagne-gold joints, a beautifully clear spherical acrylic helmet like the machine's glass chamber. Hold one ivory envelope with a simple gold heart seal at chest level; other hand raised in a calm greeting. Full standing body, complete boots and hands, whole helmet visible. Less childish, sophisticated premium designer art toy, gentle optimistic adult personality, realistic glazing and optical reflections, carefully sculpted garment seams. Compact collectible proportions but NOT a huge baby head or anime eyes. Square composition, centered with generous transparent safe margins 10-12% all sides, entire figure occupies about 80% canvas height. Slightly three-quarter front angle, soft upper-left studio key and warm cream fill. No machine in output, no environment, no plinth, no base, no backdrop, no lettering, no watermark, no drawn outlines, no vector cartoon, no clay, no low-poly. Genuine transparent alpha background.
```

## Lucky Cat Prompt

References: the lottery machine and generated wealth god. Transparent background enabled.

```text
Use case: stylized-concept. Create ONE refined lucky cat / maneki neko collectible figurine on genuinely transparent alpha background. Images are STYLE REFERENCES only: first the glossy cream-and-yellow lottery machine, second the matching red-and-gold Caishen collectible. Match their high-end physically rendered polished resin, glazed ceramic and champagne-gold metal, warm upper-left softbox lighting, clean detailed 3D product photography and carefully rounded edges. Subject: elegant ivory porcelain lucky cat seated upright, gently smiling with calm closed crescent eyes, beautifully sculpted small muzzle and whisker details, natural tiny blush, soft warm caramel accents on ears and tail, one front paw raised to beckon, the other holds a single oval brushed-gold fortune coin with a square opening and subtly engraved abstract cloud pattern, no letters. Red enamel collar and delicately detailed gold bell, glossy ivory body with restrained champagne-gold accents. Luxurious artisan figurine, rich reflections, fine believable ceramic surface, charming but less childish and not a flat cartoon. Full cat including raised paw, hind feet and curved tail fully visible. Slight three-quarter front angle, centered square canvas, figure about 78% canvas height with 10-12% transparent safe margin. No platform, no base, no environment, no backdrop, no text or watermark, no outlines, no vector art, no clay, no anime eyes, no extra coins around the cat. Genuine alpha transparency.
```

## Koi Prompt

References: the lottery machine and generated lucky cat. Transparent background enabled.

```text
Use case: stylized-concept. Create ONE refined auspicious koi mascot as a luxury collectible art-glass and porcelain sculpture, true transparent alpha background. References are STYLE/MATERIAL ONLY: first a glossy cream lottery machine with transparent acrylic and gold-yellow surfaces, second its matching ivory-and-gold lucky cat. Match their premium detailed 3D product rendering, warm soft studio highlights, polished champagne-gold accents, sophisticated glazing and meticulously rounded forms. Subject: a single elegant koi in a graceful upward leaping S-shaped curve, viewed slightly three-quarter from the front side so the head is in upper left and sweeping tail flows toward lower right. Ivory pearl glazed body with tasteful vermilion-red koi patches, delicately embossed individual scales, subtle gold edging, beautifully translucent amber and clear acrylic flowing fins and forked tail. Natural small glossy dark eye, delicate barbels, calm auspicious personality; fish anatomy recognizably koi, refined collectible rather than cartoon animal. Fins capture light like the reference machine's transparent glass. Entire fish from barbels to tail visible, no crops. Centered square canvas, diagonal body composition filling 78% area, generous transparent margins 10-12% on all edges. A single fish only: no water, no splash, no pond, no bubbles, no plinth, no stand, no environment, no backdrop, no text or watermark. No flat outlines, no cartoon face, no oversized anime eyes, no low-poly, no clay texture. Photographed 85mm product lens, soft upper-left key, warm cream fill. Genuine transparent alpha cutout.
```
