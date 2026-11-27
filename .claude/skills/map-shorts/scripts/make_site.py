#!/usr/bin/env python3
"""map-shorts site patch: a high-resolution imagery + relief patch for the place a clip dives into.
EOxCloudless 2016 by EOX (CC BY 4.0) + Terrarium elevation tiles (SRTM and others, via AWS Terrain Tiles; see references/licenses.md).

Usage: make_site.py <clip_dir> --box S N W E [--zimg 13] [--zter 12] [--grid 1024]
  e.g. make_site.py clips/baikal --box 51.0 55.9 103.0 110.5 --zimg 11 --zter 10
Writes <clip_dir>/data_extra/<name>.{jpg,u16,json}; build.py embeds it.
Two layers: a REGION patch (about 15-30 degrees wide, --zimg 8 --zter 7 --grid 512) seen while the camera is high, and a SITE patch (1-2 degrees,
--zimg 12/13 --zter 11/12) for the close-up. Every clip needs a region patch (nothing is bundled: the data is downloaded from its source, not redistributed). Keep the box about 1-2 degrees wide for z13 (more tiles = slower);
use lower zoom for a bigger box. Tiles are cached in <clip_dir>/.tiles. Requires: pip install pillow numpy
"""
import argparse, json, math, socket, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np
from PIL import Image
for _s in (sys.stdout, sys.stderr): _s.reconfigure(encoding="utf-8", errors="replace")   # Windows consoles default to a legacy code page

_gai = socket.getaddrinfo
socket.getaddrinfo = lambda h, p, f=0, *a, **k: _gai(h, p, socket.AF_INET, *a, **k)      # some networks stall on IPv6
Image.MAX_IMAGE_PIXELS = None
# The 2016 layer is CC BY 4.0 (commercial use OK with credit). The 2018+ layers (s2cloudless-2018_3857 ...) are CC BY-NC-SA:
# non-commercial only. Do not switch layers without checking https://cloudless.eox.at
EOX = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg"
TER = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
UA = {"User-Agent": "map-shorts/1.0 (open-source video tool)"}


def get(url, f):
    if not f.exists():
        f.parent.mkdir(parents=True, exist_ok=True)
        for k in range(5):
            try: f.write_bytes(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()); break
            except Exception:
                if k == 4: raise
                time.sleep(2 + 3 * k)
    return f


def mosaic(url, z, ext, cache, box):
    S, N, W, E = box; n = 2 ** z
    tx = lambda lon: (lon + 180) / 360 * n
    ty = lambda lat: (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    x0, x1, y0, y1 = int(tx(W)), int(tx(E)), int(ty(N)), int(ty(S))
    jobs = [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
    if len(jobs) > 900: raise SystemExit(f"{len(jobs)} tiles at z{z}: shrink the box or lower the zoom")
    with ThreadPoolExecutor(8) as ex:
        files = list(ex.map(lambda xy: get(url.format(z=z, x=xy[0], y=xy[1]), cache / f"{z}-{xy[0]}-{xy[1]}.{ext}"), jobs))
    mos = Image.new("RGB", ((x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256))
    for (x, y), f in zip(jobs, files): mos.paste(Image.open(f).convert("RGB"), ((x - x0) * 256, (y - y0) * 256))
    return mos.crop((int((tx(W) - x0) * 256), int((ty(N) - y0) * 256), int((tx(E) - x0) * 256), int((ty(S) - y0) * 256)))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("clip"); ap.add_argument("--box", nargs=4, type=float, required=True, metavar=("S", "N", "W", "E"))
    ap.add_argument("--zimg", type=int, default=13); ap.add_argument("--zter", type=int, default=12); ap.add_argument("--grid", type=int, default=1024)
    ap.add_argument("--name", default="site", help="site (the close-up patch) or region (the wider patch under it)")
    a = ap.parse_args(); clip = Path(a.clip); D = clip / "data_extra"; D.mkdir(parents=True, exist_ok=True); T = clip / ".tiles"
    img = mosaic(EOX, a.zimg, "jpg", T / f"eox{a.zimg}", a.box); img.thumbnail((6144, 6144)); img.save(D / f"{a.name}.jpg", quality=88)
    t = np.asarray(mosaic(TER, a.zter, "png", T / f"ter{a.zter}", a.box)).astype(np.float32)
    h = np.clip(t[..., 0] * 256 + t[..., 1] + t[..., 2] / 256 - 32768, 0, None)         # metres above sea level (sea floor clamped to 0)
    gd = round(a.grid * h.shape[0] / h.shape[1])
    hs = np.asarray(Image.fromarray(h).resize((a.grid, gd), Image.BILINEAR))
    np.round(hs).astype(np.uint16).tofile(D / f"{a.name}.u16")
    S, N, W, E = a.box
    m = {"S": S, "N": N, "W": W, "E": E, "px": list(img.size), "gw": a.grid, "gd": gd, "hmax": float(hs.max()), "hmin": float(hs.min()), "hoff": 0}
    (D / f"{a.name}.json").write_text(json.dumps(m), encoding="utf-8"); print(m)
