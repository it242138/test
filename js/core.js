/* ============================================================
   ワイプ・アーケード：共通の道具
   保存・効果音・振動・トースト・シート・演出（紙吹雪・ハンコ・テロップ）
   （ニュースワイプの core.js をもとにした軽い版）
   ============================================================ */
window.NW = window.NW || {};
(function (NW) {
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
NW.$ = $; NW.$$ = $$;
const OS_REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
NW.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
NW.pad = (n, w) => String(n).padStart(w || 2, '0');
NW.pick = a => a[Math.floor(Math.random() * a.length)];
NW.rnd = (a, b) => a + Math.random() * (b - a);
NW.irnd = (a, b) => Math.floor(NW.rnd(a, b + 1));
NW.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
NW.fmt = n => Math.round(n).toLocaleString('ja-JP');
NW.shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = r[i]; r[i] = r[j]; r[j] = t; } return r; };
/* テスト用：?test=1 で待ち時間を短くする（全形式の自動テストで使う） */
NW.T = /[?&]test=1/.test(location.search) ? 0.08 : 1;
NW.ms = ms => Math.max(1, ms * NW.T);
NW.later = (fn, ms) => setTimeout(fn, NW.ms(ms));
NW.wait = ms => new Promise(r => setTimeout(r, NW.reduce ? Math.min(NW.ms(ms), 40) : NW.ms(ms)));
NW.today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
NW.hash = str => { let h = 2166136261; for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ---------- 保存（このブラウザの中だけ） ---------- */
const PREFIX = 'arcade1:';
NW.store = {
  get(k, d){ try { const v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v){ try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k){ try { localStorage.removeItem(PREFIX + k); } catch (e) {} },
  clear(){ try { Object.keys(localStorage).filter(k => k.indexOf(PREFIX) === 0).forEach(k => localStorage.removeItem(k)); } catch (e) {} }
};

/* ---------- 設定（音量・動き・振動） ---------- */
NW.prefs = Object.assign({ volume:80, motion:'normal', vibrate:true, typing:'normal', confetti:1, theme:'auto' }, NW.store.get('prefs', {}));
NW.soundOn = NW.store.get('sound', true);
NW.reduce = OS_REDUCE || NW.prefs.motion === 'off' || NW.T < 1;
NW.fxOn = () => NW.prefs.motion !== 'off' && NW.T === 1;
NW.savePrefs = () => { NW.store.set('prefs', NW.prefs); NW.reduce = OS_REDUCE || NW.prefs.motion === 'off' || NW.T < 1; document.documentElement.classList.toggle('still', NW.prefs.motion === 'off'); if (master) master.gain.value = 0.9 * NW.prefs.volume / 100; };

/* ---------- 効果音（Web Audioで合成。音声ファイルは使わない） ---------- */
let acted = false;
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { acted = true; }, { capture:true, passive:true }));
let ac = null, master = null, noiseBuf = null;
function ctx(){
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.9 * NW.prefs.volume / 100; master.connect(ac.destination); }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(f, t, d, type, g, f2){
  const o = ac.createOscillator(), v = ac.createGain();
  o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g || 0.1, t + 0.012); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(v); v.connect(master); o.start(t); o.stop(t + d + 0.03);
}
function noise(t, d, g, freq){
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.6), ac.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain();
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = freq || 1200;
  v.gain.setValueAtTime(g || 0.1, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(v); v.connect(master); s.start(t); s.stop(t + d + 0.02);
}
NW.sfx = function (name, o){
  if (!NW.soundOn || !acted || NW.prefs.volume <= 0 || NW.T < 1) return;
  o = o || {};
  try {
    ctx(); const t = ac.currentTime;
    switch (name) {
      case 'ok': { const s = Math.pow(2, NW.clamp((o.combo || 1) - 1, 0, 9) / 12); [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f * s, t + i * 0.055, 0.2)); break; }
      case 'ng': tone(220, t, 0.18, 'square', 0.05); tone(185, t + 0.12, 0.26, 'square', 0.05); break;
      case 'vote': tone(659.25, t, 0.14); tone(987.77, t + 0.08, 0.2); break;
      case 'tap': tone(880, t, 0.05, 'sine', 0.05); break;
      case 'pick': tone(587.33 * Math.pow(2, ((o.i || 1) - 1) * 2 / 12), t, 0.09, 'sine', 0.08); break;
      case 'stamp': noise(t, 0.12, 0.2, 900); tone(120, t, 0.18, 'sine', 0.22, 60); break;
      case 'pop': tone(520, t, 0.09, 'sine', 0.12, 1500); break;
      case 'bad': tone(300, t, 0.16, 'sawtooth', 0.05, 140); break;
      case 'spin': for (let i = 0; i < 9; i++) tone(380 + i * 55, t + i * 0.075, 0.06, 'square', 0.035); break;
      case 'drop': tone(760, t, 0.26, 'sine', 0.1, 170); noise(t + 0.24, 0.09, 0.12, 600); break;
      case 'prize': [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone(f, t + i * 0.07, 0.35, 'sine', 0.09)); break;
      case 'rare': [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => tone(f, t + i * 0.065, 0.5, 'triangle', 0.08)); noise(t, 0.7, 0.025, 7000); break;
      case 'hit': noise(t, 0.14, 0.25, 2200); tone(190, t, 0.15, 'square', 0.07, 80); break;
      case 'boss': tone(92, t, 0.6, 'sawtooth', 0.07, 52); tone(62, t + 0.1, 0.6, 'square', 0.05, 44); break;
      case 'hurt': noise(t, 0.26, 0.18, 520); tone(150, t, 0.3, 'sawtooth', 0.06, 70); break;
      case 'lvup': [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.08, 0.28, 'square', 0.045)); break;
      case 'find': [1046.5, 1318.5, 1567.98, 2093].forEach((f, i) => tone(f, t + i * 0.05, 0.25, 'sine', 0.07)); break;
      case 'beep': tone(o.f || 1200, t, 0.05, 'sine', 0.035); break;
      case 'whoosh': noise(t, 0.3, 0.07, 3200); break;
      case 'type': tone(1350 + Math.random() * 250, t, 0.022, 'square', 0.01); break;
      case 'start': tone(523.25, t, 0.12, 'square', 0.05); tone(783.99, t + 0.12, 0.25, 'square', 0.05); break;
      case 'clear': [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.09, 0.3, 'triangle', 0.08)); break;
      case 'buzzer': tone(1318.5, t, 0.12, 'square', 0.06); tone(1760, t + 0.1, 0.22, 'square', 0.06); break;
      case 'flip': noise(t, 0.06, 0.08, 2600); tone(700, t, 0.06, 'sine', 0.05, 1100); break;
      case 'match': tone(784, t, 0.1, 'triangle', 0.08); tone(1175, t + 0.08, 0.18, 'triangle', 0.08); break;
      case 'up': tone(440, t, 0.12, 'sine', 0.07, 880); break;
      case 'down': tone(880, t, 0.12, 'sine', 0.07, 440); break;
      case 'tick': tone(1600, t, 0.025, 'square', 0.02); break;
      case 'dice': for (let i = 0; i < 6; i++) tone(600 + Math.random() * 500, t + i * 0.05, 0.04, 'square', 0.03); break;
      case 'pop2': tone(380, t, 0.08, 'sine', 0.12, 900); noise(t, 0.05, 0.06, 4000); break;
    }
  } catch (e) {}
};


