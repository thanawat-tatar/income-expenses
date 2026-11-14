// ===== สมุดรายรับรายจ่าย (เว็บแอป) =====
const $ = s => document.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const TITLES = { home: 'ภาพรวม', list: 'รายการ', settings: 'ตั้งค่า', debts: '📒 สมุดหนี้', admin: 'หลังบ้าน 👑' };
const EMOJIS = '🏷️ 🍼 👶 🎓 📚 🏥 💊 🐶 🐱 🎮 🎬 🎁 💄 👕 👟 🛒 🧴 🧺 🚌 🚕 🅿️ 🛵 ⛽ 🔧 📱 💡 💧 🏠 💳 🏦 💸 💼 🛍️ ☕ 🍜 🍺 🚬 🙏 🎉 ✈️ 🏋️ 💇 🧾 💰'.split(' ');
const LIFF_SDK = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
const ICON_SUN = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const ICON_MOON = '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const ICON_TRASH = '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg>';

// ---------- น้องหมูออมสิน (มาสคอต วาดเอง ไม่ใช้ตัวการ์ตูนของใคร) ----------
// mood: happy | sad | sleep | wink | wow
function pig(mood = 'happy', cls = '') {
  const eye = (x, flip) => mood === 'sleep'
    ? `<path d="M${x - 9} 80 q9 8 18 0" stroke="#3B1530" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    : mood === 'wink' && flip
      ? `<path d="M${x - 9} 82 q9 -9 18 0" stroke="#3B1530" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      : `<g class="eye"><ellipse cx="${x}" cy="80" rx="8.5" ry="${mood === 'wow' ? 11 : 10}" fill="#3B1530"/><circle cx="${x + 3}" cy="75.5" r="3.4" fill="#fff"/><circle cx="${x - 3}" cy="85" r="1.7" fill="#fff"/></g>`;
  const brows = mood === 'sad' ? '<path d="M62 64 l18 6M138 64 l-18 6" stroke="#B02A63" stroke-width="3" stroke-linecap="round"/>'
    : mood === 'angry' ? '<path d="M60 62 l22 10M140 62 l-22 10" stroke="#8E1B4E" stroke-width="4.5" stroke-linecap="round"/><g transform="translate(42 30)"><g class="anger"><path d="M-8-2h5v-5M2-7v5h5M7 2h-5v5M-3 7v-5h-5" stroke="#E2307A" stroke-width="3.2" fill="none" stroke-linecap="round"/></g></g>' : '';
  const tear = mood === 'sad' ? '<path class="tear" d="M134 92 q-5 9 0 12 q5 -3 0 -12z" fill="#8FD3FF"/>' : '';
  const mouth = mood === 'sad'
    ? '<path d="M91 123 q9 -8 18 0" stroke="#3B1530" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
    : mood === 'angry'
      ? '<path d="M92 124 q4 -5 8 0 q4 5 8 0" stroke="#3B1530" stroke-width="3" fill="none" stroke-linecap="round"/>'
    : mood === 'sleep'
      ? '<ellipse cx="100" cy="121" rx="4" ry="3" fill="#B02A63"/>'
      : mood === 'wow'
        ? '<ellipse cx="100" cy="122" rx="7" ry="8" fill="#B02A63"/><ellipse cx="100" cy="126" rx="4" ry="3" fill="#FF8FB8"/>'
        : '<path d="M90 117 q10 11 20 0z" fill="#B02A63" stroke="#3B1530" stroke-width="2.6" stroke-linejoin="round"/><path d="M95 121 q5 4 10 0" fill="#FF8FB8"/>';
  return `<svg class="pig ${cls}" viewBox="0 0 200 200" aria-hidden="true">
    <ellipse class="pig-shadow" cx="100" cy="193" rx="58" ry="7" fill="#D93A80" opacity=".18"/>
    <path class="tail" d="M164 128 q16 -4 13 -17 q-3 -10 -12 -3 q-7 7 5 10" fill="none" stroke="#F27AAE" stroke-width="5.5" stroke-linecap="round"/>
    <rect x="60" y="158" width="26" height="32" rx="12" fill="url(#pgLeg)"/><rect x="114" y="158" width="26" height="32" rx="12" fill="url(#pgLeg)"/>
    <path d="M60 181h26v3a6 6 0 0 1-6 6h-14a6 6 0 0 1-6-6z M114 181h26v3a6 6 0 0 1-6 6h-14a6 6 0 0 1-6-6z" fill="#C94683"/>
    <ellipse cx="100" cy="140" rx="70" ry="46" fill="url(#pgBody)"/>
    <ellipse cx="74" cy="126" rx="24" ry="10" fill="#fff" opacity=".35" transform="rotate(-10 74 126)"/>
    <rect x="128" y="104" width="22" height="6" rx="3" fill="#C2336F" opacity=".75" transform="rotate(14 139 107)"/>
    <g class="ear ear-l"><path d="M50 56 Q42 12 82 30 Q72 50 50 56Z" fill="#F27AAE"/><path d="M57 49 Q53 25 74 33 Q66 45 57 49Z" fill="#FFCFE3"/></g>
    <g class="ear ear-r"><path d="M150 56 Q158 12 118 30 Q128 50 150 56Z" fill="#F27AAE"/><path d="M143 49 Q147 25 126 33 Q134 45 143 49Z" fill="#FFCFE3"/></g>
    <ellipse cx="100" cy="86" rx="60" ry="49" fill="url(#pgHead)"/>
    <ellipse cx="78" cy="56" rx="24" ry="9" fill="#fff" opacity=".5" transform="rotate(-14 78 56)"/>
    <g class="bow" transform="translate(142 40) rotate(18)">
      <path d="M0 0C-10-15-28-11-26 2C-24 15-8 11 0 0Z" fill="url(#pgBow)"/>
      <path d="M0 0C10-15 28-11 26 2C24 15 8 11 0 0Z" fill="url(#pgBow)"/>
      <path d="M-3 3l-8 16 7-4 3 7 2-18zM3 3l8 16-7-4-3 7-2-18z" fill="#D92E76"/>
      <circle r="6.5" fill="#E8357F"/><circle cx="-2" cy="-2.5" r="2.2" fill="#fff" opacity=".8"/>
      <path d="M-19-5q5-5 10-2M19-5q-5-5-10-2" stroke="#fff" stroke-width="2" opacity=".55" fill="none" stroke-linecap="round"/>
    </g>
    ${brows}${eye(74)}${eye(126, true)}${tear}
    <ellipse cx="56" cy="102" rx="15" ry="9" fill="url(#pgBlush)"/><ellipse cx="144" cy="102" rx="15" ry="9" fill="url(#pgBlush)"/>
    <ellipse cx="100" cy="103" rx="23" ry="16" fill="url(#pgSnout)"/>
    <ellipse cx="93" cy="96" rx="9" ry="3.5" fill="#fff" opacity=".55"/>
    <ellipse cx="92" cy="104" rx="4.2" ry="6.2" fill="#A3245B"/><ellipse cx="108" cy="104" rx="4.2" ry="6.2" fill="#A3245B"/>
    ${mouth}
    <g class="hooves"><ellipse cx="74" cy="160" rx="13" ry="10" fill="url(#pgLeg)"/><ellipse cx="126" cy="160" rx="13" ry="10" fill="url(#pgLeg)"/>
      <path d="M74 152v8M126 152v8" stroke="#C94683" stroke-width="2" stroke-linecap="round"/></g>
    ${mood === 'sleep' ? '<text x="150" y="40" font-size="22" font-weight="700" fill="#D93A80" class="zz">z</text><text x="166" y="22" font-size="15" font-weight="700" fill="#D93A80" class="zz z2">z</text>' : ''}
  </svg>`;
}

// หมูโผล่จากหลังการ์ด เอากีบเกาะขอบไว้
function pigPeek(mood, small, extra = '') {
  return `<button class="peek-body ${small ? 'small' : ''} ${extra}" data-mood="${mood}" aria-label="น้องหมู">${pig(mood)}</button>
    <div class="peek-paws ${small ? 'small' : ''} ${extra}"><svg viewBox="0 0 200 40" aria-hidden="true">
      <ellipse cx="70" cy="18" rx="17" ry="13" fill="url(#pgLeg)"/><ellipse cx="130" cy="18" rx="17" ry="13" fill="url(#pgLeg)"/>
      <path d="M70 8v12M130 8v12" stroke="#C94683" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="64" cy="12" rx="5" ry="3" fill="#fff" opacity=".5"/><ellipse cx="124" cy="12" rx="5" ry="3" fill="#fff" opacity=".5"/></svg></div>`;
}

// ---------- คำพูดน้องหมู (ให้กำลังใจ ชวนจดต่อ) ----------
const PIG_LINES = {
  // กำไร: ชม
  happy: ['วันนี้เก่งมาก! 💖', 'กำไรแล้ว เย้~ 🎉', 'ออมเก่งที่สุดในโลก 🐷', 'ป้อนเหรียญอีกนะ 🪙', 'จดครบแบบนี้ รวยแน่ ✨',
    'หนูภูมิใจในตัวเธอ 🥹', 'เงินเข้า เงินเก็บ ปังมาก 💰', 'แบบนี้ต้องให้รางวัลตัวเองแล้ว 🍰', 'คนเก่งของหนู 💕', 'พรุ่งนี้กำไรอีกนะ ✌️'],
  // ขาดทุน: ให้กำลังใจ
  sad: ['ไม่เป็นไรนะ พรุ่งนี้เอาคืน 💪', 'ใจเย็นๆ ค่อยๆ ออม 🌷', 'หนูอยู่ข้างๆ นะ 🫶', 'ลองดูหมวดไหนจ่ายเยอะสุด 👀', 'ขาดทุนนิดหน่อย ไม่เป็นไร 🥺',
    'พรุ่งนี้ลดของไม่จำเป็นกันนะ ✂️', 'จดไว้แบบนี้ เดี๋ยวก็รู้ว่าเงินรั่วตรงไหน 🔍', 'กอดๆ 🤗 สู้ต่อนะ', 'วันนี้เหนื่อยไหม พักบ้างนะ 💗', 'เก็บทีละนิด เดี๋ยวก็กลับมาบวก 📈'],
  // ยังไม่จด (0 บาท): งอน ชวนมาจด
  angry: ['ยังไม่จดเลยนะ! 😤', 'หนูหิว… ป้อนรายการหน่อย 🪙', 'วันนี้ใช้เงินไปกับอะไร บอกหนูสิ 😠', 'ไม่จด = เงินรั่วนะ! 💸', 'พิมพ์ในแชท LINE แค่ "ข้าว 50" ก็พอ ✍️',
    'หนูรออยู่นะ… 🙄', 'จดวันละนิด รวยวันละหน่อย 💖', 'กดปุ่ม + ด้านล่างเลย! 👇', 'อย่าปล่อยหนูว่างเปล่าสิ 🥺', 'จดเดี๋ยวนี้ ไม่งั้นงอนจริงนะ 😾'],
};
// สุ่มแบบไม่ซ้ำ: ครบ 10 ประโยคก่อนค่อยวนใหม่
const pigQueue = {};
let lastLine = '';
function pigSay(mood) {
  const pool = PIG_LINES[mood] || PIG_LINES.happy;
  if (!pigQueue[mood]?.length) {
    const q = [...pool];
    if (state.streak > 1 && mood !== 'angry') q.push(`จดติดกัน ${state.streak} วันแล้ว 🔥`);
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
    if (q[q.length - 1] === lastLine) q.unshift(q.pop());
    pigQueue[mood] = q;
  }
  lastLine = pigQueue[mood].pop();
  return lastLine;
}
function burst(x, y, emojis = ['💖', '✨', '🪙', '💕', '🌸']) {
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('span');
    s.className = 'particle';
    s.textContent = emojis[i % emojis.length];
    const a = (Math.PI * 2 * i) / 10 + Math.random() * .5, r = 50 + Math.random() * 50;
    s.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r - 40}px;--r:${Math.random() * 120 - 60}deg`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
}
// ---------- ลูกเล่นเซอร์ไพรส์ (นานๆ โผล่ที · ไม่กวนตอนรีบ · ปิดได้ในตั้งค่า) ----------
const FUN_CHANCE = 0.1;      // โผล่ประมาณ 1 ใน 10 ครั้ง
const RUSH_MS = 5000;        // บันทึกติดกันภายใน 5 วิ = กำลังรีบ → ข้ามลูกเล่นทั้งหมด
let lastSaveAt = 0;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const funOn = () => store.get('fun') !== false && !reducedMotion();
const rushing = () => Date.now() - lastSaveAt < RUSH_MS;
// ?fun=1 = โผล่ทุกครั้ง (ไว้ทดสอบ)
const lucky = () => funOn() && !rushing() && (params.get('fun') === '1' || Math.random() < FUN_CHANCE);

// น้องหมูจิ๋วชะโงกจากหลังปุ่ม แล้วผลุบกลับ (จ๊ะเอ๋)
function peekaboo(el) {
  if (!el || $('.boo')) return;
  const r = el.getBoundingClientRect();
  const b = document.createElement('span');
  b.className = 'boo'; b.innerHTML = pig('wink');
  b.style.cssText = `left:${Math.round(r.right - 150)}px;top:${Math.round(r.top - 43)}px`;
  document.body.appendChild(b);
  const hide = () => { if (b.classList.contains('out')) return; b.classList.add('out'); setTimeout(() => b.remove(), 400); };
  setTimeout(hide, 2600);
  addEventListener('pointerdown', hide, { once: true }); // แตะตรงไหนก็ผลุบกลับ ไม่ขวางการใช้งาน
}
// ดาวกระจายพุ่งจากปุ่ม 0.5 วินาที
function confettiPop(el) {
  if (!el) return;
  const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const bits = ['✦', '★', '♥', '✧', '●'];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    s.textContent = bits[i % bits.length];
    const a = -Math.PI * (0.1 + 0.8 * (i / 13)), d = 60 + Math.random() * 70;
    s.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--r:${Math.random() * 360}deg;--h:${Math.round(Math.random() * 80 - 40)}deg`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 520);
  }
}
// น้องหมูนุ่มเด้ง: กดแล้วยุบ ปล่อยแล้วเด้งคืน
function bindSquish(root) {
  root.querySelectorAll('.peek-body, .corner-pig').forEach(p => {
    p.onpointerdown = () => { if (funOn()) p.classList.add('squish'); };
    p.onpointerup = p.onpointerleave = p.onpointercancel = () => p.classList.remove('squish');
  });
}

