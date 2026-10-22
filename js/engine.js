/* ============================================================
   ワイプ・アーケード：ゲームエンジン
   ・遊びの種類（game）× 進め方（flow）× ひねり（twist）＝ 形式（format）
   ・1回のプレイ（セッション）の得点・コンボ・ライフ・時間・記録
   ・ゲームに渡す道具（ctx）と、1問ずつ進むゲーム用のループ
   ゲームの作り方は README の「ゲームを作る」を見てね
   ============================================================ */
window.NW = window.NW || {};
(function (NW) {
'use strict';
const { $, $$, esc, store, fx } = NW;
const sfx = (n, o) => NW.sfx(n, o);

/* ---------- 進め方とひねり ---------- */
NW.FLOWS = {
  quick:   { name:'5問',           short:'5問',   count:5,  size:'s', desc:'5問でさくっと' },
  std:     { name:'10問',          short:'10問',  count:10, size:'m', desc:'10問でしっかり' },
  long:    { name:'20問',          short:'20問',  count:20, size:'l', desc:'20問のロングコース' },
  time60:  { name:'60秒',          short:'60秒',  time:60,  size:'m', desc:'60秒で何問いける？' },
  survival:{ name:'ライフ3',       short:'ライフ3', lives:3, size:'m', desc:'3回まちがえるまで続く' },
  sudden:  { name:'1ミスで終わり', short:'一発',  lives:1,  size:'m', desc:'1回まちがえたら終わり' }
};
NW.TWISTS = {
  none:   { name:'ふつう',       pre:'',          desc:'ひねりなし' },
  hurry:  { name:'せかせか',     pre:'せかせか',  desc:'1問5秒以内' },
  mirror: { name:'かがみ',       pre:'かがみ',    desc:'文字が左右反対になる' },
  shake:  { name:'ゆらゆら',     pre:'ゆらゆら',  desc:'問題がゆれる' },
  dark:   { name:'くらやみ',     pre:'くらやみ',  desc:'ライトで照らしたところだけ見える' },
  blind:  { name:'ちらり',       pre:'ちらり',    desc:'選択肢は2秒で消える' },
  shuffle:{ name:'シャッフル',   pre:'シャッフル', desc:'選択肢が動き回る' },
  reverse:{ name:'あまのじゃく', pre:'あまのじゃく', desc:'ほんとだと思ったら「うそ」を選ぶ' }
};
NW.FAMILIES = {
  choice:{ name:'4択・クイズ', icon:'Ａ' }, tf:{ name:'○×', icon:'○' }, num:{ name:'数字・年号', icon:'#' }, order:{ name:'ならべる', icon:'↕' },
  pairs:{ name:'ペア', icon:'⇄' }, groups:{ name:'なかま', icon:'◇' }, word:{ name:'ことば', icon:'あ' }, board:{ name:'ボード・バトル', icon:'▦' }, mix:{ name:'ミックス', icon:'★' }
};
const FLOW_IDS = Object.keys(NW.FLOWS);
const BASE_TWISTS = ['none', 'hurry', 'mirror', 'shake', 'dark'];

/* ---------- 遊びの種類の登録 ---------- */
NW.games = {};
NW.game = function (def){
  NW.games[def.id] = Object.assign({ flows:FLOW_IDS, twists:BASE_TWISTS, minItems:1, kind:'round', family:def.shape }, def);
};

/* ---------- 形式のカタログ（遊びの種類 × 進め方 × ひねり ＋ パックのオリジナル形式） ---------- */
let CAT = null;
NW.catalog = function (){
  if (CAT) return CAT;
  CAT = [];
  Object.values(NW.games).forEach(g => g.flows.forEach(f => g.twists.forEach(t => {
    CAT.push({ id:`${g.id}.${f}.${t}`, game:g.id, flow:f, twist:t, name:fname(g, f, t) });
  })));
  (NW.packs ? NW.packs.enabled() : []).forEach(p => p.formats.forEach(f => {
    if (!NW.games[f.game]) return;
    const g = NW.games[f.game];
    CAT.push({ id:`custom:${p.id}:${f.id}`, game:f.game, flow:NW.FLOWS[f.flow] ? f.flow : 'std', twist:NW.TWISTS[f.twist] ? f.twist : 'none', name:f.name, custom:true, pack:p.id, pack_title:p.title, description:f.description || '',
      filter:f.filter ? { tags:f.filter.tags, level:f.filter.level, pack:f.filter.thisPackOnly ? p.id : undefined } : null, base:fname(g, f.flow || 'std', f.twist || 'none') });
  }));
  return CAT;
};
NW.catalog.reset = () => { CAT = null; };
NW.catalog.byId = id => NW.catalog().find(f => f.id === id);
function fname(g, f, t){ const T = NW.TWISTS[t]; return `${T && T.pre ? T.pre + ' ' : ''}${g.name}（${NW.FLOWS[f].name}）`; }

/* ---------- 記録 ---------- */
const REC = store.get('best', {});
NW.records = {
  get: id => REC[id] || null,
  stars: () => Object.values(REC).reduce((s, r) => s + (r.stars || 0), 0),
  plays: () => store.get('plays', 0),
  gameStars(gid){ return Object.keys(REC).filter(k => k.split('.')[0] === gid || k.split(':')[2] && (NW.catalog.byId(k) || {}).game === gid).reduce((s, k) => s + (REC[k].stars || 0), 0); },
  gameDone(gid){ return Object.keys(REC).filter(k => k.split('.')[0] === gid).length; },
  save(id, r){ const o = REC[id] || { score:0, stars:0, plays:0 }; const best = r.score > o.score; REC[id] = { score:Math.max(o.score, r.score), stars:Math.max(o.stars, r.stars), plays:o.plays + 1, at:NW.today() }; store.set('best', REC); store.set('plays', NW.records.plays() + 1); return best && o.plays > 0; },
  clear(){ Object.keys(REC).forEach(k => { delete REC[k]; }); store.set('best', REC); store.set('plays', 0); }
};

/* ---------- 画面の部品（ゲームから使う） ---------- */
const br = s => esc(s).replace(/\n/g, '<br>');
NW.ui = {
  br,
  q:(text, cls) => `<div class="q-box ${cls || ''}"><p class="q-text">${br(text)}</p></div>`,
  opts:(choices, cls) => `<div class="opts ${cls || ''} n${choices.length}">${choices.map((c, i) => `<button class="opt" data-i="${i}" type="button"><kbd>${i + 1}</kbd><span class="opt-t">${esc(c)}</span></button>`).join('')}</div>`,
  /* 選択肢をタップ・数字キーで選ぶ */
  bindOpts(box, ctx, fn){
    const h = e => { const b = e.target.closest('.opt[data-i]'); if (b && box.contains(b) && !b.disabled) fn(Number(b.dataset.i), b); };
    box.addEventListener('click', h);
    ctx.keys(e => { const n = Number(e.key); const b = $(`.opt[data-i="${n - 1}"]`, box); if (n >= 1 && b && !b.disabled) { fn(n - 1, b); return true; } return false; });
    return () => box.removeEventListener('click', h);
  },
  markOpts(box, answer, picked){
    $$('.opt', box).forEach(b => { const i = Number(b.dataset.i); b.disabled = true; if (i === answer) b.classList.add('is-right'); else if (i === picked) b.classList.add('is-wrong'); });
  },
  mascot:(mood, cls) => NW.art ? NW.art.mascot(mood || 'normal', cls || '') : '',
  /* いちばん基本の「問題文＋選択肢」。o.pts() で点数、o.after(ok) で答えたあとの演出 */
  choice(it, done, ctx, box, o){
    o = o || {};
    box.innerHTML = (o.head || '') + NW.ui.q(it.q) + NW.ui.opts(it.choices, o.cls) + (o.foot || '');
    const right = () => `正解は「${it.choices[it.answer]}」`;
    const pick = i => {
      NW.ui.markOpts(box, it.answer, i);
      const ok = i === it.answer;
      if (o.after) o.after(ok, i);
      done(ok, { reveal:ok ? '' : right(), pts:o.pts ? o.pts(ok) : 100, penalty:o.penalty ? o.penalty() : 0, wait:o.wait });
    };
    NW.ui.bindOpts(box, ctx, pick);
    ctx.twistOpts(box);
    return {
      solve:ok => pick(ok ? it.answer : (it.answer + 1) % it.choices.length),
      timeout:() => { NW.ui.markOpts(box, it.answer, -1); if (o.after) o.after(false, -1); done(false, { reveal:'時間切れ。' + right(), penalty:o.penalty ? o.penalty() : 0 }); }
    };
  },
  /* まちがいの選択肢を n こ選んで、正解とまぜる（2択や3つの扉など） */
  narrow(it, n){
    const wrong = NW.shuffle(it.choices.filter((c, i) => i !== it.answer)).slice(0, n - 1);
    const list = NW.shuffle([it.choices[it.answer], ...wrong]);
    return { q:it.q, choices:list, answer:list.indexOf(it.choices[it.answer]), explain:it.explain, src:it.src };
  },
  /* 指でスワイプ（左右）を受けとる */
  swipe(el, fn, o){
    o = o || {};
    let x0 = null, y0 = 0, id = null;
    el.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; id = e.pointerId; });
    el.addEventListener('pointermove', e => { if (x0 == null || e.pointerId !== id) return; const dx = e.clientX - x0; if (o.drag) o.drag(dx); });
    const up = e => {
      if (x0 == null || e.pointerId !== id) return;
      const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) fn(dx < 0 ? 'left' : 'right'); else if (o.drag) o.drag(0, true);
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', e => { x0 = null; if (o.drag) o.drag(0, true); });
  },
  /* あまのじゃく（○×の逆を選ぶ）の説明 */
  revNote:ctx => ctx.reverse() ? '<p class="rev-note">あまのじゃく：ほんとなら ✕、うそなら ◯</p>' : ''
};

