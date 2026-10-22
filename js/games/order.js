/* ============================================================
   ワイプ・アーケード：ならべるなかま
   ならべかえ・じゅんばんタッチ・年表づくり
   ============================================================ */
(function (NW) {
'use strict';
const { $, $$, esc, ui } = NW;
const TW = ['none', 'hurry', 'mirror', 'shake', 'dark'];
const answerList = it => it.items.map((x, i) => `${i + 1}. ${x}${it.values && it.values[i] != null ? `（${it.values[i]}）` : ''}`).join('　');

/* ---------- ならべかえ ---------- */
NW.game({ id:'narabe', name:'ならべかえ', icon:'↕', family:'order', shape:'order', twists:['none', 'hurry', 'mirror', 'shake', 'dark', 'shuffle'], hurry:12,
  desc:'バラバラになったものを、正しい順番にならべる。', how:'1番目から順にタップ。もう一度タップすると取り消し',
  render(it, done, ctx, box){
    const n = it.items.length;
    let order = NW.shuffle(it.items.map((x, i) => i)); if (order.every((x, k) => x === k)) order = order.reverse();
    box.innerHTML = ui.q(it.q) + `<div class="nb-pool opts">${order.map((i, k) => `<button class="nb-item opt" data-i="${i}" type="button"><span class="nb-n"><kbd>${k + 1}</kbd></span><span class="opt-t">${esc(it.items[i])}</span></button>`).join('')}</div><div class="nb-act"><button class="btn-sub nb-undo" type="button" disabled>ひとつもどす</button><button class="btn-sub nb-reset" type="button" disabled>やりなおし</button></div>`;
    let picked = [], fin = false;
    const paint = () => {
      $$('.nb-item', box).forEach(b => { const p = picked.indexOf(Number(b.dataset.i)); b.classList.toggle('on', p >= 0); $('.nb-n', b).innerHTML = p >= 0 ? `<b>${p + 1}</b>` : `<kbd>${order.indexOf(Number(b.dataset.i)) + 1}</kbd>`; });
      $('.nb-undo', box).disabled = $('.nb-reset', box).disabled = !picked.length || fin;
    };
    const judge = () => {
      fin = true; const ok = picked.every((x, k) => x === k), good = picked.filter((x, k) => x === k).length;
      $$('.nb-item', box).forEach(b => { const i = Number(b.dataset.i); b.disabled = true; b.classList.add(picked.indexOf(i) === i ? 'is-right' : 'is-wrong'); });
      paint();
      done(ok, { pts:120 + n * 15, reveal:ok ? (it.values ? answerList(it) : '') : `${good}/${n} こ合ってた。正しい順：${answerList(it)}`, explainAlways:!!it.values });
    };
    const tap = i => {
      if (fin) return;
      const p = picked.indexOf(i);
      if (p >= 0) picked = picked.slice(0, p); else { picked.push(i); ctx.sfx('pick', { i:picked.length }); }
      paint(); if (picked.length === n) judge();
    };
    $('.nb-pool', box).addEventListener('click', e => { const b = e.target.closest('.nb-item'); if (b && !b.disabled) tap(Number(b.dataset.i)); });
    $('.nb-undo', box).addEventListener('click', () => { picked.pop(); paint(); });
    $('.nb-reset', box).addEventListener('click', () => { picked = []; paint(); });
    ctx.keys(e => { const k = Number(e.key); if (k >= 1 && k <= n) { tap(order[k - 1]); return true; } if (e.key === 'Backspace') { picked.pop(); paint(); return true; } return false; });
    ctx.twistOpts(box);
    return { solve(ok){ picked = ok ? it.items.map((x, i) => i) : it.items.map((x, i) => i).reverse(); paint(); judge(); }, timeout(){ if (fin) return; fin = true; $$('.nb-item', box).forEach(b => { b.disabled = true; }); done(false, { reveal:`時間切れ。正しい順：${answerList(it)}` }); } };
  } });

/* ---------- じゅんばんタッチ ---------- */
NW.game({ id:'touch', name:'じゅんばんタッチ', icon:'☝', family:'order', shape:'order', twists:TW, hurry:6,
  desc:'画面にちらばったものを、正しい順番にすばやくタッチ。1回でもまちがえたらアウト！', how:'1番目から順にタップ',
  render(it, done, ctx, box){
    const n = it.items.length, cols = n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
    const cells = NW.shuffle(Array.from({ length:cols * rows }, (_, k) => k)).slice(0, n);
    box.innerHTML = ui.q(it.q) + `<div class="tc-field field">${it.items.map((x, i) => { const c = cells[i]; return `<button class="tc-item" data-i="${i}" type="button" style="left:${NW.clamp((c % cols + 0.5) / cols * 100 + NW.rnd(-6, 6), 23, 77)}%;top:${(Math.floor(c / cols) + 0.5) / rows * 100 + NW.rnd(-8, 8)}%;--r:${NW.irnd(-8, 8)}deg"><span class="opt-t">${esc(x)}</span></button>`; }).join('')}</div>`;
    const lim = ctx.rules.perQ || (5 + n * 1.5), t0 = Date.now();
    let next = 0, fin = false;
    const end = (ok, why) => {
      fin = true; $$('.tc-item', box).forEach(b => { b.disabled = true; });
      const sp = Math.max(0, 1 - (Date.now() - t0) / NW.ms(lim * 1000));
      done(ok, { pts:Math.round(100 + 100 * sp), reveal:ok ? '' : `${why}正しい順：${answerList(it)}` });
    };
    const tap = i => {
      if (fin) return;
      const b = $(`.tc-item[data-i="${i}"]`, box);
      if (i !== next) { if (b) b.classList.add('is-wrong'); ctx.sfx('bad'); end(false, ''); return; }
      b.classList.add('done'); b.insertAdjacentHTML('afterbegin', `<b class="tc-n">${next + 1}</b>`); ctx.sfx('pick', { i:next + 1 }); next++;
      if (next >= n) end(true);
    };
    $('.tc-field', box).addEventListener('pointerdown', e => { const b = e.target.closest('.tc-item'); if (b && !b.disabled && !b.classList.contains('done')) tap(Number(b.dataset.i)); });
    ctx.startQ(() => { if (!fin) end(false, '時間切れ。'); }, lim);
    return { selfTimer:true, solve(ok){ if (!ok) { tap(next === 0 ? 1 : 0); return; } while (!fin) tap(next); } };
  } });

/* ---------- 年表づくり ---------- */
NW.game({ id:'timeline', name:'年表づくり', icon:'┆', family:'order', shape:'card', kind:'board', minItems:4, twists:TW,
  desc:'出来事のカードを1枚ずつ、年表の正しい位置に入れていく。だんだん年表が長くなって、むずかしくなる！', how:'カードが入る「ここ」をタップ',
  mount(A, ctx){
    let placed = [], nx = null, fin = true, built = 0;
    A.insertAdjacentHTML('beforeend', `<div class="round tl"><div class="tl-new"><small>このカードはどこ？</small><b class="tl-nt"></b></div><div class="tl-list"></div></div>`);
    const list = $('.tl-list', A);
    let markCls = '';
    function start(){ const f = ctx.peek(1)[0]; placed = f ? [f] : []; built++; }
    function draw(mark){
      list.innerHTML = '<button class="tl-slot" data-k="0" type="button">ここ</button>' + placed.map((c, k) => `<div class="tl-card${mark === c ? ' ' + markCls : ''}"><b class="num">${esc(c.disp)}</b><span>${esc(c.t)}</span></div><button class="tl-slot" data-k="${k + 1}" type="button">ここ</button>`).join('');
      $$('.tl-slot', list).forEach(s => { s.disabled = fin; });
    }
    function deal(){
      if (!ctx.alive()) return;
      if (placed.length >= 8) { NW.fx.banner('年表かんせい！ +200', '年表', 'gold'); ctx.addScore(200); start(); }
      do { nx = ctx.take(); } while (nx && placed.some(c => c.t === nx.t) && ctx.left() > 0);
      if (!nx || placed.some(c => c.t === nx.t)) { ctx.done('clear'); return; }
      $('.tl-nt', A).textContent = nx.t;
      fin = false; draw(); ctx.startQ(() => slot(-1));
    }
    function slot(k){
      if (fin) return; fin = true; ctx.stopQ();
      const lo = placed.filter(c => c.v < nx.v).length, hi = placed.filter(c => c.v <= nx.v).length, ok = k >= lo && k <= hi;
      placed.splice(lo, 0, nx); markCls = ok ? 'is-right' : 'is-wrong';
      draw(nx); ctx.sfx(ok ? 'match' : 'bad');
      const alive = ctx.result(ok, { pts:80 + placed.length * 15, reveal:ok ? '' : `「${nx.t}」は ${nx.disp}`, quiet:false });
      if (alive) ctx.later(deal, ok ? 700 : 1600);
    }
    list.addEventListener('click', e => { const s = e.target.closest('.tl-slot'); if (s && !s.disabled) slot(Number(s.dataset.k)); });
    start(); deal();
    return { solve(ok){ if (fin) return; const lo = placed.filter(c => c.v < nx.v).length, hi = placed.filter(c => c.v <= nx.v).length; slot(ok ? lo : (hi < placed.length ? placed.length : (lo > 0 ? 0 : -1))); } };
  } });
})(window.NW);