// ดึงหน้าจอลงเพื่อรีเฟรช: ดึงหางน้องหมูให้ยืด ปล่อยแล้วเด้งกลับ (เฉพาะจอสัมผัส · ไม่ขวางการเลื่อนปกติ)
function bindPull() {
  if (!('ontouchstart' in window)) return;
  const el = document.createElement('div');
  el.className = 'pull'; el.innerHTML = `<i class="pull-tail"></i><span class="pull-pig">${pig('wow')}</span><b></b>`;
  document.body.appendChild(el);
  const NEED = 80;
  let y0 = null, dist = 0;
  const scrollTop = () => document.scrollingElement.scrollTop;
  const ok = () => state.ready && !['settings', 'debts', 'admin'].includes(state.page) && !$('#sheet').classList.contains('open') && !$('.picker');
  addEventListener('touchstart', e => { y0 = e.touches.length === 1 && scrollTop() <= 0 && ok() && !e.target.closest?.('.peek-body, .perch, .lover') ? e.touches[0].clientY : null; dist = 0; }, { passive: true });
  addEventListener('touchmove', e => {
    if (y0 === null) return;
    dist = e.touches[0].clientY - y0;
    if (dist <= 6 || scrollTop() > 0) { el.classList.remove('show'); if (scrollTop() > 0) y0 = null; return; }
    const d = Math.min(130, dist * .5); // ยิ่งดึงยิ่งหนืด
    el.classList.add('show'); el.classList.toggle('ready', dist * .5 >= NEED);
    el.style.setProperty('--d', d + 'px');
    el.querySelector('b').textContent = dist * .5 >= NEED ? 'ปล่อยเลย!' : 'ดึงหางอีกนิด…';
  }, { passive: true });
  const end = () => {
    if (y0 === null) return;
    const go = dist * .5 >= NEED;
    y0 = null;
    el.classList.remove('ready'); el.classList.add('snap'); el.style.setProperty('--d', '0px');
    setTimeout(() => el.classList.remove('show', 'snap'), 420);
    if (go) { navigator.vibrate?.(10); clearCache(); render(true).then(() => toast('อัปเดตแล้ว ✨')); }
  };
  addEventListener('touchend', end, { passive: true });
  addEventListener('touchcancel', end, { passive: true });
}

// ---------- เอฟเฟกต์เพิ่ม ----------
// น้องหมูตัวเล็กเกาะขอบการ์ด (pose: hang = นั่งห้อยขา · eyes = โผล่แค่ตา · lie = นอนพาด)
const perch = (mood, pose) => (isUs() ? '' : `<span class="perch ${pose}" data-mood="${mood}" aria-hidden="true">${pig(mood)}</span>`);

// 💑 รูปคู่รักใหญ่ๆ กลางการ์ด: เรา (ซ้าย) ❤ แฟน (ขวา) · หัวใจเต้น หัวใจลอย วงแสงหมุน · แตะแล้วหัวใจระเบิด
const initial = name => esc([...String(name || '?').trim()][0] || '?');
const loverFace = (pic, name, cls) => `<button class="lover ${cls}" aria-label="${esc(name)}"><span class="lover-ring"></span>${pic
  ? `<img src="${esc(pic)}" alt="" referrerpolicy="no-referrer" data-initial="${initial(name)}">`
  : `<b>${initial(name)}</b>`}<small>${esc(name)}</small></button>`;
function loversHTML(small) {
  const me = store.get('user') || {};
  return `<div class="lovers ${small ? 'small' : ''}">
    ${loverFace(me.pic, 'ฉัน', 'me')}
    <i class="lheart">❤</i>
    ${loverFace(state.couple?.pic, state.couple?.name || 'แฟน', 'you')}
    <span class="floaty f1">💕</span><span class="floaty f2">💖</span><span class="floaty f3">💗</span><span class="floaty f4">✨</span>
  </div>`;
}

// แตะแล้ววิ้งเล็กๆ
function sparkle(el) {
  if (!funOn() || !el) return;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.className = 'twink'; s.textContent = '✦';
    s.style.cssText = `left:${r.left + r.width * (.2 + .3 * i)}px;top:${r.top + 4}px;--dx:${(i - 1) * 14}px`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 500);
  }
  navigator.vibrate?.(6);
}

// เมนูล่าง: วงกลมกระจกชมพูเลื่อนตามแบบสปริง (เหมือน iPhone)
function moveBlob(instant) {
  const nav = $('#nav'), act = $('.nav-item.active', nav);
  let blob = $('.nav-blob', nav);
  if (!blob) { blob = document.createElement('i'); blob.className = 'nav-blob'; nav.prepend(blob); instant = true; }
  if (!act) { blob.style.opacity = 0; return; }
  const r = { left: act.offsetLeft, top: act.offsetTop, width: act.offsetWidth, height: act.offsetHeight }; // ไม่ขึ้นกับ transform
  const wide = matchMedia('(min-width: 700px)').matches;
  const w = wide ? r.width : Math.min(r.width - 6, 100), h = wide ? r.height : Math.min(r.height - 6, 56); // แคปซูลกระจกใหญ่แบบ iPhone
  const x = r.left + (r.width - w) / 2, y = r.top + (r.height - h) / 2;
  const moved = blob.dataset.x && Math.abs(Number(blob.dataset.x) - x) > 2;
  blob.classList.toggle('instant', !!instant);
  blob.style.cssText = `opacity:1;width:${w}px;height:${h}px;transform:translate(${x}px,${y}px)`;
  blob.dataset.x = x; blob.dataset.y = y;
  if (moved && !instant && funOn()) { blob.classList.remove('go'); void blob.offsetWidth; blob.classList.add('go'); }
}

// เมนูล่างแบบ iPhone: กดค้างแล้วลากนิ้วไปมาได้ กระจกไหลตามนิ้ว ปล่อยตรงไหนไปตรงนั้น (ปล่อยบน ➕ = เพิ่มรายการ)
function bindNavDrag() {
  const nav = $('#nav');
  let s = null, swallow = false;
  const targets = () => $$('.nav-item, .nav-add', nav);
  const nearest = (x, y) => targets().reduce((best, el) => {
    const r = el.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
    return !best || d < best.d ? { el, d } : best;
  }, null)?.el;
  // หลังลาก ไม่ให้นับเป็นการแตะ
  nav.addEventListener('click', ev => { if (swallow) { swallow = false; ev.stopPropagation(); ev.preventDefault(); } }, true);
  nav.addEventListener('pointerdown', e => {
    if (!e.target.closest('.nav-item, .nav-add') || e.button > 0) return;
    document.body.classList.remove('nav-min'); // แตะเมนูตอนย่ออยู่ → ขยายก่อน
    s = { x: e.clientX, y: e.clientY, id: e.pointerId, drag: false };
  });
  addEventListener('pointermove', e => {
    if (!s || e.pointerId !== s.id) return;
    if (!s.drag && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 10) return;
    const blob = $('.nav-blob', nav);
    if (!blob) return;
    if (!s.drag) { s.drag = true; nav.classList.add('dragging'); blob.classList.add('held'); navigator.vibrate?.(8); try { nav.setPointerCapture(e.pointerId); } catch {} }
    const n = nav.getBoundingClientRect(), w = blob.offsetWidth, h = blob.offsetHeight;
    const wide = matchMedia('(min-width: 700px)').matches;
    const x = wide ? Number(blob.dataset.x) : Math.max(0, Math.min(n.width - w, e.clientX - n.left - w / 2));
    const y = wide ? Math.max(0, Math.min(n.height - h, e.clientY - n.top - h / 2)) : Number(blob.dataset.y);
    blob.style.transform = `translate(${x}px, ${y}px)`;
    const near = nearest(e.clientX, e.clientY);
    targets().forEach(t => t.classList.toggle('hover', t === near));
  });
  const end = e => {
    if (!s || e.pointerId !== s.id) return;
    const was = s; s = null;
    if (!was.drag) return;
    swallow = true; setTimeout(() => { swallow = false; }, 400);
    nav.classList.remove('dragging');
    $('.nav-blob', nav)?.classList.remove('held');
    targets().forEach(t => t.classList.remove('hover'));
    const el = nearest(e.clientX, e.clientY);
    navigator.vibrate?.(10);
    if (el?.classList.contains('nav-add')) { moveBlob(); openEntry(null); }
    else if (el?.dataset.page && el.dataset.page !== state.page) go(el.dataset.page);
    else moveBlob();
  };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);
}

// ลากน้องหมูได้: ยืดตามนิ้ว ปล่อยแล้วเด้งดึ๋งกลับที่เดิม
function bindDrag() {
  let el = null, x0 = 0, y0 = 0, moved = false;
  addEventListener('pointerdown', e => {
    const t = e.target.closest?.('.peek-body, .perch, .lover');
    if (!t || e.button > 0) return;
    el = t; x0 = e.clientX; y0 = e.clientY; moved = false;
    el.classList.remove('spring');
    try { el.setPointerCapture(e.pointerId); } catch {}
  });
  addEventListener('pointermove', e => {
    if (!el) return;
    const dx = e.clientX - x0, dy = e.clientY - y0, d = Math.hypot(dx, dy);
    if (!moved && d < 8) return;
    if (!moved) { moved = true; el.classList.add('held'); navigator.vibrate?.(8); }
    const k = Math.min(d, 220), pull = k / d || 0; // ยิ่งลากไกลยิ่งหนืด
    const tx = dx * pull * .8, ty = dy * pull * .8, a = Math.atan2(dy, dx);
    const st = 1 + Math.min(.45, k / 450);         // ยืดตามทิศที่ลาก
    el.style.transform = `translate(${tx}px, ${ty}px) rotate(${a}rad) scale(${st}, ${1 / st}) rotate(${-a}rad)`;
  });
  const up = () => {
    if (!el) return;
    const t = el; el = null;
    if (!moved) return;
    t.dataset.dragged = '1'; setTimeout(() => delete t.dataset.dragged, 50);
    t.classList.remove('held'); t.classList.add('spring'); t.style.transform = '';
    navigator.vibrate?.(12);
    setTimeout(() => t.classList.remove('spring'), 900);
  };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
}


