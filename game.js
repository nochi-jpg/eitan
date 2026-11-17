// えいたんエイリアン 本体
(() => {
'use strict';
const CATS = window.EW_CATS, AL = window.EA_LIST, LINES = window.EA_LINES, PNAME = window.EA_PNAME;
const COST = 20;
const TOTAL = CATS.reduce((a, c) => a + c.w.length, 0);
const IMG = p => (window.EA_IMG && window.EA_IMG[p]) || p;
const alienSrc = id => IMG('images/aliens/' + String(id + 1).padStart(3, '0') + '.webp');
const $ = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CAT_COL = [['#c9b8ff', '#a48ff0'], ['#a6ecd2', '#6fd0ad'], ['#ffc4dd', '#ff92bf'], ['#bfe3ff', '#83c2f7'], ['#ffe08a', '#f5bd45'], ['#ffd2bd', '#ffa98a'], ['#d5c2ff', '#b495f5'], ['#b8ead6', '#7fcfb3']];

// ===== セーブ =====
const KEY = 'eitan_save_v1';
const fresh = () => ({ v: 1, ene: 0, own: [], fav: -1, free: false, qok: {}, sok: {}, best: {}, pass: {}, bgm: true, se: true, page: {} });
let S = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return Object.assign(fresh(), s); } catch (e) {} return fresh(); })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const countIn = (obj, cat) => cat.w.reduce((a, w) => a + (obj[w[0]] ? 1 : 0), 0);
const countAll = obj => Object.keys(obj).length;

// ===== 画面サイズ =====
const stage = document.getElementById('stage'), screensEl = document.getElementById('screens'), fxEl = document.getElementById('fx'), modalEl = document.getElementById('modal'), bgEl = document.getElementById('bg');
let SCALE = 1;
function fit() {
  const W = innerWidth, H = innerHeight; SCALE = Math.min(W / 1280, H / 720);
  stage.style.transform = 'scale(' + SCALE + ')';
  stage.style.left = ((W - 1280 * SCALE) / 2) + 'px'; stage.style.top = ((H - 720 * SCALE) / 2) + 'px';
}
addEventListener('resize', fit); fit();

// ===== 音 =====
let AC = null, bgmTimer = null, bgmGain = null;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (AC.state === 'suspended') AC.resume();
  if (S.bgm && !bgmTimer) startBgm();
  return AC;
}
function se(name, vol) {
  if (!S.se || !window.ED_SE || !ED_SE[name]) return;
  try { const a = new Audio(ED_SE[name]); a.volume = vol == null ? 0.5 : vol; a.play().catch(() => {}); } catch (e) {}
}
function tone(f, t0, dur, type, vol, dest) {
  const c = AC; if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  o.connect(g); g.connect(dest || c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
function chime(kind) {
  if (!S.se || !ac()) return; const t = AC.currentTime;
  if (kind === 'ene') [1568, 2093, 2637].forEach((f, i) => tone(f, t + i * 0.06, 0.35, 'sine', 0.12));
  else if (kind === 'sparkle') [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) => tone(f, t + i * 0.07, 0.6, 'triangle', 0.08));
  else if (kind === 'pop') { tone(660, t, 0.12, 'square', 0.06); tone(1320, t + 0.03, 0.3, 'sine', 0.15); }
  else if (kind === 'puni') { tone(520, t, 0.12, 'sine', 0.14); tone(780, t + 0.06, 0.14, 'sine', 0.1); }
  else if (kind === 'flip') tone(900, t, 0.08, 'triangle', 0.06);
  else if (kind === 'whoosh') {
    const len = 2.4, buf = AC.createBuffer(1, AC.sampleRate * len, AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + len);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 1.6); g.gain.linearRampToValueAtTime(0, t + len);
    s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t);
    [523, 659, 784, 1047].forEach((fq, i) => tone(fq, t + 0.4 + i * 0.45, 0.8, 'sine', 0.05));
  }
}
// ふわふわBGM（オルゴール風。その場で鳴らす）
const BGM_SEQ = (() => {
  const c = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0, 880.0];
  const m = [5, -1, 7, 6, 5, -1, 3, -1, 4, -1, 5, 4, 3, -1, 2, -1, 3, -1, 5, 4, 3, -1, 1, -1, 2, -1, 3, 2, 1, -1, -1, -1,
    5, -1, 7, 8, 7, -1, 5, -1, 6, -1, 7, 6, 5, -1, 3, -1, 4, -1, 5, 3, 2, -1, 1, -1, 0, -1, 2, 1, 0, -1, -1, -1];
  const bass = [130.8, 110.0, 98.0, 130.8, 87.3, 98.0, 110.0, 130.8];
  return { c, m, bass };
})();
function startBgm() {
  if (!AC || bgmTimer) return;
  bgmGain = AC.createGain(); bgmGain.gain.value = 0.55; bgmGain.connect(AC.destination);
  const step = 60 / 84 / 2; let n = 0, next = AC.currentTime + 0.1;
  bgmTimer = setInterval(() => {
    while (next < AC.currentTime + 0.3) {
      const k = BGM_SEQ.m[n % BGM_SEQ.m.length];
      if (k >= 0) { tone(BGM_SEQ.c[k] * 2, next, 1.4, 'sine', 0.05, bgmGain); tone(BGM_SEQ.c[k] * 4, next, 0.5, 'sine', 0.012, bgmGain); }
      if (n % 8 === 0) tone(BGM_SEQ.bass[(n / 8) % 8], next, 2.6, 'triangle', 0.045, bgmGain);
      n++; next += step;
    }
  }, 80);
}
function stopBgm() { if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; } if (bgmGain) { bgmGain.disconnect(); bgmGain = null; } }

// ===== 文字の大きさを はばに あわせる =====
const mctx = document.createElement('canvas').getContext('2d');
function fitSize(text, maxW, base, min, weight) {
  let s = base;
  while (s > min) { mctx.font = (weight || 900) + ' ' + s + 'px ZMG, "Zen Maru Gothic", sans-serif'; if (mctx.measureText(text).width <= maxW) break; s -= 2; }
  return s;
}

// ===== 画面の切りかえ =====
let cur = null;
function show(build) {
  const old = cur;
  if (old) { old._timers.forEach(clearTimeout); old._raf && cancelAnimationFrame(old._raf); old._cleanup && old._cleanup(); old.classList.add('out'); setTimeout(() => old.remove(), 260); }
  closeModal();
  const scr = $('<div class="screen"></div>'); scr._timers = []; cur = scr;
  screensEl.appendChild(scr); build(scr);
}
function later(fn, ms) { const s = cur; const id = setTimeout(() => { if (cur === s) fn(); }, ms); s._timers.push(id); return id; }
function setBg(name, dim) { bgEl.style.backgroundImage = 'url(' + IMG('images/bg/' + name + '.webp') + ')'; bgEl.classList.toggle('dim', !!dim); }
function place(el, x, y, w, h) { if (x != null) el.style.left = x + 'px'; if (y != null) el.style.top = y + 'px'; if (w != null) el.style.width = w + 'px'; if (h != null) el.style.height = h + 'px'; return el; }
function btn(html, cls, x, y, w, h, fn, sound) {
  const b = $('<button class="btn ' + (cls || '') + '"></button>'); b.innerHTML = html; place(b, x, y, w, h);
  b.addEventListener('click', e => { ac(); b.blur(); if (b.classList.contains('dis')) return; se(sound || 'decide', 0.45); fn && fn(e); });
  return b;
}
function backBtn(fn) { return btn('<span class="arw"></span>もどる', 'white back', null, null, null, null, fn, 'tap'); }

