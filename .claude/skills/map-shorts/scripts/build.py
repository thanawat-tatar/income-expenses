#!/usr/bin/env python3
"""map-shorts build: spec.json -> narration + word timing -> timeline -> world.html (+ voice track).

Usage: build.py <clip_dir>      (clip_dir/spec.json; see references/spec.md)
Writes clip_dir/{voice/, build/timing.json, build/voice.m4a, world/world.html, world/data/*}.
Then:  node render.mjs <clip_dir> ...   and   encode.py <clip_dir>
"""
import asyncio
import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path
for _s in (sys.stdout, sys.stderr): _s.reconfigure(encoding="utf-8", errors="replace")   # Windows consoles default to a legacy code page

HERE = Path(__file__).resolve().parent
TPL = HERE.parent / "template"
GAP = 0.12          # silence between lines (s)
FPS = 30


def sh(*a):
    r = subprocess.run([str(x) for x in a], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    if r.returncode: sys.exit(f"{a[0]} failed:\n{r.stderr.strip()[-1500:]}")


def dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


# ---------------------------------------------------------------- narration
def tts_edge(text, out, voice):
    """Free Edge TTS. Returns [(word, start, end)] from word-boundary events, or None if the voice sends none."""
    import edge_tts
    words = []

    async def go():
        com = edge_tts.Communicate(text, voice, boundary="WordBoundary")
        with open(out, "wb") as f:
            async for ch in com.stream():
                if ch["type"] == "audio": f.write(ch["data"])
                elif ch["type"] == "WordBoundary":
                    s = ch["offset"] / 1e7
                    words.append((ch["text"], s, s + ch["duration"] / 1e7))
    import time
    for k in range(6):
        try:
            asyncio.run(go()); break
        except Exception as e:      # the free service drops requests now and then
            if k == 5: sys.exit(f"Edge TTS gave no audio after 6 tries ({type(e).__name__}). The free service is unreliable: wait a minute and run build.py again "
                                "(finished lines are cached), or use a licensed provider (voice.provider = elevenlabs).")
            words.clear(); time.sleep(3 + 4 * k)
    return words or None


def tts_eleven(text, out, voice_id, model, lang):
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key: sys.exit("set ELEVENLABS_API_KEY (or use voice.provider = edge)")
    body = {"text": text, "model_id": model, **({"language_code": lang} if lang else {})}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128",
                                 data=json.dumps(body).encode(), headers={"xi-api-key": key, "Content-Type": "application/json"})
    res = json.loads(urllib.request.urlopen(req, timeout=180).read())
    Path(out).write_bytes(base64.b64decode(res["audio_base64"]))
    a = res.get("normalized_alignment") or res["alignment"]
    return list(zip(a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]))


def tokens(text):
    """Split into display words: PyThaiNLP for Thai when installed, whitespace otherwise."""
    if re.search(r"[฀-๿]", text):
        try:
            from pythainlp.tokenize import word_tokenize
            return [t for t in word_tokenize(text, engine="newmm", keep_whitespace=False) if t.strip()]
        except ImportError:
            sys.stderr.write("note: pip install pythainlp for proper Thai caption words\n")
            return list(re.sub(r"\s+", "", text))
    return text.split()


def align_words(said, spans, d):
    """-> [[word, start, end], ...] for one line.
    `spans` is the provider's timing: [(text, start, end)] per character (ElevenLabs) or per word/phrase (Edge), or None.
    Each display word gets the time its characters occupy, interpolated along the provider spans."""
    toks = tokens(said)
    n_ours = sum(len(t) for t in toks) or 1
    sp = [(w.replace(" ", ""), s, e) for w, s, e in (spans or []) if w.strip()] or [("x" * n_ours, 0.0, d)]
    n_prov = sum(len(w) for w, _, _ in sp)
    curve, c = [], 0
    for w, s, e in sp: curve.append((c, c + len(w), s, e)); c += len(w)

    def time_at(pos):                       # pos in our character count -> seconds
        p = pos / n_ours * n_prov
        for c0, c1, s, e in curve:
            if p <= c1: return s + (e - s) * ((p - c0) / (c1 - c0) if c1 > c0 else 0)
        return curve[-1][3]
    out, pos = [], 0
    for t in toks:
        out.append([t, round(time_at(pos), 3), round(time_at(pos + len(t)), 3)]); pos += len(t)
    return out


