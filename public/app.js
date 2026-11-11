// ===== สมุดรายรับรายจ่าย (เว็บแอป) =====
const $ = s => document.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const TITLES = { home: 'ภาพรวม', list: 'รายการ', settings: 'ตั้งค่า' };
const EMOJIS = '🏷️ 🍼 👶 🎓 📚 🏥 💊 🐶 🐱 🎮 🎬 🎁 💄 👕 👟 🛒 🧴 🧺 🚌 🚕 🅿️ 🛵 ⛽ 🔧 📱 💡 💧 🏠 💳 🏦 💸 💼 🛍️ ☕ 🍜 🍺 🚬 🙏 🎉 ✈️ 🏋️ 💇 🧾 💰'.split(' ');
const LIFF_SDK = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
const ICON_SUN = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const ICON_MOON = '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const ICON_TRASH = '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg>';

// ---------- น้องหมูออมสิน (มาสคอต) ----------
// mood: happy | sad | sleep | wink
function pig(mood = 'happy', cls = '') {
  const eyes = mood === 'sleep'
    ? '<path d="M36 47q6 5 12 0M72 47q6 5 12 0" stroke="#3B1530" stroke-width="3" fill="none" stroke-linecap="round"/>'
    : mood === 'wink'
      ? '<g class="eye"><ellipse cx="42" cy="46" rx="5" ry="7" fill="#3B1530"/><circle cx="44" cy="43" r="2" fill="#fff"/></g><path d="M72 47q6-5 12 0" stroke="#3B1530" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : '<g class="eye"><ellipse cx="42" cy="46" rx="5" ry="7" fill="#3B1530"/><ellipse cx="78" cy="46" rx="5" ry="7" fill="#3B1530"/><circle cx="44" cy="43" r="2" fill="#fff"/><circle cx="80" cy="43" r="2" fill="#fff"/></g>';
  const mouth = mood === 'sad' ? 'M53 81q7-6 14 0' : 'M53 77q7 6 14 0';
  return `<svg class="pig ${cls}" viewBox="0 0 120 112" aria-hidden="true">
    <defs><radialGradient id="pg" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#FFD6E8"/><stop offset="1" stop-color="#FF8CC3"/></radialGradient></defs>
    <path d="M22 30 L30 4 L48 22Z M98 30 L90 4 L72 22Z" fill="#FF7DB4"/>
    <ellipse cx="60" cy="56" rx="46" ry="40" fill="url(#pg)"/>
    <ellipse cx="46" cy="28" rx="16" ry="6" fill="#fff" opacity=".35"/>
    <g transform="translate(86 14) rotate(18)"><path d="M0 0l-12-7v14zM0 0l12-7v14z" fill="#FF4F9A"/><circle r="4" fill="#D93A80"/></g>
    ${eyes}
    <ellipse cx="30" cy="62" rx="8" ry="5" fill="#FF5FA2" opacity=".45"/><ellipse cx="90" cy="62" rx="8" ry="5" fill="#FF5FA2" opacity=".45"/>
    <ellipse cx="60" cy="64" rx="16" ry="11" fill="#FF7DB4"/><ellipse cx="54" cy="64" rx="3" ry="4.5" fill="#C2336F"/><ellipse cx="66" cy="64" rx="3" ry="4.5" fill="#C2336F"/>
    <path d="${mouth}" stroke="#3B1530" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${mood === 'sleep' ? '<text x="96" y="22" font-size="16" fill="#D93A80" class="zz">z</text>' : ''}
    <g class="paws"><ellipse cx="36" cy="100" rx="11" ry="9" fill="#FFB3D3" stroke="#FF7DB4" stroke-width="2"/><ellipse cx="84" cy="100" rx="11" ry="9" fill="#FFB3D3" stroke="#FF7DB4" stroke-width="2"/></g>
  </svg>`;
}

const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');

// จำข้อมูลไว้ในเครื่อง เพื่อเปิดครั้งต่อไปขึ้นทันที
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('ie:' + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('ie:' + k, JSON.stringify(v)); } catch {} },
};

const state = {
  page: ['home', 'list', 'settings'].includes(params.get('page')) ? params.get('page') : 'home',
  mode: 'day',
  date: todayISO(),
  categories: [], custom: [], keywords: [],
  monthCache: {}, yearCache: {},
  newCat: { type: 'expense', icon: '🏷️' },
  highlight: null, ready: false,
};
let liffReady = Promise.resolve();

