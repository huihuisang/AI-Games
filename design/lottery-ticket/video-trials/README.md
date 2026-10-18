# Mascot video trial

Generated on 2026-10-18 through the signed-in Vidu web interface. The user authorized a free lucky-cat trial before producing more characters.

- Model: Vidu Q3, Image to Video, one clip, requested 5 seconds and 1080p.
- Billing evidence: the selected model showed one free trial and the submission button displayed 0 credits. No upgrade or payment was submitted. The trial was consumed after submission. The page also displayed a 65-credit reward notice; this is not verified spendable balance.
- Source: `../../../双色球摇奖机/assets/mascots/cat-front.png`.
- Exact prompt and requested settings: `cat-q3-request.json`.
- Source output: `cat-q3-free.mp4`, creation 3513954424828992, 5.041667 seconds, 1440 x 1440, HEVC, 24 fps, AAC audio.
- Browser-compatible copy: `cat-q3-preview.mp4`, 1080 x 1080, H.264 + AAC, fast start. Only scale and encoding changed; the Vidu watermark remains visible.
- Evidence: `cat-q3-before.png` shows the prepared free request; `cat-q3-complete.png` shows the completed task; `cat-q3-contact.png` samples the actual video once per second.

The actual output keeps the cat frontal. Gold light builds in its raised paw, a large gold paw sigil expands toward the camera, and red/blue orbs follow. The sigil briefly covers part of the face at the impact. The background changes from the source's white matte to dark gold at the start. These are observed output details, not assurances from the prompt.

The cat clean preview was later added to the app ceremony and pushed in commit `d853f835`. Commercial-use rights for this free trial have not been verified. The source and compatible original preview retain the watermark.


## Local clean preview

The user requested removal of the visible Vidu corner mark. The official Download control required a membership upgrade, so no paid download was requested. `cat-q3-clean-preview.mp4` is a separate local retouch, not an official clean export. It uses FFmpeg delogo over the fixed bottom-right mark before scaling to 1080 x 1080. The full frame and 5.041667-second duration are retained; AAC audio is copied from the original. Source files remain unchanged. First, middle, and final frame crops were visually checked. This edit does not change the original service usage terms.

```sh
ffmpeg -i cat-q3-free.mp4 -vf 'delogo=x=1216:y=1352:w=202:h=64,scale=1080:1080' -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a copy -map_metadata 0 -movflags +faststart cat-q3-clean-preview.mp4
```

## Three additional spells

Generated on 2026-10-18 after the user requested videos for the other three mascots. The signed-in account showed 20 Free Credits, 0 Subscribed Credits and 0 Purchased Credits. The Q4 request showed one free trial and a 0-credit Create button. Q2 Flash showed 10 credits per five-second 1080p clip. The two Q2 requests used the 20 gifted credits; the final account balance was 0. No payment, top-up or subscription was submitted. A separate 65-credit reward notice was not treated as available balance.

| File prefix | Character | Model | Cost | Observed result |
| --- | --- | --- | --- | --- |
| `caishen-q4` | God of Wealth, front-facing source | Q4 Preview | One free trial, 0 credits | Gold ingot charges, a large geometric gold seal expands, then red and blue light streams leave the frame. The seal briefly covers the face. |
| `future-q2` | Future self, front-facing source | Q2 Flash | 10 gifted credits | Blue-white time rings, an energy rift between the hands, then red and blue orbs. The body stays frontal. |
| `koi-q2` | Original side-facing koi | Q2 Flash | 10 gifted credits | Golden gate and spiral energy, a short gold dragon-like outline, then red and blue orbs. The fish stays a koi in its original side pose. |

Each request used Image to Video, five seconds, 1080p, H265 and one output. Exact prompts and settings are stored in each `*-request.json`; `*-before.png` records the prepared request. `three-spells-complete.png` shows the completed task in Vidu. Raw `*-free.mp4` files are 1440 x 1440 HEVC and retain the original watermark. Q4 includes AAC audio; the two Q2 files have no audio track. Actual durations are 5.041667 seconds for Q4 and 5.083333 seconds for Q2.

`*-preview.mp4` files are full-frame 1080 x 1080 H.264 copies with the original marks. `*-clean-preview.mp4` files apply the same local corner retouch as the cat before scaling. Existing audio is copied; no audio was added to the silent Q2 files. Both versions preserve the source duration and aspect ratio. Contact sheets sample the real clips once per second. `three-spells-verification.json` records the compatible clean files, durations, codecs and SHA-256 values; all three decoded without errors.

The user subsequently approved the three clean previews for app integration. Each is copied byte-for-byte into `双色球摇奖机/assets/video/` and selected through the existing ceremony player. Original outputs remain unchanged. Local retouch is not an official unmarked export and does not change the service usage terms.