/* ============================================================
   セッション（1回のプレイ）
   ============================================================ */
let S = null;
const scr = () => $('#scr-play'), arena = () => $('#arena');
NW.session = () => S;

NW.play = function (fid){
  const fm = typeof fid === 'string' ? NW.catalog.byId(fid) : fid;
  if (!fm) { NW.toast('その形式が見つかりません'); return false; }
  const g = NW.games[fm.game], F = NW.FLOWS[fm.flow];
  NW.pool.clear();   /* 選択肢の順番などを毎回まぜなおす */
  const why = NW.canPlay(g, fm.filter);
  if (why) { NW.toast(why); return false; }
  if (S) end('quit', true);
  const avail = NW.shapesOf(g, fm.filter);
  S = {
    fm, g, alive:true, score:0, combo:0, maxCombo:0, correct:0, wrong:0, answered:0, served:0, t0:Date.now(),
    lives:F.lives || 0, livesMax:F.lives || 0, tLeft:F.time || 0, timers:[], loops:[], keyFn:null, qOn:false, qLeft:0, qMax:0, onQ:null, decks:{}, shapes:avail, miss:[], cleanup:[],
    rules:{ flow:fm.flow, twist:fm.twist, count:F.count || Infinity, time:F.time || 0, lives:F.lives || 0, perQ:fm.twist === 'hurry' ? (g.hurry || 5) : 0, size:F.size, filter:fm.filter }
  };
  NW.show('play');
  const A = arena();
  A.className = 'arena tw-' + fm.twist + ' g-' + g.id;
  A.innerHTML = '';
  $('#ph-name').textContent = fm.name;
  $('#ph-rule').textContent = `${NW.FLOWS[fm.flow].desc}${fm.twist !== 'none' ? '／' + NW.TWISTS[fm.twist].desc : ''}`;
  $('#feedback').hidden = true;
  paintHUD();
  if (fm.twist === 'dark') darkness(A);
  const ctx = makeCtx(A);
  S.ctx = ctx;
  try { S.ctl = g.kind === 'round' ? NW.roundLoop(ctx, g) : g.mount(A, ctx); }
  catch (e) { console.error(e); NW.toast('このゲームを始められませんでした：' + e.message); end('error', true); return false; }
  S.loops.push(loop(dt => {
    if (!S || !S.alive) return;
    if (S.rules.time) { S.tLeft -= dt; if (S.tLeft <= 0) { S.tLeft = 0; paintHUD(); end('time'); return; } }
    if (S.qOn) { S.qLeft -= dt; if (S.qLeft <= 0) { S.qOn = false; const f = S.onQ; S.onQ = null; if (f) f(); } }
    paintTimers();
  }));
  sfx('start');
  return true;
};
/* ゲームで使える問題（形 × しぼりこみ × ゲームごとの条件） */
const gpool = (g, sh, filter) => { const p = NW.pool(sh, filter); return g.accept ? p.filter(g.accept) : p; };
NW.shapesOf = (g, filter) => (Array.isArray(g.shape) ? g.shape : [g.shape]).filter(sh => gpool(g, sh, filter).length >= (g.minItems || 1));
NW.gpool = gpool;
/* 遊べないときは理由を返す（遊べるなら ''） */
NW.canPlay = function (g, filter){
  if (g.need) { const w = g.need(filter); if (w) return w; }
  if (NW.shapesOf(g, filter).length) return '';
  const shapes = Array.isArray(g.shape) ? g.shape : [g.shape];
  return `このゲームに使える問題が足りません（${shapes.map(s => SHAPE_NEED[s] || s).join('・')}が${g.minItems > 1 ? g.minItems + 'こ以上' : ''}ひつよう）`;
};
const SHAPE_NEED = { choice:'選択・○×・年号などの問題', tf:'○×・選択などの問題', num:'数字・年号の問題', compare:'label 付きの数字・年号の問題（2こ以上）', order:'ならべかえ、または label 付きの年号（4こ以上）',
  pairs:'ペアの問題', groups:'なかま分けの問題', word:'ことばの問題', card:'label 付きの年号・数字の問題' };

