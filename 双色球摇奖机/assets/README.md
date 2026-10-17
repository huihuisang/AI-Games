# Asset Sources

Generation mode: built-in imagegen. The selected cream toy UI is stored in `../qa/reference.png`.

## Machine

Prompt: Use the selected reference to generate one isolated cream-yellow, tactile 3D plastic drawing machine. Keep the large clear chamber on the left, the smaller clear chamber on the right, yellow lids, a rounded yellow base, the front clear outlet chute, and the curved blue tube. Both chambers must be empty. Remove balls, paddles, text, UI, and scene decorations. Use a cream background that matches `#fff8eb`.

Source: `machine.png`. Delivery: `machine.webp`. Geometry: `machine-layout.json`.

## Ball Sprites

Prompt: Generate two equal glossy toy plastic spheres in one row, a coral red sphere on the left and a sky-blue sphere on the right. Match the selected reference and its soft upper-left lighting. Use true transparency. Do not include numbers, letters, other spheres, a stand, a platform, a floor shadow, UI, or a machine.

Source: `balls.png`. Individual source crops: `red-ball.webp` and `blue-ball.webp`. Delivery: `red-ball-small.webp` and `blue-ball-small.webp`. Numbers are live text in the renderer and result UI.

## Mixing Paddle

Prompt: Generate one front-facing, buttery yellow 3D toy plastic mixing paddle. Use three thick rounded arms at 120-degree intervals and a circular center cap. Use soft upper-left light and a truly transparent background. Do not include the machine, balls, numbers, or a scene.

Source: `paddle.png`. Delivery: `paddle-small.webp`. The source hub is at `(625, 715)` in a 1254 × 1254 image.

## Icons

Phosphor Icons Core 2.1.1: `play-circle-fill.svg`, `speaker-high-fill.svg`, and `speaker-slash-fill.svg`. License: MIT, stored in `PHOSPHOR-LICENSE.txt`.
