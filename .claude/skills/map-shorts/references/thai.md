# Thai (and other no-space languages) notes

- Install `pythainlp` so captions break on real words. Without it captions fall back to single characters.
- Thai TTS reads every space as a pause. Write lines with spaces only where you want a breath; put a space before a clause, not inside a name.
- Use the spoken register ("ประมาณ", "เกือบ"), not the written one ("โดยประมาณ").
- Numbers: put the full spoken form in `spoken` (`"9 แสน": "เก้าแสน"`), captions keep digits.
- The voice mispronounces some words (names, loanwords, "แมกมา"): respell in `spoken` (`"แมกมา": "แม็กม่า"`). The build merges words back so captions show the written form. Always **listen** to the result; a transcription check does not catch tone.
- ElevenLabs `eleven_v3` with `"voice": {"provider":"elevenlabs","voice_id":"...","model":"eleven_v3","lang":"th","speed":1.06}` gives natural Thai. Edge TTS has Thai voices (`th-TH-NiwatNeural`, `th-TH-PremwadeeNeural`) but timing for Thai is coarser.
- With Edge TTS, Thai word timing is coarse, so captions often show only one or two words at a time. ElevenLabs gives smoother captions.
- Caption width: `caption_chars` in spec (default 16 for Thai).
- Fonts: Kanit (OFL) is bundled and covers Thai. Do not add proprietary fonts to an open repo.