function makeCtx(A){
  const s = S;
  const ctx = {
    area:A, rules:s.rules, fm:s.fm,
    alive:() => S === s && s.alive,
    /* 問題を1つもらう。決まった数に達したら null */
    take(shape){
      if (!ctx.alive()) return null;
      if (s.served >= s.rules.count) return null;
      const sh = shape || s.shapes[0];
      const pool = gpool(s.g, sh, s.rules.filter); if (!pool.length) return null;
      const d = s.decks[sh] || (s.decks[sh] = { list:NW.shuffle(pool), i:0, round:0 });
      if (d.i >= d.list.length) {
        if (s.rules.count !== Infinity && d.round === 0 && s.served > 0 && !s.g.recycle) { s.rules.count = s.served; return null; }  /* 問題が足りないときは、そこまで */
        d.list = NW.shuffle(pool); d.i = 0; d.round++;
      }
      s.served++; paintHUD(); $('#feedback').hidden = true;
      return d.list[d.i++];
    },
    /* まとめて n こ（数に入れない。ボードの準備用） */
    /* 数に入れるだけ（ボードのゲームで、peek で選んだ問題を出すとき） */
    serve(){ if (!ctx.alive() || s.served >= s.rules.count) return false; s.served++; paintHUD(); $('#feedback').hidden = true; return true; },
    peek(n, shape){ return NW.shuffle(gpool(s.g, shape || s.shapes[0], s.rules.filter)).slice(0, n); },
    poolSize:shape => gpool(s.g, shape || s.shapes[0], s.rules.filter).length,
    shapes:() => s.shapes.slice(),
    left:() => s.rules.count === Infinity ? Infinity : s.rules.count - s.served,
    st:{},
    result:(ok, info) => result(s, ok, info || {}),
    done:(reason, extra) => { if (ctx.alive()) end(reason || 'clear', false, extra); },
    addScore:n => { s.score = Math.max(0, s.score + n); paintHUD(); },
    setScore:n => { s.score = Math.max(0, n); paintHUD(); },
    startQ(onTimeout, sec){
      const t = sec || s.rules.perQ; if (!t) { s.qOn = false; return; }
      s.qMax = t; s.qLeft = t; s.qOn = true; s.onQ = onTimeout; paintTimers();
    },
    stopQ(){ s.qOn = false; s.onQ = null; paintTimers(); },
    keys(fn){ s.keyFn = fn; },
    later(fn, ms){ const id = setTimeout(() => { if (ctx.alive()) fn(); }, NW.ms(ms)); s.timers.push(id); return id; },
    every(fn, ms){ const id = setInterval(() => { if (ctx.alive()) fn(); else clearInterval(id); }, NW.ms(ms)); s.timers.push(id); return id; },
    loop(fn){ const stop = loop(dt => { if (ctx.alive()) fn(dt); }); s.loops.push(stop); return stop; },
    /* 効果音・演出（ゲームから） */
    sfx:(n, o) => sfx(n, o),
    float(el, text, cls){ if (!el) return; const c = fx.center(el); fx.float(c.x, c.y, text, cls); },
    burst(el, o){ if (!el) return; const c = fx.center(el); fx.burst(c.x, c.y, o); },
    /* 選択肢のひねり（ちらり・シャッフル） */
    twistOpts(box){
      if (s.rules.twist === 'blind') ctx.later(() => { $$('.opt:not(:disabled) .opt-t', box).forEach(t => t.classList.add('blinded')); }, 2000);
      if (s.rules.twist === 'shuffle') {
        const wrap = $('.opts', box) || box;
        const id = ctx.every(() => {
          const btns = $$('.opt', wrap); if (btns.some(b => b.disabled)) { clearInterval(id); return; }
          const first = new Map(btns.map(b => [b, b.getBoundingClientRect()]));
          NW.shuffle(btns).forEach(b => wrap.appendChild(b));
          btns.forEach(b => { const a = first.get(b), z = b.getBoundingClientRect(); if (!NW.reduce) b.animate([{ transform:`translate(${a.left - z.left}px,${a.top - z.top}px)` }, { transform:'none' }], { duration:260 }); });
        }, 1600);
      }
    },
    reverse:() => s.rules.twist === 'reverse',
    toast:t => NW.toast(t),
    say(text, mood){ const b = $('#ph-say'); if (!b) return; b.innerHTML = `<span class="ph-face">${NW.ui.mascot(mood || 'happy')}</span><span class="ph-bubble">${esc(text)}</span>`; b.hidden = false; }
  };
  return ctx;
}

