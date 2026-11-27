// ---------- glass UI components (TL.ui) ----------
const ICON = {
  car: '<svg viewBox="0 0 64 64" class="ic" style="--g:#7FD1FF"><path d="M10 40 L14 26 Q16 20 22 20 H42 Q48 20 50 26 L54 40 V48 H10 Z" fill="none" stroke="#9BE0FF" stroke-width="4" stroke-linejoin="round"/><circle cx="20" cy="48" r="5" fill="#9BE0FF"/><circle cx="44" cy="48" r="5" fill="#9BE0FF"/><path d="M16 32 H48" stroke="#9BE0FF" stroke-width="3"/></svg>',
  flame: '<svg viewBox="0 0 64 64" class="ic"><path d="M32 6 C36 18 48 22 48 38 A16 16 0 0 1 16 38 C16 28 24 24 26 16 C30 22 30 26 32 28 C34 22 34 14 32 6 Z" fill="#FF7A30"/><path d="M32 30 C34 36 40 38 40 44 A8 8 0 0 1 24 44 C24 38 30 36 32 30 Z" fill="#FFD166"/></svg>',
  crop: '<svg viewBox="0 0 64 64" class="ic" style="--g:#FFD166"><path d="M32 58 V20" stroke="#FFD166" stroke-width="4"/><path d="M32 30 Q20 26 18 14 Q30 16 32 30 M32 40 Q44 36 46 24 Q34 26 32 40 M32 22 Q26 16 28 6 Q36 12 32 22" fill="#FFD166"/><path d="M14 56 Q22 46 30 50 M50 56 Q42 46 34 50" stroke="#FF7A30" stroke-width="4" fill="none"/></svg>',
  mountain: '<svg viewBox="0 0 64 64" class="ic" style="--g:#7FE0B0"><path d="M4 54 L22 22 L32 36 L42 18 L60 54 Z" fill="none" stroke="#8FF0C0" stroke-width="4" stroke-linejoin="round"/><path d="M18 54 Q32 44 46 54" stroke="#FF9A4D" stroke-width="4" fill="none"/></svg>',
  moon: '<svg viewBox="0 0 64 64" class="ic" style="--g:#9DB8FF"><path d="M40 8 A24 24 0 1 0 56 44 A20 20 0 0 1 40 8 Z" fill="#B8C9FF"/></svg>',
  sun: '<svg viewBox="0 0 64 64" class="ic" style="--g:#FFD166"><circle cx="32" cy="32" r="12" fill="#FFD166"/><g stroke="#FFD166" stroke-width="4" stroke-linecap="round"><path d="M32 6V14M32 50V58M6 32H14M50 32H58M13 13L19 19M45 45L51 51M13 51L19 45M45 19L51 13"/></g></svg>',
  sat: '<svg viewBox="0 0 64 64" class="ic" style="--g:#7FD1FF"><rect x="24" y="24" width="16" height="16" rx="3" fill="#9BE0FF" transform="rotate(45 32 32)"/><path d="M8 20 L20 8 L28 16 L16 28 Z M36 48 L48 36 L56 44 L44 56 Z" fill="none" stroke="#9BE0FF" stroke-width="3"/></svg>',
  rain: '<svg viewBox="0 0 64 64" class="ic" style="--g:#7FB3FF"><path d="M16 36 A12 12 0 0 1 20 13 A16 16 0 0 1 50 18 A10 10 0 0 1 48 36 Z" fill="#B8D0FF"/><path d="M20 44 L16 54 M32 44 L28 54 M44 44 L40 54" stroke="#7FB3FF" stroke-width="4" stroke-linecap="round"/></svg>',
  lid: '<svg viewBox="0 0 64 64" class="ic"><path d="M8 40 Q32 6 56 40 Z" fill="none" stroke="#FF9A4D" stroke-width="4"/><circle cx="32" cy="16" r="4" fill="#FF9A4D"/><path d="M4 44 H60" stroke="#FF9A4D" stroke-width="4"/></svg>'};
Object.assign(ICON, {
  layers: '<svg viewBox="0 0 64 64" class="ic" style="--g:#FFB27A"><rect x="8" y="10" width="48" height="9" rx="2" fill="#E9B98A"/><rect x="8" y="22" width="48" height="9" rx="2" fill="#C98B5E"/><rect x="8" y="34" width="48" height="9" rx="2" fill="#A8693F"/><rect x="8" y="46" width="48" height="9" rx="2" fill="#7E4B2C"/></svg>',
  ban: '<svg viewBox="0 0 64 64" class="ic" style="--g:#FF5A5A"><circle cx="32" cy="32" r="24" fill="none" stroke="#FF5A5A" stroke-width="6"/><path d="M15 15 L49 49" stroke="#FF5A5A" stroke-width="6"/></svg>',
  report: '<svg viewBox="0 0 64 64" class="ic" style="--g:#7FD1FF"><rect x="14" y="8" width="36" height="48" rx="5" fill="none" stroke="#9BE0FF" stroke-width="4"/><path d="M22 22H42M22 32H42M22 42H34" stroke="#9BE0FF" stroke-width="4" stroke-linecap="round"/></svg>'});