function popIn(el, delay, from) {
  el.animate([{ transform: from || 'translateY(40px) scale(.85)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: delay || 0, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'backwards' });
  return el;
}
// ===== うかぶ ちり =====
(() => { const d = document.getElementById('dust');
  for (let i = 0; i < 28; i++) { const m = document.createElement('i'); m.className = 'mote'; const s = 2 + Math.random() * 4;
    m.style.cssText = 'left:' + rnd(1280) + 'px;top:' + rnd(720) + 'px;width:' + s + 'px;height:' + s + 'px;--dx:' + (rnd(160) - 80) + 'px;--dy:' + (rnd(160) - 80) + 'px;animation-duration:' + (8 + Math.random() * 10) + 's;animation-delay:-' + (Math.random() * 12) + 's;box-shadow:0 0 ' + (s * 2) + 'px #fff';
    d.appendChild(m); } })();

// ===== エフェクト =====
function burst(x, y, n, colors, dist) {
  colors = colors || ['#fff', '#ffe08a', '#ffc4dd', '#c9b8ff', '#a6ecd2'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'); s.className = 'spark'; const a = Math.PI * 2 * i / n + Math.random() * 0.5, r = (dist || 110) * (0.6 + Math.random() * 0.6), sz = 14 + rnd(18);
    s.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + sz + 'px;height:' + sz + 'px;margin:' + (-sz / 2) + 'px 0 0 ' + (-sz / 2) + 'px;--sc:' + pick(colors) + ';--dx:' + Math.cos(a) * r + 'px;--dy:' + Math.sin(a) * r + 'px;--sd:' + (0.7 + Math.random() * 0.5) + 's';
    fxEl.appendChild(s); setTimeout(() => s.remove(), 1300);
  }
}
function floatText(html, x, y, cls) { const p = $('<div class="' + (cls || 'plus') + '">' + html + '</div>'); place(p, x, y); fxEl.appendChild(p); setTimeout(() => p.remove(), 1300); }

// ===== えねるぎー =====
function enePill(scr) {
  const p = $('<div class="pill ene-pill"><span class="ene-ico"></span><span class="lbl">えねるぎー</span><span class="num"></span></div>');
  const upd = () => { p.querySelector('.num').textContent = S.ene; };
  upd(); p._upd = upd; scr._ene = p; scr.appendChild(p); return p;
}
function addEne(n) {
  if (n <= 0) return; S.ene += n; save(); chime('ene');
  const p = cur && cur._ene; if (p) { p._upd(); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); floatText('+' + n, 1150, 92); }
}

// ===== えいりあん =====
function makeAlien(id, size, x, y, tappable) {
  const el = $('<div class="alien"><div class="glow"></div><div class="fl"><div class="tilt"><div class="rc"><div class="bd"><img alt=""></div></div></div></div></div>');
  el.querySelector('img').src = alienSrc(id); el.querySelector('img').draggable = false;
  place(el, x, y, size, size);
  el.style.setProperty('--fd', (4.2 + Math.random() * 1.4).toFixed(2) + 's'); el.style.setProperty('--fdl', (-Math.random() * 4).toFixed(2) + 's'); el.style.setProperty('--td', (6 + Math.random() * 3).toFixed(2) + 's');
  el._id = id;
  el.react = kind => { const rc = el.querySelector('.rc'); rc.className = 'rc'; void rc.offsetWidth; rc.classList.add('r-' + kind); };
  el.setId = nid => { el._id = nid; el.querySelector('img').src = alienSrc(nid); };
  if (tappable) el.classList.add('tap');
  return el;
}
function makeBubble(x, bottomY, w, tailX, H) {
  const b = $('<div class="bubble"></div>'); place(b, x); b.style.width = 'max-content'; b.style.maxWidth = w + 'px'; b.style.minWidth = Math.max(120, (tailX || 40) + 60) + 'px'; b.style.bottom = ((H || 720) - bottomY) + 'px';
  if (tailX != null) { b.style.setProperty('--tx', tailX + 'px'); b.style.setProperty('--bo', (tailX + 10) + 'px 100%'); }
  let t = null;
  b.say = (text, ms) => { b.textContent = text; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); clearTimeout(t); t = setTimeout(() => b.classList.remove('on'), ms || 3000); };
  return b;
}
const line = (id, sit) => pick(LINES[AL[id].p][sit]);
const favId = () => (S.fav >= 0 ? S.fav : (S.own[0] != null ? S.own[0] : 0));
const TAP_R = ['boing', 'spin', 'wiggle', 'roll', 'happy'];
function wireTap(al, bub, scr) {
  al.addEventListener('click', () => {
    ac(); al.react(pick(TAP_R)); chime('puni'); bub.say(line(al._id, 'tap'), 2400);
    const r = al.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    burst((r.left + r.width / 2 - sr.left) / SCALE, (r.top + r.height * 0.4 - sr.top) / SCALE, 8, null, 90);
  });
}

// ===== モーダル =====
function openModal(build) {
  modalEl.innerHTML = ''; modalEl.classList.add('on');
  modalEl.appendChild($('<div class="mback"></div>'));
  build(modalEl);
}
function closeModal() { modalEl.innerHTML = ''; modalEl.classList.remove('on'); }
function confirmBox(text, yes, no, onYes, h) {
  openModal(m => {
    const H = h || 300, p = place($('<div class="panel mpanel"></div>'), 340, (720 - H) / 2, 600, H);
    p.appendChild(place($('<div class="mtext">' + text + '</div>'), null, 54));
    p.appendChild(btn(no, 'white', 50, H - 104, 240, 68, closeModal, 'tap'));
    p.appendChild(btn(yes, 'pink', 310, H - 104, 240, 68, () => { closeModal(); onYes(); }));
    m.appendChild(p);
  });
}

// ===== 単語 =====
const catOf = ci => CATS[ci];
function pickWords(ci, doneObj, n) {
  const ws = catOf(ci).w.map((w, i) => ({ e: w[0], j: w[1], i }));
  const notYet = shuffle(ws.filter(w => !doneObj[w.e])), done = shuffle(ws.filter(w => doneObj[w.e]));
  return notYet.concat(done).slice(0, n);
}

// ===================== タイトル =====================
function title() {
  show(scr => {
    setBg('home', true);
    const word = 'えいたんエイリアン', cols = ['#ffadcf', '#b9a6f2', '#8fdcc0', '#9fd3ff', '#ffcf5c', '#ffa98a', '#b9a6f2', '#ff92bf', '#6fd0ad'];
    const logo = $('<div class="logo"></div>');
    [...word].forEach((ch, i) => { const s = document.createElement('span'); s.textContent = ch; s.style.setProperty('--i', i); s.style.setProperty('--lc', cols[i % cols.length]); logo.appendChild(s); });
    scr.appendChild(logo);
    scr.appendChild($('<div class="logo-sub">ふわふわ えいたんご ちょう</div>'));
    const deco = S.own.length >= 5 ? shuffle(S.own).slice(0, 5) : [0, 20, 54, 80, 7];
    const pos = [[70, 330, 180], [270, 470, 150], [880, 470, 160], [1060, 320, 170], [1080, 60, 120]];
    deco.forEach((id, k) => { const a = makeAlien(id, pos[k][2], pos[k][0], pos[k][1], true); scr.appendChild(a);
      a.addEventListener('click', () => { ac(); a.react(pick(TAP_R)); chime('puni'); }); });
    scr.appendChild(btn('はじめる', 'pink tap-start', null, null, null, null, () => { if (!S.free) firstGacha(); else home(); }));
    scr.appendChild($('<div class="credit">K.nom</div>'));
    scr._key = e => { if (e.key === 'Enter' || e.key === ' ') { if (!S.free) firstGacha(); else home(); } };
  });
}
function firstGacha() {
  gacha({ free: true });
  later(() => confirmBoxOne('ようこそ、うちゅうせんへ！<br>まだ なかまが いないみたい。<br>さいしょの えいりあんを よんでみよう！'), 500);
}
function confirmBoxOne(text) {
  openModal(m => { const p = place($('<div class="panel mpanel"></div>'), 340, 200, 600, 320);
    p.appendChild(place($('<div class="mtext"></div>'), null, 50)).innerHTML = text;
    p.appendChild(btn('OK', 'pink', 180, 216, 240, 68, closeModal)); m.appendChild(p); });
}

// ===================== ホーム =====================
function home() {
  show(scr => {
    setBg('home');
    const fid = favId();
    const np = $('<div class="pill"><span class="lbl">なかま</span><span></span></div>'); place(np, 28, 24, 230); np.lastChild.textContent = S.own.length + ' / 100'; np.style.justifyContent = 'center'; np.style.padding = '0 20px'; scr.appendChild(np);
    enePill(scr);
    const al = makeAlien(fid, 380, 140, 170, true); scr.appendChild(al);
    const bub = makeBubble(150, 186, 380, 60); scr.appendChild(bub); wireTap(al, bub, scr);
    const fp = $('<div class="pill"><span class="lbl">おきにいり</span><span></span></div>'); place(fp, 200, 606, 260); fp.style.justifyContent = 'center'; fp.lastChild.textContent = AL[fid].n; scr.appendChild(fp);
    const tops = [120, 240, 360];
    [['れんしゅう', 'sky', 'カードで おぼえる', 'learn'], ['しけん', 'mint', '4たくで チャレンジ', 'quiz'], ['にんてい', 'pink', 'スペルを かいて ごうかく', 'spell']].forEach((d, i) => {
      popIn(scr.appendChild(btn(d[0] + '<span class="sub">' + d[2] + '</span>', d[1] + ' col menu-big', null, tops[i], null, null, () => select(d[3]))), 80 + i * 80, 'translateX(120px) scale(.9)');
    });
    const g = btn('がちゃ', 'lemon menu-sm', 808, 484, null, null, () => gacha({}));
    if (S.ene >= COST && S.own.length < 100) g.classList.add('ready');
    popIn(scr.appendChild(g), 340);
    popIn(scr.appendChild(btn('ずかん', 'peach menu-sm', 952, 484, null, null, zukan)), 400);
    popIn(scr.appendChild(btn('せってい', 'white menu-sm', 1096, 484, null, null, settings)), 460);
    const pp = place($('<div class="panel"></div>'), 808, 584, 420, 108); pp.style.borderRadius = '26px'; pp.style.padding = '14px 20px';
    const qn = countAll(S.qok), sn = countAll(S.sok);
    pp.innerHTML = '<div class="grow"><span class="gl">しけん</span><div class="gauge"><i style="width:0"></i></div><span class="gn">' + qn + '/' + TOTAL + '</span></div>' +
      '<div class="grow" style="margin-top:6px"><span class="gl">にんてい</span><div class="gauge" style="--g1:#ffc4dd;--g2:#ff92bf"><i style="width:0;--g1:#ffc4dd;--g2:#ff92bf"></i></div><span class="gn">' + sn + '/' + TOTAL + '</span></div>';
    pp.querySelectorAll('.gl').forEach(e => { e.style.width = '76px'; });
    const gi = pp.querySelectorAll('.gauge i'); gi[1].style.background = 'linear-gradient(90deg,#ffc4dd,#ff92bf)';
    later(() => { gi[0].style.width = (qn / TOTAL * 100) + '%'; gi[1].style.width = (sn / TOTAL * 100) + '%'; }, 200);
    popIn(scr.appendChild(pp), 520);
    popIn(al, 0, 'translateY(-60px) scale(.6)');
    later(() => { bub.say(line(fid, 'home'), 3200); al.react('boing'); }, 500);
    const idle = () => { bub.say(line(fid, Math.random() < 0.8 ? 'home' : 'tap'), 3200); if (Math.random() < 0.5) al.react(pick(['wiggle', 'spin', 'boing'])); later(idle, 8000 + rnd(5000)); };
    later(idle, 9000);
  });
}

// ===================== カテゴリえらび =====================
const MODE_NAME = { learn: 'れんしゅう', quiz: 'しけん', spell: 'にんてい' };
function select(mode) {
  show(scr => {
    setBg('cockpit', true);
    scr.appendChild(backBtn(home));
    scr.appendChild($('<div class="scr-title">' + MODE_NAME[mode] + ' ─ カテゴリを えらぼう</div>'));
    enePill(scr);
    const pages = Math.ceil(CATS.length / 8); let page = Math.min(S.page[mode] || 0, pages - 1);
    const area = $('<div class="cards"></div>'); scr.appendChild(area);
    const pager = $('<div class="pager"></div>'); const dots = $('<div class="dots"></div>');
    for (let i = 0; i < pages; i++) dots.appendChild(document.createElement('i'));
    const prev = btn('まえ', 'white pg-prev', null, null, null, null, () => go(-1), 'tap'), next = btn('つぎ', 'white pg-next', null, null, null, null, () => go(1), 'tap');
    pager.append(prev, dots, next); scr.appendChild(pager);
    function go(d) { const np = page + d; if (np < 0 || np >= pages) return; page = np; S.page[mode] = page; save(); render(); }
    function render() {
      area.innerHTML = '';
      prev.classList.toggle('dis', page === 0); next.classList.toggle('dis', page === pages - 1);
      [...dots.children].forEach((d, i) => d.classList.toggle('on', i === page));
      for (let k = 0; k < 8; k++) {
        const ci = page * 8 + k; if (ci >= CATS.length) break;
        const c = CATS[ci], n = c.w.length, col = CAT_COL[ci % CAT_COL.length];
        const card = $('<div class="ccard"></div>'); place(card, (k % 4) * 294, Math.floor(k / 4) * 254);
        card.style.setProperty('--k1', col[0]); card.style.setProperty('--k2', col[1]); card.style.animationDelay = (k * 0.05) + 's';
        let st = '', ft = '', stamp = '';
        const qn = countIn(S.qok, c), sn = countIn(S.sok, c);
        if (mode === 'learn') {
          st = gaugeRow('しけん', qn, n, '#a6ecd2', '#6fd0ad') + gaugeRow('にんてい', sn, n, '#ffc4dd', '#ff92bf');
          ft = '<span>10ご × ' + Math.ceil(n / 10) + 'セット</span>';
        } else if (mode === 'quiz') {
          st = gaugeRow('せいかい', qn, n, '#a6ecd2', '#6fd0ad');
          const rest = n - qn;
          st += '<div class="grow"><span class="gl">さいこう</span><b style="font-size:18px">' + (S.best[ci] != null ? S.best[ci] + ' / 10' : 'まだ') + '</b></div>';
          ft = rest ? '<span>のこり えねるぎー</span><b>' + rest + '</b>' : '<span class="done-mark">えねるぎー かいしゅう ずみ</span>';
        } else {
          st = gaugeRow('つづれた', sn, n, '#ffc4dd', '#ff92bf');
          const rest = (n - sn) * 2;
          st += '<div class="grow"><span class="gl">ごうかく</span><b style="font-size:18px">' + (S.pass[ci] ? 'した！' : 'まだ') + '</b></div>';
          ft = rest ? '<span>のこり えねるぎー</span><b>' + rest + '</b>' : '<span class="done-mark">えねるぎー かいしゅう ずみ</span>';
          if (S.pass[ci]) stamp = '<div class="stamp">ごうかく</div>';
        }
        card.innerHTML = '<div class="band"><span class="no">' + (ci + 1) + '</span><span class="cnt">' + n + ' ご</span></div><div class="nm" style="font-size:' + fitSize(c.name, 232, 23, 16) + 'px;white-space:nowrap">' + esc(c.name) + '</div><div class="st">' + st + '</div><div class="ft">' + ft + '</div>' + stamp;
        card.addEventListener('click', () => { ac(); se('decide', 0.45); if (mode === 'learn') setModal(ci); else if (mode === 'quiz') quiz(ci); else spell(ci); });
        area.appendChild(card);
      }
    }
    render();
    scr._key = e => { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'Escape') home(); };
  });
}
function gaugeRow(label, v, n, c1, c2) {
  return '<div class="grow"><span class="gl">' + label + '</span><div class="gauge"><i style="width:' + (v / n * 100) + '%;background:linear-gradient(90deg,' + c1 + ',' + c2 + ')"></i></div><span class="gn">' + v + '/' + n + '</span></div>';
}
function setModal(ci) {
  const c = CATS[ci], sets = Math.ceil(c.w.length / 10), rows = Math.ceil(sets / 3), H = 150 + rows * 90 + 90;
  openModal(m => {
    const p = place($('<div class="panel mpanel"></div>'), 340, (720 - H) / 2, 600, H);
    p.appendChild($('<div class="title-tag">' + esc(c.name) + '</div>'));
    p.appendChild(place($('<div class="mtext">どの セットを れんしゅうする？</div>'), null, 40));
    for (let s = 0; s < sets; s++) {
      const b = btn('セット' + (s + 1) + '<span class="sub">' + (s * 10 + 1) + '〜' + Math.min(c.w.length, s * 10 + 10) + '</span>', 'sky col', (600 - Math.min(3, sets - Math.floor(s / 3) * 3) * 180 + 24) / 2 + (s % 3) * 180, 100 + Math.floor(s / 3) * 90, 156, 72, () => { closeModal(); learn(ci, s); });
      b.style.fontSize = '22px'; p.appendChild(b);
    }
    p.appendChild(btn('とじる', 'white', 200, H - 96, 200, 64, closeModal, 'tap'));
    m.appendChild(p);
  });
}

