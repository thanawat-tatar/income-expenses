# Data, voices and credits

Checked 2026-10-30. Licences change: re-check the links before a commercial project.

## Map data (downloaded by the scripts, not bundled)
| Data | Licence | Credit to show (video credit line + description) |
|---|---|---|
| EOxCloudless **2016** imagery, layer `s2cloudless_3857` (make_site.py) | CC BY 4.0, commercial use OK | "EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)" |
| Terrain heights: Terrarium tiles on AWS (make_site.py) | open data; attribution required, wording depends on the source used for that area | "Terrain: AWS Terrain Tiles (SRTM and others)" plus the notices for your area from https://github.com/tilezen/joerd/blob/master/docs/attribution.md (e.g. Europe: EU-DEM / Copernicus notice; Australia: © Commonwealth of Australia (Geoscience Australia); New Zealand: LINZ CC BY) |
| Natural Earth provinces and rivers (make_geo.py) | public domain | "Natural Earth" (courtesy, not required) |

**Do not switch the imagery layer.** EOX's 2018 and later cloudless layers are CC BY-NC-SA 4.0: non-commercial only, so they cannot be used on a monetised channel.

## Bundled with the skill
| File | Licence |
|---|---|
| template/vendor/three.min.js | MIT (licenses/three.js-MIT.txt) |
| template/fonts/Kanit-Bold.ttf | SIL OFL 1.1 (licenses/Kanit-OFL.txt) |
| template/data/ne10_countries.geojson | Natural Earth, public domain |
| template/data/blue-marble.jpg | NASA Visible Earth, Blue Marble Next Generation; NASA imagery, free use, credit "NASA Blue Marble" |

## Voices
- **Edge TTS (`provider: edge`) is for drafts only.** It uses Microsoft Edge's read-aloud service through an unofficial library. Microsoft has said on its Q&A forum that commercial use without an Azure subscription may break its terms, and it may stop working at any time. Do not publish monetised videos with it.
- For published videos use a provider whose licence covers your use, e.g. ElevenLabs on a paid plan (check its terms for your plan) or Azure AI Speech on the paid tier.
- The build adds the map credits to the video. Add the voice provider to the description if its terms ask for it.

## Music and sound effects
Not bundled. Use your own, or CC0 sounds (check every file's licence page; "free" is not the same as CC0).