Object.assign(ICON, {
  globe: '<svg viewBox="0 0 64 64" class="ic" style="--g:#7FD1FF"><circle cx="32" cy="32" r="24" fill="none" stroke="#9BE7FF" stroke-width="4"/><path d="M8 32 H56 M32 8 C20 20 20 44 32 56 C44 44 44 20 32 8" stroke="#9BE7FF" stroke-width="3" fill="none"/></svg>',
  ice: '<svg viewBox="0 0 64 64" class="ic" style="--g:#CFEFFF"><path d="M32 6 V58 M9 19 L55 45 M9 45 L55 19" stroke="#DDF3FF" stroke-width="5" stroke-linecap="round"/></svg>'});
const pop = (t, a, b) => { const k = env(t, a, a + .28, b, b + .28); return [k, .9 + .1 * Math.min(1, (t - a) / .28)]; };
function ringPath(lon, lat, rkm, n = 72) {   // a circle on the ground, projected
  const pts = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, la = lat + rkm * Math.sin(a) / 110.57, lo = lon + rkm * Math.cos(a) / (111.32 * Math.cos(lat * D2R));
    const xy = screen(lo, la, 0.3); if (xy) pts.push(xy); }
  return pts.length > 2 ? "M" + pts.map(p => p.map(v => v.toFixed(1)).join(" ")).join(" L") : "";
}
function uiHTML(t) {
  let h = "", svg = "";
  for (const u of TL.ui || []) {
    const [k, sc] = pop(t, u.at, u.until); if (k <= 0) continue;
    if (u.type === "title") h += `<div class="title" style="top:${u.y}px;opacity:${k};transform:scale(${sc})">${u.text}</div>`;
    else if (u.type === "cards") {
      h += `<div style="position:absolute;left:0;right:0;top:${u.y}px;display:flex;justify-content:center;gap:22px;opacity:${k}">` + u.items.map(c => {
        const on = c.on != null && t >= c.on && (c.off == null || t < c.off), shown = c.at == null || t >= c.at;
        return `<div class="glass card ${on ? "on" : (c.on != null ? "off" : "")}" style="position:relative;opacity:${shown ? 1 : 0}">${ICON[c.icon] || ""}<div>${c.text}${c.sub ? `<small>${c.sub}</small>` : ""}</div></div>`; }).join("") + `</div>`;
    } else if (u.type === "pill") { const xy = u.local ? (LOCAL ? screenL(new THREE.Vector3(u.local[0], SLAB_Y + u.local[1], u.local[2])) : null) : (LOCAL ? null : screen(u.lon, u.lat, u.h || 0)); if (xy) h += `<div class="glass mpill" style="left:${xy[0] + (u.dx || 0)}px;top:${xy[1] + (u.dy || 0)}px;opacity:${k};--d:${u.dot || "#FF8A3D"}"><i></i>${u.text}</div>`; }
    else if (u.type === "counter") { const v = u.from + (u.to - u.from) * sm((t - u.t0) / (u.t1 - u.t0));
      h += `<div class="glass counter${u.x ? " sm" : ""}" style="top:${u.y}px;${u.x ? `left:${u.x}px;` : ""}opacity:${k};border-color:${u.color || "rgba(255,255,255,.16)"}"><b style="color:${u.color || "#fff"}">${u.prefix || ""}${u.dec ? v.toFixed(u.dec) : Math.round(v).toLocaleString("en-US")}${u.suffix || ""}</b><span>${u.label}</span></div>`; }
    else if (u.type === "ring") { for (let j = 0; j < (u.n || 2); j++) { const ph = ((t - u.at) / (u.period || 1.6) - j / (u.n || 2)); if (ph < 0) continue; const f = ph % 1;
        const d = ringPath(u.lon, u.lat, u.r0 + (u.r1 - u.r0) * f); if (d) svg += `<path d="${d}" fill="none" stroke="${u.color || "#FF8A3D"}" stroke-width="5" opacity="${k * (1 - f)}"/>`; } }
    else if (u.type === "flash") { const f = Math.max(0, 1 - Math.abs(t - u.at) / .12) + .6 * Math.max(0, 1 - Math.abs(t - u.at - .25) / .1); if (f > 0) h += `<div style="position:absolute;inset:0;background:rgba(220,235,255,${.55 * f})"></div>`; }
  }
  return (svg ? `<svg width="${W}" height="${H}" style="position:absolute;inset:0">${svg}</svg>` : "") + h;
}