def narrate(clip, spec):
    v = spec.get("voice", {}); prov = v.get("provider", "edge"); speed = float(v.get("speed", 1.0))
    spoken = spec.get("spoken", {})
    if prov == "edge":
        print("note: Edge TTS is a DRAFT voice. Microsoft has said commercial use without an Azure subscription may break its terms;\n"
              "      voice the final with a provider whose licence covers your use (see references/licenses.md).\n")
    (clip / "voice").mkdir(exist_ok=True)
    beats, t = [], 0.0
    for n, line in enumerate(spec["lines"]):
        said = line
        for written, say in spoken.items(): said = said.replace(written, say)
        key = hashlib.sha1(json.dumps([prov, v.get("voice") or v.get("voice_id"), v.get("model"), v.get("lang"), said]).encode()).hexdigest()[:12]
        mp3, meta = clip / "voice" / f"{key}.mp3", clip / "voice" / f"{key}.json"
        if mp3.exists() and meta.exists():
            raw = json.loads(meta.read_text(encoding="utf-8"))
        else:
            if prov == "elevenlabs": raw = tts_eleven(said, mp3, v["voice_id"], v.get("model", "eleven_v3"), v.get("lang"))
            else: raw = tts_edge(said, mp3, v.get("voice", "en-US-AriaNeural"))
            meta.write_text(json.dumps(raw or [], ensure_ascii=False), encoding="utf-8")
        src = mp3
        if speed != 1.0:
            fast = mp3.with_name(f"{key}-x{speed}.mp3")
            if not fast.exists(): sh("ffmpeg", "-y", "-v", "error", "-i", mp3, "-af", f"atempo={speed}", fast)
            src = fast
        d = dur(src)
        words = align_words(said, [(c[0], c[1] / speed, c[2] / speed) for c in raw] if raw else None, d)
        # captions show the written form even where the voice was told a respelling
        words = fix_back(words, {sp: w for w, sp in spoken.items()})
        lead = 0.06 if n else float(v.get("lead_in", 0.0)) + 0.06
        start = t
        beats.append(dict(start=round(start, 3), end=round(start + lead + d + GAP, 3), audio=str(src), lead=lead,
                          words=[[w, round(start + lead + s, 3), round(start + lead + e, 3)] for w, s, e in words]))
        print(f"beat {n}: {start:6.2f}s  {line}")
        t = start + lead + d + GAP
    return beats


def fix_back(words, fixes):
    """Captions keep the written form: where the voice was told a respelling, put the written text back over the words it spans
    (the respelling may start or end inside a word)."""
    for heard, wanted in fixes.items():
        h = heard.replace(" ", "")
        if not h or h == wanted.replace(" ", ""): continue
        start = 0
        while True:
            at = "".join(w[0] for w in words).find(h, start)
            if at < 0: break
            pos, first = 0, None
            for k, w in enumerate(words):
                a, b = pos, pos + len(w[0])
                if first is None and b > at: first, head = k, w[0][:at - a]
                if b >= at + len(h): last, tail = k, w[0][at + len(h) - a:]; break
                pos = b
            words[first:last + 1] = [[head + wanted + tail, words[first][1], words[last][2]]]
            start = sum(len(w[0]) for w in words[:first]) + len(head) + len(wanted)
    return words


def mix(clip, beats, spec, total, out):
    ins, graph, tags = [], [], []
    for k, b in enumerate(beats):
        ins += ["-i", b["audio"]]; ms = int((b["start"] + b["lead"]) * 1000)
        graph.append(f"[{k}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={ms}|{ms}[v{k}]"); tags.append(f"[v{k}]")
    graph.append("".join(tags) + f"amix=inputs={len(tags)}:normalize=0,apad=whole_dur={total:.3f}[voice]")
    last = "[voice]"; n = len(beats)
    for k, (t, f, *vol) in enumerate(spec.get("sfx_files", [])):      # [[time, "file.mp3", volume]] — your own sounds
        p = (clip / f) if (clip / f).exists() else Path(f)
        ins += ["-i", str(p)]; ms = int(t * 1000)
        graph.append(f"[{n + k}:a]aresample=44100,aformat=channel_layouts=stereo,volume={vol[0] if vol else .4},adelay={ms}|{ms}[s{k}]")
        graph.append(f"{last}[s{k}]amix=inputs=2:normalize=0:duration=first[m{k}]"); last = f"[m{k}]"
    music = spec.get("music")
    if music:
        mp = (clip / music) if (clip / music).exists() else Path(music)
        mi = n + len(spec.get("sfx_files", []))      # input index: voice lines, then sfx, then music
        ins += ["-stream_loop", "-1", "-i", str(mp)]
        graph.append(f"[{mi}:a]aresample=44100,aformat=channel_layouts=stereo,volume={spec.get('music_volume', .14)}[mu]")
        graph.append(f"{last}asplit=2[dry][key]")
        graph.append("[mu][key]sidechaincompress=threshold=0.04:ratio=8:attack=20:release=400[mud]")      # music ducks under the voice
        graph.append("[dry][mud]amix=inputs=2:normalize=0:duration=first[mx]"); last = "[mx]"
    graph.append(f"{last}loudnorm=I=-14:TP=-1.5:LRA=11[out]")
    sh("ffmpeg", "-y", "-v", "error", *ins, "-filter_complex", ";".join(graph), "-map", "[out]", "-t", f"{total:.3f}", "-c:a", "aac", "-b:a", "192k", out)