// จดติดกันครบ 3 / 7 / 14 / 30 / 60 / 100 วัน → ฉลองใหญ่ครั้งเดียว (แบบ Duolingo)
function celebrateStreak() {
  const n = state.streak;
  if (!funOn() || isUs() || state.page !== 'home' || state.mode !== 'day' || state.date !== todayISO()) return;
  if (![3, 7, 14, 30, 60, 100].includes(n) || (store.get('cel') || 0) >= n) return;
  store.set('cel', n);
  const hero = $('.hero');
  if (!hero) return;
  hero.classList.add('glow');
  setTimeout(() => {
    const r = hero.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + 40, ['🔥', '🎉', '✨', '🪙', '💖']);
    setTimeout(() => burst(r.left + r.width * .25, r.top + 60, ['🎉', '✨', '🔥']), 220);
    setTimeout(() => burst(r.left + r.width * .75, r.top + 60, ['🎉', '💖', '🔥']), 420);
    const p = $('.peek-body');
    if (p) { bindPig.greeted = true; showBubble(p, `จดติดกัน ${n} วันแล้ว! เก่งที่สุด 🎉`); }
    navigator.vibrate?.([20, 40, 20]);
  }, 700);
}

function showBubble(anchor, text) {
  const wrap = anchor.closest('.hero-wrap') || anchor.parentElement;
  wrap.querySelector('.bubble')?.remove();
  const b = document.createElement('div');
  b.className = 'bubble' + (anchor.classList.contains('small') ? ' small' : '');
  b.textContent = text;
  wrap.appendChild(b);
  clearTimeout(showBubble.t);
  showBubble.t = setTimeout(() => b.classList.add('out'), 2600);
  setTimeout(() => b.remove(), 3000);
}
function bindPig(root) {
  bindSquish(root);
  root.querySelectorAll('.lover').forEach(l => {
    const img = l.querySelector('img');
    if (img) img.onerror = () => { const b = document.createElement('b'); b.textContent = img.dataset.initial; img.replaceWith(b); }; // รูปโหลดไม่ได้ → ตัวอักษรแรก
    l.onclick = () => {
      if (l.dataset.dragged) { delete l.dataset.dragged; return; }
      l.classList.remove('love-pop'); void l.offsetWidth; l.classList.add('love-pop');
      const r = l.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, ['💖', '💕', '💗', '❤️', '✨']);
      navigator.vibrate?.(12);
    };
  });
  root.querySelectorAll('.peek-body').forEach(p => {
    p.onclick = () => {
      if (p.dataset.dragged) { delete p.dataset.dragged; return; }
      p.classList.remove('boing'); void p.offsetWidth; p.classList.add('boing');
      const r = p.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height * .45);
      showBubble(p, pigSay(p.dataset.mood));
      navigator.vibrate?.(12);
    };
  });
  // ทักทายครั้งเดียวตอนเปิดหน้า
  const first = root.querySelector('.peek-body');
  if (first && !bindPig.greeted) {
    bindPig.greeted = true;
    const mood = first.dataset.mood;
    setTimeout(() => showBubble(first, state.streak > 1 && mood !== 'angry' ? `จดติดกัน ${state.streak} วันแล้ว 🔥` : pigSay(mood)), 900);
  }
}

const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');

// จำข้อมูลไว้ในเครื่อง เพื่อเปิดครั้งต่อไปขึ้นทันที
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('ie:' + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('ie:' + k, JSON.stringify(v)); } catch {} },
};

const state = {
  page: ['home', 'list', 'settings', 'debts', 'admin'].includes(params.get('page')) ? params.get('page') : 'home',
  mode: 'day',
  date: todayISO(),
  categories: [], custom: [], keywords: [],
  monthCache: {}, yearCache: {},
  newCat: { type: 'expense', icon: '🏷️' },
  highlight: null, ready: false,
  debts: null, debtOpen: null, // 📒 สมุดหนี้ (ซ่อนในตั้งค่า)
  couple: null,   // 💑 { name, pic, since } ถ้าจับคู่แล้ว (คนโสด = null ไม่เห็นอะไรเพิ่ม)
  scope: 'me',    // 'me' = ของฉัน · 'us' = ของเรา
  usCats: {},     // หมวดที่แฟนสร้างเอง (ใช้แสดงผลอย่างเดียว)
};
const isUs = () => state.scope === 'us' && !!state.couple;
// ตั้งสถานะคู่ (จำไว้ในเครื่องแค่ชื่อ+รูป ไว้โชว์ปุ่มทันที · ไม่จำรายการของแฟน)
function setCouple(c) {
  const old = state.couple;
  state.couple = c ? { ...c, pic: c.pic || (old && old.name === c.name ? old.pic : '') } : null; // รูปโหลดไม่ทัน → ใช้รูปเดิม
  store.set('couple', state.couple);
  if (!state.couple) { // เลิกคู่แล้ว → ล้างข้อมูลคู่รักที่จำไว้ในเครื่องทิ้ง
    state.scope = 'me';
    try { Object.keys(localStorage).filter(k => k.startsWith('ie:us')).forEach(k => localStorage.removeItem(k)); } catch {}
    for (const k of Object.keys(state.monthCache)) if (k.startsWith('us:')) delete state.monthCache[k];
    for (const k of Object.keys(state.yearCache)) if (k.startsWith('us:')) delete state.yearCache[k];
  }
}
let liffReady = Promise.resolve();

// ---------- utils ----------
function todayISO() {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
const fmt = n => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// หมวดเก่าที่ยุบรวมแล้ว (ข้อมูลที่จำไว้ในเครื่องอาจยังใช้รหัสเดิม)
const ALIAS = { fuel: 'travel', repair: 'travel', phone: 'rent', care: 'health', tip: 'bonus' };
const catById = id => state.categories.find(c => c.id === (ALIAS[id] || id)) || state.usCats[id] || { id, name: 'อื่นๆ', icon: '🏷️', type: 'expense' };
const ymOf = iso => iso.slice(0, 7);
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
// แจ้งเตือนแบบ Dynamic Island: เม็ดยาสีดำด้านบน ยืดออกแบบสปริงตามความยาวข้อความ แล้วหดกลับ · แตะเพื่อปิด
function toast(msg) {
  let isl = $('#island');
  if (!isl) {
    isl = document.createElement('div');
    isl.id = 'island'; isl.setAttribute('role', 'status'); isl.setAttribute('aria-live', 'polite');
    isl.innerHTML = '<span class="isl-ico"></span><span class="isl-txt"></span><span class="isl-measure" aria-hidden="true"></span>';
    isl.onclick = () => isl.classList.remove('show');
    document.body.appendChild(isl);
  }
  const text = String(msg);
  const m = text.match(/^(.*?)\s*([\u{1F300}-\u{1FAFF}\u2700-\u27BF\u2600-\u26FF✓✨🗑💕\uFE0F]+)\s*$/u); // อีโมจิท้ายข้อความ → ไอคอนด้านซ้าย
  const bad = /ไม่สำเร็จ|ผิดพลาด|error/i.test(text);
  const icon = m ? m[2] : bad ? '⚠️' : '✓';
  const body = m ? m[1] : text;
  isl.querySelector('.isl-ico').textContent = icon;
  isl.querySelector('.isl-txt').textContent = body;
  const meas = isl.querySelector('.isl-measure');
  meas.textContent = body;
  const w = Math.min(innerWidth - 32, Math.max(150, meas.offsetWidth + 64));
  isl.classList.toggle('bad', bad);
  isl.style.setProperty('--w', w + 'px');
  isl.classList.remove('show'); void isl.offsetWidth; isl.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => isl.classList.remove('show'), bad ? 3200 : 1900);
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
// บัตรผ่านที่ระบบออกให้ (เปิดเว็บครั้งถัดไปไม่ต้องรอ LINE)
const session = () => { const x = store.get('sess'); return x && x.exp > Date.now() + 60000 ? x.token : null; };
async function authHeader(fresh) {
  const t = !fresh && session();
  if (t) return `Session ${t}`;
  await liffReady;
  if (!window.liff.isLoggedIn()) throw new Error('login');
  return `Bearer ${window.liff.getIDToken()}`;
}
async function call(url, method, body, retry = true) {
  const auth = await authHeader(!retry);
  const res = await fetch(url, {
    method,
    headers: { Authorization: auth, ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }) },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    if (auth.startsWith('Session') && retry) { store.set('sess', null); return call(url, method, body, false); } // บัตรหมดอายุ → ใช้ LINE แทน
    window.liff.logout(); window.liff.login({ redirectUri: location.href }); throw new Error('login');
  }
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || 'error');
  if (j.session) store.set('sess', j.session);
  return j;
}
async function api(method, action, body) {
  if (DEMO) return demoApi(method, action, body);
  const isGet = method === 'GET';
  const qs = isGet ? '?' + new URLSearchParams({ action, ...(body || {}) }) : '';
  return call('/api/data' + qs, method, isGet ? undefined : { action, ...body });
}

