// ===== สมุดรายรับรายจ่าย (เว็บแอป) =====
const $ = s => document.querySelector(s);
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TITLES = { home: 'ภาพรวม', list: 'รายการ', settings: 'ตั้งค่า' };

const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');

const state = {
  page: ['home', 'list', 'settings'].includes(params.get('page')) ? params.get('page') : 'home',
  mode: 'month',
  date: todayISO(),
  categories: [], custom: [], keywords: [],
  monthCache: {}, yearCache: {},
};

// ---------- utils ----------
function todayISO() {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
const fmt = n => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const catById = id => state.categories.find(c => c.id === id) || { id, name: 'อื่นๆ', icon: '🏷️', type: 'expense' };
const ymOf = iso => iso.slice(0, 7);
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

// ---------- API ----------
async function api(method, action, body) {
  if (DEMO) return demoApi(method, action, body);
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

async function getMonth(ym) {
  if (!state.monthCache[ym]) {
    const [y, m] = ym.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    state.monthCache[ym] = api('GET', 'entries', { from: `${ym}-01`, to: `${ym}-${last}` }).then(r => r.entries);
  }
  return state.monthCache[ym];
}
async function getYear(y) {
  if (!state.yearCache[y]) state.yearCache[y] = api('GET', 'year', { year: y }).then(r => r.months);
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
  const [y, m] = state.date.split('-').map(Number);
  if (state.mode === 'day') return thaiDay(state.date);
  if (state.mode === 'month') return `${MONTHS_FULL[m - 1]} ${y + 543}`;
  return `ปี ${y + 543}`;
}
const periodWord = () => ({ day: 'วันนี้', month: 'เดือนนี้', year: 'ปีนี้' }[state.mode]);

// ---------- render ----------
async function render() {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === state.page));
  $('#pageTitle').textContent = TITLES[state.page];
  $('#period').classList.toggle('hide', state.page === 'settings');
  const modes = ['day', 'month', 'year'];
  document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));
  $('.seg-pill').style.transform = `translateX(${modes.indexOf(state.mode) * 100}%)`;
  $('#periodLabel').textContent = periodLabel();

  const view = $('#view');
  view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
  if (state.page === 'settings') { view.innerHTML = settingsHTML(); bindSettings(); return; }

  view.innerHTML = `<div class="card"><div class="skeleton" style="width:40%"></div><div class="skeleton" style="height:42px;margin:12px 0;width:70%"></div><div class="skeleton"></div></div>`;
  const key = `${state.page}|${state.mode}|${state.date}`;
  render.key = key;
  let data;
  try { data = await loadPeriod(); } catch (e) { if (e.message !== 'login') view.innerHTML = `<div class="card empty">โหลดข้อมูลไม่สำเร็จ<br>${esc(e.message)}</div>`; return; }
  if (render.key !== key) return;
  view.innerHTML = state.page === 'home' ? homeHTML(data) : listHTML(data);
  bindView();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    view.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; });
    view.querySelectorAll('[data-h]').forEach(el => { el.style.height = el.dataset.h + '%'; });
    const amt = view.querySelector('[data-count]');
    if (amt) countUp(amt, Number(amt.dataset.count));
  }));
}

function catRows(map, total, cls) {
  const rows = Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return `<div class="empty">ยังไม่มีรายการ</div>`;
  return rows.map(([id, v]) => {
    const c = catById(id), pct = total ? (v / total) * 100 : 0;
    return `<div class="cat-row"><div class="cat-ico">${esc(c.icon)}</div>
      <div><div class="cat-name"><span>${esc(c.name)}</span><small>${pct.toFixed(0)}%</small></div>
      <div class="bar ${cls}"><i data-w="${pct.toFixed(1)}"></i></div></div>
      <div class="cat-amt">${fmt(v)}</div></div>`;
  }).join('');
}

