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

This is a preview artifact. It has not replaced the app ceremony and has not been pushed. Commercial-use rights for this free trial have not been verified. The source and compatible original preview retain the watermark.


## Local clean preview

The user requested removal of the visible Vidu corner mark. The official Download control required a membership upgrade, so no paid download was requested. `cat-q3-clean-preview.mp4` is a separate local retouch, not an official clean export. It uses FFmpeg delogo over the fixed bottom-right mark before scaling to 1080 x 1080. The full frame and 5.041667-second duration are retained; AAC audio is copied from the original. Source files remain unchanged. First, middle, and final frame crops were visually checked. This edit does not change the original service usage terms.

```sh
ffmpeg -i cat-q3-free.mp4 -vf 'delogo=x=1216:y=1352:w=202:h=64,scale=1080:1080' -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a copy -map_metadata 0 -movflags +faststart cat-q3-clean-preview.mp4
```