/* ---------- 答えの結果 ---------- */
function result(s, ok, info){
  if (S !== s || !s.alive) return false;
  s.answered++;
  const A = arena();
  if (ok) {
    s.correct++; s.combo++; s.maxCombo = Math.max(s.maxCombo, s.combo);
    const mult = 1 + Math.min(s.combo - 1, 9) * 0.1, pts = Math.round((info.pts == null ? 100 : info.pts) * mult);
    s.score += pts;
    if (!info.quiet) { mark(A, true); sfx('ok', { combo:s.combo }); NW.buzz(15); if (s.combo >= 3 && s.combo % 5 === 0) fx.banner(`${s.combo}コンボ！`, 'すごい', 'gold'); }
  } else {
    s.wrong++; s.combo = 0;
    if (info.q && s.miss.length < 30) s.miss.push({ q:info.q, reveal:info.reveal || '', explain:info.explain || '' });
    if (info.penalty) s.score = Math.max(0, s.score - info.penalty);
    if (!info.quiet) { mark(A, false); sfx('ng'); NW.buzz([30, 40, 30]); }
    if (s.livesMax) s.lives--;
  }
  feedback(ok, info);
  paintHUD();
  if (s.livesMax && s.lives <= 0) { NW.later(() => end('lives'), ok ? 600 : 1300); s.alive = false; return false; }
  return true;
}
function mark(A, ok){
  const m = document.createElement('div');
  m.className = 'big-mark ' + (ok ? 'ok' : 'ng'); m.textContent = ok ? '◯' : '✕';
  A.appendChild(m); setTimeout(() => m.remove(), NW.ms(650));
}
function feedback(ok, info){
  const f = $('#feedback');
  const t = [info.reveal, info.explain].filter(Boolean).join('　');
  if (!t || (ok && !info.explainAlways && !info.reveal)) { f.hidden = true; return; }
  f.className = 'feedback ' + (ok ? 'ok' : 'ng'); f.innerHTML = `<b>${ok ? '正解！' : 'ざんねん'}</b> ${esc(t)}`; f.hidden = false;
}

