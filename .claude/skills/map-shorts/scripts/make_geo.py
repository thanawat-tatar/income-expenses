#!/usr/bin/env python3
"""map-shorts regions and rivers: Natural Earth (public domain) -> <clip_dir>/geo_extra.json
Use the names it defines in spec.json:  {"type": "country", "names": ["MyRegion"]}  /  {"type": "path", "path": "myriver"}

Usage: make_geo.py <clip_dir> [--region "Name=Country:Province1,Province2"]... [--river "key=River name[,Other piece]"]...
  e.g. make_geo.py clips/x --region "Isan=Thailand:Khon Kaen,Udon Thani" --river "mun=Mun"
  --list-provinces Thailand   prints the province names Natural Earth uses for a country
Needs: pip install pyshp shapely.  Natural Earth 10m files are downloaded once to ~/.cache/map-shorts."""
import argparse, io, json, math, sys, urllib.request, zipfile
from pathlib import Path
import shapefile
from shapely.geometry import shape
from shapely.ops import unary_union
for _s in (sys.stdout, sys.stderr): _s.reconfigure(encoding="utf-8", errors="replace")   # Windows consoles default to a legacy code page

CACHE = Path.home() / ".cache/map-shorts"
NE = "https://naturalearth.s3.amazonaws.com/10m_{kind}/{name}.zip"


def ne(kind, name):
    f = CACHE / f"{name}.shp"
    if not f.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(NE.format(kind=kind, name=name), timeout=300).read())).extractall(CACHE)
    return shapefile.Reader(str(f))


def records(r):
    f = [x[0] for x in r.fields[1:]]
    return [(dict(zip(f, sr.record)), shape(sr.shape.__geo_interface__)) for sr in r.iterShapeRecords()]


def hav(a, b):
    la1, la2 = math.radians(a[1]), math.radians(b[1]); dl = math.radians(b[0] - a[0])
    return 2 * 6371 * math.asin(math.sqrt(math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(dl / 2) ** 2))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("clip", nargs="?"); ap.add_argument("--region", action="append", default=[]); ap.add_argument("--river", action="append", default=[])
    ap.add_argument("--list-provinces"); ap.add_argument("--max-gap", type=float, default=30, help="km; river pieces further than this from the chain are skipped")
    a = ap.parse_args()
    if a.list_provinces:
        print(sorted(d["name"] for d, _ in records(ne("cultural", "ne_10m_admin_1_states_provinces")) if d["admin"] == a.list_provinces)); raise SystemExit
    out_p = Path(a.clip) / "geo_extra.json"; out = json.loads(out_p.read_text(encoding="utf-8")) if out_p.exists() else {"countries": {}, "paths": {}}
    if a.region:
        recs = records(ne("cultural", "ne_10m_admin_1_states_provinces"))
        for spec in a.region:
            key, rest = spec.split("=", 1); country, names = rest.split(":", 1); names = [n.strip() for n in names.split(",")]
            g = [s for d, s in recs if d["admin"] == country and d["name"] in names]
            if len(g) != len(names): raise SystemExit(f"{key}: found {len(g)} of {len(names)} provinces; try --list-provinces {country}")
            u = unary_union(g).buffer(0.002).buffer(-0.002); polys = list(u.geoms) if u.geom_type == "MultiPolygon" else [u]
            out["countries"][key] = [[[round(x, 3), round(y, 3)] for x, y in p.exterior.coords] for p in polys if p.area > .002]
            print("region", key, "centroid", [round(c, 2) for c in u.centroid.coords[0]])
    if a.river:
        recs = records(ne("physical", "ne_10m_rivers_lake_centerlines"))
        for spec in a.river:
            key, names = spec.split("=", 1); names = [n.strip() for n in names.split(",")]
            lines = []
            for d, g in recs:
                if d["name"] in names: lines += list(g.geoms) if g.geom_type == "MultiLineString" else [g]
            if not lines: raise SystemExit(f"{key}: no river called {names}")
            # chain the pieces: start with the longest, then attach the nearest piece at either end; skip pieces far away
            # (another river with the same name). Flow direction is not known: reverse the list if the first point is the mouth.
            pts = [list(l.coords) for l in lines]; chain = max(pts, key=len); pts.remove(chain)
            while pts:
                best = min(((hav(end, p[k]), p, end_i, k) for p in pts for end_i, end in ((0, chain[0]), (1, chain[-1])) for k in (0, -1)), key=lambda x: x[0])
                gap, p, end_i, k = best; pts.remove(p)
                if gap > a.max_gap: print(f"  skip a '{key}' piece {gap:.0f} km away"); continue
                if end_i == 1: chain += p if k == 0 else p[::-1]
                else: chain = (p if k == -1 else p[::-1]) + chain
            out["paths"][key] = [[round(x, 4), round(y, 4)] for x, y, *_ in chain]
            print("river", key, len(chain), "points", round(sum(hav(chain[i], chain[i + 1]) for i in range(len(chain) - 1))), "km (flow direction not guaranteed: check the first point)")
    out_p.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