// ---------- utils ----------
function todayISO() {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
const fmt = n => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const catById = id => state.categories.find(c => c.id === id) || { id, name: 'อื่นๆ', icon: '🏷️', type: 'expense' };
const ymOf = iso => iso.slice(0, 7);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const thaiDay = iso => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y + 543}`; };
function shiftDate(iso, mode, dir) {
  const [y, m, d] = iso.split('-').map(Number);
  let dt;
  if (mode === 'day') dt = new Date(Date.UTC(y, m - 1, d + dir));
  else if (mode === 'month') dt = new Date(Date.UTC(y, m - 1 + dir, 1));
  else dt = new Date(Date.UTC(y + dir, 0, 1));
  return dt.toISOString().slice(0, 10);
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}
function countUp(el, to) {
  const start = performance.now(), dur = 700;
  const step = now => {
    const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(to * e * 100) / 100);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
// ปุ่มลบ: แตะครั้งแรกถาม แตะซ้ำภายใน 3 วิ = ลบจริง
function armDelete(btn, fn, label = 'แตะอีกครั้งเพื่อลบ') {
  btn.onclick = () => {
    if (!btn.classList.contains('armed')) {
      btn.dataset.html = btn.innerHTML; btn.classList.add('armed'); btn.textContent = label;
      clearTimeout(btn.t); btn.t = setTimeout(() => { btn.classList.remove('armed'); btn.innerHTML = btn.dataset.html; }, 3000);
      return;
    }
    clearTimeout(btn.t); btn.disabled = true; fn();
  };
}

// ---------- ธีม ----------
const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};
function applyTheme(t) {
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.dataset.theme = t; else root.removeAttribute('data-theme');
  $('meta[name="theme-color"]').content = isDark() ? '#1A0D16' : '#FFF0F6';
  $('#themeBtn').innerHTML = isDark() ? ICON_SUN : ICON_MOON;
}
function setTheme(t) { store.set('theme', t); applyTheme(t); }

// ---------- API ----------
async function api(method, action, body) {
  if (DEMO) return demoApi(method, action, body);
  await liffReady;
  const token = window.liff.getIDToken();
  const isGet = method === 'GET';
  const qs = isGet ? '?' + new URLSearchParams({ action, ...(body || {}) }) : '';
  const res = await fetch('/api/data' + qs, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(isGet ? {} : { 'Content-Type': 'application/json' }) },
    body: isGet ? undefined : JSON.stringify({ action, ...body }),
  });
  if (res.status === 401) { window.liff.logout(); window.liff.login({ redirectUri: location.href }); throw new Error('login'); }
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || 'error');
  return j;
}

function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  return { from: `${ym}-01`, to: `${ym}-${lastDay(y, m)}` };
}
function cacheMonth(ym, entries) {
  if (ym === ymOf(todayISO())) store.set('month', { ym, entries });
}
function getMonth(ym) {
  if (!state.monthCache[ym]) {
    const p = api('GET', 'entries', monthRange(ym)).then(r => { cacheMonth(ym, r.entries); return r.entries; });
    p.catch(() => { if (state.monthCache[ym] === p) delete state.monthCache[ym]; }); // พลาดแล้วให้โหลดใหม่ได้
    state.monthCache[ym] = p;
  }
  return state.monthCache[ym];
}
function getYear(y) {
  if (!state.yearCache[y]) {
    const p = api('GET', 'year', { year: y }).then(r => r.months);
    p.catch(() => { if (state.yearCache[y] === p) delete state.yearCache[y]; });
    state.yearCache[y] = p;
  }
  return state.yearCache[y];
}
function clearCache() { state.monthCache = {}; state.yearCache = {}; }

// ---------- โหลดข้อมูลตามช่วงเวลา ----------
async function loadPeriod() {
  const { mode, date } = state;
  if (mode === 'year') {
    const months = await getYear(date.slice(0, 4));
    const inc = {}, exp = {};
    let ti = 0, te = 0;
    const perMonth = months.map(mo => {
      let i = 0, o = 0;
      for (const [k, v] of Object.entries(mo.inc || {})) { inc[k] = (inc[k] || 0) + v; i += v; }
      for (const [k, v] of Object.entries(mo.exp || {})) { exp[k] = (exp[k] || 0) + v; o += v; }
      ti += i; te += o;
      return { inc: i, exp: o };
    });
    return { inc, exp, ti, te, perMonth, entries: null };
  }
  let entries = await getMonth(ymOf(date));
  if (mode === 'day') entries = entries.filter(e => e.date === date);
  const inc = {}, exp = {};
  let ti = 0, te = 0;
  for (const e of entries) {
    if (e.type === 'income') { inc[e.category] = (inc[e.category] || 0) + e.amount; ti += e.amount; }
    else { exp[e.category] = (exp[e.category] || 0) + e.amount; te += e.amount; }
  }
  return { inc, exp, ti, te, entries };
}

function periodLabel() {
  const [y, m, d] = state.date.split('-').map(Number);
  if (state.mode === 'day') {
    const t = todayISO();
    if (state.date === t) return `วันนี้ · ${d} ${MONTHS[m - 1]}`;
    if (state.date === shiftDate(t, 'day', -1)) return `เมื่อวาน · ${d} ${MONTHS[m - 1]}`;
    return thaiDay(state.date);
  }
  if (state.mode === 'month') return `${MONTHS_FULL[m - 1]} ${y + 543}`;
  return `ปี ${y + 543}`;
}
function periodWord() {
  const t = todayISO();
  if (state.mode === 'day') return state.date === t ? 'วันนี้' : thaiDay(state.date);
  if (state.mode === 'month') return ymOf(state.date) === ymOf(t) ? 'เดือนนี้' : periodLabel();
  return state.date.slice(0, 4) === t.slice(0, 4) ? 'ปีนี้' : periodLabel();
}

// ---------- render ----------
async function render(quiet) {
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === state.page));
  $('#pageTitle').textContent = TITLES[state.page];
  $('#period').classList.toggle('hide', state.page === 'settings');
  const modes = ['day', 'month', 'year'];
  $$('.seg button').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));
  $('.seg-pill').style.transform = `translateX(${modes.indexOf(state.mode) * 100}%)`;
  $('#periodLabel span').textContent = periodLabel();

  const view = $('#view');
  const restartAnim = () => {
    view.dataset.anim = state.anim || ''; state.anim = '';
    view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
  };
  if (state.page === 'settings') {
    if (!quiet) restartAnim();
    view.innerHTML = settingsHTML(); bindSettings(); return;
  }

  const key = `${state.page}|${state.mode}|${state.date}`;
  render.key = key;
  let done = false;
  const sk = setTimeout(() => { // โชว์โครงรอเฉพาะตอนโหลดช้า
    if (!done && !quiet) view.innerHTML = `<div class="card"><div class="skeleton" style="width:40%"></div><div class="skeleton" style="height:42px;margin:12px 0;width:70%"></div><div class="skeleton"></div></div>`;
  }, 150);
  let data;
  try { data = await loadPeriod(); } catch (e) {
    done = true; clearTimeout(sk);
    if (e.message !== 'login' && render.key === key) view.innerHTML = `<div class="card empty">โหลดข้อมูลไม่สำเร็จ<br>${esc(e.message)}<br><button class="btn" id="retry">ลองใหม่</button></div>`;
    $('#retry') && ($('#retry').onclick = () => render());
    return;
  }
  done = true; clearTimeout(sk);
  if (render.key !== key) return;
  if (!quiet) restartAnim();
  view.innerHTML = state.page === 'home' ? homeHTML(data) : listHTML(data);
  bindView();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('[data-w]', view).forEach(el => { el.style.width = el.dataset.w + '%'; });
    $$('[data-h]', view).forEach(el => { el.style.height = el.dataset.h + '%'; });
    const amt = view.querySelector('[data-count]');
    if (amt) quiet ? (amt.textContent = fmt(Number(amt.dataset.count))) : countUp(amt, Number(amt.dataset.count));
    if (state.highlight) {
      const el = view.querySelector(`.entry[data-id="${CSS.escape(state.highlight)}"]`);
      if (el) { el.classList.add('flash'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      state.highlight = null;
    }
  }));
}

function catRows(map, total, cls) {
  const rows = Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return `<div class="empty">—</div>`;
  return rows.map(([id, v]) => {
    const c = catById(id), pct = total ? (v / total) * 100 : 0;
    return `<div class="cat-row"><div class="cat-ico">${esc(c.icon)}</div>
      <div><div class="cat-name"><span>${esc(c.name)}</span><small>${pct.toFixed(0)}%</small></div>
      <div class="bar ${cls}"><i data-w="${pct.toFixed(1)}"></i></div></div>
      <div class="cat-amt">${fmt(v)}</div></div>`;
  }).join('');
}

const emptyEntries = `<div class="empty">${pig('sleep', 'nap')}<div>ยังไม่มีรายการ</div><button class="btn" data-add>+ เพิ่ม</button></div>`;

function homeHTML(d) {
  const net = d.ti - d.te, zero = !d.ti && !d.te, profit = net >= 0;
  const hero = `<div class="hero-wrap">${pig(zero ? 'wink' : profit ? 'happy' : 'sad', 'peek')}<div class="card hero tilt ${zero ? '' : profit ? 'profit' : 'loss'}">
    <i class="spark s1">✦</i><i class="spark s2">✦</i><i class="spark s3">✦</i>
    <div class="hero-top"><span class="hero-label">${esc(periodWord())}</span><span class="badge">${zero ? '—' : profit ? '▲ กำไร' : '▼ ขาดทุน'}</span></div>
    <div class="hero-amount">${!zero && !profit ? '-' : ''}<span data-count="${Math.abs(net)}">0</span><small>บาท</small></div>
    <div class="split">
      <div class="pill"><span><i>💰</i>รายรับ</span><b>+${fmt(d.ti)}</b></div>
      <div class="pill"><span><i>💸</i>รายจ่าย</span><b>-${fmt(d.te)}</b></div>
    </div></div></div>`;

  let middle = '';
  if (d.perMonth) {
    const max = Math.max(1, ...d.perMonth.flatMap(m => [m.inc, m.exp]));
    middle = `<div class="card"><h3>📊 รายเดือน</h3><div class="chart">${d.perMonth.map((m, i) => `
      <div class="col" data-month="${i}" title="${MONTHS[i]}: +${fmt(m.inc)} / -${fmt(m.exp)}">
        <div class="bars"><i class="i" data-h="${(m.inc / max) * 100}"></i><i class="o" data-h="${(m.exp / max) * 100}"></i></div>
        <small>${MONTHS[i].replace('.', '').slice(0, 3)}</small></div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--income)"></i>รายรับ</span><span><i style="background:var(--expense)"></i>รายจ่าย</span></div></div>`;
  } else {
    const isDay = state.mode === 'day';
    const list = isDay ? d.entries : d.entries.slice(0, 5);
    middle = `<div class="card"><h3>🧾 ${isDay ? 'รายการ' : 'ล่าสุด'} ${!isDay && d.entries.length > 5 ? '<button class="link" data-go="list">ดูทั้งหมด</button>' : ''}</h3>
      ${list.length ? list.map(entryHTML).join('') : emptyEntries}</div>`;
  }

  return `<div class="grid home">
    <div class="grid">${hero}${middle}</div>
    <div class="grid">
      <div class="card"><h3>💸 รายจ่าย <small>${fmt(d.te)} ฿</small></h3>${catRows(d.exp, d.te, 'out')}</div>
      <div class="card"><h3>💰 รายรับ <small>${fmt(d.ti)} ฿</small></h3>${catRows(d.inc, d.ti, 'in')}</div>
    </div>
  </div>`;
}

