#!/usr/bin/env python3
"""map-shorts encode: clip/build/frames/%04d.jpg + build/voice.m4a -> clip/build/<name>-<tag>.mp4 (1080x1920, H.264, AAC).
Usage: encode.py <clip_dir> [tag]
Uses libx264 when ffmpeg has it; otherwise falls back to OpenH264 or Windows Media Foundation (some ffmpeg builds ship without x264)."""
import json, subprocess, sys
from pathlib import Path
for _s in (sys.stdout, sys.stderr): _s.reconfigure(encoding="utf-8", errors="replace")   # Windows consoles default to a legacy code page

# (encoder, its options) in order of preference; ~9 Mbit/s because platforms soften uploads under ~5
ENCODERS = [("libx264", ["-b:v", "9M", "-maxrate", "14M", "-bufsize", "18M", "-preset", "medium"]),
            ("libopenh264", ["-b:v", "9M"]),
            ("h264_mf", ["-b:v", "9M"])]

clip = Path(sys.argv[1]).resolve(); tag = sys.argv[2] if len(sys.argv) > 2 else "v1"
fps = json.loads((clip / "build/meta.json").read_text(encoding="utf-8"))["fps"]
out = clip / "build" / f"{clip.name}-{tag}.mp4"
have = subprocess.run(["ffmpeg", "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
errors = []
for name, opts in ENCODERS:
    if f" {name} " not in have: continue
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(fps), "-i", str(clip / "build/frames/%04d.jpg"), "-i", str(clip / "build/voice.m4a"),
                        "-map", "0:v", "-map", "1:a", "-c:v", name, *opts, "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", "-shortest", str(out)],
                       capture_output=True, text=True)
    if r.returncode == 0:
        print(out if name == "libx264" else f"{out}  (encoded with {name}; install an ffmpeg build with libx264 for the best quality)")
        sys.exit(0)
    errors.append(f"{name}: {r.stderr.strip()[-400:]}")
sys.exit("could not encode: no working H.264 encoder in this ffmpeg.\n" + "\n".join(errors) +
         "\nInstall a full ffmpeg build (Windows: winget install --id Gyan.FFmpeg -e, macOS: brew install ffmpeg, Linux: apt install ffmpeg).")