function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  return { from: `${ym}-01`, to: `${ym}-${lastDay(y, m)}` };
}
function cacheMonth(ym, entries) {
  if (ym === ymOf(todayISO())) store.set('month', { ym, entries });
}
// 💑 ของเรา: ขอจากเซิร์ฟเวอร์ทุกครั้ง ไม่เก็บลงเครื่อง (เลิกคู่แล้วต้องไม่เหลือข้อมูลของอีกฝ่าย)
function usFail(e) {
  if (e.message === 'no_couple') { setCouple(null); clearCache(); toast('โหมดคู่รักถูกยกเลิกแล้ว'); render(); }
}
function addUsCats(list) { for (const c of list || []) state.usCats[c.id] = c; }
function getMonth(ym, us = isUs()) {
  if (us) {
    const k = 'us:' + ym;
    if (!state.monthCache[k]) {
      const saved = ym === ymOf(todayISO()) ? store.get('usmonth') : null;
      const p = api('GET', 'coupleEntries', monthRange(ym)).then(r => { addUsCats(r.extraCats); if (ym === ymOf(todayISO())) store.set('usmonth', { ym, ...r }); return r.entries; });
      p.catch(e => { if (state.monthCache[k] === p) delete state.monthCache[k]; usFail(e); });
      // จำไว้ในเครื่อง → โชว์ทันที แล้วค่อยอัปเดตเงียบๆ
      if (saved?.ym === ym) {
        addUsCats(saved.extraCats);
        p.then(list => { state.monthCache[k] = Promise.resolve(list); if (JSON.stringify(list) !== JSON.stringify(saved.entries) && isUs()) render(true); }).catch(() => {});
        state.monthCache[k] = Promise.resolve(saved.entries);
      } else state.monthCache[k] = p;
    }
    return state.monthCache[k];
  }
  if (!state.monthCache[ym]) {
    const p = api('GET', 'entries', monthRange(ym)).then(r => { cacheMonth(ym, r.entries); return r.entries; });
    p.catch(() => { if (state.monthCache[ym] === p) delete state.monthCache[ym]; }); // พลาดแล้วให้โหลดใหม่ได้
    state.monthCache[ym] = p;
  }
  return state.monthCache[ym];
}
// รายปี: โชว์ที่จำไว้ในเครื่องทันที แล้วค่อยอัปเดต (ถ้าเปลี่ยน วาดใหม่เงียบๆ)
function getYear(y, us = isUs()) {
  if (us) {
    const k = 'us:' + y;
    if (!state.yearCache[k]) {
      const saved = store.get('usyear:' + y);
      const p = api('GET', 'coupleYear', { year: y }).then(r => { addUsCats(r.extraCats); store.set('usyear:' + y, r); return r.months; });
      p.catch(e => { if (state.yearCache[k] === p) delete state.yearCache[k]; usFail(e); });
      if (saved) {
        addUsCats(saved.extraCats);
        p.then(m => { state.yearCache[k] = Promise.resolve(m); }).catch(() => {});
        state.yearCache[k] = Promise.resolve(saved.months);
      } else state.yearCache[k] = p;
    }
    return state.yearCache[k];
  }
  if (!state.yearCache[y]) {
    const saved = store.get('year:' + y);
    const p = api('GET', 'year', { year: y }).then(r => r.months);
    p.then(m => {
      store.set('year:' + y, m);
      if (saved && JSON.stringify(saved) !== JSON.stringify(m)) {
        state.yearCache[y] = Promise.resolve(m);
        if (state.ready && state.mode === 'year' && state.date.startsWith(y) && state.page !== 'settings' && state.page !== 'admin') render(true);
      }
    }).catch(() => { if (state.yearCache[y] === p) delete state.yearCache[y]; });
    state.yearCache[y] = saved ? Promise.resolve(saved) : p;
  }
  return state.yearCache[y];
}
// โหลดล่วงหน้า: รายปี + เดือนก่อน กดแล้วขึ้นทันที
function prefetchMore() {
  const run = () => {
    // มีคู่ → โหลด "ของเรา" เดือนนี้ + ปีนี้ไว้ก่อน กดสลับแล้วขึ้นทันที
    if (state.couple) { getMonth(ymOf(todayISO()), true).catch(() => {}); getYear(todayISO().slice(0, 4), true).catch(() => {}); }
    getYear(todayISO().slice(0, 4)).catch(() => {});
    const prev = shiftDate(todayISO(), 'month', -1).slice(0, 7);
    if (prev >= archiveBefore()) getMonth(prev).catch(() => {});
  };
  (window.requestIdleCallback || (f => setTimeout(f, 300)))(run);
}
// ---------- อัปเดตบนจอทันที แล้วค่อยส่งเซิร์ฟเวอร์เบื้องหลัง (ไม่ต้องรอ "ประมวลผล") ----------
const byNewest = (a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0);
// เปลี่ยนรายการ old → neu ในข้อมูลที่จำไว้ทั้งหมด (ของฉัน + คู่รัก, รายเดือน + รายปี) · old/neu = null ได้
function applyLocal(old, neu) {
  for (const us of [false, true]) {
    if (us && !state.couple) continue;
    const pre = us ? 'us:' : '';
    const yms = new Set([old, neu].filter(Boolean).map(e => ymOf(e.date)));
    for (const ym of yms) {
      const key = pre + ym;
      if (!state.monthCache[key]) continue;
      state.monthCache[key] = state.monthCache[key].then(list => {
        let out = old ? list.filter(e => e.id !== old.id) : list.slice();
        if (neu && ymOf(neu.date) === ym) out = [...out, us ? { ...neu, owner: 'me' } : neu].sort(byNewest);
        if (!us) cacheMonth(ym, out);
        return out;
      });
    }
    const ys = new Set([old, neu].filter(Boolean).map(e => e.date.slice(0, 4)));
    for (const y of ys) {
      const key = pre + y;
      if (!state.yearCache[key]) continue;
      state.yearCache[key] = state.yearCache[key].then(months => {
        const m = structuredClone(months);
        for (const [e, sign] of [[old, -1], [neu, 1]]) {
          if (!e || e.date.slice(0, 4) !== y) continue;
          const mo = m[Number(e.date.slice(5, 7)) - 1] ||= { inc: {}, exp: {} };
          const t = e.type === 'income' ? (mo.inc ||= {}) : (mo.exp ||= {});
          t[e.category] = Math.round(((t[e.category] || 0) + sign * e.amount) * 100) / 100;
        }
        if (!us) store.set('year:' + y, m);
        return m;
      });
    }
  }
}
// รายการที่เพิ่งเพิ่ม ยังไม่ได้รหัสจริงจากเซิร์ฟเวอร์ → รอรหัสก่อนแก้/ลบ
const pendingIds = new Map();
const realId = async id => (pendingIds.has(id) ? pendingIds.get(id) : id);
// ส่งเซิร์ฟเวอร์เบื้องหลัง ถ้าไม่สำเร็จ → คืนค่าเดิมบนจอ + แจ้ง
function syncBg(task, undo, what) {
  return task().catch(err => {
    if (err.message === 'login') return;
    undo(); toast(`${what}ไม่สำเร็จ ลองใหม่นะ (${err.message})`); render(true);
  });
}
// เอฟเฟกต์หลังบันทึก (ไม่ขวางการใช้งาน): เหรียญตกใส่การ์ดยอดเงิน
function savedFx(data, pop) {
  const hero = $('.hero');
  if (!hero || !funOn()) return;
  const r = hero.getBoundingClientRect();
  if (pop) confettiPop(hero.querySelector('.hero-amount') || hero);
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('span');
    c.className = 'coin-drop'; c.textContent = data.type === 'income' ? '🪙' : '💸';
    c.style.cssText = `left:${r.left + r.width * (.2 + Math.random() * .6)}px;top:${r.top - 30}px;--d:${i * 60}ms`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 900);
  }
  hero.classList.remove('thump'); void hero.offsetWidth; hero.classList.add('thump');
  navigator.vibrate?.(10);
}
// ลบ: ไอคอนม้วนลงถังขยะ (ลอยบนจอ ไม่ขวางการใช้งาน)
function tossFx(icon) {
  if (!funOn()) return;
  const w = document.createElement('div');
  w.className = 'toss-fx';
  w.innerHTML = `<span class="toss">${esc(icon)}</span><span class="bin">🗑️</span>`;
  document.body.appendChild(w);
  setTimeout(() => w.remove(), 1000);
}

function clearCache() {
  state.monthCache = {}; state.yearCache = {};
  if (state.ready) { clearTimeout(clearCache.t); clearCache.t = setTimeout(prefetchMore, 700); }
}

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
  if (ymOf(date) < archiveBefore() || (mode === 'day' && date < keepFrom())) return archived(mode, date);
  let entries = await getMonth(ymOf(date));
  if (!isUs()) state.streak = streakOf(await daysWithEntries(entries));
  if (mode === 'day') entries = entries.filter(e => e.date === date);
  // เดือนที่มีบางวันรวมยอดไปแล้ว → ยอดรวมใช้ยอดรายเดือน (ครบทุกวัน) · รายการที่โชว์ = 7 วันล่าสุด
  if (mode === 'month' && ymOf(date) === archiveBefore() && keepFrom().slice(8) !== '01') {
    const agg = fromAgg((await getYear(date.slice(0, 4)))[Number(date.slice(5, 7)) - 1], '');
    return { ...agg, entries, archived: '' };
  }
  const inc = {}, exp = {};
  let ti = 0, te = 0;
  for (const e of entries) {
    if (e.type === 'income') { inc[e.category] = (inc[e.category] || 0) + e.amount; ti += e.amount; }
    else { exp[e.category] = (exp[e.category] || 0) + e.amount; te += e.amount; }
  }
  return { inc, exp, ti, te, entries };
}

// จดติดกันกี่วัน (นับถึงวันนี้ หรือเมื่อวานถ้าวันนี้ยังไม่จด)
function streakOf(days) {
  let d = todayISO(), n = 0;
  if (!days.has(d)) d = shiftDate(d, 'day', -1);
  while (days.has(d)) { n++; d = shiftDate(d, 'day', -1); }
  return n;
}

// รายการย่อยเก็บ 7 วันล่าสุด (แก้ได้) · เก่ากว่านั้นเหลือยอดตามหมวดของแต่ละวัน (months.days) และของทั้งเดือน
const keepFrom = () => shiftDate(todayISO(), 'day', -6);
const archiveBefore = () => ymOf(keepFrom()); // เดือนที่เก่ากว่านี้ไม่มีรายการย่อยเหลือแล้ว
const sumOf = o => Object.values(o || {}).reduce((s, v) => s + v, 0);
const fromAgg = (mo, archivedTag) => {
  const inc = { ...(mo?.inc || {}) }, exp = { ...(mo?.exp || {}) };
  return { inc, exp, ti: sumOf(inc), te: sumOf(exp), entries: [], archived: archivedTag };
};
async function archived(mode, date) {
  const months = await getYear(date.slice(0, 4));
  const mo = months[Number(date.slice(5, 7)) - 1] || {};
  if (mode === 'day') {
    const day = mo.days?.[date.slice(8, 10)];
    return day ? fromAgg(day, 'dayTotals') : { inc: {}, exp: {}, ti: 0, te: 0, entries: [], archived: (mo.days && Object.keys(mo.days).length) ? 'dayTotals' : 'day' };
  }
  return fromAgg(mo, 'month');
}
// วันที่เคยจด (รวมวันที่รวมยอดไปแล้ว) ไว้นับ streak
async function daysWithEntries(entries) {
  const set = new Set(entries.map(e => e.date));
  const t = todayISO();
  for (const ym of [ymOf(t), ymOf(shiftDate(t, 'month', -1))]) {
    const months = await getYear(ym.slice(0, 4)).catch(() => null);
    for (const dd of Object.keys(months?.[Number(ym.slice(5, 7)) - 1]?.days || {})) set.add(`${ym}-${dd}`);
  }
  return set;
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
  moveBlob();
  $('#pageTitle').textContent = TITLES[state.page];
  $('#period').classList.toggle('hide', ['settings', 'debts', 'admin'].includes(state.page));
  const sc = $('#scope');
  sc.hidden = !state.couple || ['settings', 'debts', 'admin'].includes(state.page);
  sc.dataset.scope = isUs() ? 'us' : 'me';
  sc.querySelector('.scope-pill').style.transform = ''; // ให้กระจกไปตามสถานะจริง (หลังลาก)
  $$('#scope button').forEach(b => b.classList.toggle('active', b.dataset.scope === sc.dataset.scope));
  document.body.classList.toggle('us', isUs() && !sc.hidden);
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
  if (state.page === 'debts') { if (!quiet) restartAnim(); return renderDebts(view); }
  if (state.page === 'admin') { if (!quiet) restartAnim(); return renderAdmin(view, quiet); }

  const key = `${state.page}|${state.mode}|${state.date}|${state.scope}`;
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
  // โหลดเดือนก่อน/ถัดไปไว้ก่อน กด ‹ › แล้วขึ้นทันที
  if (state.mode !== 'year') {
    for (const dir of [-1, 1]) {
      const ym = ymOf(shiftDate(`${ymOf(state.date)}-01`, 'month', dir));
      if (ym >= archiveBefore() && ym <= ymOf(todayISO())) getMonth(ym).catch(() => {});
    }
  }
  if (!quiet) restartAnim();
  view.innerHTML = state.page === 'home' ? homeHTML(data) : listHTML(data);
  bindView();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('[data-w]', view).forEach(el => { el.style.width = el.dataset.w + '%'; });
    $$('[data-h]', view).forEach(el => { el.style.height = el.dataset.h + '%'; });
    const amt = view.querySelector('[data-count]');
    if (amt) {
      if (quiet) amt.textContent = fmt(Number(amt.dataset.count));
      else { countUp(amt, Number(amt.dataset.count)); setTimeout(() => amt.closest('.hero-amount')?.classList.add('pop'), 650); }
    }
    celebrateStreak();
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
  const streak = state.mode === 'day' && state.date === todayISO() && state.streak > 1 ? `<span class="streak">🔥 ${state.streak} วัน</span>` : '';
  const us = isUs();
  // 💑 ของเรา: หมู 2 ตัวอยู่ด้วยกัน (ยอดเป็นบวก = ดีใจด้วยกัน มีหัวใจลอย) · ไม่มีการเทียบว่าใครใช้มากกว่า
  const mood = zero ? (us ? 'wink' : 'angry') : profit ? 'happy' : 'sad';
  const pigs = us ? loversHTML() : pigPeek(mood);
  const label = us ? `${esc(periodWord())}ของเรา 💕` : esc(periodWord());
  const hero = `<div class="hero-wrap ${us ? 'us' : ''}">${pigs}<div class="card hero tilt ${us ? 'love' : ''} ${zero ? '' : profit ? 'profit' : 'loss'}">
    <i class="spark s1">✦</i><i class="spark s2">✦</i><i class="spark s3">✦</i><i class="glare"></i>
    <div class="hero-top"><span class="hero-label">${label} ${streak}</span><span class="badge">${zero ? '—' : profit ? '▲ กำไร' : '▼ ขาดทุน'}</span></div>
    <div class="hero-amount">${!zero && !profit ? '-' : ''}<span data-count="${Math.abs(net)}">0</span><small>บาท</small></div>
    <div class="split">
      <div class="pill"><span><i>💰</i>รายรับ</span><b>+${fmt(d.ti)}</b></div>
      <div class="pill"><span><i>💸</i>รายจ่าย</span><b>-${fmt(d.te)}</b></div>
    </div></div></div>`;

  let middle = '';
  if (d.perMonth) {
    const max = Math.max(1, ...d.perMonth.flatMap(m => [m.inc, m.exp]));
    middle = `<div class="card perched">${perch('wow', 'hang')}<h3>📊 รายเดือน</h3><div class="chart">${d.perMonth.map((m, i) => `
      <div class="col" data-month="${i}" title="${MONTHS[i]}: +${fmt(m.inc)} / -${fmt(m.exp)}">
        <div class="bars"><i class="i" data-h="${(m.inc / max) * 100}"></i><i class="o" data-h="${(m.exp / max) * 100}"></i></div>
        <small>${MONTHS[i].replace('.', '').slice(0, 3)}</small></div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--income)"></i>รายรับ</span><span><i style="background:var(--expense)"></i>รายจ่าย</span></div></div>`;
  } else if (d.archived) {
    middle = `<div class="card empty archived">${pig('sleep', 'nap')}<div>📦 ${d.archived === 'dayTotals' ? 'เก่ากว่า 7 วัน รวมเป็นยอดตามหมวดแล้ว<br><small>ดูยอดด้านล่างได้ แต่แก้รายการย่อยไม่ได้</small>' : 'ข้อมูลเก่ารวมเป็นยอดตามหมวดแล้ว'}</div>
      ${d.archived === 'day' ? '<button class="btn" data-month-view>ดูยอดรายเดือน</button>' : ''}</div>`;
  } else {
    const isDay = state.mode === 'day';
    const list = isDay ? d.entries : d.entries.slice(0, 5);
    middle = `<div class="card perched">${perch(d.entries.length ? 'happy' : 'sleep', 'hang')}<h3>🧾 ${isDay ? 'รายการ' : 'ล่าสุด'}${us ? 'ของเรา' : ''} ${!isDay && d.entries.length > 5 ? '<button class="link" data-go="list">ดูทั้งหมด</button>' : ''}</h3>
      ${list.length ? list.map(entryHTML).join('') : emptyEntries}
      </div>`;
  }

  return `<div class="grid home">
    <div class="grid">${hero}${middle}</div>
    <div class="grid">
      <div class="card perched">${perch('wink', 'eyes')}<h3>💸 รายจ่าย <small>${fmt(d.te)} ฿</small></h3>${catRows(d.exp, d.te, 'out')}</div>
      <div class="card perched">${perch('happy', 'lie')}<h3>💰 รายรับ <small>${fmt(d.ti)} ฿</small></h3>${catRows(d.inc, d.ti, 'in')}</div>
    </div>
  </div>`;
}