# ---------------------------------------------------------------- timeline
def compile_spec(clip, spec, beats):
    T = beats; B = [b["start"] for b in T]; END = T[-1]["end"] - GAP

    def at(bi, phrase, end=False):
        if bi >= len(T): sys.exit(f"time ref '@{bi}:{phrase}': there are only {len(T)} lines (numbered from 0)")
        ws = T[bi]["words"]; text, idx = "", []
        for k, w in enumerate(ws):
            tok = w[0].replace(" ", ""); idx += [k] * len(tok); text += tok
        p = phrase.replace(" ", "")
        if p not in text: sys.exit(f"time ref: '{phrase}' is not in beat {bi}: '{text}'")
        pos = text.index(p); w0, w1 = ws[idx[pos]], ws[idx[pos + len(p) - 1]]
        return round(w1[2] if end else w0[1], 2)

    def tm(x):
        if isinstance(x, (int, float)): return x
        m = re.fullmatch(r"\s*(@(\d+):(.+?)(>?)|B(\d+)|END)\s*([+-]\s*[\d.]+)?\s*", x)
        if not m: raise ValueError(f"bad time {x!r}")
        b0 = at(int(m.group(2)), m.group(3), bool(m.group(4))) if m.group(2) else B[int(m.group(5))] if m.group(5) else END
        return round(b0 + (float(m.group(6).replace(" ", "")) if m.group(6) else 0), 2)

    def res(o):
        o = dict(o)
        for k in ("at", "until", "t0", "t1", "on", "off", "flowAt"):
            if k in o: o[k] = tm(o[k])
        if "items" in o: o["items"] = [res(i) for i in o["items"]]
        if "from_" in o: o["from"] = o.pop("from_")
        return o

    lo0, la0 = spec["cam"][0][1], spec["cam"][0][2]
    cam = [[0, lo0 - 55, la0, 21000, 0, 0], [1.3, lo0, la0, 21000, 0, 0]] + [[tm(k[0])] + k[1:] + [0] * (6 - len(k)) for k in spec["cam"]]
    for a, b in zip(cam[1:], cam[2:]):
        if b[0] <= a[0]: sys.exit(f"camera keys must run forward in time: {a[0]}s then {b[0]}s (key at {b[1:3]}). Move one of them.")
    q = [res(e) for e in spec.get("q", [])]; ui = [res(u) for u in spec.get("ui", [])]
    maxc = spec.get("caption_chars", 16 if re.search(r"[฀-๿]", " ".join(spec["lines"])) else 34)
    caps = []
    for b in T:
        cur, n, out = [], 0, []
        for w in b["words"]:
            ln = len(w[0].replace(" ", "")) + (1 if cur else 0)
            if cur and (n + ln > maxc or w[1] - cur[-1][2] > .35): out.append(cur); cur, n = [], 0
            cur.append(w); n += ln
        if cur: out.append(cur)
        for i, c in enumerate(out):
            t1 = out[i + 1][0][1] if i + 1 < len(out) else c[-1][2] + .4
            caps.append([round(c[0][1] - .05, 2), round(min(t1, c[-1][2] + 1.2), 2), [[w[0], round(w[1], 2)] for w in c]])
    credits = [dict(text=spec.get("credits", "") + (" · " if spec.get("credits") else "") + "Imagery: EOxCloudless 2016 by EOX (CC BY 4.0, contains modified Copernicus Sentinel data 2016) · Terrain: AWS Terrain Tiles (SRTM & others) · Globe: NASA Blue Marble · Borders: Natural Earth",
                    at=0, until=END + 1)]
    return dict(cam=cam, q=q, ui=ui, caps=caps, credits=credits, end=END, relief=res(spec["relief"]) if "relief" in spec else None), tm