function homeHTML(d) {
  const net = d.ti - d.te, profit = net >= 0;
  const hero = `<div class="card hero ${profit ? 'profit' : 'loss'} span">
    <div class="hero-label">${periodWord()} <b>${profit ? 'กำไร' : 'ขาดทุน'}</b></div>
    <div class="hero-amount"><span data-count="${Math.abs(net)}">0</span><small>บาท</small></div>
    <div class="split">
      <div class="pill in"><span>รายรับ</span><b>+${fmt(d.ti)}</b></div>
      <div class="pill out"><span>รายจ่าย</span><b>-${fmt(d.te)}</b></div>
    </div></div>`;

  let chart = '';
  if (d.perMonth) {
    const max = Math.max(1, ...d.perMonth.flatMap(m => [m.inc, m.exp]));
    chart = `<div class="card span"><h3>รายเดือน</h3><div class="chart">${d.perMonth.map((m, i) => `
      <div class="col" data-month="${i}" title="${MONTHS[i]}: +${fmt(m.inc)} / -${fmt(m.exp)}">
        <div class="bars"><i class="i" data-h="${(m.inc / max) * 100}"></i><i class="o" data-h="${(m.exp / max) * 100}"></i></div>
        <small>${MONTHS[i].replace('.', '').slice(0, 3)}</small></div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--income)"></i>รายรับ</span><span><i style="background:var(--expense)"></i>รายจ่าย</span></div></div>`;
  }

  const recent = d.entries
    ? `<div class="card"><h3 style="display:flex;justify-content:space-between">รายการล่าสุด <button class="link" data-go="list">ดูทั้งหมด</button></h3>
        ${d.entries.length ? d.entries.slice(0, 5).map(entryHTML).join('') : '<div class="empty">ยังไม่มีรายการ<br>พิมพ์ในแชท LINE หรือกดปุ่ม + เพื่อเพิ่ม</div>'}</div>`
    : '';

  return `<div class="grid home">
    <div class="grid">${hero}${chart}${recent}</div>
    <div class="grid">
      <div class="card"><h3>รายจ่ายตามหมวด <small>${fmt(d.te)} ฿</small></h3>${catRows(d.exp, d.te, 'out')}</div>
      <div class="card"><h3>รายรับตามหมวด <small>${fmt(d.ti)} ฿</small></h3>${catRows(d.inc, d.ti, 'in')}</div>
    </div>
  </div>`;
}

function entryHTML(e) {
  const c = catById(e.category);
  const showNote = e.note && e.note !== c.name;
  return `<button class="entry" data-id="${esc(e.id)}">
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
  if (!d.entries.length) return `<div class="card empty">ไม่มีรายการในช่วงนี้</div>`;
  const groups = {};
  for (const e of d.entries) (groups[e.date] ||= []).push(e);
  return Object.entries(groups).map(([date, list]) => {
    const net = list.reduce((s, e) => s + (e.type === 'income' ? e.amount : -e.amount), 0);
    return `<div class="day-group"><div class="day-head"><span>${thaiDay(date)}</span>
      <b class="${net >= 0 ? 'amt-in' : 'amt-out'}">${net >= 0 ? '+' : '-'}${fmt(Math.abs(net))}</b></div>
      ${list.map(entryHTML).join('')}</div>`;
  }).join('');
}

function bindView() {
  const view = $('#view');
  view.querySelectorAll('.entry').forEach(b => b.onclick = async () => {
    const list = await getMonth(ymOf(state.date));
    const e = list.find(x => x.id === b.dataset.id);
    if (e) openSheet(e);
  });
  view.querySelectorAll('[data-month]').forEach(b => b.onclick = () => {
    state.mode = 'month';
    state.date = `${state.date.slice(0, 4)}-${String(Number(b.dataset.month) + 1).padStart(2, '0')}-01`;
    render();
  });
  view.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
}

// ---------- ตั้งค่า ----------
function settingsHTML() {
  const defaults = state.categories.filter(c => !c.custom);
  const opt = t => state.categories.filter(c => c.type === t).map(c => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`).join('');
  return `<div class="grid two">
    <div class="card span"><h3>💬 วิธีบันทึกผ่านแชท LINE</h3>
      <div class="tip-box">พิมพ์ได้เลย เช่น <code>น้ำมัน 60 ข้าว 50</code> · <code>วิ่งงาน 1200 ทิป 20</code> · <code>เมื่อวาน ปะยาง 120</code><br>
      พิมพ์ <code>ยกเลิก</code> เพื่อลบรายการล่าสุด · <code>สรุปวันนี้</code> เพื่อดูยอด</div></div>

    <div class="card"><h3>🔤 คำของฉัน</h3>
      <p class="hint">สอนบอทให้รู้จักคำของคุณ เช่น "นมลูก" → ค่านมลูก</p>
      <div id="kwList" style="margin-top:8px">${state.keywords.length ? state.keywords.map((k, i) => `
        <div class="kw-row"><span><b>${esc(k.word)}</b> → ${esc(catById(k.category).icon)} ${esc(catById(k.category).name)}</span>
        <button class="chip" data-delkw="${i}"><span class="x">×</span></button></div>`).join('') : '<div class="empty">ยังไม่มีคำ</div>'}</div>
      <div class="form-row">
        <input class="input" id="kwWord" placeholder="คำที่พิมพ์ เช่น นมลูก" maxlength="30">
        <select class="input" id="kwCat"><optgroup label="รายจ่าย">${opt('expense')}</optgroup><optgroup label="รายรับ">${opt('income')}</optgroup></select>
        <button class="btn" id="kwAdd">เพิ่มคำ</button>
      </div></div>

    <div class="card"><h3>🗂️ หมวดหมู่</h3>
      <p class="hint">หมวดเริ่มต้น</p>
      <div class="chips" style="margin:8px 0 14px">${defaults.map(c => `<span class="chip">${esc(c.icon)} ${esc(c.name)}</span>`).join('')}</div>
      <p class="hint">หมวดที่สร้างเอง</p>
      <div class="chips" style="margin-top:8px">${state.custom.length ? state.custom.map(c => `
        <span class="chip">${esc(c.icon)} ${esc(c.name)} <small style="color:var(--muted)">${c.type === 'income' ? 'รับ' : 'จ่าย'}</small>
        <button class="x" data-delcat="${esc(c.id)}" aria-label="ลบ">×</button></span>`).join('') : '<span class="hint">ยังไม่มี</span>'}</div>
      <div class="form-row">
        <input class="input icon" id="catIcon" value="🏷️" maxlength="4" aria-label="ไอคอน">
        <input class="input" id="catName" placeholder="ชื่อหมวด เช่น ค่านมลูก" maxlength="30">
        <select class="input" id="catType" style="flex:0 1 120px"><option value="expense">รายจ่าย</option><option value="income">รายรับ</option></select>
        <button class="btn" id="catAdd">เพิ่มหมวด</button>
      </div></div>
  </div>`;
}

