const L = {};
const EXL = 18, EXS = 2, DCLAMP = 2600;   // land x6 so the Hat Yai basin rim reads in 3D; sea floor only lightly
const hvis = h => (h >= 0 ? h * EXL : -Math.min(-h, DCLAMP) * EXS) / 1000;
// a relief patch whose vertices carry their real height (m); the shader colours land, exposed sea floor and water
// against a moving sea level (uniform, metres), and draws a glowing coastline wherever the height crosses it
function reliefPatch(name, seg, map, extra = {}) {
  const m = P[name], raw = Uint8Array.from(atob(m.h), c => c.charCodeAt(0)), hg = new Uint16Array(raw.buffer);
  const at = (u, vm) => { const x = clamp(u) * (m.gw - 1), y = clamp(vm) * (m.gd - 1), x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(m.gw - 1, x0 + 1), y1 = Math.min(m.gd - 1, y0 + 1), fx = x - x0, fy = y - y0, g = (a, b) => hg[b * m.gw + a];
    return (g(x0, y0) * (1 - fx) + g(x1, y0) * fx) * (1 - fy) + (g(x0, y1) * (1 - fx) + g(x1, y1) * fx) * fy - m.hoff; };
  const nx = seg, ny = Math.round(seg * (m.N - m.S) / (m.E - m.W)), m0 = my(m.N), m1 = my(m.S), pos = [], uv = [], hm = [], idx = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const lon = m.W + (m.E - m.W) * i / nx, lat = m.N - (m.N - m.S) * j / ny, vm = (m0 - my(lat)) / (m0 - m1), h = at(i / nx, vm);
    const hv = extra.ex ? (h >= 0 ? Math.min(h, extra.hclamp || 1e9) * extra.ex : h * (extra.exs || 3)) / 1000 : hvis(h);   // a scene can exaggerate its own relief
    const p = lonlat(lon, lat, R + (extra.lift || 0) + hv); pos.push(p.x, p.y, p.z); uv.push(i / nx, 1 - vm); hm.push(h); }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setIndex(idx); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("hm", new THREE.Float32BufferAttribute(hm, 1)); g.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({ transparent: true, extensions: { derivatives: true },
    uniforms: Object.assign({ map: { value: map }, opacity: { value: 1 }, hole: { value: extra.hole || new THREE.Vector4(2, 2, 2, 2) }, feather: { value: extra.feather ?? .03 }, sea: L.seaU, glow: L.glowU, shelf: L.shelfU, mask: { value: extra.mask || L.noMask }, flood: L.floodU, time: L.timeU, fcol: L.fcolU, rk: L.rkU }, U),
    vertexShader: `attribute float hm; uniform float rk; varying vec2 vUv; varying vec3 vN; varying float vH; void main(){ vUv = uv; vH = hm; vN = normalize(mat3(modelMatrix) * normal);
      float r = length(position); vec3 p = position * (${R.toFixed(1)} + (r - ${R.toFixed(1)}) * rk) / r;   // rk < 1 flattens the relief (a scene can raise it)
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.); }`,
    fragmentShader: `uniform sampler2D map, mask; uniform vec4 hole; uniform vec3 sun, light; uniform float opacity, feather, sea, glow, shelf, flood, time; uniform vec3 fcol; varying vec2 vUv; varying vec3 vN; varying float vH;
      float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        if (vUv.x > hole.x && vUv.x < hole.z && 1. - vUv.y > hole.y && 1. - vUv.y < hole.w) discard;   // a finer patch draws here
        float sh = .35 + .9 * max(dot(vN, sun), 0.);
        vec3 img = pow(texture2D(map, vUv).rgb, vec3(2.2)) * 1.1;
        // exposed sea floor: lowland greens and tans (the imagery there is ocean blue), darker as it was deeper
        vec3 low = mix(vec3(.30, .36, .16), vec3(.42, .38, .24), smoothstep(-20., -110., vH)) * (.9 + .2 * hsh(floor(vUv * 900.)));
        vec3 landC = img;   // keep the real sea imagery (no drained-shelf colours here)
        vec3 c = landC * sh;
        float d = sea - vH;   // water depth over this point
        if (d > 0.) { vec3 wc = mix(vec3(.03, .30, .40), vec3(.01, .06, .18), smoothstep(10., 140., d));
          if (vH > 0.) {   // land under a raised sea (the storm surge): churning water with foam
            float fo = smoothstep(.7, 1., sin(vUv.x * 1700. + vUv.y * 900. - time * 4.) * sin(vUv.y * 1300. + time * 3.) * .5 + .5 + hsh(floor(vUv * 700.)) * .3);
            c = mix(c, vec3(.16, .44, .50) * (.85 + .3 * sh) + fo * .18, clamp(.55 + d * .08, 0., .88)); }
          else c = mix(c, wc * (.8 + .3 * sh), clamp(.2 + d / 200., 0., .6)); }
        vec4 mk = texture2D(mask, vUv);   // flood (0..1): low ground and ground near the canal go under first, only inside the basin
        float nz = hsh(floor(vUv * 1400.)) * .08 + hsh(floor(vUv * 260.)) * .12;
        float fd = (flood * 1.6 - (clamp(vH, 0., 40.) / 40. + (1. - mk.g) * .55 + nz)) * smoothstep(.15, .6, mk.r);   // dry at flood = 0
        if (fd > 0. && vH > -1.) {   // muddy flood water with moving glints
          float rip = sin(vUv.x * 2600. + time * 3.) * sin(vUv.y * 2100. - time * 2.4), glint = smoothstep(.75, 1., rip) * .35;
          float foam = smoothstep(.82, 1., sin((vUv.x * 1.2 + vUv.y) * 900. - time * 5.) * .5 + .5 + nz * 1.5) * .7;   // storm waves rolling over the spit
          vec3 wc = mix(fcol * 1.35, fcol * .8, smoothstep(0., .25, fd)) * (.9 + .2 * sh) + glint + foam;
          c = mix(c, wc, clamp(.35 + fd * 3., 0., .78)); c += vec3(.9, .8, .6) * (1. - smoothstep(0., .03, fd)) * .5; }   // a bright waterline at the edge
        float w = fwidth(vH) * 1.2 + .5; c = mix(c, vec3(1.), (1. - smoothstep(0., w, abs(d))) * glow);                       // the moving coastline
        float band = step(-125., vH) * step(vH, -2.) * step(0., -d); c = mix(c, vec3(1., .55, .2), band * shelf * .45);         // Sundaland tint
        float e = min(min(vUv.x, 1. - vUv.x), min(vUv.y, 1. - vUv.y));
        gl_FragColor = vec4(pow(c, vec3(1. / 2.2)), opacity * smoothstep(0., feather, e)); }` });
  return new THREE.Mesh(g, mat);
}
function build() {
  L.seaU = { value: 0 }; L.glowU = { value: 0 }; L.shelfU = { value: 0 }; L.floodU = { value: -999 }; L.timeU = { value: 0 }; L.fcolU = { value: new THREE.Color(.12, .42, .52) };
  L.noMask = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); L.noMask.needsUpdate = true;
  L.rkU = { value: 1 }; const RL = TL.relief;   // optional {ex, exs, k0, at, dur}: a stronger relief that rises from k0 at `at`
  const rex = RL ? { ex: RL.ex, exs: RL.exs || 2, hclamp: RL.hclamp || 1400 } : {}, site = P.site;
  let hole;   // an optional high-res "site" patch (same relief scale) replaces the region inside its box
  if (site) { const m = P.region, m0 = my(m.N), m1 = my(m.S), ins = .01 * (site.E - site.W);
    hole = new THREE.Vector4((site.W + ins - m.W) / (m.E - m.W), (m0 - my(site.N - ins)) / (m0 - m1), (site.E - ins - m.W) / (m.E - m.W), (m0 - my(site.S + ins)) / (m0 - m1)); }
  L.region = reliefPatch("region", 560, tex("data/region.jpg"), { feather: .1, hole, ...rex }); L.region.renderOrder = 1; scene.add(L.region);
  if (site) { L.site = reliefPatch("site", 900, tex("data/site.jpg"), { feather: .02, ...rex }); L.site.renderOrder = 2; scene.add(L.site); }
  buildQuick();
}
let LOCAL = false;
function screenL() { return null; }

