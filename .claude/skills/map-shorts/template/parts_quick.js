// ---------- quick-format elements, all driven by TL.q: country highlights, arcs, beacons, rings, comets ----------
// Each element: {id, type, at, until, ...}; times are already resolved to seconds by tools/quick_build.py.
const Q = { items: [] };
function gcUnit(a, b, n) {
  const A = lonlat(a[0], a[1], 1).normalize(), B = lonlat(b[0], b[1], 1).normalize(), w = A.angleTo(B), out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, s = Math.sin(w) || 1; out.push(w < 1e-6 ? A.clone() : A.clone().multiplyScalar(Math.sin((1 - t) * w) / s).add(B.clone().multiplyScalar(Math.sin(t * w) / s))); }
  return { pts: out, km: w * R };
}
function destPt(c, brg, km) {
  const d = km / R, la1 = c[1] * D2R, lo1 = c[0] * D2R, b = brg * D2R;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b));
  return [(lo1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2))) / D2R, la2 / D2R];
}
function qTube(pts, radius, color, order) {
  const seg = pts.length * 2, m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, radius, 10, false),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
  m.renderOrder = order || 10; m.userData.seg = seg; m.frustumCulled = false; scene.add(m); return m;
}
function countryLayer(names, fill, stroke, lift = 4) {   // a whole-globe equirectangular overlay with the named countries filled
  const W = 8192, H = 4096, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  const px = (lo, la) => [(lo + 180) / 360 * W, (90 - la) / 180 * H];
  g.beginPath(); for (const n of names) for (const ring of (GEO.countries[n] || [])) ring.forEach(([lo, la], i) => { const [x, y] = px(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.fillStyle = fill; g.fill("evenodd"); g.lineJoin = "round"; g.strokeStyle = stroke; g.lineWidth = 4; g.shadowColor = stroke; g.shadowBlur = 8; g.stroke();
  const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.SphereGeometry(R + lift, 256, 128), new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0, depthWrite: false }));
  m.renderOrder = 6; scene.add(m); return m;
}
function buildQuick() {
  const bc = document.createElement("canvas"); bc.width = 8; bc.height = 128; const bg = bc.getContext("2d"), gr = bg.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(255,255,255,1)"); bg.fillStyle = gr; bg.fillRect(0, 0, 8, 128);
  const beamTex = new THREE.CanvasTexture(bc);
  const cc = document.createElement("canvas"); cc.width = cc.height = 64; const cg = cc.getContext("2d"), cgr = cg.createRadialGradient(32, 32, 0, 32, 32, 32);
  cgr.addColorStop(0, "rgba(255,255,255,1)"); cgr.addColorStop(.35, "rgba(255,240,220,.8)"); cgr.addColorStop(1, "rgba(255,255,255,0)"); cg.fillStyle = cgr; cg.fillRect(0, 0, 64, 64);
  const cometTex = new THREE.CanvasTexture(cc);
  for (const e of TL.q || []) {
    const it = { e };
    if (e.type === "country") it.mesh = countryLayer(e.names, e.fill || "rgba(255,170,70,.35)", e.stroke || "#FFD166", e.lift);
    if (e.type === "arc") { const { pts, km } = gcUnit(e.from, e.to, 120), H = e.height ?? Math.max(30, .2 * km);
      const path = pts.map((u, i) => u.clone().multiplyScalar(R + 2 + H * Math.sin(Math.PI * i / 120)));
      it.mesh = qTube(path, e.radius || Math.max(3, km * .004), new THREE.Color(e.color || "#FFD166"), 11); it.curve = new THREE.CatmullRomCurve3(path);
      it.comets = [0, 1, 2].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cometTex, transparent: true, depthWrite: false, depthTest: false, opacity: 0 })); s.renderOrder = 14; scene.add(s); return s; }); }
    if (e.type === "ring") { const pts = []; for (let i = 0; i <= 180; i++) { const [lo, la] = destPt(e.center, i * 2, e.km); pts.push(lonlat(lo, la, R + 6)); }
      it.mesh = qTube(pts, e.radius || Math.max(4, e.km * .005), new THREE.Color(e.color || "#FFD166"), 9); }
    if (e.type === "line") { const { pts } = gcUnit(e.from, e.to, 80); it.mesh = qTube(pts.map(u => u.clone().multiplyScalar(R + (e.lift ?? 8))), e.radius || 6, new THREE.Color(e.color || "#FFFFFF"), 11); }
    if (e.type === "beacon") { const n = lonlat(e.lon, e.lat, 1).normalize(); it.mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, .5, 0),
        new THREE.MeshBasicMaterial({ map: beamTex, color: new THREE.Color(e.color || "#FFD166"), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      it.mesh.position.copy(n.clone().multiplyScalar(R + 1)); it.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); it.mesh.renderOrder = 12; scene.add(it.mesh); }
    if (e.type === "path") {   // a named polyline (a river) laid on the relief, drawn from its first point; optional flowing drops
      const m = P.region, hs = heightSampler("region"), m0 = my(m.N), m1 = my(m.S), ex = TL.relief ? TL.relief.ex : EXL;
      const pts = (GEO.paths[e.path] || []).map(([lo, la]) => { const inP = lo > m.W && lo < m.E && la > m.S && la < m.N, h = inP ? hs((lo - m.W) / (m.E - m.W), (m0 - my(la)) / (m0 - m1)) : 0;
        return lonlat(lo, la, R + (e.lift ?? 2) + Math.min(h, TL.relief ? (TL.relief.hclamp || 1400) : 3000) * ex / 1000); });
      it.mesh = qTube(pts, e.radius || 4, new THREE.Color(e.color || "#7FD1FF"), 11); it.mesh.material.depthTest = false; it.curve = new THREE.CatmullRomCurve3(pts);
      if (e.flow) it.comets = new Array(e.flow).fill(0).map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cometTex, color: new THREE.Color(e.dropColor || "#CFF3FF"), transparent: true, depthWrite: false, depthTest: false, opacity: 0 })); s.renderOrder = 14; scene.add(s); return s; }); }
    Q.items.push(it);
  }
}
function quickAt(t, range) {
  const r6 = Math.min(range, 6000), RL = TL.relief;
  if (RL) L.rkU.value = RL.k0 + (1 - RL.k0) * sm((t - RL.at) / (RL.dur || 2.5));
  for (const it of Q.items) {
    const e = it.e, op = env(t, e.at, e.at + (e.fade || .4), e.until ?? 1e9, (e.until ?? 1e9) + .5); const m = it.mesh; if (!m) continue;
    m.visible = op > .01; if (!m.visible) { (it.comets || []).forEach(s => s.visible = false); continue; }
    if (m.userData.seg) { const f = clamp((t - e.at) / (e.draw || 1.2)); m.geometry.setDrawRange(0, Math.ceil(f * m.userData.seg) * 10 * 6); }
    m.material.opacity = op * (e.opacity || 1);
    if (e.type === "beacon") { const g = sm((t - e.at) / (e.grow || .8)); m.scale.set(e.radiusKm || .0018 * r6, (e.heightKm || .04 * r6) * g * (e.heightKm ? 1 : (.85 + .15 * Math.sin(t * 3))), e.radiusKm || .0018 * r6); }
    if (it.comets) { const done = t > (e.flowAt ?? e.at + (e.draw || 1.2)), n = it.comets.length; it.comets.forEach((s, i) => { s.visible = done; if (!done) return; const u = (t * (e.speed || .35) + i / n) % 1;
      s.position.copy(it.curve.getPointAt(u)); s.scale.setScalar((e.drop || .02) * r6); s.material.opacity = op * Math.sin(Math.PI * u); }); }
  }
}