async function saveProfile(patch, msg) {
  try {
    const p = await api('POST', 'profile', patch);
    applyProfile(p); toast(msg); render();
  } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message); }
}

function bindSettings() {
  $('#kwAdd').onclick = () => {
    const word = $('#kwWord').value.trim();
    if (!word) return toast('กรุณาพิมพ์คำ');
    const keywords = state.keywords.filter(k => k.word !== word).concat({ word, category: $('#kwCat').value });
    saveProfile({ keywords }, 'เพิ่มคำแล้ว ✓');
  };
  document.querySelectorAll('[data-delkw]').forEach(b => b.onclick = () => {
    const keywords = state.keywords.filter((_, i) => i !== Number(b.dataset.delkw));
    saveProfile({ keywords }, 'ลบคำแล้ว');
  });
  $('#catAdd').onclick = () => {
    const name = $('#catName').value.trim();
    if (!name) return toast('กรุณาใส่ชื่อหมวด');
    const categories = state.custom.concat({ id: 'c_' + Date.now().toString(36), name, type: $('#catType').value, icon: $('#catIcon').value.trim() || '🏷️' });
    saveProfile({ categories }, 'เพิ่มหมวดแล้ว ✓');
  };
  document.querySelectorAll('[data-delcat]').forEach(b => b.onclick = () => {
    if (!confirm('ลบหมวดนี้? (รายการเก่าจะแสดงเป็น "อื่นๆ")')) return;
    const id = b.dataset.delcat;
    saveProfile({ categories: state.custom.filter(c => c.id !== id), keywords: state.keywords.filter(k => k.category !== id) }, 'ลบหมวดแล้ว');
  });
}