// ===================== れんしゅう =====================
function learn(ci, si) {
  show(scr => {
    setBg('cockpit', true);
    const c = CATS[ci], ws = c.w.slice(si * 10, si * 10 + 10); let i = 0, flipped = false;
    scr.appendChild(backBtn(() => select('learn')));
    const counter = $('<div class="counter"></div>'); scr.appendChild(counter);
    enePill(scr);
    const card = $('<div class="fcard"><div class="in"><div class="face fr"><span class="tag">えいご</span><div class="word"></div><div class="hint">クリックで うらがえす</div></div><div class="face bk"><span class="tag">いみ</span><div class="mean"></div><div class="hint">クリックで もどす</div></div></div></div>');
    scr.appendChild(card);
    const fid = favId(), al = makeAlien(fid, 230, 1000, 330, true); scr.appendChild(al);
    const bub = makeBubble(990, 330, 270, 90); scr.appendChild(bub); wireTap(al, bub, scr);
    const sub = $('<div class="pill" style="left:460px;top:488px;width:360px;height:44px;justify-content:center;font-size:18px;padding:0 16px"></div>'); sub.textContent = c.name + '  セット' + (si + 1); scr.appendChild(sub);
    const bp = btn('まえ', 'white', 330, 540, 200, 76, () => move(-1), 'tap');
    const bf = btn('めくる', 'lemon', 540, 540, 200, 76, flip, 'tap');
    const bn = btn('つぎ', 'sky', 750, 540, 200, 76, () => move(1), 'tap');
    scr.append(bp, bf, bn);
    card.addEventListener('click', () => { ac(); flip(); });
    function render() {
      const w = ws[i];
      card.querySelector('.word').textContent = w[0]; card.querySelector('.word').style.fontSize = fitSize(w[0], 540, 84, 36) + 'px';
      card.querySelector('.mean').textContent = w[1]; card.querySelector('.mean').style.fontSize = fitSize(w[1], 520, 56, 28) + 'px';
      counter.textContent = (i + 1) + ' / ' + ws.length;
      bp.classList.toggle('dis', i === 0);
      bn.innerHTML = i === ws.length - 1 ? 'おわり' : 'つぎ';
    }
    function flip() { flipped = !flipped; card.classList.toggle('flip', flipped); chime('flip'); if (flipped && Math.random() < 0.3) { bub.say(line(fid, 'ok'), 2000); al.react('boing'); } }
    function move(d) {
      if (i + d >= ws.length) { finish(); return; }
      if (i + d < 0) return;
      i += d; flipped = false; card.classList.remove('flip');
      card.animate([{ transform: 'translateX(' + (d * 60) + 'px) rotate(' + (d * 3) + 'deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      render();
    }
    function finish() {
      al.react('great'); se('cheer', 0.4); chime('sparkle'); bub.say(line(fid, 'great'), 3000);
      const sets = Math.ceil(c.w.length / 10);
      openModal(m => {
        const p = place($('<div class="panel mpanel"></div>'), 340, 210, 600, 300);
        p.appendChild($('<div class="title-tag">セット' + (si + 1) + ' おわり！</div>'));
        p.appendChild(place($('<div class="mtext">10この たんごを みたよ。<br>しけんで ためしてみよう！</div>'), null, 50));
        p.appendChild(btn('もういちど', 'white', 24, 196, 176, 68, () => { closeModal(); learn(ci, si); }, 'tap'));
        const nb = btn('つぎのセット', 'sky', 212, 196, 176, 68, () => { closeModal(); learn(ci, si + 1); }); if (si + 1 >= sets) nb.classList.add('dis'); nb.style.fontSize = '20px';
        p.appendChild(nb);
        p.appendChild(btn('しけんへ', 'mint', 400, 196, 176, 68, () => { closeModal(); quiz(ci); }));
        m.appendChild(p);
      });
    }
    render();
    later(() => bub.say(line(fid, 'start'), 2600), 400);
    scr._key = e => { if (modalEl.classList.contains('on')) return; if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); flip(); } else if (e.key === 'ArrowRight') move(1); else if (e.key === 'ArrowLeft') move(-1); };
  });
}

// ===================== しけん・にんてい 共通 =====================
function testFrame(scr, ci, mode) {
  setBg('cockpit', true);
  scr.appendChild(btn('<span class="arw"></span>やめる', 'white back', null, null, null, null, () => confirmBox('とちゅうで やめる？<br><span style="font-size:18px">ここまでの えねるぎーは もらえるよ</span>', 'やめる', 'つづける', () => select(mode)), 'tap'));
  const dots = $('<div class="qdots"></div>'); for (let i = 0; i < 10; i++) dots.appendChild(document.createElement('i')); scr.appendChild(dots);
  enePill(scr);
  const qp = $('<div class="panel qpanel"><div class="qlabel"></div><div class="qword"></div></div>'); scr.appendChild(qp);
  const side = $('<div class="abs side-info"><div class="sinfo"><span class="l">せいかい</span><span class="v s-ok">0</span></div><div class="sinfo"><span class="l">れんぞく</span><span class="v s-cb">0</span></div><div class="sinfo"><span class="l">もらった えねるぎー</span><span class="v s-en">0</span></div></div>');
  scr.appendChild(side);
  const fid = favId(), al = makeAlien(fid, 210, 24, 390, true); scr.appendChild(al);
  const bub = makeBubble(12, 384, 230, 80); scr.appendChild(bub); wireTap(al, bub, scr);
  const catTag = $('<div class="abs" style="left:24px;top:620px;width:210px;height:52px;border-radius:26px;background:var(--glass);border:4px solid #fff;display:flex;align-items:center;justify-content:center;font-size:17px;white-space:nowrap;overflow:hidden"></div>');
  catTag.textContent = CATS[ci].name; scr.appendChild(catTag);
  const fb = $('<div class="feedback"></div>'); scr.appendChild(fb);
  later(() => { bub.say(line(fid, 'start'), 2400); al.react('boing'); }, 300);
  return { dots, qp, side, al, bub, fid, fb };
}
function cheer(F, st, ok) {
  if (ok) {
    st.combo++;
    if (st.combo >= 3 && st.combo % 3 === 0) { F.bub.say(line(F.fid, 'combo'), 2000); floatText(st.combo + ' れんぞく！', 1050, 380, 'combo'); F.al.react('great'); }
    else { F.bub.say(line(F.fid, 'ok'), 1800); F.al.react('happy'); }
  } else { st.combo = 0; F.bub.say(line(F.fid, 'ng'), 2600); F.al.react('sad'); }
  F.side.querySelector('.s-ok').textContent = st.ok;
  F.side.querySelector('.s-cb').textContent = st.combo;
  F.side.querySelector('.s-en').textContent = st.gain;
}
function centerOf(el) { const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(); return [(r.left + r.width / 2 - sr.left) / SCALE, (r.top + r.height / 2 - sr.top) / SCALE]; }
function showAnswer(F, html, onNext) {
  F.fb.innerHTML = '';
  const a = $('<div class="answer"><span class="k">こたえ</span><span class="t"></span></div>'); a.querySelector('.t').innerHTML = html; F.fb.appendChild(a);
  const nb = btn('つぎへ', 'sky nextbtn', null, null, null, null, onNext); F.fb.appendChild(nb);
  return nb;
}

// ===================== しけん（4たく） =====================
function quiz(ci) {
  show(scr => {
    const F = testFrame(scr, ci, 'quiz'), c = CATS[ci];
    const qs = pickWords(ci, S.qok, 10), st = { qi: 0, ok: 0, combo: 0, gain: 0, miss: [], lock: false, next: null };
    F.qp.querySelector('.qlabel').textContent = 'この えいごの いみは どれかな？';
    const word = F.qp.querySelector('.qword');
    let choiceEls = [];
    function ask() {
      const q = qs[st.qi]; st.lock = false; st.next = null; F.fb.innerHTML = '';
      [...F.dots.children].forEach((d, i) => d.classList.toggle('cur', i === st.qi));
      word.textContent = q.e; word.style.fontSize = fitSize(q.e, 720, 80, 36) + 'px';
      word.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.3,1.6,.5,1)' });
      const others = shuffle(c.w.filter(w => w[0] !== q.e && w[1] !== q.j)).slice(0, 3).map(w => w[1]);
      const opts = shuffle([q.j].concat(others));
      choiceEls.forEach(b => b.remove());
      choiceEls = opts.map((o, k) => {
        const b = btn('', 'white choice', 250 + (k % 2) * 400, 344 + Math.floor(k / 2) * 120, null, null, () => answer(k, b), 'tap');
        b.textContent = o; b.style.fontSize = fitSize(o, 330, 28, 18, 900) + 'px'; b._o = o; scr.appendChild(b);
        b.animate([{ transform: 'translateY(30px) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: k * 60, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'backwards' });
        return b;
      });
    }
    function answer(k, b) {
      if (st.lock) return; st.lock = true; const q = qs[st.qi];
      const ok = b._o === q.j; const dot = F.dots.children[st.qi]; dot.classList.remove('cur');
      if (ok) {
        st.ok++; b.classList.remove('white'); b.classList.add('ok'); se('ok', 0.45); dot.classList.add('o');
        const [x, y] = centerOf(b); burst(x, y, 12);
        if (!S.qok[q.e]) { S.qok[q.e] = 1; st.gain++; addEne(1); } save();
        cheer(F, st, true);
        later(nextQ, 1100);
      } else {
        b.classList.remove('white'); b.classList.add('ng'); se('ng', 0.4); dot.classList.add('x');
        choiceEls.forEach(e => { if (e._o === q.j) { e.classList.remove('white'); e.classList.add('ok'); } else if (e !== b) e.classList.add('fade'); });
        st.miss.push(q); cheer(F, st, false);
        st.next = showAnswer(F, '<b>' + esc(q.e) + '</b>　＝　' + esc(q.j), nextQ);
      }
    }
    function nextQ() { st.qi++; if (st.qi >= qs.length) result('quiz', ci, st, qs.length); else ask(); }
    ask();
    scr._key = e => { if (modalEl.classList.contains('on')) return; const n = '1234'.indexOf(e.key); if (n >= 0 && choiceEls[n]) choiceEls[n].click(); else if (e.key === 'Enter' && st.next) st.next.click(); };
  });
}

// ===================== にんてい（キー入力） =====================
function spell(ci) {
  show(scr => {
    const F = testFrame(scr, ci, 'spell');
    const qs = pickWords(ci, S.sok, 10), st = { qi: 0, ok: 0, combo: 0, gain: 0, miss: [], lock: false, next: null };
    F.qp.querySelector('.qlabel').textContent = 'この いみの えいごを かいてみよう';
    const word = F.qp.querySelector('.qword');
    const boxes = $('<div class="boxes"></div>'); scr.appendChild(boxes);
    const kin = $('<input id="kin" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="latin">'); scr.appendChild(kin);
    const bDel = btn('1もじ けす', 'white', 370, 466, 220, 76, () => { kin.value = kin.value.slice(0, -1); draw(); kin.focus(); }, 'tap');
    const bOk = btn('こたえる', 'pink', 610, 466, 300, 76, submit);
    scr.append(bDel, bOk);
    let slots = [], need = 0, hintN = 0;
    function ask() {
      const q = qs[st.qi]; st.lock = false; st.next = null; F.fb.innerHTML = ''; bDel.style.visibility = bOk.style.visibility = 'visible';
      [...F.dots.children].forEach((d, i) => d.classList.toggle('cur', i === st.qi));
      word.textContent = q.j; word.style.fontSize = fitSize(q.j, 720, 60, 30) + 'px';
      word.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.3,1.6,.5,1)' });
      const chars = [...q.e]; const letters = chars.filter(ch => /[a-z]/i.test(ch)).length;
      hintN = letters > 1 ? 1 : 0;
      const n = chars.length, size = Math.min(62, Math.floor((760 - (n - 1) * 8) / n));
      boxes.innerHTML = ''; slots = []; let li = 0;
      chars.forEach((ch, k) => {
        const b = document.createElement('div'); b.className = 'lbox'; b.style.width = size + 'px'; b.style.height = Math.min(84, Math.round(size * 1.25)) + 'px'; b.style.fontSize = Math.round(size * 0.62) + 'px'; b.style.margin = '0 ' + (n > 1 ? 4 : 0) + 'px';
        if (ch === ' ') { b.classList.add('sp'); b.style.width = Math.round(size * 0.5) + 'px'; }
        else if (!/[a-z]/i.test(ch)) { b.classList.add('sym'); b.textContent = ch; }
        else { if (li < hintN) { b.classList.add('hint'); b.textContent = ch; } else slots.push({ el: b, ch }); li++; }
        boxes.appendChild(b);
      });
      need = slots.length; kin.value = ''; kin.maxLength = need; draw(); kin.focus();
    }
    function draw() {
      const v = kin.value.replace(/[^a-z]/gi, '').slice(0, need); if (v !== kin.value) kin.value = v;
      slots.forEach((s, k) => {
        const t = v[k]; s.el.textContent = t ? (t.toLowerCase() === s.ch.toLowerCase() ? s.ch : t.toLowerCase()) : '';
        s.el.classList.toggle('fill', !!t); s.el.classList.toggle('cur', k === v.length && !st.lock);
      });
      bOk.classList.toggle('dis', v.length < need);
    }
    kin.addEventListener('input', () => { if (st.lock) { kin.value = ''; return; } draw(); chime('flip'); });
    kin.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (st.next) st.next.click(); else submit(); } });
    boxes.addEventListener('click', () => kin.focus());
    scr.addEventListener('click', e => { if (!modalEl.classList.contains('on') && e.target.tagName !== 'BUTTON') kin.focus(); });
    function submit() {
      if (st.lock || kin.value.length < need) return; st.lock = true;
      const q = qs[st.qi], v = kin.value.toLowerCase(), ans = slots.map(s => s.ch.toLowerCase()).join('');
      const ok = v === ans, dot = F.dots.children[st.qi]; dot.classList.remove('cur');
      slots.forEach((s, k) => { s.el.classList.remove('cur'); });
      if (ok) {
        st.ok++; se('ok', 0.45); dot.classList.add('o');
        [...boxes.children].forEach((b, k) => { if (!b.classList.contains('sp') && !b.classList.contains('sym')) { b.classList.add('okc'); b.animate([{ transform: 'none' }, { transform: 'translateY(-16px) scale(1.1)' }, { transform: 'none' }], { duration: 420, delay: k * 40, easing: 'ease-out' }); } });
        const [x, y] = centerOf(boxes); burst(x, y, 16);
        if (!S.sok[q.e]) { S.sok[q.e] = 1; st.gain += 2; addEne(2); } save();
        cheer(F, st, true); later(nextQ, 1300);
      } else {
        se('ng', 0.4); dot.classList.add('x');
        slots.forEach((s, k) => { const good = (v[k] || '') === s.ch.toLowerCase(); s.el.textContent = s.ch; s.el.classList.add(good ? 'okc' : 'ngc'); });
        boxes.animate([{ transform: 'translateX(-12px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-6px)' }, { transform: 'none' }], { duration: 400 });
        st.miss.push(q); cheer(F, st, false);
        bDel.style.visibility = bOk.style.visibility = 'hidden';
        st.next = showAnswer(F, '<b>' + esc(q.e) + '</b>　＝　' + esc(q.j), nextQ);
      }
    }
    function nextQ() { st.qi++; if (st.qi >= qs.length) result('spell', ci, st, qs.length); else ask(); }
    ask();
    scr._key = e => { if (modalEl.classList.contains('on')) return; if (document.activeElement !== kin && e.key === 'Enter' && st.next) st.next.click(); };
  });
}