/* ---------- 表示 ---------- */
function paintHUD(){
  if (!S) return;
  $('#ph-score').innerHTML = `<b class="num">${NW.fmt(S.score)}</b><small>点</small>`;
  $('#ph-lives').innerHTML = S.livesMax ? Array.from({ length:S.livesMax }, (_, i) => `<span class="hrt${i < S.lives ? '' : ' lost'}">♥</span>`).join('') : '';
  const c = S.rules.count;
  $('#ph-count').textContent = c === Infinity ? `${S.correct}問正解` : `${Math.min(S.served, c)}/${c}`;
  $('#ph-prog').style.width = c === Infinity ? '0%' : `${Math.min(100, S.answered / c * 100)}%`;
  $('#ph-combo').textContent = S.combo >= 2 ? `${S.combo}コンボ` : '';
  paintTimers();
}
function paintTimers(){
  if (!S) return;
  const t = $('#ph-time');
  if (S.rules.time) { t.hidden = false; t.textContent = S.tLeft.toFixed(1) + '秒'; t.classList.toggle('low', S.tLeft < 10); } else t.hidden = true;
  const w = $('#ph-qtw'), q = $('#ph-qt');
  w.hidden = !S.qOn;
  if (S.qOn) { q.style.width = Math.max(0, S.qLeft / S.qMax * 100) + '%'; q.classList.toggle('low', S.qLeft < 2); }
}