// รูปโปรไฟล์วงกลม (ไม่มีรูป → น้องหมู)
const face = (pic, cls = '') => (pic ? `<img class="face ${cls}" src="${esc(pic)}" alt="" referrerpolicy="no-referrer">` : `<i class="face ${cls}">🐷</i>`);
const myPic = () => store.get('user')?.pic || '';
const duoHTML = () => `<span class="duo">${face(myPic())}${face(state.couple?.pic, 'p2')}</span>`;

function entryHTML(e, i = 0) {
  const c = catById(e.category);
  const showNote = e.note && e.note !== c.name;
  const who = e.owner ? `<span class="who ${e.owner}">${face(e.owner === 'me' ? myPic() : state.couple?.pic)}${e.owner === 'me' ? 'ฉัน' : esc(state.couple?.name || 'แฟน')}</span>` : '';
  return `<button class="entry" style="--i:${Math.min(i, 12)}" data-id="${esc(e.id)}" data-ym="${esc(ymOf(e.date))}" ${e.owner === 'partner' ? 'data-partner' : ''}>
    <div class="cat-ico">${esc(c.icon)}</div>
    <div><div class="entry-name">${esc(c.name)}</div>${who || showNote ? `<div class="entry-note">${who}${showNote ? esc(e.note) : ''}</div>` : ''}</div>
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
  if (d.archived) return homeHTML(d);
  if (!d.entries.length) return `<div class="card">${emptyEntries}</div>`;
  const net = d.ti - d.te;
  const us = isUs(), lm = net >= 0 ? 'happy' : 'sad';
  const top = `<div class="hero-wrap small ${us ? 'us' : ''}">${us ? loversHTML(true) : pigPeek(lm, true)}<div class="card hero mini tilt ${us ? 'love' : ''} ${net >= 0 ? 'profit' : 'loss'}">
    <div class="hero-top"><span class="hero-label">${esc(periodWord())}${us ? 'ของเรา' : ''} · ${d.entries.length} รายการ</span><span class="badge">${net >= 0 ? '▲ กำไร' : '▼ ขาดทุน'}</span></div>
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

// เอียงการ์ด + แสงวิ้งวิ่งตาม (x, y = -0.5 ถึง 0.5)
function setTilt(el, x, y) {
  el.style.setProperty('--ry', `${x * 12}deg`); el.style.setProperty('--rx', `${-y * 12}deg`);
  el.style.setProperty('--gx', `${50 + x * 90}%`); el.style.setProperty('--gy', `${50 + y * 90}%`);
}
// มือถือ Android: เอียงเครื่องแล้วการ์ดเอียงตาม (iPhone ต้องขออนุญาต จึงใช้แสงวิ่งเองแทน)
function bindDeviceTilt() {
  if (!('DeviceOrientationEvent' in window) || typeof DeviceOrientationEvent.requestPermission === 'function') return;
  let raf = 0;
  addEventListener('deviceorientation', e => {
    if (raf || e.gamma == null || !funOn()) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const x = Math.max(-.5, Math.min(.5, e.gamma / 50)), y = Math.max(-.5, Math.min(.5, (e.beta - 45) / 60));
      $$('.hero.tilt').forEach(el => setTilt(el, x, y));
    });
  });
}

function bindTilt(root) {
  $$('.tilt', root).forEach(el => {
    el.onpointermove = e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      setTilt(el, x, y);
    };
    el.onpointerleave = el.onpointerup = () => setTilt(el, 0, 0);
  });
}

