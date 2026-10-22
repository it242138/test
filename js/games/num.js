/* ============================================================
   ワイプ・アーケード：数字・年号のなかま
   ピタリ賞・ニアピン・ハイ＆ロー・金庫やぶり・どっち？・れんぞくハイ＆ロー
   ============================================================ */
(function (NW) {
'use strict';
const { $, $$, esc, ui } = NW;
const TW = ['none', 'hurry', 'mirror', 'shake', 'dark'];
const fmtV = (v, u) => NW.pool.fmtV(v, u);
const isY = it => it.unit === '年';
const dec = s => { const t = String(s); return t.includes('.') ? t.split('.')[1].length : 0; };
const snap = (v, st, lo) => { const k = Math.round((v - lo) / st); return Number((lo + k * st).toFixed(Math.max(dec(st), 0))); };

/* 答えのまわりの「はんい」を決める（答えがまん中にならないように、ずらす） */
function range(it){
  const a = it.answer;
  if (it.min != null && it.max != null && it.max > it.min) return { lo:it.min, hi:it.max, step:it.step || (Number.isInteger(a) && it.max - it.min <= 3000 ? 1 : (it.max - it.min) / 500) };
  let span, step;
  if (isY(it)) { span = a < 1000 ? 400 : a < 1800 ? 200 : 80; step = 1; }
  else {
    const m = Math.abs(a) || 10; span = m * NW.rnd(1.6, 2.4);
    step = it.step || (Number.isInteger(a) ? Math.max(1, Math.pow(10, Math.floor(Math.log10(span / 400)))) : Math.pow(10, Math.floor(Math.log10(span / 400))));
  }
  let lo = a - span * NW.rnd(0.15, 0.85);
  if (!isY(it) && a >= 0) lo = Math.max(0, lo);
  lo = Math.floor(lo / step) * step;
  return { lo, hi:lo + Math.ceil(span / step) * step, step };
}
const tolOf = (it, R) => isY(it) ? Math.max(2, Math.round((R.hi - R.lo) * 0.02)) : Math.max(R.step, Math.abs(it.answer) * 0.1);

/* ---------- ピタリ賞 ---------- */
NW.game({ id:'pitari', name:'ピタリ賞', icon:'≒', family:'num', shape:'num', twists:TW, hurry:10,
  desc:'スライダーで数字や年を合わせる。近ければ正解、ピッタリなら大ボーナス！', how:'スライダーと ＋ − で合わせて「これだ！」',
  render(it, done, ctx, box){
    const R = range(it), u = it.unit;
    let v = snap((R.lo + R.hi) / 2, R.step, R.lo), fin = false;
    box.innerHTML = ui.q(it.q) + `<div class="pt-val"><b class="num">${esc(fmtV(v, u))}</b></div>
      <input class="pt-range" type="range" min="${R.lo}" max="${R.hi}" step="${R.step}" value="${v}" aria-label="答えの数">
      <div class="pt-ends"><span>${esc(fmtV(R.lo, u))}</span><span>${esc(fmtV(R.hi, u))}</span></div>
      <div class="pt-fine">${[-10, -1, 1, 10].map(d => `<button data-d="${d}" type="button">${d < 0 ? '−' : '＋'}${Math.abs(d) === 10 ? Math.abs(d) * R.step : R.step}</button>`).join('')}</div>
      <button class="btn-main pt-go" type="button">これだ！</button>`;
    const rg = $('.pt-range', box), val = $('.pt-val b', box);
    const set = x => { v = snap(NW.clamp(x, R.lo, R.hi), R.step, R.lo); rg.value = v; val.textContent = fmtV(v, u); };
    rg.addEventListener('input', () => set(Number(rg.value)));
    $$('.pt-fine button', box).forEach(b => b.addEventListener('click', () => { set(v + Number(b.dataset.d) * R.step); ctx.sfx('tick'); }));
    const go = () => {
      if (fin) return; fin = true; rg.disabled = true; $$('button', box).forEach(b => { b.disabled = true; });
      const err = Math.abs(v - it.answer), tol = tolOf(it, R), ok = err <= tol, exact = err < R.step / 2;
      if (exact) NW.fx.banner('ピッタリ！', 'ピタリ賞', 'gold');
      val.innerHTML = `${esc(fmtV(v, u))} <small>答え ${esc(fmtV(it.answer, u))}</small>`;
      done(ok, { pts:exact ? 250 : ok ? Math.round(100 + 100 * (1 - err / tol)) : 0, reveal:exact ? 'ピッタリ！' : `答えは ${fmtV(it.answer, u)}（ずれ ${fmtV(Number(err.toFixed(dec(R.step))), u === '年' ? '年' : u)}）`, explainAlways:true });
    };
    $('.pt-go', box).addEventListener('click', go);
    ctx.keys(e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { set(v - R.step * (e.shiftKey ? 10 : 1)); return true; } if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { set(v + R.step * (e.shiftKey ? 10 : 1)); return true; } if (e.key === 'Enter') { go(); return true; } return false; });
    return { solve(ok){ set(ok ? it.answer : (it.answer - R.lo > (R.hi - R.lo) / 2 ? R.lo : R.hi)); go(); }, timeout(){ go(); } };
  } });

/* ---------- ニアピン ---------- */
NW.game({ id:'nearpin', name:'ニアピン', icon:'⚑', family:'num', shape:'num', twists:TW, hurry:6,
  desc:'数直線のどこに答えがあるか、1回タップして旗を立てる。近いほど高得点。', how:'答えがありそうな場所を、線の上でタップ',
  render(it, done, ctx, box){
    const R = range(it), u = it.unit, span = R.hi - R.lo, ticks = 4;
    box.innerHTML = ui.q(it.q) + `<div class="np-line"><div class="np-bar">${Array.from({ length:ticks + 1 }, (_, k) => `<span class="np-t" style="left:${k / ticks * 100}%"><i></i><small>${esc(fmtV(snap(R.lo + span * k / ticks, R.step, R.lo), u))}</small></span>`).join('')}<span class="np-pin" hidden>▼</span><span class="np-flag" hidden>⚑</span></div></div><p class="np-read num">線の上をタップ</p>`;
    const bar = $('.np-bar', box), pin = $('.np-pin', box), flag = $('.np-flag', box);
    let fin = false;
    const drop = frac => {
      if (fin) return; fin = true;
      frac = NW.clamp(frac, 0, 1);
      const v = snap(R.lo + span * frac, R.step, R.lo), err = Math.abs(v - it.answer), tol = Math.max(R.step, span * 0.06), ok = err <= tol;
      pin.hidden = false; pin.style.left = (frac * 100) + '%';
      flag.hidden = false; flag.style.left = ((it.answer - R.lo) / span * 100) + '%';
      $('.np-read', box).innerHTML = `あなた ${esc(fmtV(v, u))} ／ 答え <b>${esc(fmtV(it.answer, u))}</b>`;
      done(ok, { pts:ok ? Math.round(100 + 100 * (1 - err / tol)) : 0, reveal:`答えは ${fmtV(it.answer, u)}`, explainAlways:true });
    };
    bar.addEventListener('pointerdown', e => { const r = bar.getBoundingClientRect(); drop((e.clientX - r.left) / r.width); });
    return { solve:ok => drop(ok ? (it.answer - R.lo) / span : ((it.answer - R.lo) / span > 0.5 ? 0 : 1)), timeout:() => drop(-1) };
  } });

/* ---------- ハイ＆ロー ---------- */
NW.game({ id:'highlow', name:'ハイ＆ロー', icon:'⇅', family:'num', shape:'num', twists:['none', 'hurry', 'mirror', 'shake', 'dark', 'reverse'], hurry:3,
  desc:'ヒントの数字より、本当の答えは「上」か「下」か？ 1問2秒くらいでどんどん進む。', how:'↑ か ↓ をタップ（キーボードの ↑ ↓ でもOK）',
  render(it, done, ctx, box){
    const a = it.answer, u = it.unit, R = range(it), y = isY(it);
    let x;
    if (y) x = a + NW.pick([-1, 1]) * NW.irnd(1, Math.max(3, Math.round((R.hi - R.lo) * 0.12)));
    else { x = snap(a * (Math.random() < 0.5 ? NW.rnd(0.45, 0.9) : NW.rnd(1.12, 1.8)), R.step, 0); if (x === a) x = a + R.step; }
    const up = a > x, rev = ctx.reverse();
    const L = y ? ['あと（新しい）', 'まえ（古い）'] : ['大きい', '小さい'];
    box.innerHTML = ui.revNote(ctx).replace('ほんとなら ✕、うそなら ◯', '答えと逆のほうを選ぶ') + ui.q(it.q) + `<p class="hl-x">答えは <b class="num">${esc(fmtV(x, u))}</b> より…</p><div class="hl-btns"><button class="hl-b up" data-v="1" type="button"><b>↑</b>${L[0]}</button><button class="hl-b dn" data-v="0" type="button"><b>↓</b>${L[1]}</button></div>`;
    let fin = false;
    const pick = v => {
      if (fin) return; fin = true;
      const ok = rev ? v !== up : v === up;
      $$('.hl-b', box).forEach(b => { b.disabled = true; const bv = b.dataset.v === '1'; if (bv === (rev ? !up : up)) b.classList.add('is-right'); else if (bv === v) b.classList.add('is-wrong'); });
      done(ok, { pts:90, reveal:`答えは ${fmtV(a, u)}`, explainAlways:!ok, wait:ok ? 600 : 1500 });
    };
    $$('.hl-b', box).forEach(b => b.addEventListener('click', () => pick(b.dataset.v === '1')));
    ctx.keys(e => { if (e.key === 'ArrowUp') { pick(true); return true; } if (e.key === 'ArrowDown') { pick(false); return true; } return false; });
    return { solve:ok => pick(ok !== rev ? up : !up), timeout(){ if (fin) return; fin = true; done(false, { reveal:`時間切れ。答えは ${fmtV(a, u)}` }); } };
  } });

/* ---------- 金庫やぶり ---------- */
NW.game({ id:'kinko', name:'金庫やぶり', icon:'▣', family:'num', shape:'num', accept:it => Number.isInteger(it.answer) && it.answer >= 0 && it.answer < 100000, twists:TW, hurry:15,
  desc:'答えの数字が金庫の暗証番号。3回までためせる。まちがえると、1けたずつ「◯」「もっと上」「もっと下」のヒントが出る。', how:'▲ ▼（または数字キー）でダイヤルを合わせて「あける」',
  render(it, done, ctx, box){
    const ans = String(it.answer).split('').map(Number), D = ans.length, dig = Array(D).fill(0);
    let tries = 3, cur = 0, fin = false;
    box.innerHTML = ui.q(it.q) + `<div class="kk-safe"><div class="kk-dials">${ans.map((x, k) => `<div class="kk-d" data-k="${k}"><button class="kk-up" type="button" aria-label="${k + 1}けた目を上げる">▲</button><b class="num">0</b><button class="kk-dn" type="button" aria-label="${k + 1}けた目を下げる">▼</button><i class="kk-h"></i></div>`).join('')}${it.unit ? `<span class="kk-u">${esc(it.unit)}</span>` : ''}</div><p class="kk-tries">のこり <b>3</b> 回</p></div><button class="btn-main kk-go" type="button">あける</button>`;
    const paint = () => $$('.kk-d', box).forEach((d, k) => { $('b', d).textContent = dig[k]; d.classList.toggle('cur', k === cur); });
    const turn = (k, d) => { if (fin) return; dig[k] = (dig[k] + d + 10) % 10; cur = k; paint(); ctx.sfx('tick'); };
    $$('.kk-d', box).forEach((d, k) => { $('.kk-up', d).addEventListener('click', () => turn(k, 1)); $('.kk-dn', d).addEventListener('click', () => turn(k, -1)); $('b', d).addEventListener('click', () => { cur = k; paint(); }); });
    paint();
    const go = () => {
      if (fin) return;
      const ok = dig.every((x, k) => x === ans[k]);
      $$('.kk-d', box).forEach((d, k) => { const h = $('.kk-h', d); h.textContent = dig[k] === ans[k] ? '◯' : dig[k] < ans[k] ? '上' : '下'; d.className = 'kk-d ' + (dig[k] === ans[k] ? 'good' : 'bad'); });
      if (ok) { fin = true; $('.kk-safe', box).classList.add('open'); ctx.sfx('prize'); done(true, { pts:[100, 150, 220][tries - 1] }); return; }
      tries--; $('.kk-tries b', box).textContent = tries; ctx.sfx('bad'); NW.fx.shake($('.kk-safe', box));
      if (tries <= 0) { fin = true; $$('button', box).forEach(b => { b.disabled = true; }); done(false, { reveal:`暗証番号は ${it.answer}` }); }
    };
    $('.kk-go', box).addEventListener('click', go);
    ctx.keys(e => {
      if (/^[0-9]$/.test(e.key)) { dig[cur] = Number(e.key); cur = Math.min(D - 1, cur + 1); paint(); return true; }
      if (e.key === 'ArrowLeft') { cur = Math.max(0, cur - 1); paint(); return true; } if (e.key === 'ArrowRight') { cur = Math.min(D - 1, cur + 1); paint(); return true; }
      if (e.key === 'ArrowUp') { turn(cur, 1); return true; } if (e.key === 'ArrowDown') { turn(cur, -1); return true; }
      if (e.key === 'Enter') { go(); return true; } return false;
    });
    return { solve(ok){ if (ok) { ans.forEach((x, k) => { dig[k] = x; }); paint(); go(); } else { while (!fin) { dig.forEach((x, k) => { dig[k] = (ans[k] + 5) % 10; }); go(); } } }, timeout(){ fin = true; done(false, { reveal:`時間切れ。暗証番号は ${it.answer}` }); } };
  } });

/* ---------- どっち？ ---------- */
NW.game({ id:'docchi', name:'どっち？', icon:'⚖', family:'num', shape:'compare', twists:TW,
  desc:'2つのうち、古いのはどっち？ 大きいのはどっち？ 年号や数字をくらべる。', how:'左か右のカードをタップ（← → キーでもOK）',
  render(it, done, ctx, box){
    box.innerHTML = `<div class="q-box"><p class="q-text">${esc(it.q)}</p></div><div class="dc-row">${[it.a, it.b].map((c, i) => `<button class="dc-card opt" data-i="${i}" type="button"><kbd>${i ? '→' : '←'}</kbd><span class="opt-t">${esc(c.t)}</span><b class="dc-v num" hidden>${esc(c.disp)}</b></button>`).join('<span class="dc-vs">VS</span>')}</div>`;
    let fin = false;
    const pick = i => {
      if (fin) return; fin = true;
      $$('.dc-card', box).forEach((b, k) => { b.disabled = true; $('.dc-v', b).hidden = false; if (k === it.answer) b.classList.add('is-right'); else if (k === i) b.classList.add('is-wrong'); });
      done(i === it.answer, { pts:100 });
    };
    $$('.dc-card', box).forEach(b => b.addEventListener('click', () => pick(Number(b.dataset.i))));
    ctx.keys(e => { if (e.key === 'ArrowLeft' || e.key === '1') { pick(0); return true; } if (e.key === 'ArrowRight' || e.key === '2') { pick(1); return true; } return false; });
    return { solve:ok => pick(ok ? it.answer : 1 - it.answer), timeout:() => pick(-1) };
  } });

/* ---------- れんぞくハイ＆ロー ---------- */
NW.game({ id:'chain', name:'れんぞくハイ＆ロー', icon:'⇵', family:'num', shape:'card', kind:'board', minItems:3, twists:TW,
  desc:'今のカードとくらべて、次のカードは「あと／まえ（大きい／小さい）」？ 当たると次のカードが基準になって、どんどん続く。', how:'↑ か ↓ をタップ',
  mount(A, ctx){
    let cur = ctx.peek(1)[0], nx = null, fin = true, streak = 0, best = 0;
    const y = cur && cur.unit === '年', L = y ? ['あと', 'まえ'] : ['大きい', '小さい'];
    A.insertAdjacentHTML('beforeend', `<div class="round ch"><div class="ch-row"><div class="ch-card base"><small>いまのカード</small><span class="ch-t"></span><b class="num ch-v"></b></div><span class="ch-ar">→</span><div class="ch-card next"><small>つぎのカード</small><span class="ch-t"></span><b class="num ch-v">？</b></div></div>
      <p class="ch-ask"></p><div class="hl-btns"><button class="hl-b up" data-v="1" type="button"><b>↑</b>${L[0]}</button><button class="hl-b dn" data-v="0" type="button"><b>↓</b>${L[1]}</button></div><p class="ch-streak">れんぞく <b>0</b></p></div>`);
    const base = $('.ch-card.base', A), next = $('.ch-card.next', A);
    function deal(){
      if (!ctx.alive()) return;
      do { nx = ctx.take(); } while (nx && (nx.t === cur.t || nx.v === cur.v) && ctx.left() > 0);
      if (!nx || nx.v === cur.v) { ctx.done('clear'); return; }
      $('.ch-t', base).textContent = cur.t; $('.ch-v', base).textContent = cur.disp;
      $('.ch-t', next).textContent = nx.t; $('.ch-v', next).textContent = '？'; next.className = 'ch-card next';
      $('.ch-ask', A).textContent = y ? `「${nx.t}」は「${cur.t}」より あと？ まえ？` : `「${nx.t}」は「${cur.t}」より 大きい？ 小さい？`;
      $$('.hl-b', A).forEach(b => { b.disabled = false; b.className = b.className.replace(/ is-\w+/g, ''); });
      fin = false; ctx.startQ(() => pick(null));
    }
    function pick(v){
      if (fin) return; fin = true; ctx.stopQ();
      const up = nx.v > cur.v, ok = v === up;
      $('.ch-v', next).textContent = nx.disp; next.classList.add(ok ? 'is-right' : 'is-wrong');
      $$('.hl-b', A).forEach(b => { b.disabled = true; if ((b.dataset.v === '1') === up) b.classList.add('is-right'); });
      streak = ok ? streak + 1 : 0; best = Math.max(best, streak); $('.ch-streak b', A).textContent = streak;
      const alive = ctx.result(ok, { pts:90 + streak * 10, reveal:ok ? '' : `「${nx.t}」は ${nx.disp}` });
      cur = nx;
      if (alive) ctx.later(deal, ok ? 800 : 1600);
    }
    $$('.hl-b', A).forEach(b => b.addEventListener('click', () => pick(b.dataset.v === '1')));
    ctx.keys(e => { if (e.key === 'ArrowUp') { pick(true); return true; } if (e.key === 'ArrowDown') { pick(false); return true; } return false; });
    deal();
    return { solve:ok => { if (!fin) pick(ok ? nx.v > cur.v : !(nx.v > cur.v)); } };
  } });
})(window.NW);