function entryHTML(e, i = 0) {
  const c = catById(e.category);
  const showNote = e.note && e.note !== c.name;
  return `<button class="entry" style="--i:${Math.min(i, 12)}" data-id="${esc(e.id)}" data-ym="${esc(ymOf(e.date))}">
    <div class="cat-ico">${esc(c.icon)}</div>
    <div><div class="entry-name">${esc(c.name)}</div>${showNote ? `<div class="entry-note">${esc(e.note)}</div>` : ''}</div>
    <div class="${e.type === 'income' ? 'amt-in' : 'amt-out'}">${e.type === 'income' ? '+' : '-'}${fmt(e.amount)}</div>
  </button>`;
}

function listHTML(d) {
  if (d.perMonth) {
    const y = Number(state.date.slice(0, 4));
    return `<div class="card">${d.perMonth.map((m, i) => {
      const net = m.inc - m.exp;
      return `<button class="month-row" data-month="${i}">
        <b>${MONTHS_FULL[i]} ${y + 543}</b>
        <b class="${net >= 0 ? 'amt-in' : 'amt-out'}">${net >= 0 ? '+' : '-'}${fmt(Math.abs(net))}</b>
        <small>รับ ${fmt(m.inc)} · จ่าย ${fmt(m.exp)}</small><small></small></button>`;
    }).join('')}</div>`;
  }
  if (!d.entries.length) return `<div class="card">${emptyEntries}</div>`;
  const net = d.ti - d.te;
  const top = `<div class="hero-wrap">${pig(net >= 0 ? 'happy' : 'sad', 'peek small')}<div class="card hero mini tilt ${net >= 0 ? 'profit' : 'loss'}">
    <div class="hero-top"><span class="hero-label">${esc(periodWord())} · ${d.entries.length} รายการ</span><span class="badge">${net >= 0 ? '▲ กำไร' : '▼ ขาดทุน'}</span></div>
    <div class="hero-amount">${net < 0 ? '-' : ''}${fmt(Math.abs(net))}<small>บาท</small></div>
    <div class="split"><div class="pill"><span><i>💰</i>รายรับ</span><b>+${fmt(d.ti)}</b></div><div class="pill"><span><i>💸</i>รายจ่าย</span><b>-${fmt(d.te)}</b></div></div></div></div>`;
  const groups = {};
  for (const e of d.entries) (groups[e.date] ||= []).push(e);
  return top + Object.entries(groups).map(([date, list]) => {
    const net = list.reduce((s, e) => s + (e.type === 'income' ? e.amount : -e.amount), 0);
    return `<div class="day-group"><div class="day-head"><span>${thaiDay(date)}</span>
      <b class="${net >= 0 ? 'amt-in' : 'amt-out'}">${net >= 0 ? '+' : '-'}${fmt(Math.abs(net))}</b></div>
      ${list.map(entryHTML).join('')}</div>`;
  }).join('');
}