function bindView() {
  const view = $('#view');
  bindTilt(view);
  bindPig(view);
  $$('.entry', view).forEach(b => b.onclick = async () => {
    if (b.hasAttribute('data-partner')) return toast('รายการของแฟน แก้ได้เฉพาะเจ้าของนะ 💕');
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
  $$('[data-month-view]', view).forEach(b => b.onclick = () => { state.mode = 'month'; render(); });
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

// ---------- หลังบ้าน (เจ้าของระบบ) ----------
async function adminApi(method, body) {
  if (DEMO) return demoAdmin(method, body);
  return call('/api/admin', method, body);
}
function demoAdmin(method, body) {
  const now = Date.now(), D = 86400e3;
  demoAdmin.d ||= {
    limit: 50, me: 'u0', now, rules: { warnDays: 14, deleteDays: 30, acceptDays: 3 },
    users: [
      { id: 'u0', name: 'เจ้าของ', joinedAt: now - 40 * D, lastActive: now - 3600e3, consentAt: now - 40 * D, consentBy: 'owner', words: 12, cats: 2 },
      { id: 'u1', name: 'มิ้นท์ 🌸', joinedAt: now - 9 * D, lastActive: now - 2 * 3600e3, consentAt: now - 9 * D, words: 4, cats: 1 },
      { id: 'u2', name: 'ไรเดอร์บอย', joinedAt: now - 20 * D, lastActive: now - 3 * D, consentAt: now - 20 * D, words: 7, cats: 0 },
      { id: 'u3', name: 'ฝน', joinedAt: now - 28 * D, lastActive: now - 25 * D, consentAt: now - 28 * D, words: 0, cats: 0 },
      { id: 'u4', name: 'เจเจ', joinedAt: now - D, lastActive: now - D, consentAt: 0, pendingSince: now - D, invitedAt: now - D, words: 0, cats: 0 },
    ],
    waitlist: [{ at: now - 5 * D }, { at: now - 2 * D }],
  };
  const d = demoAdmin.d;
  if (method === 'POST' && body.action === 'limit') d.limit = body.limit;
  if (method === 'POST' && body.action === 'delete') d.users = d.users.filter(u => u.id !== body.id);
  if (method === 'POST' && body.action === 'cleanup') return Promise.resolve({ removed: 0 });
  return Promise.resolve({ ...d, count: d.users.length });
}

const ago = (ms, now) => {
  const m = Math.max(0, now - ms) / 60000;
  return m < 60 ? 'เมื่อกี้' : m < 1440 ? `${Math.floor(m / 60)} ชม.ก่อน` : `${Math.floor(m / 1440)} วันก่อน`;
};
const dmy = ms => { const d = new Date(ms + 7 * 3600e3); return `${d.getUTCDate()} ${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][d.getUTCMonth()]}`; };

async function renderAdmin(view, quiet) {
  if (!quiet) view.innerHTML = `<div class="card"><div class="skeleton" style="width:40%"></div><div class="skeleton" style="height:42px;margin:12px 0;width:70%"></div><div class="skeleton"></div></div>`;
  let d;
  try { d = await adminApi('GET'); } catch (e) {
    const why = { not_admin: 'บัญชีนี้ไม่ใช่เจ้าของระบบ', no_admin_uid: 'ยังไม่ได้ใส่ ADMIN_UID ใน Vercel<br>พิมพ์ "ไอดีของฉัน" ในแชท แล้วนำไปใส่' }[e.message] || esc(e.message);
    view.innerHTML = `<div class="card empty gate">${pig('angry')}<b>เข้าหลังบ้านไม่ได้ 🔒</b><br>${why}</div>`;
    return;
  }
  if (state.page !== 'admin') return;
  view.innerHTML = adminHTML(d);
  bindAdmin(d);
}

function adminHTML(d) {
  const D = 86400e3, now = d.now, r = d.rules;
  const act = days => d.users.filter(u => now - u.lastActive < days * D).length;
  const pending = d.users.filter(u => !u.consentAt);
  const nearDel = d.users.filter(u => u.consentAt && now - u.lastActive >= r.warnDays * D);
  const pct = Math.min(100, Math.round((d.count / d.limit) * 100));
  const tile = (ico, n, label, tone = '') => `<div class="a-tile ${tone}"><div class="a-ico">${ico}</div><b>${n}</b><small>${label}</small></div>`;
  const users = [...d.users].sort((a, b) => b.lastActive - a.lastActive);
  const badge = u => {
    if (!u.consentAt) return `<span class="a-badge warn">💌 รอกดยอมรับ · เหลือ ${Math.max(0, Math.ceil((u.pendingSince + r.acceptDays * D - now) / D))} วัน</span>`;
    if (now - u.lastActive >= r.warnDays * D) return `<span class="a-badge danger">⏳ ลบใน ${Math.max(0, Math.ceil((u.lastActive + r.deleteDays * D - now) / D))} วัน</span>`;
    if (now - u.lastActive < D) return '<span class="a-badge ok">🔥 ใช้วันนี้</span>';
    return '';
  };
  return `<div class="grid two">
    <div class="hero-wrap">${pigPeek(pct >= 90 ? 'wow' : 'happy')}<div class="card hero profit">
      <div class="hero-top"><span class="hero-label">👥 ผู้ใช้ทั้งหมด</span><span class="hero-label">📋 รอคิว ${d.waitlist.length}</span></div>
      <div class="hero-amount">${d.count}<small style="font-size:.45em;opacity:.85"> / ${d.limit} คน</small></div>
      <div class="a-bar"><i style="width:${pct}%"></i></div>
      <div class="hero-label" style="margin-top:8px">${pct >= 100 ? '🚫 เต็มแล้ว คนใหม่ต้องรอคิว' : `ว่างอีก ${d.limit - d.count} ที่`}</div>
    </div></div>

    <div class="a-tiles">
      ${tile('🔥', act(1), 'ใช้วันนี้')}${tile('📅', act(7), 'ใช้ใน 7 วัน')}
      ${tile('🆕', d.users.filter(u => now - u.joinedAt < 7 * D).length, 'คนใหม่ 7 วัน')}${tile('💌', pending.length, 'รอกดยอมรับ', pending.length ? 'warn' : '')}
      ${tile('⏳', nearDel.length, `หายเกิน ${r.warnDays} วัน`, nearDel.length ? 'danger' : '')}${tile('📋', d.waitlist.length, 'รอคิว')}
    </div>

    <div class="card">
      <h2 class="section-title">🎚️ จำนวนคนที่รับได้</h2>
      <div class="form-row"><input class="input" id="aLimit" type="number" min="1" max="1000" inputmode="numeric" value="${d.limit}"><button class="btn" id="aSave">บันทึก</button></div>
      <p class="hint">เพิ่มเลข → คนรอคิวได้เข้าทันที บอททักไปบอกเอง · ⚠️ ดูโควต้าก่อนเพิ่ม</p>
      <div class="a-links">
        <a class="btn ghost" href="https://console.firebase.google.com/project/income-expenses-da85e/firestore/usage" target="_blank">🔥 Firebase</a>
        <a class="btn ghost" href="https://vercel.com/dashboard/usage" target="_blank">▲ Vercel</a>
        <a class="btn ghost" href="https://manager.line.biz/" target="_blank">💬 LINE OA</a>
      </div>
    </div>

    <div class="card span">
      <h2 class="section-title">👥 ผู้ใช้ <small>${d.count} คน · ไม่แสดงยอดเงินของใคร</small></h2>
      ${users.map(u => `<div class="item-row a-user">
        <div class="cat-ico">${u.id === d.me ? '👑' : u.consentAt ? '🐷' : '💌'}</div>
        <div class="grow">${esc(u.name || 'ไม่มีชื่อ')} ${badge(u)}
          <small>เข้า ${dmy(u.joinedAt)} · ใช้ล่าสุด ${ago(u.lastActive, now)}${u.consentBy === 'owner' ? ' · ผู้ใช้เดิม' : ''}${u.words ? ` · สอนคำ ${u.words}` : ''}${u.couple ? ' · 💑 มีคู่' : ''}</small></div>
        ${u.id === d.me ? '' : `<button class="del-btn" data-auser="${esc(u.id)}" aria-label="ลบผู้ใช้">${ICON_TRASH}</button>`}
      </div>`).join('')}
    </div>

    <div class="card">
      <h2 class="section-title">📋 คิว</h2>
      ${d.waitlist.length ? d.waitlist.map((w, i) => `<div class="item-row"><div class="cat-ico">${i + 1}</div><div class="grow">คิวที่ ${i + 1}<small>ลงชื่อ ${dmy(w.at)} (${ago(w.at, now)})</small></div></div>`).join('') : '<p class="hint">ไม่มีคนรอคิว 🎉</p>'}
    </div>

    <div class="card">
      <h2 class="section-title">⚙️ กติกาอัตโนมัติ</h2>
      <div class="example">💌 ถึงคิว → บอททักไปเอง 1 ครั้ง<br>⏱️ ไม่กดยอมรับใน ${r.acceptDays} วัน → ยกที่ให้คิวถัดไป<br>🥺 หายไป ${r.warnDays} วัน → เตือนตอนกลับมา<br>🗑️ ไม่ใช้ ${r.deleteDays} วัน → ลบอัตโนมัติ (ตี 3 ทุกวัน)</div>
      <button class="btn ghost" id="aClean" style="width:100%;margin-top:12px">🧹 เคลียร์คนหมดเวลาตอนนี้</button>
    </div>
  </div>`;
}

function bindAdmin(d) {
  $('#aSave').onclick = async () => {
    const n = Number($('#aLimit').value);
    if (!(n >= 1)) return toast('ใส่ตัวเลขก่อนนะ');
    $('#aSave').disabled = true;
    try { await adminApi('POST', { action: 'limit', limit: n }); toast(`✅ รับได้ ${n} คนแล้ว`); render(true); } catch (e) { toast(e.message); $('#aSave').disabled = false; }
  };
  $('#aClean').onclick = async () => {
    $('#aClean').disabled = true;
    try { const r = await adminApi('POST', { action: 'cleanup' }); toast(r.removed ? `🧹 เคลียร์แล้ว ${r.removed} คน` : '✨ ไม่มีใครหมดเวลา'); render(true); } catch (e) { toast(e.message); }
  };
  $$('[data-auser]').forEach(b => {
    b.onclick = async () => {
      if (!b.classList.contains('armed')) { // แตะครั้งแรก = เตรียมลบ, แตะซ้ำ = ลบจริง
        $$('[data-auser].armed').forEach(x => x.classList.remove('armed'));
        b.classList.add('armed'); toast('แตะอีกครั้งเพื่อลบคนนี้ (ข้อมูลหายถาวร)');
        setTimeout(() => b.classList.remove('armed'), 4000); return;
      }
      b.disabled = true;
      try { await adminApi('POST', { action: 'delete', id: b.dataset.auser }); toast('🗑️ ลบแล้ว'); render(true); } catch (e) { toast(e.message); b.disabled = false; }
    };
  });
}

// ---------- ตั้งค่า ----------
function settingsHTML() {
  const defaults = state.categories.filter(c => !c.custom);
  const opt = t => state.categories.filter(c => c.type === t).map(c => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`).join('');
  const nc = state.newCat;
  const theme = store.get('theme') || 'auto';
  return `<div class="grid two">
    <div class="card">
      <div class="corner-pig">${pig('wink')}</div><h2 class="section-title">🗂️ หมวดหมู่</h2>

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

    <div class="card span couple-card">
      <h2 class="section-title">💑 โหมดคู่รัก</h2>
      ${state.couple ? `
        <div class="couple-row">${duoHTML()}<div class="grow"><b>คุณ กับ ${esc(state.couple.name)}</b><small>จับคู่เมื่อ ${thaiDay(new Date(state.couple.since + 7 * 3600e3).toISOString().slice(0, 10))}</small></div></div>
        <p class="hint">แฟนเห็นยอดรวมของเราและทุกรายการที่จด · แก้ได้เฉพาะของตัวเอง</p>
        <div class="form-row"><button class="btn" id="cOpen">💑 ไปหน้าคู่รัก</button><button class="btn ghost danger-text" id="cUnpair">เลิกคู่</button></div>`
      : `<div class="couple-row"><span class="duo">${face(myPic())}<i class="face p2">💌</i></span><div class="grow"><b>ชวนแฟนมาจดด้วยกัน</b><small>ดูยอดรวมของเราสองคน · เลิกได้ทุกเมื่อ</small></div></div>
        <a class="btn" href="https://line.me/R/oaMessage/%40514ddese/?${encodeURIComponent('จับคู่')}">💌 ชวนแฟน (ไปที่แชท)</a>
        <p class="hint">ไม่ใช้ก็ไม่เป็นไร ทุกอย่างเหมือนเดิม</p>`}
    </div>

    <div class="card span">
      <button class="priv" id="debtsOpen" type="button" style="margin:0"><span>📒</span><div><b>สมุดหนี้</b><small>จดว่าใครติดเงินเราอยู่เท่าไหร่ · เห็นแค่คุณคนเดียว</small></div><em style="font-style:normal;color:var(--faint)">›</em></button>
    </div>

    <div class="card span">
      <h2 class="section-title">🎨 หน้าตา</h2>
      <button class="priv ${store.get('fun') !== false ? 'on' : ''}" id="funToggle" type="button" style="margin:10px 0 12px">
        <span>🐷</span><div><b>ลูกเล่นน้องหมู</b><small>${store.get('fun') !== false ? 'นานๆ น้องจะโผล่มาเซอร์ไพรส์ · รีบอยู่น้องไม่กวน' : 'ปิดอยู่ · แอปนิ่งๆ ไม่มีเซอร์ไพรส์'}</small></div><i></i></button>
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

  $('#debtsOpen').onclick = () => { state.page = 'debts'; state.anim = 'l'; render(); window.scrollTo({ top: 0 }); };
  $('#funToggle').onclick = () => { store.set('fun', store.get('fun') === false); document.body.classList.toggle('calm', !funOn()); render(true); };
  bindSquish($('#view'));
  $('#cOpen') && ($('#cOpen').onclick = () => { state.scope = 'us'; go('home'); });
  $('#cUnpair') && armDelete($('#cUnpair'), async () => {
    try { await api('POST', 'unpair', {}); setCouple(null); clearCache(); toast('เลิกโหมดคู่รักแล้ว'); render(true); }
    catch (e) { toast(e.message); render(true); }
  }, 'แตะอีกครั้งเพื่อเลิกคู่');

  $$('[data-themeopt]').forEach(b => b.onclick = () => { setTheme(b.dataset.themeopt === 'auto' ? null : b.dataset.themeopt); render(true); });
}

// ---------- 📒 สมุดหนี้ (ไว้จำว่าใครติดเงินเรา · ซ่อนในตั้งค่า · ไม่ปนกับรายรับรายจ่าย · ไม่แชร์ให้แฟน) ----------
const debtDay = ts => { const d = new Date(ts + 7 * 3600e3).toISOString().slice(0, 10); return thaiDay(d); };
function debtsHTML() {
  const list = state.debts || [];
  const total = list.reduce((a, d) => a + d.balance, 0);
  const row = d => {
    const open = state.debtOpen === d.id, done = d.balance <= 0;
    return `<div class="debt ${done ? 'done' : ''}">
      <button class="item-row debt-head" data-debtopen="${esc(d.id)}" type="button">
        <div class="cat-ico">${done ? '✅' : '🙋'}</div>
        <div class="grow">${esc(d.name)}<small>${done ? 'จ่ายครบแล้ว' : 'ยังติดอยู่'}</small></div>
        <b>${done ? '' : fmt(d.balance) + ' ฿'}</b></button>
      ${open ? `<div class="debt-body">
        <div class="form-row"><input class="input" id="dAmt" type="number" inputmode="decimal" min="0" placeholder="จำนวนเงิน"></div>
        <div class="form-row"><button class="btn" data-dmove="${esc(d.id)}" data-repay="1">− คืนมา</button><button class="btn ghost" data-dmove="${esc(d.id)}">+ ยืมเพิ่ม</button></div>
        <div class="sub">ประวัติ</div>
        ${[...(d.log || [])].reverse().map(l => `<div class="item-row"><div class="grow">${l.d > 0 ? 'ยืม' : 'คืนมา'}<small>${debtDay(l.ts)}</small></div><b class="${l.d > 0 ? 'neg' : 'pos'}">${l.d > 0 ? '+' : '−'}${fmt(Math.abs(l.d))}</b></div>`).join('')}
        <button class="btn ghost danger-text" data-ddel="${esc(d.id)}" type="button">ลบคนนี้ออกจากสมุด</button>
      </div>` : ''}</div>`;
  };
  return `<div class="grid two">
    <div class="card span">
      <button class="btn ghost" id="debtBack" type="button" style="margin-bottom:10px">‹ กลับไปตั้งค่า</button>
      <h2 class="section-title">📒 คนที่ติดเงินเรา</h2>
      <div class="debt-total"><small>รวมที่ยังไม่ได้คืน</small><b>${fmt(total)} ฿</b></div>
      ${list.length ? list.map(row).join('') : '<p class="hint">ยังไม่มีใคร เพิ่มด้านล่างได้เลย</p>'}
    </div>
    <div class="card span">
      <h2 class="section-title">+ เพิ่มคนที่ติดเงิน</h2>
      <div class="form">
        <input class="input" id="dName" placeholder="ชื่อ เช่น แม่, ยาย, แฟน" maxlength="30">
        <input class="input" id="dNew" type="number" inputmode="decimal" min="0" placeholder="ติดอยู่เท่าไหร่ (บาท)">
        <button class="btn" id="dAdd" type="button">+ จดไว้</button>
      </div>
      <p class="hint" style="margin-top:10px">แยกจากรายรับรายจ่าย · ไม่แชร์ให้แฟน · ลบได้ทุกเมื่อ</p>
    </div>
  </div>`;
}
async function renderDebts(view) {
  if (!state.debts) view.innerHTML = '<div class="card"><div class="skeleton" style="width:40%"></div><div class="skeleton" style="height:42px;margin:12px 0;width:70%"></div></div>';
  try { if (!state.debts) state.debts = (await api('GET', 'debts')).debts; } catch (e) {
    if (e.message !== 'login') view.innerHTML = `<div class="card empty">โหลดไม่สำเร็จ<br>${esc(e.message)}<br><button class="btn" id="retry">ลองใหม่</button></div>`;
    $('#retry') && ($('#retry').onclick = () => render());
    return;
  }
  if (state.page !== 'debts') return;
  view.innerHTML = debtsHTML(); bindDebts(view);
}
function bindDebts(view) {
  const redraw = () => { view.innerHTML = debtsHTML(); bindDebts(view); };
  const apply = d => { state.debts = [d, ...(state.debts || []).filter(x => x.id !== d.id)].sort((a, b) => (b.balance > 0) - (a.balance > 0) || b.ts - a.ts); };
  $('#debtBack').onclick = () => { state.page = 'settings'; state.anim = 'r'; render(); };
  $$('[data-debtopen]', view).forEach(b => b.onclick = () => { state.debtOpen = state.debtOpen === b.dataset.debtopen ? null : b.dataset.debtopen; redraw(); });
  $('#dAdd').onclick = async () => {
    const name = $('#dName').value.trim(), amount = Number($('#dNew').value);
    if (!name) { $('#dName').focus(); return toast('กรุณาใส่ชื่อ'); }
    if (!(amount > 0)) { $('#dNew').focus(); return toast('กรุณาใส่จำนวนเงิน'); }
    try { const r = await api('POST', 'debtAdd', { name, amount }); apply(r.debt); toast('จดแล้ว ✓'); redraw(); } catch (e) { toast(e.message); }
  };
  $$('[data-dmove]', view).forEach(b => b.onclick = async () => {
    const amount = Number($('#dAmt').value);
    if (!(amount > 0)) { $('#dAmt').focus(); return toast('กรุณาใส่จำนวนเงิน'); }
    try { const r = await api('POST', 'debtMove', { id: b.dataset.dmove, amount, repay: !!b.dataset.repay }); apply(r.debt); toast(b.dataset.repay ? 'บันทึกการคืนแล้ว ✓' : 'จดเพิ่มแล้ว ✓'); redraw(); } catch (e) { toast(e.message); }
  });
  $$('[data-ddel]', view).forEach(b => armDelete(b, async () => {
    try { await api('POST', 'debtDel', { id: b.dataset.ddel }); state.debts = state.debts.filter(x => x.id !== b.dataset.ddel); state.debtOpen = null; toast('ลบแล้ว'); redraw(); } catch (e) { toast(e.message); redraw(); }
  }, 'แตะอีกครั้งเพื่อลบ'));
}

// ---------- sheet เพิ่ม/แก้ไข ----------
function openSheetEl() { const s = $('#sheet'); s.style.transform = ''; $('#sheetBg').style.opacity = ''; $('#sheetBg').classList.add('open'); s.classList.add('open'); }
function closeSheet() { const s = $('#sheet'); s.style.transform = ''; $('#sheetBg').style.opacity = ''; s.classList.remove('open'); $('#sheetBg').classList.remove('open'); }
// ปัดหน้าต่างลงเพื่อปิด (แบบ iPhone) · ลากจากแถบด้านบน หรือจากหัวหน้าต่างตอนเลื่อนอยู่บนสุด
function bindSheetSwipe() {
  const sheet = $('#sheet'), bg = $('#sheetBg');
  let y0 = null, dy = 0, t0 = 0;
  sheet.addEventListener('pointerdown', e => {
    if (matchMedia('(min-width: 700px)').matches || !sheet.classList.contains('open')) return;
    const onGrab = e.target.closest('.grab, h2');
    if (!onGrab || e.target.closest('input, button, select')) return;
    y0 = e.clientY; dy = 0; t0 = Date.now();
    sheet.classList.add('dragging');
    try { sheet.setPointerCapture(e.pointerId); } catch {}
  });
  sheet.addEventListener('pointermove', e => {
    if (y0 === null) return;
    dy = Math.max(0, e.clientY - y0);
    sheet.style.transform = `translateY(${dy}px)`;
    bg.style.opacity = String(Math.max(0, 1 - dy / 400));
  });
  const end = () => {
    if (y0 === null) return;
    y0 = null;
    sheet.classList.remove('dragging');
    const fast = dy / Math.max(1, Date.now() - t0) > .6; // ปัดเร็วก็ปิด
    if (dy > 110 || (fast && dy > 30)) closeSheet();
    else { sheet.style.transform = ''; bg.style.opacity = ''; }
  };
  sheet.addEventListener('pointerup', end); sheet.addEventListener('pointercancel', end);
}

function openEntry(entry) {
  const isEdit = !!entry;
  const e = entry ? { ...entry, category: ALIAS[entry.category] || entry.category } : { type: 'expense', category: 'food', amount: '', note: '', date: todayISO() };
  const sheet = $('#sheet');
  const draw = () => {
    const cats = state.categories.filter(c => c.type === e.type);
    if (!cats.some(c => c.id === e.category)) e.category = cats[0]?.id;
    sheet.innerHTML = `<div class="grab"></div><h2>${isEdit ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}</h2>
      <div class="type-toggle has-pill" data-on="${e.type}">
        <span class="tt-pill"></span>
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
    $$('[data-type]', sheet).forEach(b => b.onclick = () => {
      if (e.type === b.dataset.type) return;
      keep(); e.type = b.dataset.type;
      const tt = $('.type-toggle.has-pill', sheet);
      tt.dataset.on = e.type; tt.querySelector('.tt-pill').style.transform = '';
      setTimeout(draw, 260);
    });
    $$('[data-cat]', sheet).forEach(b => b.onclick = () => {
      e.category = b.dataset.cat;
      $$('[data-cat]', sheet).forEach(x => x.classList.toggle('on', x === b));
      sparkle(b);
    });
    $('#fCancel') && ($('#fCancel').onclick = closeSheet);
    $('#fDel') && armDelete($('#fDel'), async () => {
      const old = { ...entry };
      delete old.owner;
      applyLocal(old, null);
      syncBg(async () => api('POST', 'delete', { id: await realId(old.id) }), () => applyLocal(null, old), 'ลบ');
      closeSheet();
      if (rushing() || !funOn()) toast('ลบแล้ว 🗑️'); else tossFx(catById(old.category).icon);
      render(true);
    });
    $('#fSave').onclick = async () => {
      keep();
      if (!(Number(e.amount) > 0)) { $('#fAmount').focus(); return toast('กรุณาใส่จำนวนเงิน'); }
      if (!e.date) return toast('กรุณาเลือกวันที่');
      const data = { type: e.type, category: e.category, amount: Number(e.amount), note: e.note, date: e.date };
      // ขึ้นบนจอทันที แล้วค่อยส่งเซิร์ฟเวอร์เบื้องหลัง
      const rush = rushing(), pop = lucky();
      lastSaveAt = Date.now();
      const old = isEdit ? { ...entry } : null;
      const id = isEdit ? e.id : 'tmp' + Date.now();
      const neu = { ...(old || {}), ...data, id, ts: old?.ts || Date.now() };
      delete neu.owner;
      applyLocal(old, neu);
      if (isEdit) {
        syncBg(async () => api('POST', 'update', { id: await realId(id), entry: data }), () => applyLocal(neu, old), 'แก้ไข');
      } else {
        const p = api('POST', 'add', { entry: data }).then(r => {
          const real = r.entries?.[0]?.id;
          if (real) applyLocal(neu, { ...neu, id: real });
          return real;
        });
        pendingIds.set(id, p);
        p.finally(() => setTimeout(() => pendingIds.delete(id), 5000)).catch(() => {});
        syncBg(() => p, () => applyLocal(neu, null), 'บันทึก');
      }
      closeSheet();
      if (rush || !funOn()) toast(`${isEdit ? 'แก้ไขแล้ว' : 'บันทึกแล้ว'} ✓`);
      // พาไปดูรายวันของวันนั้น
      state.mode = 'day'; state.date = data.date; state.highlight = id;
      if (state.page === 'settings') state.page = 'home';
      await render();
      if (!rush) savedFx(data, pop);
    };
  };
  draw();
  openSheetEl();
  if (!isEdit) setTimeout(() => $('#fAmount')?.focus(), 350);
  if (lucky()) setTimeout(() => $('#sheet').classList.contains('open') && peekaboo($('#sheet')), 900); // ชะโงกจากขอบบนของหน้าต่าง
}


// ---------- navigation ----------
const PAGES = ['home', 'list', 'settings'];
function go(page) {
  if (page === state.page) return;
  state.anim = PAGES.indexOf(page) > PAGES.indexOf(state.page) ? 'l' : 'r';
  state.page = page; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
// ดึงข้อมูลเดือนที่ดูอยู่ใหม่เบื้องหลัง (เช่น เพิ่งไปจดในแชทมา) ถ้าเปลี่ยนค่อยวาดใหม่ ไม่โชว์หน้าโหลด
async function refreshQuiet() {
  if (state.mode === 'year' || ymOf(state.date) < archiveBefore()) { clearCache(); return render(true); }
  const ym = ymOf(state.date), us = isUs(), key = (us ? 'us:' : '') + ym;
  try {
    const before = await (state.monthCache[key] || Promise.resolve(null));
    const r = await api('GET', us ? 'coupleEntries' : 'entries', monthRange(ym));
    if (us) { addUsCats(r.extraCats); if (ym === ymOf(todayISO())) store.set('usmonth', { ym, ...r }); } else cacheMonth(ym, r.entries);
    state.monthCache[key] = Promise.resolve(r.entries);
    if (JSON.stringify(before) !== JSON.stringify(r.entries)) {
      delete state.yearCache[(us ? 'us:' : '') + ym.slice(0, 4)];
      render(true);
    }
  } catch (e) { if (us) usFail(e); }
}

// ปุ่มสลับทุกอัน: กดค้างแล้วลากกระจกไปมาได้แบบ iOS · ปล่อยตรงไหนเลือกอันนั้น · แตะปกติยังใช้ได้
const GLASS_SEGS = [
  { box: '.scope', pill: '.scope-pill', btn: 'button[data-scope]' },
  { box: '.seg', pill: '.seg-pill', btn: 'button[data-mode], button[data-themeopt]' },
  { box: '.type-toggle.has-pill', pill: '.tt-pill', btn: 'button[data-type]' },
];
function bindGlassSegs() {
  let s = null, swallow = false;
  document.addEventListener('click', e => { if (swallow && e.isTrusted) { swallow = false; e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    for (const g of GLASS_SEGS) {
      const box = e.target.closest(g.box), pill = box?.querySelector(g.pill);
      if (!box || !pill) continue;
      s = { box, pill, btns: $$(g.btn, box), x0: e.clientX, y0: e.clientY, id: e.pointerId, drag: false };
      return;
    }
  });
  document.addEventListener('pointermove', e => {
    if (!s || e.pointerId !== s.id) return;
    if (!s.drag) {
      if (Math.abs(e.clientX - s.x0) < 8 || Math.abs(e.clientY - s.y0) > Math.abs(e.clientX - s.x0)) return;
      s.drag = true; s.box.classList.add('dragging'); s.pill.classList.add('lens');
      try { s.box.setPointerCapture(e.pointerId); } catch {}
    }
    const r = s.box.getBoundingClientRect(), pw = s.pill.offsetWidth, base = s.pill.offsetLeft;
    const tx = Math.max(0, Math.min(r.width - pw - base * 2, e.clientX - r.left - pw / 2 - base));
    s.pill.style.transform = `translateX(${tx}px)`;
    const near = s.btns.reduce((b, el) => { const d = Math.abs(el.getBoundingClientRect().left + el.offsetWidth / 2 - e.clientX); return !b || d < b.d ? { el, d } : b; }, null)?.el;
    s.btns.forEach(b => b.classList.toggle('hover', b === near));
  });
  const end = e => {
    if (!s || e.pointerId !== s.id) return;
    const g = s; s = null;
    if (!g.drag) return;
    g.box.classList.remove('dragging'); g.pill.classList.remove('lens');
    const near = g.btns.find(b => b.classList.contains('hover')) || g.btns[0];
    g.btns.forEach(b => b.classList.remove('hover'));
    const i = g.btns.indexOf(near);
    g.pill.style.transform = `translateX(calc(${i * 100}% + ${i * (g.box.matches('.type-toggle') ? 8 : 0)}px))`; // เด้งเข้าที่แบบสปริง
    swallow = true;
    setTimeout(() => { swallow = false; near.click(); }, 0);
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
}

function bindScrollChrome() {
  let lastY = scrollY, raf = 0;
  addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const y = scrollY, b = document.body;
      b.classList.toggle('scrolled', y > 24);
      b.classList.add('scrolling');
      clearTimeout(bindScrollChrome.t); bindScrollChrome.t = setTimeout(() => b.classList.remove('scrolling'), 160);
      if (Math.abs(y - lastY) > 10) {
        const min = y > lastY && y > 140;
        if (b.classList.contains('nav-min') !== min) b.classList.toggle('nav-min', min);
        lastY = y;
      }
    });
  }, { passive: true });
}

function bindChrome() {
  $$('.nav-item').forEach(b => b.onclick = () => go(b.dataset.page));
  $$('.seg button[data-mode]').forEach(b => b.onclick = () => { state.mode = b.dataset.mode; state.date = todayISO(); render(); });
  $$('#scope button').forEach(b => b.onclick = () => {
    if (state.scope === b.dataset.scope) return;
    state.anim = b.dataset.scope === 'us' ? 'l' : 'r'; state.scope = b.dataset.scope; render();
    if (b.dataset.scope === 'us') { const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, ['💕', '💖', '🐷', '✨']); }
  });
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
    else if (state.ready && Date.now() - hiddenAt > 3000) refreshQuiet();
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
  document.body.classList.toggle('calm', !funOn()); // ปิดลูกเล่น = พื้นหลัง/น้องหมูนิ่ง
  bindChrome();
  bindPull();
  bindDrag();
  bindNavDrag();
  bindSheetSwipe();
  bindScrollChrome();
  bindGlassSegs();
  bindDeviceTilt();
  addEventListener('resize', () => moveBlob(true));
  applyTheme(store.get('theme'));
  const ym = ymOf(todayISO());
  let shown = false;

  // 1) มีข้อมูลที่จำไว้ → โชว์ทันที แล้วค่อยอัปเดตทีหลัง
  if (!DEMO) {
    setUser(store.get('user'));
    state.couple = store.get('couple') || null;
    if (params.get('scope') === 'us' && state.couple) state.scope = 'us';
    const um = store.get('usmonth');
    if (state.couple && um?.ym === ym) { addUsCats(um.extraCats); state.monthCache['us:' + ym] = Promise.resolve(um.entries); }
    const p = store.get('profile'), m = store.get('month');
    if (p && m && m.ym === ym) {
      applyProfile(p); state.monthCache[ym] = Promise.resolve(m.entries);
      await render(); hideLoader(); shown = true;
    }
  }

  try {
    let early = null;
    if (!DEMO) {
      liffReady = initLiff();
      liffReady.catch(() => {});
      // มีบัตรผ่าน → ขอข้อมูลพร้อมกับเปิด LINE เลย ไม่ต้องรอ
      if (session()) { early = api('GET', 'boot', monthRange(ym)); early.catch(() => {}); }
      await liffReady;
      if (!window.liff.isLoggedIn()) { store.set('sess', null); window.liff.login({ redirectUri: location.href }); return; }
      // บัตรผ่านเป็นของบัญชีอื่นในเครื่องนี้ → ล้างแล้วเริ่มใหม่
      const me = window.liff.getDecodedIDToken?.()?.sub;
      const s = store.get('sess');
      if (me && s && s.uid && s.uid !== me) { try { localStorage.clear(); } catch {} location.reload(); return; }
      window.liff.getProfile().then(pr => {
        const u = { name: pr.displayName, pic: pr.pictureUrl || '' };
        store.set('user', u); setUser(u);
      }).catch(() => {});
    } else {
      setUser({ name: '(โหมดทดลอง)' });
    }
    // 2) ดึงหมวด + รายการเดือนนี้ในครั้งเดียว
    const r = await (early || api('GET', 'boot', monthRange(ym))).catch(e => (e.message === 'unauthorized' ? api('GET', 'boot', monthRange(ym)) : Promise.reject(e)));
    applyProfile(r.profile); store.set('profile', r.profile);
    const wasUs = isUs();
    setCouple(r.couple);
    if (params.get('scope') === 'us' && state.couple) state.scope = 'us';
    if (r.us) { // ข้อมูลคู่รักเดือนนี้มาในคำขอเดียวกัน
      addUsCats(r.us.extraCats);
      state.monthCache['us:' + ym] = Promise.resolve(r.us.entries);
      store.set('usmonth', { ym, ...r.us });
    }
    state.monthCache[ym] = Promise.resolve(r.entries); cacheMonth(ym, r.entries);
    await render(shown && wasUs === isUs());
    prefetchMore();
    if (params.has('add')) openEntry(); // เปิดจากปุ่ม "🔢 กดตัวเลข" ในแชท → เปิดหน้าเพิ่มรายการเลย
  } catch (e) {
    if (e.message === 'login') return;
    if (e.message === 'not_member' || e.message === 'no_consent') { // ยังไม่ได้รับเข้า / ยังไม่กดยอมรับ / ลบข้อมูลไปแล้ว
      try { Object.keys(localStorage).filter(k => k.startsWith('ie:') && k !== 'ie:theme').forEach(k => localStorage.removeItem(k)); } catch {}
      $('#view').innerHTML = `<div class="card empty gate">${pig(e.message === 'no_consent' ? 'wink' : 'sleep')}
        <b>${e.message === 'no_consent' ? 'กดยอมรับในแชทก่อนนะ 📄' : 'ยังไม่ได้เริ่มใช้งาน 🐷'}</b><br>
        ${e.message === 'no_consent' ? 'แตะ 💖 ยอมรับ ในแชท LINE แล้วกลับมาที่นี่' : 'ทักแชท LINE ก่อน บอทจะพาเริ่มใช้งาน'}<br>
        <a class="btn" href="https://line.me/R/ti/p/@514ddese">💬 ไปที่แชท</a> <a class="btn ghost" href="/privacy.html">📄 นโยบายข้อมูล</a></div>`;
      return;
    }
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
      ['job', 'income', '💼', 'รายได้งาน'], ['bonus', 'income', '🎁', 'ทิป/โบนัส'], ['inc_other', 'income', '💰', 'รายรับอื่นๆ'],
      ['food', 'expense', '🍚', 'กินดื่ม'], ['travel', 'expense', '⛽', 'รถ/เดินทาง'], ['rent', 'expense', '🏠', 'บ้าน/บิล'], ['shopping', 'expense', '🛍️', 'ช้อปปิ้ง'],
      ['loan', 'expense', '💳', 'ผ่อน/หนี้'], ['family', 'expense', '👪', 'ครอบครัว'], ['health', 'expense', '💊', 'สุขภาพ/ความงาม'], ['exp_other', 'expense', '🧾', 'อื่นๆ'],
    ].map(([id, type, icon, name]) => ({ id, type, icon, name }));
    const entries = [];
    const t = todayISO();
    for (let i = 0; i < 70; i++) {
      const date = shiftDate(t, 'day', -i);
      entries.push({ type: 'income', category: 'job', amount: 700 + ((i * 137) % 600), note: 'วิ่งงาน', date });
      if (i % 3 === 0) entries.push({ type: 'income', category: 'bonus', amount: 20 + (i % 5) * 10, note: 'ทิป', date });
      entries.push({ type: 'expense', category: 'travel', amount: 60 + (i % 4) * 20, note: 'เติมน้ำมัน', date });
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
    // โหมดทดลองคู่รัก: /?demo=1&couple=1
    const partner = () => db.entries.filter((e, i) => i % 3 === 0).map((e, i) => ({ ...e, id: '~' + i, owner: 'partner', amount: Math.round(e.amount * 0.8), note: e.type === 'income' ? 'ขายของ' : e.note, category: e.type === 'income' ? '~income|ขายของออนไลน์' : e.category }));
    const usList = b => [...inRange(b).map(e => ({ ...e, owner: 'me' })), ...partner().filter(e => e.date >= b.from && e.date <= b.to)].sort((a, c) => c.date.localeCompare(a.date) || c.ts - a.ts);
    const extraCats = [{ id: '~income|ขายของออนไลน์', name: 'ขายของออนไลน์', icon: '🛒', type: 'income' }];
    if (action === 'boot') return wait({ profile: profile(), entries: inRange(body), couple: params.has('couple') && !db.unpaired ? { name: 'มิ้นท์ 🌸', pic: '', since: Date.now() - 12 * 86400e3 } : null });
    if (action === 'coupleEntries') return wait({ entries: usList(body), extraCats });
    if (action === 'coupleYear') return wait({ extraCats, months: Array.from({ length: 12 }, (_, m) => {
      const ym = `${body.year}-${String(m + 1).padStart(2, '0')}`, inc = {}, exp = {};
      const days = {};
      [...db.entries, ...partner()].filter(e => e.date.startsWith(ym)).forEach(e => {
        const t = e.type === 'income' ? inc : exp; t[e.category] = (t[e.category] || 0) + e.amount;
        const dd = (days[e.date.slice(8)] ||= { inc: {}, exp: {} })[e.type === 'income' ? 'inc' : 'exp']; dd[e.category] = (dd[e.category] || 0) + e.amount;
      });
      return { inc, exp, days };
    }) });
    if (action === 'profile') return wait(profile());
    if (action === 'entries') return wait({ entries: inRange(body) });
    if (action === 'year') return wait({ months: Array.from({ length: 12 }, (_, m) => {
      const ym = `${body.year}-${String(m + 1).padStart(2, '0')}`, inc = {}, exp = {};
      const days = {};
      db.entries.filter(e => e.date.startsWith(ym)).forEach(e => {
        const t = e.type === 'income' ? inc : exp; t[e.category] = (t[e.category] || 0) + e.amount;
        const dd = (days[e.date.slice(8)] ||= { inc: {}, exp: {} })[e.type === 'income' ? 'inc' : 'exp']; dd[e.category] = (dd[e.category] || 0) + e.amount;
      });
      return { inc, exp, days };
    }) });
  }
  if (action === 'add') { const n = { ...body.entry, id: 'n' + Date.now(), ts: Date.now() }; db.entries.push(n); return wait({ entries: [n] }); }
  if (action === 'update') Object.assign(db.entries.find(e => e.id === body.id), body.entry);
  if (action === 'delete') db.entries = db.entries.filter(e => e.id !== body.id);
  if (action === 'unpair') db.unpaired = true;
  const dd = db.debts ||= [{ id: 'm1', name: 'แม่', balance: 6000, ts: Date.now(), log: [{ d: 6000, ts: Date.now() - 20 * 86400e3 }] }, { id: 'g1', name: 'ยาย', balance: 5000, ts: Date.now() - 1e3, log: [{ d: 5000, ts: Date.now() - 30 * 86400e3 }] }, { id: 'f1', name: 'แฟน', balance: 1106, ts: Date.now() - 2e3, log: [{ d: 1106, ts: Date.now() - 5 * 86400e3 }] }];
  if (action === 'debts') return wait({ debts: dd });
  if (action === 'debtAdd') { const n = { id: 'x' + Date.now(), name: body.name, balance: body.amount, ts: Date.now(), log: [{ d: body.amount, ts: Date.now() }] }; dd.push(n); return wait({ debt: n }); }
  if (action === 'debtMove') { const d = dd.find(x => x.id === body.id), v = body.repay ? -body.amount : body.amount; d.balance = Math.max(0, d.balance + v); d.ts = Date.now(); d.log.push({ d: v, ts: Date.now() }); return wait({ debt: d }); }
  if (action === 'debtDel') { db.debts = dd.filter(x => x.id !== body.id); return wait({ deleted: true }); }
  if (action === 'profile') { if (body.categories) db.custom = body.categories; if (body.keywords) db.keywords = body.keywords; return wait(profile()); }
  return wait({ ok: true });
}
