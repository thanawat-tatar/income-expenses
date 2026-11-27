#!/usr/bin/env python3
"""map-shorts setup check: run once before the first clip. Prints what is missing and how to fix it; changes nothing.
Usage: check_setup.py [project_dir]   (project_dir = where you will run render.mjs, default: current folder)"""
import importlib.util, json, os, shutil, subprocess, sys
from pathlib import Path
for _s in (sys.stdout, sys.stderr): _s.reconfigure(encoding="utf-8", errors="replace")   # Windows consoles default to a legacy code page

proj = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve(); here = Path(__file__).resolve().parent
ok = True


def line(good, what, fix=""):
    global ok
    optional = fix.startswith("(optional)")
    ok &= good or optional
    print(("  OK   " if good else "  opt  " if optional else "  --   ") + what + ("" if good else f"\n         {'note' if optional else 'fix'}: {fix}"))


print("map-shorts setup check\n")
line(sys.version_info >= (3, 10), f"Python {sys.version.split()[0]} (3.10+)", "install Python 3.10 or newer")
for mod, pkg, opt in [("numpy", "numpy", 0), ("PIL", "pillow", 0), ("edge_tts", "edge-tts", 0),
                      ("pythainlp", "pythainlp", 1), ("shapefile", "pyshp", 1), ("shapely", "shapely", 1)]:
    line(importlib.util.find_spec(mod) is not None, f"python package {pkg}", ("(optional) " if opt else "") + f"pip install {pkg}")
HOW = {"ffmpeg": {"win32": "winget install --id Gyan.FFmpeg -e   (then open a new terminal)", "darwin": "brew install ffmpeg", "linux": "sudo apt install ffmpeg"},
       "node": {"win32": "winget install --id OpenJS.NodeJS.LTS -e   (then open a new terminal)", "darwin": "brew install node", "linux": "sudo apt install nodejs npm"}}
plat = "win32" if sys.platform.startswith("win") else "darwin" if sys.platform == "darwin" else "linux"
for tool in ("ffmpeg", "ffprobe", "node"):
    line(shutil.which(tool) is not None, tool, HOW.get("ffmpeg" if tool == "ffprobe" else tool, {}).get(plat, f"install {tool} and put it on PATH"))
pw_dir = next((d for d in [proj, *proj.parents, here, *here.parents] if (d / "node_modules/playwright-core").exists()), None)
line(pw_dir is not None, "node package playwright-core", f"cd {proj} && npm install   (in the map-shorts folder; or: npm i playwright-core@1.58.2)")
if pw_dir and shutil.which("node"):       # the browser build that matches this playwright-core
    r = subprocess.run(["node", "-e", "const c=require('playwright-core').chromium;console.log(c.executablePath())"], cwd=pw_dir, capture_output=True, text=True)
    exe = r.stdout.strip()
    line(bool(exe) and Path(exe).exists(), "Chromium for playwright-core", f"cd {pw_dir} && npx playwright-core install chromium   (not `npx playwright`; ~200 MB, goes to the ms-playwright cache), or pass --chrome <path> to render.mjs")
line(bool(os.environ.get("ELEVENLABS_API_KEY")), "ELEVENLABS_API_KEY set (final-quality voice)",
     "(optional) only needed for the final voice; the free Edge voice is for drafts, not monetised videos")
for f in ("template/data/blue-marble.jpg", "template/data/ne10_countries.geojson", "template/vendor/three.min.js", "template/fonts/Kanit-Bold.ttf"):
    line((here.parent / f).exists(), f"skill file {f}", "re-download the skill: a file is missing")
print("\n" + ("Ready (opt lines are optional). Next: ask the agent for a clip, or try examples/fuji from the repository." if ok else "Fix the -- lines above, then run this again (opt lines are optional)."))
sys.exit(0 if ok else 1)
