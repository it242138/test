/* ============================================================
   ワイプ・アーケード：なかまのなかま
   仕分けラッシュ・コネクション・なかまはずれ（1つの「なかま分け」問題＝1問）
   ============================================================ */
(function (NW) {
'use strict';
const { $, $$, esc, ui } = NW;
const TW = ['none', 'hurry', 'mirror', 'shake', 'dark'];
const COLORS = ['var(--c-blue)', 'var(--c-orange)', 'var(--c-green)', 'var(--c-pink)'];

/* ---------- 仕分けラッシュ ---------- */
NW.game({ id:'bunrui', name:'仕分けラッシュ', icon:'⊔', family:'groups', shape:'groups', recycle:true, twists:TW, hurry:10,
  desc:'ひとつずつ出てくることばを、正しいなかまの箱へ仕分ける。ミス1回まではOK。', how:'ことばが入る箱をタップ（数字キーでもOK）',
  render(it, done, ctx, box){
    const G = it.groups, all = NW.shuffle(G.flatMap((g, k) => g.items.map(t => ({ t, k })))).slice(0, 10);
    box.innerHTML = `<p class="pr-q">${esc(it.q)}</p><div class="br-now"><b class="opt-t"></b><small></small></div><div class="br-bins n${G.length}">${G.map((g, k) => `<button class="br-bin" data-k="${k}" type="button" style="--bc:${COLORS[k]}"><kbd>${k + 1}</kbd><span class="opt-t">${esc(g.name)}</span><i class="br-cnt">0</i></button>`).join('')}</div>`;
    let i = 0, miss = 0, fin = false; const cnt = G.map(() => 0);
    const show = () => { $('.br-now b', box).textContent = all[i].t; $('.br-now small', box).textContent = `${i + 1}/${all.length}`; const n = $('.br-now', box); n.classList.remove('in'); void n.offsetWidth; n.classList.add('in'); };
    show();
    const put = k => {
      if (fin) return;
      const c = all[i], bin = $(`.br-bin[data-k="${k}"]`, box);
      if (c.k === k) { cnt[k]++; $('.br-cnt', bin).textContent = cnt[k]; ctx.sfx('pick', { i:(i % 7) + 1 }); bin.classList.remove('hit'); void bin.offsetWidth; bin.classList.add('hit'); }
      else { miss++; ctx.sfx('bad'); const r = $(`.br-bin[data-k="${c.k}"]`, box); r.classList.remove('hint'); void r.offsetWidth; r.classList.add('hint'); if (bin) { bin.classList.remove('shake'); void bin.offsetWidth; bin.classList.add('shake'); } }
      i++;
      if (i >= all.length) { fin = true; $$('.br-bin', box).forEach(b => { b.disabled = true; }); done(miss <= 1, { pts:60 + 15 * all.length - 30 * miss, reveal:miss <= 1 ? (miss ? 'ミス1回！' : 'パーフェクト！') : `ミスが ${miss} 回…`, explainAlways:true }); }
      else show();
    };
    $('.br-bins', box).addEventListener('click', e => { const b = e.target.closest('.br-bin'); if (b && !b.disabled) put(Number(b.dataset.k)); });
    ctx.keys(e => { const k = Number(e.key); if (k >= 1 && k <= G.length) { put(k - 1); return true; } return false; });
    return { solve(ok){ if (!ok) miss = 2; while (!fin) put(all[i].k); }, timeout(){ if (fin) return; fin = true; done(false, { reveal:'時間切れ' }); } };
  } });

/* ---------- コネクション ---------- */
NW.game({ id:'connections', name:'コネクション', icon:'⊟', family:'groups', shape:'groups', twists:['none', 'mirror', 'shake', 'dark'],
  desc:'まざったことばの中から、同じなかまのグループを見つけ出す。まちがえていいのは3回まで！', how:'なかまだと思うことばを選んで「決定」',
  render(it, done, ctx, box){
    const G = it.groups.map((g, k) => ({ name:g.name, items:NW.shuffle(g.items).slice(0, 4), k }));
    let tiles = NW.shuffle(G.flatMap(g => g.items.map(t => ({ t, k:g.k })))), sel = new Set(), found = [], miss = 0, fin = false;
    const sizes = [...new Set(G.map(g => g.items.length))];
    box.innerHTML = `<p class="pr-q">${esc(it.q)}<small>${sizes.length === 1 ? `${sizes[0]}つずつのなかまが ${G.length} 組` : `なかまは ${G.length} 組（${G.map(g => g.items.length).join('・')}こ）`}</small></p><div class="cn-found"></div><div class="cn-grid"></div>
      <div class="cn-bar"><span class="cn-life">ミスできる回数 <b>●●●</b></span><button class="btn-sub cn-mix" type="button">まぜる</button><button class="btn-sub cn-clr" type="button">はずす</button><button class="btn-main cn-go" type="button" disabled>決定</button></div>`;
    const grid = $('.cn-grid', box), go = $('.cn-go', box);
    const left = () => G.filter(g => !found.includes(g.k));
    const paint = () => {
      grid.innerHTML = tiles.map((x, i) => `<button class="cn-t${sel.has(i) ? ' sel' : ''}" data-i="${i}" type="button"><span class="opt-t">${esc(x.t)}</span></button>`).join('');
      go.disabled = fin || !left().some(g => g.items.length === sel.size);
      $('.cn-life b', box).textContent = '●'.repeat(Math.max(0, 3 - miss)) + '○'.repeat(Math.min(3, miss));
    };
    const finish = ok => {
      fin = true; paint(); $$('button', box).forEach(b => { b.disabled = true; });
      done(ok, { pts:120 + 50 * G.length - 40 * miss, reveal:ok ? '' : '答え：' + G.map(g => `${g.name}（${g.items.join('・')}）`).join('／') });
    };
    const submit = () => {
      if (fin || go.disabled) return;
      const picks = [...sel].map(i => tiles[i]), ks = new Set(picks.map(x => x.k));
      if (ks.size === 1 && G[picks[0].k].items.length === picks.length) {
        const g = G[picks[0].k]; found.push(g.k); tiles = tiles.filter(x => x.k !== g.k); sel = new Set();
        $('.cn-found', box).insertAdjacentHTML('beforeend', `<div class="cn-g" style="--bc:${COLORS[found.length - 1]}"><b>${esc(g.name)}</b><span>${esc(g.items.join('・'))}</span></div>`);
        ctx.sfx('match');
        if (!left().length) { finish(true); return; }
        if (left().length === 1) { submitLast(); return; }
      } else {
        miss++; ctx.sfx('bad');
        const most = Math.max(...[...ks].map(k => picks.filter(x => x.k === k).length));
        if (most === picks.length - 1) NW.toast('おしい！ あと1つ');
        $$('.cn-t.sel', grid).forEach(b => { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); });
        if (miss >= 4) { finish(false); return; }
      }
      paint();
    };
    /* 最後の1組はのこりで自動的にきまる */
    const submitLast = () => { const g = left()[0]; found.push(g.k); tiles = []; $('.cn-found', box).insertAdjacentHTML('beforeend', `<div class="cn-g" style="--bc:${COLORS[found.length - 1]}"><b>${esc(g.name)}</b><span>${esc(g.items.join('・'))}</span></div>`); finish(true); };
    grid.addEventListener('click', e => { const b = e.target.closest('.cn-t'); if (!b || fin) return; const i = Number(b.dataset.i); if (sel.has(i)) sel.delete(i); else sel.add(i); ctx.sfx('tap'); paint(); });
    go.addEventListener('click', submit);
    $('.cn-mix', box).addEventListener('click', () => { const keep = [...sel].map(i => tiles[i]); tiles = NW.shuffle(tiles); sel = new Set(keep.map(x => tiles.indexOf(x))); paint(); });
    $('.cn-clr', box).addEventListener('click', () => { sel = new Set(); paint(); });
    ctx.keys(e => { if (e.key === 'Enter') { submit(); return true; } return false; });
    paint();
    return {
      solve(ok){
        if (!ok) { miss = 4; finish(false); return; }
        while (!fin) { const g = left()[0]; sel = new Set(tiles.map((x, i) => i).filter(i => tiles[i].k === g.k)); paint(); submit(); }
      },
      timeout(){ if (!fin) finish(false); }
    };
  } });

/* ---------- なかまはずれ ---------- */
NW.game({ id:'hazure', name:'なかまはずれ', icon:'◇', family:'groups', shape:'groups', recycle:true, twists:['none', 'hurry', 'mirror', 'shake', 'dark', 'shuffle'],
  desc:'ならんだことばの中に、1つだけちがうなかまがまざっている。それはどれ？', how:'なかまはずれをタップ（数字キーでもOK）',
  render(it, done, ctx, box){
    const big = NW.shuffle(it.groups).sort((a, b) => b.items.length - a.items.length)[0];
    const other = NW.pick(it.groups.filter(g => g !== big)), odd = NW.pick(other.items);
    const same = NW.shuffle(big.items).slice(0, Math.min(5, big.items.length));
    const list = NW.shuffle([odd, ...same]), ans = list.indexOf(odd);
    const c = ui.choice({ q:'なかまはずれはどれ？' + (it.q ? `\n（${it.q}）` : ''), choices:list, answer:ans }, (ok, info) => done(ok, Object.assign(info, { reveal:`「${odd}」は${other.name}。ほかは${big.name}`, explainAlways:true })), ctx, box, { cls:'hz' });
    return c;
  } });
})(window.NW);