function bindTilt(root) {
  $$('.tilt', root).forEach(el => {
    el.onpointermove = e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-2px)`;
    };
    el.onpointerleave = el.onpointerup = () => { el.style.transform = ''; };
  });
}

function bindView() {
  const view = $('#view');
  bindTilt(view);
  $$('.entry', view).forEach(b => b.onclick = async () => {
    const list = await getMonth(b.dataset.ym);
    const e = list.find(x => x.id === b.dataset.id);
    if (e) openEntry(e);
  });
  $$('[data-month]', view).forEach(b => b.onclick = () => {
    state.mode = 'month';
    state.date = `${state.date.slice(0, 4)}-${String(Number(b.dataset.month) + 1).padStart(2, '0')}-01`;
    render();
  });
  $$('[data-go]', view).forEach(b => b.onclick = () => go(b.dataset.go));
  $$('[data-add]', view).forEach(b => b.onclick = () => openEntry(null));
}

// ---------- ปฏิทินเลือกวัน/เดือน/ปี ----------
function openPicker() {
  const today = todayISO();
  const [ty, tm] = today.split('-').map(Number);
  let [vy, vm] = state.date.split('-').map(Number);
  const sheet = $('#sheet');
  const pick = iso => { state.date = iso; closeSheet(); render(); };

  const draw = () => {
    let head, body, quick;
    if (state.mode === 'day') {
      head = `<button data-nav="-1" aria-label="เดือนก่อน">‹</button><b>${MONTHS_FULL[vm - 1]} ${vy + 543}</b><button data-nav="1" aria-label="เดือนถัดไป">›</button>`;
      const first = new Date(Date.UTC(vy, vm - 1, 1)).getUTCDay();
      const cells = DOW.map(d => `<div class="dow">${d}</div>`).concat(Array(first).fill('<div></div>'));
      for (let d = 1; d <= lastDay(vy, vm); d++) {
        const iso = `${vy}-${String(vm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push(`<button data-pick="${iso}" class="${iso === state.date ? 'sel' : iso === today ? 'now' : ''}">${d}</button>`);
      }
      body = `<div class="cal">${cells.join('')}</div>`;
      quick = 'วันนี้';
    } else if (state.mode === 'month') {
      head = `<button data-nav="-1" aria-label="ปีก่อน">‹</button><b>ปี ${vy + 543}</b><button data-nav="1" aria-label="ปีถัดไป">›</button>`;
      const sel = ymOf(state.date);
      body = `<div class="mgrid">${MONTHS_FULL.map((name, i) => {
        const ym = `${vy}-${String(i + 1).padStart(2, '0')}`;
        return `<button data-pick="${ym}-01" class="${ym === sel ? 'sel' : vy === ty && i + 1 === tm ? 'now' : ''}">${name}</button>`;
      }).join('')}</div>`;
      quick = 'เดือนนี้';
    } else {
      head = `<span></span><b>เลือกปี</b><span></span>`;
      const sy = Number(state.date.slice(0, 4));
      body = `<div class="mgrid">${Array.from({ length: 9 }, (_, i) => ty - 7 + i).map(y =>
        `<button data-pick="${y}-01-01" class="${y === sy ? 'sel' : y === ty ? 'now' : ''}">${y + 543}</button>`).join('')}</div>`;
      quick = 'ปีนี้';
    }
    sheet.innerHTML = `<div class="grab"></div><div class="pick-head">${head}</div>${body}
      <div class="actions"><button class="btn ghost" data-close>ปิด</button><button class="btn" data-today>${quick}</button></div>`;
    $$('[data-nav]', sheet).forEach(b => b.onclick = () => {
      const dir = Number(b.dataset.nav);
      if (state.mode === 'day') { vm += dir; if (vm < 1) { vm = 12; vy--; } if (vm > 12) { vm = 1; vy++; } }
      else vy += dir;
      draw();
    });
    $$('[data-pick]', sheet).forEach(b => b.onclick = () => pick(b.dataset.pick));
    sheet.querySelector('[data-close]').onclick = closeSheet;
    sheet.querySelector('[data-today]').onclick = () => pick(today);
  };
  draw();
  openSheetEl();
}