// ===================== けっか =====================
function result(mode, ci, st, n) {
  if (mode === 'quiz') { S.best[ci] = Math.max(S.best[ci] || 0, st.ok); }
  const pass = mode === 'spell' && st.ok >= 9;
  if (pass) S.pass[ci] = 1;
  save();
  show(scr => {
    setBg('cockpit', true);
    enePill(scr);
    const fid = favId(), al = makeAlien(fid, 300, 70, 250, true); scr.appendChild(al);
    const bub = makeBubble(50, 240, 340, 140); scr.appendChild(bub); wireTap(al, bub, scr);
    const p = $('<div class="panel rpanel"></div>'); place(p, 420, 96, 800, 600); scr.appendChild(p);
    p.appendChild($('<div class="title-tag">' + MODE_NAME[mode] + ' の けっか</div>'));
    const sc = $('<div class="rscore"><span class="v">0</span><small> / ' + n + '</small></div>'); p.appendChild(sc);
    const perfect = st.ok === n, good = mode === 'spell' ? pass : st.ok >= 8;
    const msg = mode === 'spell' ? (pass ? 'にんてい ごうかく！ おめでとう！' : 'ごうかくは 9もん いじょう。もういちど チャレンジ！') : (perfect ? 'まんてん！ すごい！' : good ? 'よく できたね！' : 'まちがえた たんごを おぼえよう');
    p.appendChild($('<div class="rmsg">' + msg + '</div>'));
    p.appendChild($('<div class="rene"><span class="ene-ico"></span>+' + st.gain + ' えねるぎー</div>'));
    if (pass) p.appendChild($('<div class="bigstamp">ごうかく</div>'));
    else if (mode === 'quiz' && perfect) p.appendChild($('<div class="bigstamp">まんてん</div>'));
    p.appendChild($('<div class="rlist-h">' + (st.miss.length ? 'まちがえた たんご（' + st.miss.length + '）' : '') + '</div>'));
    const list = $('<div class="rlist cute-scroll"></div>');
    if (!st.miss.length) list.innerHTML = '<div class="rrow allok">ぜんぶ せいかい！ かんぺき！</div>';
    else st.miss.forEach(q => { const r = $('<div class="rrow"><span class="e"></span><span class="j"></span></div>'); r.children[0].textContent = q.e; r.children[1].textContent = q.j; list.appendChild(r); });
    p.appendChild(list);
    const again = mode === 'quiz' ? () => quiz(ci) : () => spell(ci);
    p.appendChild(btn('もういちど', 'sky', 40, 510, 224, 68, again));
    p.appendChild(btn('カテゴリへ', 'white', 288, 510, 224, 68, () => select(mode), 'tap'));
    const hb = btn('ホームへ', 'lemon', 536, 510, 224, 68, home);
    p.appendChild(hb);
    // 点数カウントアップ
    let k = 0; const v = sc.querySelector('.v');
    const tick = () => { v.textContent = k; if (k < st.ok) { k++; chime('flip'); later(tick, 90); } else { done(); } };
    later(tick, 400);
    function done() {
      if (good || perfect) { se('cheer', 0.45); chime('sparkle'); al.react('great'); bub.say(line(fid, 'great'), 3600); burst(820, 160, 22, null, 180); }
      else { al.react('sad'); bub.say(line(fid, 'fail'), 3600); }
      if (S.ene >= COST && S.own.length < 100) later(() => { hb.innerHTML = 'がちゃへ'; hb.classList.add('ready'); hb.onclick = null; const nb = btn('がちゃへ', 'lemon ready', 536, 510, 224, 68, () => gacha({})); hb.replaceWith(nb); }, 900);
    }
  });
}