/* ---------- くらやみ（ライトで照らしたところだけ見える） ---------- */
function darkness(A){
  const d = document.createElement('div'); d.className = 'tw-darkness'; document.body.appendChild(d);
  const top = () => A.getBoundingClientRect().top;
  const set = (x, y) => { d.style.top = top() + 'px'; d.style.setProperty('--dx', x + 'px'); d.style.setProperty('--dy', (y - top()) + 'px'); };
  const mv = e => set(e.clientX, e.clientY);
  A.addEventListener('pointermove', mv); A.addEventListener('pointerdown', mv);
  requestAnimationFrame(() => { const r = A.getBoundingClientRect(); set(r.left + r.width / 2, r.top + r.height * 0.35); });
  S.cleanup.push(() => d.remove());
}

/* ---------- おわり ---------- */
function end(reason, silent, extra){
  if (!S) return;
  const s = S; s.alive = false;
  s.timers.forEach(id => { clearTimeout(id); clearInterval(id); }); s.loops.forEach(f => f());
  s.cleanup.forEach(f => { try { f(); } catch (e) {} });
  try { if (s.ctl && s.ctl.destroy) s.ctl.destroy(); } catch (e) {}
  s.keyFn = null; s.qOn = false;
  S = null;
  if (silent) return;
  extra = extra || {};
  if (s.g.summary) { try { extra = Object.assign({}, s.g.summary(s.ctx.st, s), extra); } catch (e) { console.error(e); } }
  const acc = s.answered ? s.correct / s.answered : 0;
  let stars = extra.stars;
  if (stars == null) {
    if (s.rules.count === Infinity && !s.rules.lives) stars = s.correct >= 15 ? 3 : s.correct >= 8 ? 2 : s.correct >= 3 ? 1 : 0;
    else if (s.rules.count === Infinity) stars = s.correct >= 12 ? 3 : s.correct >= 6 ? 2 : s.correct >= 2 ? 1 : 0;
    else stars = !s.answered ? 0 : acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.4 ? 1 : 0;
  }
  if (reason === 'quit' && !s.answered) { NW.show('home'); return; }
  const rec = { score:s.score, stars }, best = NW.records.save(s.fm.id, rec);
  NW.showResult({ fm:s.fm, g:s.g, reason, score:s.score, correct:s.correct, answered:s.answered, maxCombo:s.maxCombo, stars, best, acc, extra, miss:s.miss, secs:Math.round((Date.now() - s.t0) / 1000) });
}
NW.quit = () => { if (S) end('quit'); };
NW.forceEnd = () => { if (S) end('time'); };

