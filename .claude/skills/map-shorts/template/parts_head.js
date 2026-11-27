<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: Kanit; src: url("fonts/Kanit-Bold.ttf"); }
@font-face { font-family: UI; src: url("fonts/Kanit-Bold.ttf"); }
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#000;font-family:Kanit}
canvas{position:absolute;inset:0}
#ov{position:absolute;inset:0;pointer-events:none}
.lab{position:absolute;transform:translate(-50%,-50%);color:#fff;white-space:nowrap;text-shadow:0 3px 14px rgba(0,0,0,.75),0 0 3px rgba(0,0,0,.9)}
.pin{position:absolute;transform:translate(-50%,-100%);background:#fff;color:#0B1324;font-size:40px;padding:6px 22px;border-radius:14px;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.pin::after{content:"";position:absolute;left:50%;bottom:-16px;margin-left:-2px;width:4px;height:16px;background:#fff}
.chip{position:absolute;transform:translate(-50%,-50%);padding:10px 30px;border-radius:20px;white-space:nowrap;font-size:56px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.chip small{display:block;font:30px UI;opacity:.9;text-align:center}
#credit{position:absolute;left:56px;right:56px;bottom:64px;text-align:center;font:22px UI;color:rgba(255,255,255,.8);text-shadow:0 1px 4px rgba(0,0,0,.8)}
/* glass UI (cards, pills, counters, captions) */
.glass{position:absolute;background:rgba(14,20,30,.58);border:2px solid rgba(255,255,255,.16);border-radius:26px;box-shadow:0 14px 40px rgba(0,0,0,.45);backdrop-filter:blur(10px);color:#fff}
.title{position:absolute;left:0;right:0;text-align:center;font-size:76px;color:#fff;text-shadow:0 4px 24px rgba(0,0,0,.8),0 0 2px #000;line-height:1.15}
.card{display:flex;align-items:center;gap:18px;padding:18px 28px;font-size:44px;white-space:nowrap}
.card small{display:block;font:28px UI;opacity:.85;margin-top:-4px}
.card.on{border-color:rgba(255,154,77,.95);box-shadow:0 0 34px rgba(255,122,48,.55),0 14px 40px rgba(0,0,0,.45)}
.card.off{opacity:.55}
.ic{width:64px;height:64px;flex:none;filter:drop-shadow(0 0 10px var(--g,#FF8A3D))}
.mpill{position:absolute;transform:translate(-50%,-50%);padding:8px 24px 8px 20px;font-size:40px;white-space:nowrap;border-radius:40px}
.mpill i{display:inline-block;width:16px;height:16px;border-radius:50%;background:var(--d,#FF8A3D);margin-right:12px;vertical-align:middle;box-shadow:0 0 12px var(--d,#FF8A3D)}
.date{left:50%;transform:translateX(-50%);padding:10px 30px;font-size:42px;white-space:nowrap;border-radius:40px}
.date i{display:inline-block;width:16px;height:16px;border-radius:50%;background:#FFB13B;margin-right:14px;vertical-align:middle;box-shadow:0 0 12px #FFB13B}
.counter{left:50%;transform:translateX(-50%);padding:14px 50px 18px;text-align:center}
.counter b{display:block;font-size:120px;line-height:1.05;letter-spacing:1px;white-space:nowrap}
.counter span{font:34px UI;opacity:.9;white-space:nowrap}
.counter.sm{padding:12px 34px 16px}.counter.sm b{font-size:100px}.counter.sm span{font-size:30px}
.months{left:50%;transform:translateX(-50%);display:flex;gap:8px;padding:12px 14px;border-radius:22px}
.months div{font:26px UI;padding:6px 10px;border-radius:12px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.75)}
.months div.hi{background:#FF7A30;color:#fff;box-shadow:0 0 16px rgba(255,122,48,.8)}
.months div.cur{background:#FFD166;color:#0B1324}
#cap{position:absolute;left:50%;top:1390px;transform:translateX(-50%);padding:12px 30px;font-size:50px;white-space:nowrap;border-radius:22px}
#cap .now{color:#FFD166}
.photo{position:absolute;left:50%;max-width:640px;padding:14px;border-radius:26px}
.photo img{display:block;max-height:470px;max-width:610px;margin:0 auto;border-radius:14px}
.photo span{display:block;font:28px UI;line-height:1.35;margin:12px 6px 2px;color:#fff}
.photo span b{color:#FFD166;font-weight:700}
.inset{left:50%;transform:translateX(-50%);padding:18px;border-radius:28px}
#logo{position:absolute;left:40px;top:150px;font-size:34px;color:#fff;opacity:.9;text-shadow:0 2px 10px rgba(0,0,0,.6)}
</style></head><body>
<div id="ov"></div>
<div id="cap" class="glass" style="opacity:0"></div>
<div id="logo"></div>
<div id="credit"></div>
<script src="vendor/three.min.js"></script>
<script src="data/geo.js"></script>
<script src="data/timeline.js"></script>
<script>
// One continuous camera move over a NASA globe, real SRTM relief and Sentinel-2 imagery. Units: km.
const W = 1080, H = 1920, R = 6371, EX = 2.2;
const G = window.GEO, P = G.patches;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(1); r.setSize(W, H); r.autoClear = true; r.outputEncoding = THREE.sRGBEncoding;
document.body.prepend(r.domElement);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(38, W / H, 1, 1e6);
const D2R = Math.PI / 180, clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const sm = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const ss = (a, b, x) => sm((x - a) / (b - a));
const lonlat = (lon, lat, rad = R) => { const p = (90 - lat) * D2R, t = (lon + 180) * D2R;
  return new THREE.Vector3(-rad * Math.sin(p) * Math.cos(t), rad * Math.cos(p), rad * Math.sin(p) * Math.sin(t)); };
const my = lat => Math.asinh(Math.tan(lat * D2R));
const SITE = (window.TIMELINE && window.TIMELINE.site) || [100.5, 13.7];
const CM = SITE;
const SUN = (() => { const n = lonlat(CM[0], CM[1], 1).normalize(), north = new THREE.Vector3(0, 1, 0).sub(n.clone().multiplyScalar(n.y)).normalize(),
  east = new THREE.Vector3().crossVectors(north, n).normalize(), az = 245 * D2R, el = 32 * D2R;
  return n.multiplyScalar(Math.sin(el)).add(north.multiplyScalar(Math.cos(el) * Math.cos(az))).add(east.multiplyScalar(Math.cos(el) * Math.sin(az))).normalize(); })();
const U = { light: { value: new THREE.Color(1, 1, 1) }, sun: { value: SUN }, sunG: { value: lonlat(CM[0] - 12, CM[1] + 12).normalize() } };   // sunG: daylight for the whole globe

// ---------- globe (NASA Blue Marble) + atmosphere + stars ----------
const loader = new THREE.TextureLoader(); let pending = 0;
const tex = (src, cb) => { pending++; return loader.load(src, t => { t.anisotropy = 16; cb && cb(t); if (--pending === 0) readyRes(); }); };
let readyRes; window.ready = new Promise(res => readyRes = res);
const globeMat = new THREE.ShaderMaterial({ uniforms: Object.assign({ map: { value: tex("data/blue-marble.jpg") } }, U),
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D map; uniform vec3 sunG, light; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){ vec3 c = pow(texture2D(map, vUv).rgb, vec3(2.2));
      float d = dot(vN, sunG); c *= (0.35 + 0.9 * max(d, 0.)) * light;
      float rim = pow(1. - max(dot(vN, normalize(cameraPosition - vW)), 0.), 3.);
      c += vec3(.25,.5,1.) * rim * .35;
      gl_FragColor = vec4(pow(c, vec3(1./2.2)), 1.); }` });
scene.add(new THREE.Mesh(new THREE.SphereGeometry(R - 8, 256, 128), globeMat));   // sunk below the deepest drawn sea floor so it never covers the relief
const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 128, 64), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
  vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 sunG, light; varying vec3 vN; varying vec3 vP; void main(){ vec3 v = normalize(cameraPosition - vP); float i = pow(max(0., .72 - dot(v, -vN)), 3.2) * 9.;
    gl_FragColor = vec4(vec3(.3,.6,1.) * light * i * (.35 + .65 * smoothstep(-.4,.5,dot(normalize(vP), sunG))), 1.); }` }));
scene.add(atm);
{ const g = new THREE.BufferGeometry(), p = []; let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 3000; i++) { const v = new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).normalize().multiplyScalar(4e5); p.push(v.x, v.y, v.z); }
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false }))); }

// ---------- patches on the sphere ----------
function heightSampler(name) {
  const m = P[name]; if (!m.h) return () => 0;
  const raw = Uint8Array.from(atob(m.h), c => c.charCodeAt(0)), hg = new Uint16Array(raw.buffer);
  return (u, vm) => {   // u east, vm = mercator fraction from the north edge; metres
    const x = clamp(u) * (m.gw - 1), y = clamp(vm) * (m.gd - 1), x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(m.gw - 1, x0 + 1), y1 = Math.min(m.gd - 1, y0 + 1), fx = x - x0, fy = y - y0;
    const at = (a, b) => hg[b * m.gw + a];
    return Math.max(0, (at(x0, y0) * (1 - fx) + at(x1, y0) * fx) * (1 - fy) + (at(x0, y1) * (1 - fx) + at(x1, y1) * fx) * fy - (m.hoff || 0));   // land only
  };
}
const HS = {};
function patchGeo(name, seg, lift, relief, ex = EX) {
  const m = P[name], nx = seg, ny = Math.round(seg * (m.N - m.S) / (m.E - m.W)), hs = HS[name] || (HS[name] = heightSampler(name));
  const pos = [], uv = [], idx = [], hm = [], m0 = my(m.N), m1 = my(m.S);
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const lon = m.W + (m.E - m.W) * i / nx, lat = m.N - (m.N - m.S) * j / ny, vm = (m0 - my(lat)) / (m0 - m1), u = i / nx;
    const hM = relief ? (name === "site" ? siteHeightM(lon, lat) : hs(u, vm)) : 0, h = hM / 1000 * ex;
    const p = lonlat(lon, lat, R + lift + h); pos.push(p.x, p.y, p.z); uv.push(u, 1 - vm); hm.push(hM);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setIndex(idx);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("hm", new THREE.Float32BufferAttribute(hm, 1)); g.computeVertexNormals();
  return g;
}
// the same patch at a much stronger vertical exaggeration, blended in on the GPU (uK 0..1) for the 3D plateau moment
function morphGeo(name, seg, lift, exHi) { const g = patchGeo(name, seg, lift, true), g2 = patchGeo(name, seg, lift, true, exHi), a = g.attributes.position.array, b = g2.attributes.position.array, d = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) d[i] = b[i] - a[i]; g.setAttribute("dpos", new THREE.BufferAttribute(d, 3)); g.setAttribute("n2", g2.attributes.normal); return g; }
const patchMat = (map, extra = {}) => new THREE.ShaderMaterial({ transparent: true, depthWrite: !!extra.depth, depthTest: !!extra.depth,
  polygonOffset: !!extra.offset, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  uniforms: Object.assign({ map: { value: map }, opacity: { value: 0 }, feather: { value: extra.feather ?? .03 }, contour: { value: 0 }, cLevel: { value: 1000 }, hz: { value: 0 }, hzTop: { value: 0 }, uK: { value: 0 } }, U),
  vertexShader: extra.morph ? `attribute vec3 dpos; attribute vec3 n2; attribute float hm; uniform float uK; varying vec2 vUv; varying vec3 vN; varying float vH;
    void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normalize(mix(normal, n2, uK))); vec4 w = modelMatrix * vec4(position + dpos * uK, 1.); vH = hm; gl_Position = projectionMatrix * viewMatrix * w; }`
  : `varying vec2 vUv; varying vec3 vN; varying float vH; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.);
    vH = (length(w.xyz) - ${R.toFixed(1)}) / ${EX.toFixed(2)} * 1000.; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D map; uniform vec3 sun, light; uniform float opacity, feather, contour, cLevel, hz, hzTop; varying vec2 vUv; varying vec3 vN; varying float vH;
    void main(){ vec3 c = pow(texture2D(map, vUv).rgb, vec3(2.2)) * 1.12;
      c *= (0.32 + 1.05 * max(dot(vN, sun), 0.)) * light;
      if (contour > 0.) { float l = abs(vH - cLevel); c = mix(c, vec3(1., .55, .2), contour * (1. - smoothstep(6., 18., l)) * .95); }
      if (hz > 0.) c = mix(c, vec3(.55, .53, .5) * light, hz * smoothstep(-60., 420., hzTop - vH) * .78);
      float e = min(min(vUv.x, 1. - vUv.x), min(vUv.y, 1. - vUv.y));
      gl_FragColor = vec4(pow(c, vec3(1./2.2)), opacity * smoothstep(0., feather, e)); }` });

// overlay canvases drawn in the patch's mercator pixel space
function overlayCanvas(name, w, draw) {
  const m = P[name], h = Math.round(w * (my(m.N) - my(m.S)) / ((m.E - m.W) * D2R)), cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d"), m0 = my(m.N), m1 = my(m.S);
  const px = (lon, lat) => [(lon - m.W) / (m.E - m.W) * w, (m0 - my(lat)) / (m0 - m1) * h];
  const path = rings => { g.beginPath(); for (const ring of rings) ring.forEach(([lo, la], i) => { const [x, y] = px(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
  draw(g, path, px, w, h);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 16; return t;
}
const ovMat = (t) => new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
const glowFill = (fill, stroke, lw) => (g, path, px, w, h, rings) => { path(rings); g.fillStyle = fill; g.fill("evenodd");
  g.shadowColor = stroke; g.shadowBlur = lw * 3; g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = "round"; path(rings); g.stroke(); g.shadowBlur = 0; };

