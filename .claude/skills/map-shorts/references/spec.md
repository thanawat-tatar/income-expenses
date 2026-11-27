# spec.json reference

```jsonc
{
  "logo": "",                       // small text top-left, optional
  "voice": {"provider": "edge", "voice": "en-US-AriaNeural", "speed": 1.0, "lead_in": 0.0},
  "lines": ["Hook line.", "Second line."],     // one beat each
  "spoken": {"3,776": "three thousand seven hundred seventy six"},   // voice reads the value, captions keep the key
  "site": [lon, lat],               // centre of the close-up patch
  "relief": {"ex": 3, "exs": 2, "k0": 0.15, "at": "@0:Mount", "dur": 2.6, "hclamp": 4000},
  "cam": [[t, lon, lat, range_km, tilt, heading, th], ...],
  "q":  [ ...map elements... ],
  "ui": [ ...screen elements... ],
  "sfx_files": [["@2:1707", "boom.mp3", 0.5]],   // optional, your own sounds: [time, file, volume]
  "music": "music.mp3", "music_volume": 0.14,    // optional
  "credits": "Facts: ... (your sources)"          // build appends imagery/globe/borders credits
}
```

## Times
A number (seconds) or:
- `"@2:Ash"` start of the phrase "Ash" in line 2 (0-based); `"@2:Edo>"` its end; `"@2:Ash-0.2"` 0.2 s earlier
- `"B3"` start of line 3, `"B3+0.5"`; `"END"`, `"END+1"`
A phrase that itself contains "-<digits>" (e.g. "COVID-19") is read as an offset: pick a different word. The phrase must occur in that line exactly as written (spaces ignored; use the *written* line, not the `spoken` respelling).

## Camera `cam`
`[time, lon, lat, range_km, tilt_deg, heading_deg, th]`
- First key is where the opening globe spin lands (usually 2-3 s, range 2000-3000 km, tilt 0).
- `range_km` distance to target (21000 = whole globe, 2000 = a country, 50 = a mountain).
- `tilt` 0 = straight down, 50-60 = dramatic oblique. `heading` rotates around the target.
- `th` = target height in km **in exaggerated space** (relief ex multiplies heights). For a peak with `ex: 3` and 3.8 km, use about 8. Check with stills.
- Keys must run forward in time; build.py stops if not.

## `relief`
`ex` land exaggeration, `exs` sea-floor exaggeration, `k0` starting fraction (relief rises from k0 to 1 at `at`, over `dur` s), `hclamp` max height in metres counted.

## Map elements `q`
All take `at`, `until`, optional `fade`.
- `country` `{"names": ["Thailand"], "fill": "rgba(...)", "stroke": "#FFD166", "lift": 4}` fill a country (Natural Earth ADMIN name) or a region from geo_extra.json. Use `lift` 30+ over steep terrain or the fill hides under mountains. Outlines are one whole-globe texture (about 5 km per pixel), so they look soft when the camera is closer than ~500 km: fade them out (`until`) before a close-up.
- `beacon` `{"lon","lat","color","radiusKm","heightKm","grow"}` a glowing column.
- `ring` `{"center":[lon,lat],"km","color","radius","draw"}` circle on the ground.
- `line` `{"from":[lon,lat],"to":[lon,lat],"color","radius","draw","lift"}` straight great-circle line on the surface.
- `arc` `{"from","to","color","height"}` raised arc with travelling lights.
- `path` `{"path":"key","color","radius","draw","flow":7,"speed":0.09,"drop":0.02,"flowAt"}` a polyline from geo_extra.json (a river), optional flowing drops.

## Screen elements `ui`
- `title` `{"text": "Line<br>two", "y": 240}`
- `pill` `{"text","lon","lat","h","dot","dx","dy"}` label pinned to a map point (h = km above ground)
- `cards` `{"y":240,"items":[{"icon":"flame","text":"...","sub":"...","on":time,"off":time}]}` icons: car flame crop mountain moon sun sat rain lid layers ban report globe ice
- `counter` `{"from_":0,"to":3776,"t0","t1","suffix":" m","label","color","y"}` counts up between t0 and t1
- `ring` `{"lon","lat","r0","r1","n","period","color"}` ripple on screen
- `flash` `{"at"}` white flash for a big moment

## Region/site patches
Every clip needs `data_extra/region.*` (wide map, `make_site.py --name region`); `data_extra/site.*` is the optional close-up. Nothing is bundled: the tool downloads imagery and heights from their sources.