/* ---------- キー操作 ---------- */
document.addEventListener('keydown', e => {
  if (!S || !S.alive || NW.sheet.isOpen()) return;
  if (e.key === 'Escape') { NW.quit(); return; }
  if (e.target.closest && e.target.closest('input,textarea,select')) return;
  if (e.target.closest && e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
  if (S.keyFn && S.keyFn(e)) e.preventDefault();
});

/* ---------- 1問ずつ進むゲームのループ ---------- */
NW.roundLoop = function (ctx, g){
  let cur = null, alive = true, settled = false, item = null;
  if (g.setup) g.setup(ctx.area, ctx, ctx.st);
  const host = () => ctx.st.host || ctx.area;
  function next(){
    if (!alive || !ctx.alive()) return;
    if (g.before) g.before(ctx, ctx.st);
    const it = ctx.take(ctx.st.shape); if (!it) { ctx.done('clear'); return; }
    item = it; settled = false;
    const box = document.createElement('div'); box.className = 'round';
    $$('.round', host()).forEach(r => r.remove());
    host().prepend(box);
    ctx.keys(null);
    const done = (ok, info) => {
      if (settled || !alive) return false; settled = true; ctx.stopQ(); ctx.keys(null);
      info = info || {};
      const cont = ctx.result(ok, Object.assign({ explain:it.explain, q:it.a && it.b ? `${it.q}（${it.a.t}／${it.b.t}）` : (it.q || '') }, info));
      if (cont && !info.hold) ctx.later(next, info.wait || (ok ? 750 : 1700));
      return cont;
    };
    cur = g.render(it, done, ctx, box) || {};
    if (!settled && !cur.selfTimer) ctx.startQ(() => { if (cur.timeout) cur.timeout(); else done(false, { reveal:'時間切れ' }); });
  }
  ctx.next = () => ctx.later(next, 350);
  next();
  return { destroy(){ alive = false; if (cur && cur.destroy) cur.destroy(); if (g.teardown) g.teardown(ctx); }, solve(ok){ if (cur && cur.solve && !settled) cur.solve(ok); else if (ctx.st.solve) ctx.st.solve(ok); }, item:() => item };
};

/* rAF ループ（おわったら止める） */
function loop(fn){ let raf = 0, last = 0, on = true; const step = ts => { if (!on) return; raf = requestAnimationFrame(step); const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0); last = ts; fn(dt / NW.T); }; raf = requestAnimationFrame(step); return () => { on = false; cancelAnimationFrame(raf); }; }

/* テスト用（tools のテストや、うごき確認に） */
NW.test = { solve:ok => S && S.ctl && S.ctl.solve && S.ctl.solve(ok), state:() => S && { served:S.served, answered:S.answered, correct:S.correct, score:S.score, lives:S.lives, alive:S.alive, game:S.g.id } };
})(window.NW);
