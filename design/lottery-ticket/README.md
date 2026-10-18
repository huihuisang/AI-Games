# Number Selection Slip Concept

Status: design preview only. The generated image uses sample numbers and metadata. The app now has character dialogue after number selection. Dynamic slip rendering, image export, and sharing are still not implemented.

## Files and Direction

- `ticket-preview.png`: current preview edited with the built-in `imagegen` tool to use number-selection terminology.
- Material references: `../../双色球摇奖机/assets/machine.webp` and `../../双色球摇奖机/assets/mascots/caishen.png`.
- Paper layout references: the two user-supplied lottery ticket photos in the conversation.
- Use cream paper, champagne-gold details, subtle cloud patterns, perforation, and the existing 3D machine and selected mascot.
- Sample selection: red 07, 08, 21, 26, 29, 30; blue 15. All dates, identifiers, and the decorative barcode are sample design content.

## Proposed Completion Flow

1. Wait until the last blue ball settles and number selection is complete.
2. Show the selection slip with the actual numbers, selection time, chosen companion, and a line from that character’s 20-line pool.
3. Offer Save image, Share, and Select another set outside the exported image.
4. Keep the simulation label visible in the exported slip. Use original app assets and live text when implementing the design; the sample raster is not a template for replacing digits.

## Latest Image Edit Prompt

Mode: built-in image generation, opaque background. The previous preview was the edit target. Old wording appears below only to record the exact text-replacement instruction, not as current product copy.

```text
Precise text-localization edit of this existing concept image. Keep its entire cream paper composition, gold cloud patterns, perforations, shadows, red and blue ball materials, exact ball numbers 07 08 21 26 29 30 + blue 15, miniature machine, Caishen character, date, barcode, and spacing. Correct its product positioning: this is ONLY a playful number-selection helper, not a lottery draw or an issued ticket. Make these EXACT Chinese text replacements with clean readable typography: top brand '双色球摇奖机' -> '双色球选号机'; large headline '我的幸运票' -> '我的选号单'; middle line '开奖仪式 · 财神送福' -> '选号搭子 · 财神爷'; section label '本次模拟号码' -> '这次选的号码'; metadata label '出票时间' -> '选号时间'; round coral stamp '福气到账' -> '挑好啦'; replace the large blessing beside the stamp '把福气，交到你手上' with the warm humorous shopkeeper line '号码慢慢挑，晚饭记得加个蛋。', laid out in two balanced readable lines if needed without overlapping the mascot. Keep '这一组，送给今天的你', '6 红 + 1 蓝 · 单组号码', '纪念编号', '号码模式', '完全随机', and the bottom fine print '仅供模拟体验 · 非真实彩票'. Replace the very bottom small sentence with '老掌柜挑号码，你负责好好吃饭。'. No other text substitutions, no layout redesign, no new objects. All text mentioning 开奖, 摇奖, 出票 or 幸运票 must be absent in the revised image. Preserve the sophisticated cream-and-gold machine style.
```
