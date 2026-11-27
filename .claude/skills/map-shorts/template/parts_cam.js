// ---------- camera: target lon/lat, range (km), tilt (deg from straight down), heading (deg) ----------
function camAt(lon, lat, range, tilt, heading) {
  // far out the globe sits centred; close in, the target is the ground
  const gm = 0;
  const tg = lonlat(lon, lat, (R + gm) * (1 - ss(3500, 16000, range))), n = lonlat(lon, lat, 1).normalize();
  const north = new THREE.Vector3(0, 1, 0).sub(n.clone().multiplyScalar(n.y)).normalize(), east = new THREE.Vector3().crossVectors(north, n).normalize();
  const hd = heading * D2R, fwd = north.clone().multiplyScalar(Math.cos(hd)).add(east.clone().multiplyScalar(Math.sin(hd)));
  const tl = tilt * D2R; cam.position.copy(tg).add(n.clone().multiplyScalar(range * Math.cos(tl))).add(fwd.clone().multiplyScalar(-range * Math.sin(tl)));
  cam.up.copy(tilt < 2 ? fwd : n); cam.lookAt(tg);
  const alt = cam.position.length() - R - gm; cam.near = Math.max(.0005, alt * .02); cam.far = alt < 60 ? alt * 300 + 200 : cam.position.length() + R; cam.updateProjectionMatrix();
  return alt;   // above the ground, not sea level
}
const TL = window.TIMELINE || {};
function keyAt(keys, t) {   // keys: [[t, lon, lat, range, tilt, heading], ...]; log-range, smooth per segment
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const u = sm((t - a[0]) / (b[0] - a[0]));
    const rng = Math.exp(Math.log(a[3]) + (Math.log(b[3]) - Math.log(a[3])) * u);
    // big zooms: the target slides sideways in step with the real range, so a climb from the ground rises straight up
    // first and only drifts across the map once it is high (otherwise the ground races past: a "drag", not a zoom-out)
    const big = Math.max(a[3], b[3]) / Math.min(a[3], b[3]) > 20, w = big ? (rng - a[3]) / (b[3] - a[3]) : u;
    return [a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w, rng, a[4] + (b[4] - a[4]) * (big ? Math.sqrt(clamp(w)) : u), a[5] + (b[5] - a[5]) * (big ? w : u)]; } }
  return keys[keys.length - 1].slice(1);
}
const env = (t, a, b, c, d) => Math.min(ss(a, b, t), 1 - ss(c, d, t));   // fade in a->b, out c->d

function screen(lon, lat, hkm = 0) { const p = lonlat(lon, lat, R + hkm), v = p.clone().project(cam);
  const facing = p.clone().normalize().dot(cam.position.clone().sub(p).normalize()) > 0; return facing && v.z < 1 ? [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H] : null; }