// ---------- ตั้งค่า ----------
function settingsHTML() {
  const defaults = state.categories.filter(c => !c.custom);
  const opt = t => state.categories.filter(c => c.type === t).map(c => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`).join('');
  const nc = state.newCat;
  const theme = store.get('theme') || 'auto';
  return `<div class="grid two">
    <div class="card">
      ${pig('wink', 'peek corner')}<h2 class="section-title">🗂️ หมวดหมู่</h2>

      <div class="sub">หมวดที่สร้างเอง</div>
      ${state.custom.length ? state.custom.map(c => `
        <div class="item-row"><div class="cat-ico">${esc(c.icon)}</div>
          <div class="grow">${esc(c.name)}<small>${c.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</small></div>
          <button class="del-btn" data-delcat="${esc(c.id)}" aria-label="ลบหมวด">${ICON_TRASH}</button></div>`).join('')
        : '<p class="hint">ยังไม่มี สร้างได้ด้านล่าง</p>'}
      <div class="form">
        <div class="type-toggle">
          <button class="expense ${nc.type === 'expense' ? 'on' : ''}" data-ctype="expense">รายจ่าย</button>
          <button class="income ${nc.type === 'income' ? 'on' : ''}" data-ctype="income">รายรับ</button>
        </div>
        <div class="form-row">
          <button class="emoji-btn" id="catIcon" aria-label="เลือกรูป">${esc(nc.icon)}</button>
          <input class="input" id="catName" placeholder="ชื่อหมวด เช่น ค่านมลูก" maxlength="30">
        </div>
        <div class="emoji-grid" id="emojiGrid" hidden>${EMOJIS.map(e => `<button data-emoji="${e}" class="${e === nc.icon ? 'on' : ''}">${e}</button>`).join('')}</div>
        <button class="btn" id="catAdd">+ เพิ่มหมวด</button>
      </div>
      <div class="sub">หมวดเริ่มต้น (มีให้ทุกคน ลบไม่ได้)</div>
      <div class="chips">${defaults.map(c => `<span class="chip">${esc(c.icon)} ${esc(c.name)}</span>`).join('')}</div>
    </div>

    <div class="card">
      <h2 class="section-title">💬 คำลัดของฉัน</h2>
      <div class="example">💬 พิมพ์ <b>"นมลูก 350"</b> → 👪 ครอบครัว/ลูก ✅<br>🧠 บอทจะถามคำที่ไม่รู้จักเองในแชท<br>✍️ หรือพิมพ์ในแชท: <b>นมลูก = ครอบครัว</b></div>
      <div class="sub">คำที่ตั้งไว้</div>
      ${state.keywords.length ? state.keywords.map((k, i) => {
        const c = catById(k.category);
        return `<div class="item-row"><div class="cat-ico">${esc(c.icon)}</div>
          <div class="grow">พิมพ์ "<b>${esc(k.word)}</b>"<small>→ บันทึกเป็น ${esc(c.name)}</small></div>
          <button class="del-btn" data-delkw="${i}" aria-label="ลบคำ">${ICON_TRASH}</button></div>`;
      }).join('') : '<p class="hint">ยังไม่มี ตั้งได้ด้านล่าง</p>'}
      <div class="form">
        <label>1. เวลาพิมพ์คำว่า
          <input class="input" id="kwWord" placeholder="เช่น นมลูก, ค่าเทอม, ข้าวแมว" maxlength="30"></label>
        <label>2. ให้บันทึกเป็นหมวด
          <select class="input" id="kwCat"><optgroup label="รายจ่าย">${opt('expense')}</optgroup><optgroup label="รายรับ">${opt('income')}</optgroup></select></label>
        <div class="preview" id="kwPreview"></div>
        <button class="btn" id="kwAdd">+ บันทึกคำนี้</button>
      </div>
    </div>

    <div class="card span">
      <h2 class="section-title">🎨 หน้าตา</h2>
      <div class="seg" style="max-width:none;margin-top:10px">
        ${[['light', 'สว่าง'], ['dark', 'มืด'], ['auto', 'ตามเครื่อง']].map(([v, l]) => `<button data-themeopt="${v}" class="${theme === v ? 'active' : ''}">${l}</button>`).join('')}
        <span class="seg-pill" style="transform:translateX(${['light', 'dark', 'auto'].indexOf(theme) * 100}%)"></span>
      </div>
    </div>
  </div>`;
}

async function saveProfile(patch, msg) {
  try {
    const p = await api('POST', 'profile', patch);
    applyProfile(p); store.set('profile', p); toast(msg); render(true);
  } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message); render(true); }
}

function bindSettings() {
  const nc = state.newCat;
  $$('[data-ctype]').forEach(b => b.onclick = () => {
    nc.type = b.dataset.ctype;
    $$('[data-ctype]').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#catIcon').onclick = () => { $('#emojiGrid').hidden = !$('#emojiGrid').hidden; };
  $$('[data-emoji]').forEach(b => b.onclick = () => {
    nc.icon = b.dataset.emoji; $('#catIcon').textContent = nc.icon; $('#emojiGrid').hidden = true;
    $$('[data-emoji]').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#catAdd').onclick = () => {
    const name = $('#catName').value.trim();
    if (!name) { $('#catName').focus(); return toast('กรุณาใส่ชื่อหมวด'); }
    if (state.categories.some(c => c.name === name)) return toast('มีหมวดชื่อนี้แล้ว');
    const categories = state.custom.concat({ id: 'c_' + Date.now().toString(36), name, type: nc.type, icon: nc.icon });
    state.newCat = { type: nc.type, icon: '🏷️' };
    saveProfile({ categories }, 'เพิ่มหมวดแล้ว ✓');
  };
  $$('[data-delcat]').forEach(b => armDelete(b, () => {
    const id = b.dataset.delcat;
    saveProfile({ categories: state.custom.filter(c => c.id !== id), keywords: state.keywords.filter(k => k.category !== id) }, 'ลบหมวดแล้ว');
  }, 'ลบ?'));

  const preview = () => {
    const w = $('#kwWord').value.trim(), c = catById($('#kwCat').value);
    $('#kwPreview').innerHTML = w
      ? `พิมพ์ "<b>${esc(w)} 100</b>" → ${esc(c.icon)} <b>${esc(c.name)}</b> ${c.type === 'income' ? '+' : '-'}100 ฿`
      : 'พิมพ์คำในช่องที่ 1 แล้วจะเห็นตัวอย่างตรงนี้';
  };
  $('#kwWord').oninput = preview; $('#kwCat').onchange = preview; preview();
  $('#kwAdd').onclick = () => {
    const word = $('#kwWord').value.trim();
    if (!word) { $('#kwWord').focus(); return toast('กรุณาพิมพ์คำ'); }
    if (/\d/.test(word)) return toast('คำห้ามมีตัวเลข');
    const keywords = state.keywords.filter(k => k.word !== word).concat({ word, category: $('#kwCat').value });
    saveProfile({ keywords }, 'บันทึกคำแล้ว ✓');
  };
  $$('[data-delkw]').forEach(b => armDelete(b, () => {
    const keywords = state.keywords.filter((_, i) => i !== Number(b.dataset.delkw));
    saveProfile({ keywords }, 'ลบคำแล้ว');
  }, 'ลบ?'));

  $$('[data-themeopt]').forEach(b => b.onclick = () => { setTheme(b.dataset.themeopt === 'auto' ? null : b.dataset.themeopt); render(true); });
}

// ---------- sheet เพิ่ม/แก้ไข ----------
function openSheetEl() { $('#sheetBg').classList.add('open'); $('#sheet').classList.add('open'); }
function closeSheet() { $('#sheet').classList.remove('open'); $('#sheetBg').classList.remove('open'); }

function openEntry(entry) {
  const isEdit = !!entry;
  const e = entry ? { ...entry } : { type: 'expense', category: 'fuel', amount: '', note: '', date: todayISO() };
  const sheet = $('#sheet');
  const draw = () => {
    const cats = state.categories.filter(c => c.type === e.type);
    if (!cats.some(c => c.id === e.category)) e.category = cats[0]?.id;
    sheet.innerHTML = `<div class="grab"></div><h2>${isEdit ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}</h2>
      <div class="type-toggle">
        <button class="expense ${e.type === 'expense' ? 'on' : ''}" data-type="expense">รายจ่าย</button>
        <button class="income ${e.type === 'income' ? 'on' : ''}" data-type="income">รายรับ</button>
      </div>
      <input class="amount-input" id="fAmount" type="number" inputmode="decimal" placeholder="0" min="0" step="0.01" value="${esc(e.amount)}"
        style="color:var(--${e.type === 'income' ? 'income' : 'expense'})">
      <span class="label">หมวด</span>
      <div class="chips">${cats.map(c => `<button class="chip ${c.id === e.category ? 'on' : ''}" data-cat="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</button>`).join('')}</div>
      <span class="label">บันทึกช่วยจำ</span>
      <input class="input" id="fNote" maxlength="60" placeholder="ไม่บังคับ" value="${esc(e.note)}">
      <span class="label">วันที่</span>
      <input class="input" id="fDate" type="date" value="${esc(e.date)}">
      <div class="actions">
        ${isEdit ? `<button class="btn danger" id="fDel">ลบ</button>` : '<button class="btn ghost" id="fCancel">ยกเลิก</button>'}
        <button class="btn" id="fSave">บันทึก</button>
      </div>`;
    const keep = () => { e.amount = $('#fAmount').value; e.note = $('#fNote').value; e.date = $('#fDate').value; };
    $$('[data-type]', sheet).forEach(b => b.onclick = () => { keep(); e.type = b.dataset.type; draw(); });
    $$('[data-cat]', sheet).forEach(b => b.onclick = () => {
      e.category = b.dataset.cat;
      $$('[data-cat]', sheet).forEach(x => x.classList.toggle('on', x === b));
    });
    $('#fCancel') && ($('#fCancel').onclick = closeSheet);
    $('#fDel') && armDelete($('#fDel'), async () => {
      try { await api('POST', 'delete', { id: e.id }); closeSheet(); clearCache(); toast('ลบแล้ว 🗑️'); render(); }
      catch (err) { toast(err.message); draw(); }
    });
    $('#fSave').onclick = async () => {
      keep();
      if (!(Number(e.amount) > 0)) { $('#fAmount').focus(); return toast('กรุณาใส่จำนวนเงิน'); }
      if (!e.date) return toast('กรุณาเลือกวันที่');
      const data = { type: e.type, category: e.category, amount: Number(e.amount), note: e.note, date: e.date };
      $('#fSave').disabled = true; $('#fSave').textContent = 'กำลังบันทึก…';
      try {
        let id = e.id;
        if (isEdit) await api('POST', 'update', { id: e.id, entry: data });
        else id = (await api('POST', 'add', { entry: data })).entries?.[0]?.id;
        await showSaved(data, isEdit ? 'แก้ไขแล้ว' : 'บันทึกแล้ว');
        clearCache();
        // หลังบันทึก พาไปดูรายวันของวันนั้น
        state.mode = 'day'; state.date = data.date; state.highlight = id;
        if (state.page === 'settings') state.page = 'home';
        render();
      } catch (err) { toast(err.message); $('#fSave').disabled = false; $('#fSave').textContent = 'บันทึก'; }
    };
  };
  draw();
  openSheetEl();
  if (!isEdit) setTimeout(() => $('#fAmount')?.focus(), 350);
}

async function showSaved(d, title) {
  const c = catById(d.category);
  $('#sheet').innerHTML = `<div class="saved">
    <div class="saved-pig"><span class="coin">🪙</span>${pig('happy', 'jump')}</div>
    <div class="saved-title">${title}</div>
    <div class="saved-amt ${d.type === 'income' ? 'amt-in' : 'amt-out'}">${d.type === 'income' ? '+' : '-'}${fmt(d.amount)} ฿</div>
    <div class="saved-cat">${esc(c.icon)} ${esc(c.name)} · ${thaiDay(d.date)}</div></div>`;
  await sleep(1000);
  closeSheet();
}

// ---------- navigation ----------
const PAGES = ['home', 'list', 'settings'];
function go(page) {
  if (page === state.page) return;
  state.anim = PAGES.indexOf(page) > PAGES.indexOf(state.page) ? 'l' : 'r';
  state.page = page; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function bindChrome() {
  $$('.nav-item').forEach(b => b.onclick = () => go(b.dataset.page));
  $$('.seg button[data-mode]').forEach(b => b.onclick = () => { state.mode = b.dataset.mode; state.date = todayISO(); render(); });
  $('#prev').onclick = () => { state.anim = 'r'; state.date = shiftDate(state.date, state.mode, -1); render(); };
  $('#next').onclick = () => { state.anim = 'l'; state.date = shiftDate(state.date, state.mode, 1); render(); };
  $('#periodLabel').onclick = openPicker;
  $('#addBtn').onclick = () => openEntry(null);
  $('#sheetBg').onclick = closeSheet;
  $('#themeBtn').onclick = () => { setTheme(isDark() ? 'light' : 'dark'); if (state.page === 'settings') render(true); };
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeSheet(); });
  // กลับมาที่หน้าเว็บ (เช่น ไปพิมพ์ในแชทมา) ให้ดึงข้อมูลใหม่
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (state.ready && Date.now() - hiddenAt > 3000) { clearCache(); render(true); }
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme(store.get('theme')));
}

function applyProfile(p) {
  state.categories = p.categories; state.custom = p.customCategories || []; state.keywords = p.keywords || [];
}
function setUser(u) {
  if (!u) return;
  $('#hello').textContent = `สวัสดี ${u.name || ''} 🎀`;
  if (u.pic) { $('#avatar').src = u.pic; $('#avatar').hidden = false; }
}
const hideLoader = () => $('#loader').classList.add('hide');

// ---------- start ----------
function loadScript(src) {
  return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
}

async function initLiff() {
  const cachedId = store.get('liffId');
  const getId = () => fetch('/api/data?action=config').then(r => r.json()).then(j => j.liffId);
  const [liffId] = await Promise.all([cachedId || getId(), window.liff ? null : loadScript(LIFF_SDK)]);
  if (!liffId) throw new Error('ยังไม่ได้ตั้งค่า LIFF_ID');
  try { await window.liff.init({ liffId }); }
  catch (e) { // LIFF ID ที่จำไว้อาจเก่า ลองขอใหม่อีกครั้ง
    if (!cachedId) throw e;
    const fresh = await getId();
    if (!fresh || fresh === cachedId) throw e;
    await window.liff.init({ liffId: fresh }); store.set('liffId', fresh); return;
  }
  store.set('liffId', liffId);
}

async function boot() {
  bindChrome();
  applyTheme(store.get('theme'));
  const ym = ymOf(todayISO());
  let shown = false;

  // 1) มีข้อมูลที่จำไว้ → โชว์ทันที แล้วค่อยอัปเดตทีหลัง
  if (!DEMO) {
    setUser(store.get('user'));
    const p = store.get('profile'), m = store.get('month');
    if (p && m && m.ym === ym) {
      applyProfile(p); state.monthCache[ym] = Promise.resolve(m.entries);
      await render(); hideLoader(); shown = true;
    }
  }

  try {
    if (!DEMO) {
      liffReady = initLiff();
      await liffReady;
      if (!window.liff.isLoggedIn()) { window.liff.login({ redirectUri: location.href }); return; }
      window.liff.getProfile().then(pr => {
        const u = { name: pr.displayName, pic: pr.pictureUrl || '' };
        store.set('user', u); setUser(u);
      }).catch(() => {});
    } else {
      setUser({ name: '(โหมดทดลอง)' });
    }
    // 2) ดึงหมวด + รายการเดือนนี้ในครั้งเดียว
    const r = await api('GET', 'boot', monthRange(ym));
    applyProfile(r.profile); store.set('profile', r.profile);
    state.monthCache[ym] = Promise.resolve(r.entries); cacheMonth(ym, r.entries);
    await render(shown);
  } catch (e) {
    if (e.message === 'login') return;
    console.error(e);
    if (shown) toast('อัปเดตข้อมูลไม่สำเร็จ');
    else $('#view').innerHTML = `<div class="card empty">เริ่มระบบไม่สำเร็จ<br>${esc(e.message)}</div>`;
  } finally {
    state.ready = true;
    hideLoader();
  }
}
boot();

// ---------- โหมดทดลอง (?demo=1) ไม่ต้องต่อ LINE/Firebase ----------
function demoApi(method, action, body) {
  const db = demoApi.db ||= (() => {
    const cats = [
      ['job', 'income', '🛵', 'รายได้จากการวิ่งงาน'], ['tip', 'income', '💝', 'ทิป'], ['bonus', 'income', '🎁', 'โบนัส'], ['inc_other', 'income', '💰', 'รายรับอื่นๆ'],
      ['fuel', 'expense', '⛽', 'ค่าน้ำมัน'], ['food', 'expense', '🍚', 'ค่ากิน'], ['travel', 'expense', '🚌', 'ค่าเดินทาง'], ['phone', 'expense', '📱', 'ค่าเน็ต/ค่าโทร'], ['repair', 'expense', '🔧', 'ค่าซ่อมรถ'],
      ['loan', 'expense', '🏍️', 'ค่าผ่อนรถ'], ['rent', 'expense', '🏠', 'ค่าที่พัก'], ['family', 'expense', '👪', 'ครอบครัว/ลูก'], ['shopping', 'expense', '🛍️', 'ของใช้'], ['care', 'expense', '💇', 'ดูแลตัวเอง'], ['health', 'expense', '💊', 'ค่ารักษา'], ['exp_other', 'expense', '🧾', 'รายจ่ายอื่นๆ'],
    ].map(([id, type, icon, name]) => ({ id, type, icon, name }));
    const entries = [];
    const t = todayISO();
    for (let i = 0; i < 70; i++) {
      const date = shiftDate(t, 'day', -i);
      entries.push({ type: 'income', category: 'job', amount: 700 + ((i * 137) % 600), note: 'วิ่งงาน', date });
      if (i % 3 === 0) entries.push({ type: 'income', category: 'tip', amount: 20 + (i % 5) * 10, note: 'ทิป', date });
      entries.push({ type: 'expense', category: 'fuel', amount: 60 + (i % 4) * 20, note: 'เติมน้ำมัน', date });
      entries.push({ type: 'expense', category: 'food', amount: 50 + (i % 3) * 25, note: 'ข้าวมันไก่', date });
      if (i % 30 === 5) entries.push({ type: 'expense', category: 'loan', amount: 3200, note: 'งวดรถ', date });
      if (i % 30 === 1) entries.push({ type: 'expense', category: 'rent', amount: 3500, note: 'ค่าห้อง', date });
    }
    entries.forEach((e, i) => { e.id = 'd' + i; e.ts = Date.now() - i * 1000; });
    return { cats, custom: [{ id: 'c_milk', name: 'ค่านมลูก', type: 'expense', icon: '🍼' }], keywords: [{ word: 'นมลูก', category: 'c_milk' }], entries };
  })();
  const profile = () => ({ categories: [...db.cats, ...db.custom.map(c => ({ ...c, custom: true }))], customCategories: db.custom, keywords: db.keywords });
  const inRange = b => db.entries.filter(e => e.date >= b.from && e.date <= b.to).sort((a, c) => c.date.localeCompare(a.date) || c.ts - a.ts);
  const wait = v => new Promise(r => setTimeout(() => r(structuredClone(v)), 250));
  if (method === 'GET') {
    if (action === 'boot') return wait({ profile: profile(), entries: inRange(body) });
    if (action === 'profile') return wait(profile());
    if (action === 'entries') return wait({ entries: inRange(body) });
    if (action === 'year') return wait({ months: Array.from({ length: 12 }, (_, m) => {
      const ym = `${body.year}-${String(m + 1).padStart(2, '0')}`, inc = {}, exp = {};
      db.entries.filter(e => e.date.startsWith(ym)).forEach(e => { const t = e.type === 'income' ? inc : exp; t[e.category] = (t[e.category] || 0) + e.amount; });
      return { inc, exp };
    }) });
  }
  if (action === 'add') { const n = { ...body.entry, id: 'n' + Date.now(), ts: Date.now() }; db.entries.push(n); return wait({ entries: [n] }); }
  if (action === 'update') Object.assign(db.entries.find(e => e.id === body.id), body.entry);
  if (action === 'delete') db.entries = db.entries.filter(e => e.id !== body.id);
  if (action === 'profile') { if (body.categories) db.custom = body.categories; if (body.keywords) db.keywords = body.keywords; return wait(profile()); }
  return wait({ ok: true });
}