// ===================== がちゃ =====================
const ORIGIN = [548, 300];
function gacha(opt) {
  show(scr => {
    setBg('hatch');
    const free = !!opt.free;
    const back = backBtn(home); if (!free) scr.appendChild(back);
    const np = $('<div class="pill"><span class="lbl">なかま</span><span></span></div>'); place(np, free ? 28 : 196, 24, 230); np.style.justifyContent = 'center'; np.style.padding = '0 20px';
    const updN = () => { np.lastChild.textContent = S.own.length + ' / 100'; }; updN(); scr.appendChild(np);
    enePill(scr);
    const hglow = $('<div class="abs" style="width:260px;height:260px;margin:-130px 0 0 -130px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,240,255,.55),rgba(255,240,255,0));pointer-events:none"></div>');
    place(hglow, ORIGIN[0], ORIGIN[1]); hglow.animate([{ transform: 'scale(.8)', opacity: .5 }, { transform: 'scale(1.1)', opacity: 1 }], { duration: 1800, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    scr.appendChild(hglow);
    const ui = $('<div class="gacha-ui"></div>'); scr.appendChild(ui);
    const note = $('<div class="gnote"></div>'); ui.appendChild(note);
    let callB = null;
    function setupUI() {
      ui.style.display = ''; if (callB) callB.remove();
      const left = 100 - S.own.length;
      if (left <= 0) { note.textContent = 'ぜんいん そろった！ コンプリート おめでとう！'; callB = btn('コンプリート！', 'lemon call dis'); }
      else if (free) { note.textContent = 'さいしょの なかまは むりょうで よべるよ'; callB = btn('むりょうで よぶ！', 'pink call', null, null, null, null, run); }
      else {
        note.textContent = S.ene >= COST ? 'ハッチの むこうから なかまが やってくるよ' : 'えねるぎーが あと ' + (COST - S.ene) + ' たりないよ。しけんや にんていで ためよう';
        callB = btn('よぶ！<span class="sub">' + COST + ' えねるぎー</span>', 'pink col call', null, null, null, null, run);
        if (S.ene < COST) callB.classList.add('dis');
      }
      ui.appendChild(callB);
    }
    setupUI();
    function run() {
      const pool = []; for (let i = 0; i < 100; i++) if (S.own.indexOf(i) < 0) pool.push(i);
      if (!pool.length) return;
      if (!free) { if (S.ene < COST) return; S.ene -= COST; scr._ene._upd(); }
      const id = pick(pool); S.own.push(id); if (free) { S.free = true; S.fav = id; } save();
      ui.style.display = 'none'; back.style.visibility = 'hidden';
      scr.querySelectorAll('.gpanel,.alien,.bubble').forEach(e => e.remove());
      hglow.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(2.2)', opacity: 1 }, { transform: 'scale(1)', opacity: .6 }], { duration: 1400 });
      chime('whoosh');
      const orb = $('<div class="orb"><div class="sil"></div></div>'); orb.querySelector('.sil').style.backgroundImage = 'url(' + alienSrc(id) + ')';
      scr.appendChild(orb);
      const T = 2600, t0 = performance.now(), end = [640, 300];
      const stepF = now => {
        let t = Math.min(1, (now - t0) / T); const e = 1 - Math.pow(1 - t, 2.2);
        const x = ORIGIN[0] + (end[0] - ORIGIN[0]) * e + Math.sin(t * Math.PI * 2.5) * 70 * (1 - t);
        const y = ORIGIN[1] + (end[1] - ORIGIN[1]) * e + Math.sin(t * Math.PI * 3.2) * 34 * (1 - t) - Math.sin(t * Math.PI) * 30;
        const s = 0.05 + 0.95 * e, r = Math.sin(t * Math.PI * 4) * 12 * (1 - t);
        orb.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ') rotate(' + r + 'deg)';
        orb.style.opacity = Math.min(1, t * 4);
        if (t < 1) scr._raf = requestAnimationFrame(stepF);
        else { orb.animate([{ transform: orb.style.transform }, { transform: orb.style.transform + ' scale(1.08,.94)' }, { transform: orb.style.transform + ' scale(.94,1.08)' }, { transform: orb.style.transform + ' scale(1.12,.9)' }], { duration: 600, easing: 'ease-in-out' }); later(() => pop(id, orb), 620); }
      };
      scr._raf = requestAnimationFrame(stepF);
    }
    function pop(id, orb) {
      orb.remove(); chime('pop'); chime('sparkle'); se('cheer', 0.45);
      const fl = $('<div class="flash"></div>'); fl.style.setProperty('--x', '640px'); fl.style.setProperty('--y', '300px'); fxEl.appendChild(fl); setTimeout(() => fl.remove(), 1000);
      for (let i = 0; i < 2; i++) { const r = $('<div class="ring"></div>'); place(r, 540, 200, 200, 200); r.style.animationDelay = (i * 0.15) + 's'; fxEl.appendChild(r); setTimeout(() => r.remove(), 1300); }
      burst(640, 300, 28, null, 260);
      const al = makeAlien(id, 280, 500, 150, true); scr.appendChild(al); al.react('pop'); later(() => al.react('great'), 650);
      const bub = makeBubble(790, 190, 300, 30); scr.appendChild(bub); wireTap(al, bub, scr);
      later(() => bub.say(line(id, 'hello'), 3600), 900);
      const a = AL[id], gp = $('<div class="panel gpanel"></div>'); place(gp, 340, 440, 600, 264);
      gp.innerHTML = '<div class="newtag">' + (free ? 'さいしょの なかま' : 'なかまに なった！') + '</div><div class="gname"></div><div class="gmeta"><span class="ptag no">No.' + String(id + 1).padStart(3, '0') + '</span><span class="ptag p-' + a.p + '">' + PNAME[a.p] + '</span></div><div class="gdesc"></div>';
      gp.querySelector('.gname').textContent = a.n; gp.querySelector('.gdesc').textContent = a.d;
      gp.querySelector('.gname').style.fontSize = fitSize(a.n, 540, 40, 26) + 'px';
      gp.querySelector('.gdesc').style.fontSize = (a.d.length > 58 ? 16 : 18) + 'px';
      const gb = $('<div class="gbtns"></div>'); gp.appendChild(gb);
      if (free) {
        gb.appendChild(btn('ホームへ', 'pink', 180, 188, 240, 60, home));
      } else {
        const fb = btn(S.fav === id ? 'おきにいり ちゅう' : 'おきにいりにする', 'pink', 20, 188, 176, 60, () => { S.fav = id; save(); fb.textContent = 'おきにいり ちゅう'; fb.classList.add('isfav'); al.react('great'); bub.say(line(id, 'great'), 2600); burst(640, 290, 16); });
        fb.style.fontSize = '18px'; if (S.fav === id) fb.classList.add('isfav');
        const ag = btn('もういちど', 'lemon', 212, 188, 176, 60, () => { setupUI(); back.style.visibility = 'visible'; scr.querySelectorAll('.gpanel,.alien,.bubble').forEach(e => e.remove()); updN(); run(); });
        if (S.ene < COST || S.own.length >= 100) ag.classList.add('dis');
        gb.append(fb, ag, btn('もどる', 'white', 404, 188, 176, 60, () => { setupUI(); back.style.visibility = 'visible'; scr.querySelectorAll('.gpanel,.alien,.bubble').forEach(e => e.remove()); updN(); }, 'tap'));
      }
      scr.appendChild(gp); updN();
      if (S.own.length >= 100) later(complete, 2600);
    }
  });
}
function complete() {
  se('cheer', 0.5); chime('sparkle');
  openModal(m => {
    const p = place($('<div class="panel mpanel"></div>'), 290, 150, 700, 420);
    p.appendChild($('<div class="title-tag">コンプリート！</div>'));
    p.appendChild(place($('<div class="mtext">100たいの えいりあんが ぜんいん そろったよ！<br>660この たんごを ぜんぶ クリアした あかし！</div>'), null, 46));
    [3, 20, 54, 80, 99].forEach((id, k) => { const a = makeAlien(id, 110, 40 + k * 124, 160, false); p.appendChild(a); setTimeout(() => a.react('great'), 300 + k * 150); });
    p.appendChild(btn('やったー！', 'pink', 230, 320, 240, 68, closeModal));
    m.appendChild(p);
    burst(640, 360, 40, null, 320);
  });
}

// ===================== ずかん =====================
function zukan() {
  show(scr => {
    setBg('room', true);
    scr.appendChild(backBtn(home));
    scr.appendChild($('<div class="scr-title">えいりあん ずかん　' + S.own.length + ' / 100</div>'));
    enePill(scr);
    const dp = $('<div class="panel zdetail"></div>'); scr.appendChild(dp);
    const gw = $('<div class="panel zgridwrap"></div>'); scr.appendChild(gw);
    const grid = $('<div class="zgrid cute-scroll"></div>'); gw.appendChild(grid);
    let sel = S.own.length ? favId() : -1, al = null, bub = null;
    const cards = [];
    for (let i = 0; i < 100; i++) {
      const own = S.own.indexOf(i) >= 0, c = $('<div class="zc' + (own ? '' : ' no') + '"><span class="znum">' + String(i + 1).padStart(3, '0') + '</span><img alt=""><div class="zn"></div></div>');
      c.querySelector('img').src = alienSrc(i); c.querySelector('img').loading = 'lazy'; c.querySelector('.zn').textContent = own ? AL[i].n : '？？？';
      if (S.fav === i) c.appendChild($('<i class="fav"></i>'));
      c.addEventListener('click', () => { ac(); if (sel === i && own && al) { al.react(pick(TAP_R)); chime('puni'); bub.say(line(i, 'tap'), 2200); return; } se('tap', 0.4); sel = i; detail(); });
      grid.appendChild(c); cards.push(c);
    }
    function detail() {
      cards.forEach((c, i) => c.classList.toggle('sel', i === sel));
      dp.innerHTML = '';
      if (sel < 0) { dp.appendChild($('<div class="zempty">まだ なかまが いないよ<br>がちゃで よんでみよう</div>')); return; }
      const own = S.own.indexOf(sel) >= 0, a = AL[sel];
      al = makeAlien(sel, 210, 95, 84, own); if (!own) al.querySelector('img').style.filter = 'brightness(0) opacity(.18)';
      dp.appendChild(al);
      bub = makeBubble(30, 92, 340, 150, 586); bub.style.zIndex = 3; dp.appendChild(bub);
      if (own) { wireTap(al, bub, scr); al.react('pop'); later(() => bub.say(line(sel, 'tap'), 2400), 300); }
      const nm = $('<div class="zname"></div>'); nm.textContent = own ? a.n : '？？？'; nm.style.fontSize = fitSize(nm.textContent, 360, 34, 22) + 'px'; dp.appendChild(nm);
      dp.appendChild($('<div class="zmeta"><span class="ptag no">No.' + String(sel + 1).padStart(3, '0') + '</span>' + (own ? '<span class="ptag p-' + a.p + '">' + PNAME[a.p] + '</span>' : '') + '</div>'));
      const ds = $('<div class="zdesc"></div>'); ds.textContent = own ? a.d : 'まだ であって いない えいりあん。がちゃで よんでみよう。'; if (ds.textContent.length > 54) ds.style.fontSize = '16px'; dp.appendChild(ds);
      if (own) {
        const fb = btn(S.fav === sel ? 'おきにいり ちゅう' : 'おきにいりにする', 'pink zfav', null, null, null, null, () => {
          S.fav = sel; save(); fb.textContent = 'おきにいり ちゅう'; fb.classList.add('isfav'); al.react('great'); bub.say(line(sel, 'great'), 2600); chime('sparkle');
          const [x, y] = centerOf(al); burst(x, y, 18);
          grid.querySelectorAll('.fav').forEach(f => f.remove()); cards[sel].appendChild($('<i class="fav"></i>'));
        });
        if (S.fav === sel) fb.classList.add('isfav'); dp.appendChild(fb);
      }
    }
    detail();
    if (sel >= 0) later(() => { cards[sel].scrollIntoView({ block: 'nearest' }); }, 50);
  });
}

// ===================== せってい =====================
function settings() {
  openModal(m => {
    const p = place($('<div class="panel mpanel"></div>'), 380, 140, 520, 440);
    p.appendChild($('<div class="title-tag">せってい</div>'));
    const row = (label, key, top, fn) => {
      const r = place($('<div class="toggle-row"><span class="tl">' + label + '</span><div class="tg"><i></i></div></div>'), null, top);
      const tg = r.querySelector('.tg'); tg.classList.toggle('on', !!S[key]);
      tg.addEventListener('click', () => { ac(); S[key] = !S[key]; save(); tg.classList.toggle('on', S[key]); fn && fn(); se('tap', 0.4); });
      p.appendChild(r);
    };
    row('BGM', 'bgm', 50, () => { if (S.bgm) { ac(); startBgm(); } else stopBgm(); });
    row('こうかおん', 'se', 130);
    p.appendChild(btn('データを けす', 'peach', 110, 230, 300, 64, () => confirmBox('ほんとうに けす？<br>えねるぎーも なかまも<br>ぜんぶ きえるよ', 'けす', 'やめる', () => confirmBox('さいごの かくにん。<br>ほんとうに けしても いい？', 'けす', 'やめる', () => { const b = S.bgm, s = S.se; S = fresh(); S.bgm = b; S.se = s; save(); title(); }, 300), 320)));
    p.appendChild(btn('とじる', 'white', 110, 330, 300, 64, closeModal, 'tap'));
    m.appendChild(p);
  });
}

// ===== キー =====
addEventListener('keydown', e => { if (cur && cur._key) cur._key(e); });
addEventListener('pointerdown', () => ac(), { once: true });

// ===== スタート =====
const go = () => title();
if (document.fonts && document.fonts.ready) { let done = false; document.fonts.ready.then(() => { if (!done) { done = true; go(); } }); setTimeout(() => { if (!done) { done = true; go(); } }, 1500); }
else go();
// テスト用
window.__EA = { get S() { return S; }, set S(v) { S = v; }, save, home, select, quiz, spell, gacha, zukan, title, learn, result };
})();