/* ---------- トースト ---------- */
let toastT = 0;
NW.toast = function (msg){
  const el = $('#toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1900);
};

/* ---------- 下から出るシート（PCでは中央のダイアログ） ---------- */
let sheetOpen = false, lastFocus = null;
NW.sheet = {
  open(title, html){
    const scrim = $('#scrim'), sheet = $('#sheet');
    lastFocus = document.activeElement;
    $('#sheet-title').textContent = title; $('#sheet-body').innerHTML = html;
    scrim.hidden = false; sheet.hidden = false; sheetOpen = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('show'); sheet.classList.add('show'); }));
    setTimeout(() => { const c = $('.sheet-close', sheet); if (c) c.focus({ preventScroll:true }); }, 30);
  },
  close(){
    if (!sheetOpen) return; sheetOpen = false;
    const scrim = $('#scrim'), sheet = $('#sheet');
    scrim.classList.remove('show'); sheet.classList.remove('show');
    setTimeout(() => { if (!sheetOpen) { scrim.hidden = true; sheet.hidden = true; } }, NW.reduce ? 0 : 280);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
  },
  isOpen(){ return sheetOpen; }
};



/* ---------- 演出 ---------- */
const layer = () => $('#fx');
const center = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const done = (a, el) => { a.onfinish = () => el.remove(); a.oncancel = () => el.remove(); };
NW.fx = {
  center,
  /* 紙吹雪 */
  burst(x, y, o){
    o = o || {};
    if (NW.reduce || !NW.fxOn('burst')) return;
    const mul = NW.prefs.confetti * (1);
    const L = layer(), n = Math.max(2, Math.round((o.n || 18) * mul));
    const colors = o.colors || ['var(--ok)', 'var(--live)', 'var(--future)', 'var(--c-gold)', 'var(--c-pink)'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'fx-p' + (Math.random() < 0.35 ? ' round' : '');
      p.style.background = NW.pick(colors); p.style.left = x + 'px'; p.style.top = y + 'px';
      L.appendChild(p);
      const a = Math.random() * Math.PI * 2, d = (o.spread || 110) * (0.35 + Math.random() * 0.85);
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d - (o.lift == null ? 34 : o.lift), rot = NW.rnd(-540, 540);
      done(p.animate([
        { transform:'translate(0,0) rotate(0deg) scale(1)', opacity:1 },
        { transform:`translate(${dx}px,${dy}px) rotate(${rot * 0.6}deg) scale(1)`, opacity:1, offset:0.55 },
        { transform:`translate(${dx * 1.1}px,${dy + 90}px) rotate(${rot}deg) scale(.4)`, opacity:0 }
      ], { duration: NW.rnd(700, 1150), easing:'cubic-bezier(.15,.7,.35,1)' }), p);
    }
  },
  /* ハンコ（正解・残念・解明など） */
  stamp(host, text, tone){
    if (!host) return;
    if (!NW.fxOn('stamp')) { NW.sfx('stamp'); return; }
    const s = document.createElement('div');
    s.className = 'fx-stamp fx-stamp-' + (tone || 'ok') + (Array.from(text).length >= 4 ? ' long' : '');
    s.innerHTML = `<span>${NW.esc(text)}</span>`;
    host.appendChild(s);
    NW.sfx('stamp'); NW.buzz(18);
    if (!NW.reduce) {
      s.animate([
        { transform:'translate(-50%,-50%) scale(2.6) rotate(-22deg)', opacity:0 },
        { transform:'translate(-50%,-50%) scale(.92) rotate(-9deg)', opacity:1, offset:0.7 },
        { transform:'translate(-50%,-50%) scale(1) rotate(-9deg)', opacity:1 }
      ], { duration:320, easing:'cubic-bezier(.3,.6,.4,1)', fill:'forwards' });
    }
    setTimeout(() => { const a = s.animate([{ opacity:1 }, { opacity:0 }], { duration:320, fill:'forwards' }); done(a, s); }, NW.reduce ? 700 : 1050);
  },
  /* テレビの速報テロップのように横切る帯 */
  banner(main, sub, tone){
    if (!NW.fxOn('banner')) return;
    const L = layer(), b = document.createElement('div');
    b.className = 'fx-banner fx-banner-' + (tone || 'live');
    b.innerHTML = `<div class="fx-banner-in"><span class="fx-banner-tag">${NW.esc(sub || '速報')}</span><span class="fx-banner-main">${NW.esc(main)}</span></div>`;
    L.appendChild(b);
    const kf = NW.reduce
      ? [{ opacity:0 }, { opacity:1, offset:0.15 }, { opacity:1, offset:0.85 }, { opacity:0 }]
      : [{ transform:'translateX(105%)' }, { transform:'translateX(0)', offset:0.18 }, { transform:'translateX(0)', offset:0.82 }, { transform:'translateX(-105%)' }];
    done(b.animate(kf, { duration:2000, easing:'cubic-bezier(.3,.7,.3,1)' }), b);
  },
  /* 浮かんで消える文字（+300 など） */
  float(x, y, text, cls){
    if (!NW.fxOn('float')) return;
    const L = layer(), f = document.createElement('span');
    f.className = 'fx-float ' + (cls || ''); f.textContent = text; f.style.left = x + 'px'; f.style.top = y + 'px';
    L.appendChild(f);
    done(f.animate([
      { transform:'translate(-50%,-50%) scale(.6)', opacity:0 },
      { transform:'translate(-50%,-90%) scale(1.15)', opacity:1, offset:0.25 },
      { transform:'translate(-50%,-230%) scale(1)', opacity:0 }
    ], { duration: NW.reduce ? 700 : 1050, easing:'ease-out' }), f);
  },
  shake(el, k){
    if (NW.reduce || !el || !NW.fxOn('shake')) return;
    k = (k || 1) * (1);
    el.animate([0, -8, 7, -6, 4, -2, 0].map(v => ({ transform:`translate(${v * k}px,${v * k * 0.3}px)` })), { duration:380 });
  },
  flash(tone){
    if (!NW.fxOn('flash')) return;
    const L = layer(), f = document.createElement('div');
    f.className = 'fx-flash fx-flash-' + (tone || 'ng'); L.appendChild(f);
    done(f.animate([{ opacity:0 }, { opacity:0.45, offset:0.2 }, { opacity:0 }], { duration: NW.reduce ? 200 : 420 }), f);
  },
  /* AからBへ弧を描いて飛ぶ（ボス戦の攻撃など） */
  fly(a, b, html, o){
    o = o || {};
    return new Promise(res => {
      if (!a || !b) { res(); return; }
      const A = center(a), B = center(b), L = layer(), p = document.createElement('div');
      p.className = 'fx-fly ' + (o.cls || ''); p.innerHTML = html; p.style.left = A.x + 'px'; p.style.top = A.y + 'px';
      L.appendChild(p);
      if (NW.reduce) { p.remove(); res(); return; }
      const dx = B.x - A.x, dy = B.y - A.y, lift = o.lift == null ? -80 : o.lift, spin = o.spin == null ? 360 : o.spin;
      const an = p.animate([
        { transform:'translate(-50%,-50%) translate(0px,0px) rotate(0deg) scale(.7)' },
        { transform:`translate(-50%,-50%) translate(${dx * 0.5}px,${dy * 0.5 + lift}px) rotate(${spin}deg) scale(1.1)`, offset:0.5 },
        { transform:`translate(-50%,-50%) translate(${dx}px,${dy}px) rotate(${spin * 2}deg) scale(.95)` }
      ], { duration: o.ms || 520, easing:'cubic-bezier(.4,.1,.6,1)' });
      an.onfinish = () => { p.remove(); res(); };
      an.oncancel = () => { p.remove(); res(); };
    });
  }
};



