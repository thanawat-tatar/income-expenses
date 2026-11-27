# Setup

Requirements: Python 3.10+, Node 18+, ffmpeg/ffprobe, Chrome or Chromium.

```bash
pip install numpy pillow edge-tts          # build + site tool
pip install pythainlp                      # Thai captions (optional)
pip install pyshp shapely                  # make_geo.py (optional)
npm i playwright-core && npx playwright-core install chromium   # in the folder you work from; NOT `npx playwright` (wrong browser version)
```

Render speed
- With a GPU: `node scripts/render.mjs <clip>` (Chrome uses ANGLE/your GPU). Check the `renderer:` line it prints.
- Without: add `--swiftshader` (software, works anywhere, about 30x slower; fine for stills).
- Frames land in `<clip>/build/frames`; parallelise with `--from N --to M` in several processes.
- WSL: Chrome inside WSL only has software GL. Run the project on the Windows side (Windows Python + Node) to use the GPU; measured ~16 fps on an AMD 860M iGPU vs ~0.5 fps in WSL.
- ffmpeg: Windows `winget install --id Gyan.FFmpeg -e`, macOS `brew install ffmpeg`, Linux `apt install ffmpeg`. encode.py falls back to OpenH264 when a build lacks x264.

Voices
- Draft (free, not for monetised videos): Edge TTS. Final: `export ELEVENLABS_API_KEY=...` and `"provider": "elevenlabs"` (or another licensed provider).
- Voice lines are cached in `<clip>/voice/` by text, so rebuilding after a camera edit costs nothing.