def write_world(clip, spec, tl):
    w = clip / "world"; (w / "data").mkdir(parents=True, exist_ok=True)
    pm = {}
    extra_dir = clip / "data_extra"
    if not (extra_dir / "region.json").exists():
        sys.exit(f"missing {extra_dir}/region.json. Make the wide map patch first:\n  python3 {HERE}/make_site.py {clip} --name region --box S N W E --zimg 8 --zter 7 --grid 512")
    for mf in sorted(extra_dir.glob("*.json")) if extra_dir.exists() else []:
        n = mf.stem; pm[n] = json.loads(mf.read_text(encoding="utf-8")); pm[n]["h"] = base64.b64encode(mf.with_suffix(".u16").read_bytes()).decode()
        shutil.copyfile(mf.with_suffix(".jpg"), w / "data" / f"{n}.jpg")
    names = {n for e in tl["q"] if e["type"] == "country" for n in e["names"]}
    ne = json.loads((TPL / "data/ne10_countries.geojson").read_text(encoding="utf-8"))
    countries = {}
    for f in ne["features"]:
        n = f["properties"]["ADMIN"]
        if n in names:
            g = f["geometry"]; polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            countries[n] = [[[round(x, 3), round(y, 3)] for x, y in p[0]] for p in polys]
    extra = json.loads((clip / "geo_extra.json").read_text(encoding="utf-8")) if (clip / "geo_extra.json").exists() else {}
    countries.update({n: v for n, v in extra.get("countries", {}).items() if n in names})
    miss = names - set(countries)
    if miss: sys.exit(f"unknown country/region names: {sorted(miss)} (countries use Natural Earth ADMIN names; regions come from geo_extra.json)")
    (w / "data/geo.js").write_text("window.GEO=" + json.dumps({"patches": pm, "countries": countries, "paths": extra.get("paths", {})}, separators=(",", ":")) + ";", encoding="utf-8")
    lo0, la0 = spec["cam"][0][1], spec["cam"][0][2]
    (w / "data/timeline.js").write_text("window.TIMELINE = " + json.dumps(dict(cam=tl["cam"], site=spec.get("site", [lo0, la0]), s={}, labels=[], clock=[], ui=tl["ui"], caps=tl["caps"],
                                        credits=tl["credits"], q=tl["q"], cols=[], end=tl["end"], relief=tl["relief"], logo=spec.get("logo", ""),
                                        capSpace=not re.search(r"[\u0E00-\u0E7F]", " ".join(spec["lines"]))), ensure_ascii=False) + ";", encoding="utf-8")
    subprocess.run([sys.executable, str(TPL / "assemble.py"), str(w / "world.html")], cwd=TPL, check=True)


def main(clip):
    clip = Path(clip).resolve(); spec = json.loads((clip / "spec.json").read_text(encoding="utf-8"))
    (clip / "build").mkdir(exist_ok=True)
    beats = narrate(clip, spec)
    (clip / "build/timing.json").write_text(json.dumps([{k: b[k] for k in ("start", "end", "words")} for b in beats], ensure_ascii=False), encoding="utf-8")
    tl, tm = compile_spec(clip, spec, beats)
    spec = dict(spec, sfx_files=[[tm(t), *r] for t, *r in spec.get("sfx_files", [])])
    total = tl["end"] + 1.0
    mix(clip, beats, spec, total, clip / "build/voice.m4a")
    write_world(clip, spec, tl)
    (clip / "build/meta.json").write_text(json.dumps(dict(end=tl["end"], total=total, fps=FPS)), encoding="utf-8")
    print(f"\n{clip.name}: voice {tl['end']:.1f}s, video {total:.1f}s")
    print(f"next:  node {HERE / 'render.mjs'} {clip} --times 3,8,15   (stills first)\n       node {HERE / 'render.mjs'} {clip}\n       {sys.executable} {HERE / 'encode.py'} {clip} v1")


if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(sys.argv[1])