/* ---------- 1文字ずつ出るセリフ ---------- */
NW.type = function (el, text, o){
  o = o || {};
  const chars = Array.from(text);
  let i = 0, timer = 0, resolve;
  const ctl = { done:false };
  ctl.promise = new Promise(r => { resolve = r; });
  const finish = () => { if (ctl.done) return; ctl.done = true; el.classList.remove('typing'); resolve(); };
  ctl.skip = () => { clearTimeout(timer); el.textContent = text; finish(); };
  if (el._typer) el._typer.skip();
  el._typer = ctl;
  const per = { instant:0, fast:14, normal:30, slow:56 }[NW.prefs.typing];
  if (NW.reduce || o.instant || per === 0) { el.textContent = text; finish(); return ctl; }
  const k = (per || 30) / 30;
  el.textContent = ''; el.classList.add('typing');
  (function step(){
    if (ctl.done) return;
    i++; el.textContent = chars.slice(0, i).join('');
    if (o.sound !== false && i % 3 === 1) NW.sfx('type');
    if (i >= chars.length) { finish(); return; }
    const c = chars[i - 1];
    timer = setTimeout(step, ('、。！？…'.indexOf(c) >= 0 ? 150 : (o.speed || 30)) * k);
  })();
  return ctl;
};



/* ---------- 小さなアイコン ---------- */
NW.icon = {
  lamp:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 18.5h5.6M10.2 21.3h3.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M12 2.8a6.2 6.2 0 0 0-3.7 11.2c.7.6 1.1 1.4 1.1 2.3h5.2c0-.9.4-1.7 1.1-2.3A6.2 6.2 0 0 0 12 2.8z" fill="var(--c-gold)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  ticket:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4z" fill="var(--c-pink)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 6.5v11" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 2"/></svg>',
  star:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/></svg>',
  heart:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5S3.5 15.3 3.5 9.3A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.5 2.5c0 6-8.5 11.2-8.5 11.2z" fill="var(--c-red)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  flame:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c1 3.4 5.6 5.4 5.6 10.6A5.6 5.6 0 0 1 12 21a5.6 5.6 0 0 1-5.6-5.6c0-2.6 1.5-4 2.5-5 .2 1.6 1 2.4 1.9 2.6-.5-2.8.2-6.4 1.2-10.5z" fill="var(--c-orange)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  book:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  feed:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 20h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  me:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 20c1.2-3.6 4-5.2 7.5-5.2s6.3 1.6 7.5 5.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
};
NW.buzz = ms => { try { if (NW.prefs.vibrate && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
NW.stars = (n, max) => `<span class="stars" role="img" aria-label="星${n}"><b aria-hidden="true">${'★'.repeat(n)}</b><span aria-hidden="true">${'★'.repeat((max || 3) - n)}</span></span>`;
NW.download = (name, text, type) => {
  const blob = new Blob([text], { type:type || 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
};
NW.savePrefs();
})(window.NW);
