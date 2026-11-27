const SLAB_Y = 0;
const kAt = (keys, t) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) return a[1] + (b[1] - a[1]) * sm((t - a[0]) / (b[0] - a[0])); } return keys[keys.length - 1][1]; };
const envs = (t, list) => Math.max(0, ...(list || []).map(v => env(t, ...v)));
function render3d(t) {
  const [lon, lat, range, tilt, hd, th] = keyAt(TL.cam, t); const alt = camAt(lon, lat, range, tilt, hd, th || 0);
  atm.visible = alt > 400;   // low over the ground the camera sits inside the atmosphere shell, which would haze the whole view
  quickAt(t, range);
  const low = 0; scene.background = new THREE.Color(0x000000);
  r.render(scene, cam);
  document.getElementById("ov").innerHTML = uiHTML(t);
  const cap = document.getElementById("cap"), cc = (TL.caps || []).find(c => t >= c[0] && t < c[1]);
  if (cc) { cap.style.opacity = 1; cap.innerHTML = cc[2].map(([w, ws], i) => t >= ws && (i === cc[2].length - 1 || t < cc[2][i + 1][1]) ? `<span class="now">${w}</span>` : w).join(TL.capSpace ? " " : ""); }
  else cap.style.opacity = 0;
  document.getElementById("logo").textContent = TL.logo || "";
  document.getElementById("credit").textContent = (TL.credits || []).filter(c => t >= c.at && t < c.until).map(c => c.text).join(" · ");
}