// ---------- sheet เพิ่ม/แก้ไข ----------
function openSheet(entry) {
  const isEdit = !!entry;
  const e = entry ? { ...entry } : { type: 'expense', category: 'fuel', amount: '', note: '', date: state.mode === 'day' ? state.date : todayISO() };
  const sheet = $('#sheet');
  const draw = () => {
    const cats = state.categories.filter(c => c.type === e.type);
    if (!cats.some(c => c.id === e.category)) e.category = cats[0]?.id;
    sheet.innerHTML = `<div class="grab"></div><h2>${isEdit ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}</h2>
      <div class="type-toggle">
        <button class="income ${e.type === 'income' ? 'on' : ''}" data-type="income">รายรับ</button>
        <button class="expense ${e.type === 'expense' ? 'on' : ''}" data-type="expense">รายจ่าย</button>
      </div>
      <input class="amount-input" id="fAmount" type="number" inputmode="decimal" placeholder="0" min="0" step="0.01" value="${esc(e.amount)}"
        style="color:var(--${e.type === 'income' ? 'income' : 'expense'})">
      <span class="label">หมวด</span>
      <div class="chips">${cats.map(c => `<button class="chip ${c.id === e.category ? 'on' : ''}" data-cat="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</button>`).join('')}</div>
      <span class="label">บันทึกช่วยจำ</span>
      <input class="input" id="fNote" style="width:100%" maxlength="60" placeholder="ไม่บังคับ" value="${esc(e.note)}">
      <span class="label">วันที่</span>
      <input class="input" id="fDate" type="date" style="width:100%" value="${esc(e.date)}">
      <div class="actions">
        ${isEdit ? '<button class="btn danger" id="fDel">ลบ</button>' : '<button class="btn ghost" id="fCancel">ยกเลิก</button>'}
        <button class="btn" id="fSave">บันทึก</button>
      </div>`;
    const keep = () => { e.amount = $('#fAmount').value; e.note = $('#fNote').value; e.date = $('#fDate').value; };
    sheet.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { keep(); e.type = b.dataset.type; draw(); });
    sheet.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => {
      e.category = b.dataset.cat;
      sheet.querySelectorAll('[data-cat]').forEach(x => x.classList.toggle('on', x === b));
    });
    $('#fCancel') && ($('#fCancel').onclick = closeSheet);
    $('#fDel') && ($('#fDel').onclick = async () => {
      if (!confirm('ลบรายการนี้?')) return;
      try { await api('POST', 'delete', { id: e.id }); done('ลบแล้ว 🗑️'); } catch (err) { toast(err.message); }
    });
    $('#fSave').onclick = async () => {
      keep();
      if (!(Number(e.amount) > 0)) return toast('กรุณาใส่จำนวนเงิน');
      if (!e.date) return toast('กรุณาเลือกวันที่');
      const entryData = { type: e.type, category: e.category, amount: Number(e.amount), note: e.note, date: e.date };
      $('#fSave').disabled = true;
      try {
        if (isEdit) await api('POST', 'update', { id: e.id, entry: entryData });
        else await api('POST', 'add', { entry: entryData });
        done(isEdit ? 'แก้ไขแล้ว ✓' : 'บันทึกแล้ว ✓');
      } catch (err) { toast(err.message); $('#fSave').disabled = false; }
    };
  };
  draw();
  $('#sheetBg').classList.add('open'); sheet.classList.add('open');
  if (!isEdit) setTimeout(() => $('#fAmount')?.focus(), 350);
}
function closeSheet() { $('#sheet').classList.remove('open'); $('#sheetBg').classList.remove('open'); }
function done(msg) { closeSheet(); clearCache(); toast(msg); render(); }

// ---------- navigation ----------
function go(page) { state.page = page; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function bindChrome() {
  document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => go(b.dataset.page));
  document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { state.mode = b.dataset.mode; render(); });
  $('#prev').onclick = () => { state.date = shiftDate(state.date, state.mode, -1); render(); };
  $('#next').onclick = () => { state.date = shiftDate(state.date, state.mode, 1); render(); };
  $('#addBtn').onclick = () => openSheet(null);
  $('#sheetBg').onclick = closeSheet;
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeSheet(); });
}

function applyProfile(p) {
  state.categories = p.categories; state.custom = p.customCategories || []; state.keywords = p.keywords || [];
}

// ---------- start ----------
function loadScript(src) {
  return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
}

async function boot() {
  bindChrome();
  try {
    if (!DEMO) {
      const { liffId } = await fetch('/api/data?action=config').then(r => r.json());
      await loadScript('https://static.line-scdn.net/liff/edge/2/sdk.js');
      await window.liff.init({ liffId });
      if (!window.liff.isLoggedIn()) { window.liff.login({ redirectUri: location.href }); return; }
      window.liff.getProfile().then(pr => {
        $('#hello').textContent = `สวัสดี ${pr.displayName}`;
        if (pr.pictureUrl) { $('#avatar').src = pr.pictureUrl; $('#avatar').hidden = false; }
      }).catch(() => {});
    } else {
      $('#hello').textContent = 'สวัสดี (โหมดทดลอง)';
    }
    applyProfile(await api('GET', 'profile'));
    await render();
  } catch (e) {
    console.error(e);
    $('#view').innerHTML = `<div class="card empty">เริ่มระบบไม่สำเร็จ<br>${esc(e.message)}</div>`;
  } finally {
    $('#loader').classList.add('hide');
  }
}
boot();

// ---------- โหมดทดลอง (?demo=1) ไม่ต้องต่อ LINE/Firebase ----------
function demoApi(method, action, body) {
  const db = demoApi.db ||= (() => {
    const cats = [
      ['job', 'income', '🛵', 'รายได้จากการวิ่งงาน'], ['tip', 'income', '💝', 'ทิป'], ['bonus', 'income', '🎁', 'โบนัส'], ['inc_other', 'income', '💰', 'รายรับอื่นๆ'],
      ['fuel', 'expense', '⛽', 'ค่าน้ำมัน'], ['food', 'expense', '🍚', 'ค่ากิน'], ['phone', 'expense', '📱', 'ค่าเน็ต/ค่าโทร'], ['repair', 'expense', '🔧', 'ค่าซ่อมรถ'],
      ['loan', 'expense', '🏍️', 'ค่าผ่อนรถ'], ['rent', 'expense', '🏠', 'ค่าที่พัก'], ['exp_other', 'expense', '🧾', 'รายจ่ายอื่นๆ'],
    ].map(([id, type, icon, name]) => ({ id, type, icon, name }));
    const entries = [];
    const t = todayISO();
    for (let i = 0; i < 70; i++) {
      const d = new Date(t); d.setDate(d.getDate() - i); const date = d.toISOString().slice(0, 10);
      entries.push({ type: 'income', category: 'job', amount: 700 + ((i * 137) % 600), note: 'วิ่งงาน', date });
      if (i % 3 === 0) entries.push({ type: 'income', category: 'tip', amount: 20 + (i % 5) * 10, note: 'ทิป', date });
      entries.push({ type: 'expense', category: 'fuel', amount: 60 + (i % 4) * 20, note: 'เติมน้ำมัน', date });
      entries.push({ type: 'expense', category: 'food', amount: 50 + (i % 3) * 25, note: 'ข้าวมันไก่', date });
      if (i % 30 === 5) entries.push({ type: 'expense', category: 'loan', amount: 3200, note: 'งวดรถ', date });
      if (i % 30 === 1) entries.push({ type: 'expense', category: 'rent', amount: 3500, note: 'ค่าห้อง', date });
    }
    entries.forEach((e, i) => { e.id = 'd' + i; e.ts = Date.now() - i * 1000; });
    return { cats, custom: [], keywords: [{ word: 'นมลูก', category: 'exp_other' }], entries };
  })();
  const profile = () => ({ categories: [...db.cats, ...db.custom.map(c => ({ ...c, custom: true }))], customCategories: db.custom, keywords: db.keywords });
  const wait = v => new Promise(r => setTimeout(() => r(structuredClone(v)), 250));
  if (method === 'GET') {
    if (action === 'profile') return wait(profile());
    if (action === 'entries') return wait({ entries: db.entries.filter(e => e.date >= body.from && e.date <= body.to).sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts) });
    if (action === 'year') return wait({ months: Array.from({ length: 12 }, (_, m) => {
      const ym = `${body.year}-${String(m + 1).padStart(2, '0')}`, inc = {}, exp = {};
      db.entries.filter(e => e.date.startsWith(ym)).forEach(e => { const t = e.type === 'income' ? inc : exp; t[e.category] = (t[e.category] || 0) + e.amount; });
      return { inc, exp };
    }) });
  }
  if (action === 'add') db.entries.push({ ...body.entry, id: 'n' + Date.now(), ts: Date.now() });
  if (action === 'update') Object.assign(db.entries.find(e => e.id === body.id), body.entry);
  if (action === 'delete') db.entries = db.entries.filter(e => e.id !== body.id);
  if (action === 'profile') { if (body.categories) db.custom = body.categories; if (body.keywords) db.keywords = body.keywords; return wait(profile()); }
  return wait({ ok: true });
}
