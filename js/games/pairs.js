/* ============================================================
   ワイプ・アーケード：ペアのなかま
   神経衰弱・線むすび・ペアラッシュ（1つの「ペア」問題＝1問）
   ============================================================ */
(function (NW) {
'use strict';
const { $, $$, esc, ui } = NW;
const TW = ['none', 'mirror', 'shake', 'dark'];
const sample = (it, max) => NW.shuffle(it.pairs).slice(0, Math.min(max, it.pairs.length));
const list = ps => ps.map(p => `${p[0]}＝${p[1]}`).join('、');

/* ---------- 神経衰弱 ---------- */
NW.game({ id:'memory', name:'神経衰弱', icon:'▚', family:'pairs', shape:'pairs', twists:TW,
  desc:'うらがえしのカードを2枚ずつめくって、ペアを見つける。少ないミスでそろえるほど高得点。', how:'カードを2枚タップしてめくる',
  render(it, done, ctx, box){
    const ps = sample(it, 6), n = ps.length;
    const cards = NW.shuffle(ps.flatMap((p, k) => [{ k, s:0, t:p[0] }, { k, s:1, t:p[1] }]));
    box.innerHTML = `<p class="pr-q">${esc(it.q)}<small>（ミス ${n} 回までならクリア）</small></p><div class="mm-grid c${cards.length > 8 ? 4 : 4}">${cards.map((c, i) => `<button class="mm-c s${c.s}" data-i="${i}" type="button"><span class="mm-back">？</span><span class="mm-face"><span class="opt-t">${esc(c.t)}</span></span></button>`).join('')}</div><p class="mm-miss">ミス <b>0</b></p>`;
    let open = [], got = 0, miss = 0, fin = false, busy = false;
    const els = $$('.mm-c', box);
    const flip = i => {
      if (fin || busy) return;
      const el = els[i]; if (el.classList.contains('up')) return;
      el.classList.add('up'); ctx.sfx('flip'); open.push(i);
      if (open.length < 2) return;
      const [a, b] = open.map(x => cards[x]); open = open.slice();
      const pair = open; open = [];
      if (a.k === b.k && a.s !== b.s) {
        pair.forEach(x => els[x].classList.add('got')); got++; ctx.sfx('match');
        if (got === n) { fin = true; done(miss <= n, { pts:Math.max(60, 100 + 40 * n - 25 * miss), reveal:miss <= n ? `ミス ${miss} 回でクリア！` : `ミスが ${miss} 回で多すぎた…`, explainAlways:true }); }
      } else {
        miss++; $('.mm-miss b', box).textContent = miss; busy = true;
        ctx.later(() => { pair.forEach(x => els[x].classList.remove('up')); busy = false; }, 750);
      }
    };
    $('.mm-grid', box).addEventListener('click', e => { const b = e.target.closest('.mm-c'); if (b) flip(Number(b.dataset.i)); });
    return {
      solve(ok){ if (fin) return; if (!ok) miss = n + 1; els.forEach(e => e.classList.add('up', 'got')); fin = true; done(ok, { pts:100 }); },
      timeout(){ if (fin) return; fin = true; els.forEach(e => e.classList.add('up')); done(false, { reveal:`時間切れ。${list(ps)}` }); }
    };
  } });

/* ---------- 線むすび ---------- */
NW.game({ id:'senmusubi', name:'線むすび', icon:'⟋', family:'pairs', shape:'pairs', twists:['none', 'hurry', 'mirror', 'shake', 'dark'], hurry:15,
  desc:'左と右で、ペアになるものを線でむすぶ。ミス1回まではOK。', how:'左をタップ → 右をタップで線がつながる',
  render(it, done, ctx, box){
    const ps = sample(it, 6), n = ps.length, L = NW.shuffle(ps.map((p, k) => k)), R = NW.shuffle(ps.map((p, k) => k));
    box.innerHTML = `<p class="pr-q">${esc(it.q)}</p><div class="sm-wrap"><svg class="sm-svg" aria-hidden="true"></svg><div class="sm-col l">${L.map(k => `<button class="sm-i opt" data-k="${k}" data-s="l" type="button"><span class="opt-t">${esc(ps[k][0])}</span><i class="sm-dot"></i></button>`).join('')}</div><div class="sm-col r">${R.map(k => `<button class="sm-i opt" data-k="${k}" data-s="r" type="button"><i class="sm-dot"></i><span class="opt-t">${esc(ps[k][1])}</span></button>`).join('')}</div></div><p class="mm-miss">ミス <b>0</b></p>`;
    const wrap = $('.sm-wrap', box), svg = $('.sm-svg', box);
    let sel = null, miss = 0, got = 0, fin = false; const lines = [];
    const draw = () => {
      const w = wrap.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${w.width} ${w.height}`);
      svg.innerHTML = lines.map(([k, cls]) => {
        const a = $(`.sm-col.l [data-k="${k}"] .sm-dot`, wrap).getBoundingClientRect(), b = $(`.sm-col.r [data-k="${k}"] .sm-dot`, wrap).getBoundingClientRect();
        return `<line class="${cls}" x1="${a.left + a.width / 2 - w.left}" y1="${a.top + a.height / 2 - w.top}" x2="${b.left + b.width / 2 - w.left}" y2="${b.top + b.height / 2 - w.top}"/>`;
      }).join('');
    };
    const ro = window.ResizeObserver ? new ResizeObserver(draw) : null; if (ro) ro.observe(wrap);
    const tap = b => {
      if (fin || b.disabled) return;
      if (!sel || sel.dataset.s === b.dataset.s) { if (sel) sel.classList.remove('sel'); sel = b; b.classList.add('sel'); ctx.sfx('tap'); return; }
      const a = sel; sel = null; a.classList.remove('sel');
      if (a.dataset.k === b.dataset.k) {
        a.disabled = b.disabled = true; a.classList.add('got'); b.classList.add('got'); lines.push([Number(a.dataset.k), 'ok']); draw(); ctx.sfx('match'); got++;
        if (got === n) { fin = true; done(miss <= 1, { pts:100 + 30 * n - 40 * miss, reveal:miss <= 1 ? '' : `ミスが ${miss} 回…` }); }
      } else {
        miss++; $('.mm-miss b', box).textContent = miss; ctx.sfx('bad');
        [a, b].forEach(x => { x.classList.remove('shake'); void x.offsetWidth; x.classList.add('shake'); });
      }
    };
    wrap.addEventListener('click', e => { const b = e.target.closest('.sm-i'); if (b) tap(b); });
    return {
      destroy:() => { if (ro) ro.disconnect(); },
      solve(ok){ if (fin) return; if (!ok) miss = 2; ps.forEach((p, k) => { if (!lines.some(l => l[0] === k)) lines.push([k, 'ok']); }); draw(); fin = true; done(ok, { pts:100 }); },
      timeout(){ if (fin) return; fin = true; ps.forEach((p, k) => { if (!lines.some(l => l[0] === k)) lines.push([k, 'ng']); }); draw(); done(false, { reveal:`時間切れ。${list(ps)}` }); }
    };
  } });

/* ---------- ペアラッシュ ---------- */
NW.game({ id:'pairrush', name:'ペアラッシュ', icon:'⚡', family:'pairs', shape:'pairs', twists:['none', 'hurry', 'mirror', 'shake', 'dark'], hurry:7,
  desc:'まん中に出てくることばのペアを、下のボタンから大急ぎでさがす。そろうとボタンが消えていく。', how:'まん中のことばとペアになるボタンをタップ',
  render(it, done, ctx, box){
    const ps = sample(it, 6), n = ps.length, order = NW.shuffle(ps.map((p, k) => k));
    box.innerHTML = `<p class="pr-q">${esc(it.q)}</p><div class="pz-target"><small>これのペアは？</small><b class="opt-t"></b><span class="pz-left"></span></div><div class="pz-grid opts n${n}">${NW.shuffle(ps.map((p, k) => k)).map((k, i) => `<button class="opt pz-b" data-k="${k}" type="button"><kbd>${i + 1}</kbd><span class="opt-t">${esc(ps[k][1])}</span></button>`).join('')}</div>`;
    const lim = ctx.rules.perQ || 2.2 * n + 2, t0 = Date.now();
    let cur = 0, miss = 0, fin = false;
    const show = () => { $('.pz-target b', box).textContent = ps[order[cur]][0]; $('.pz-left', box).textContent = `${cur + 1}/${n}`; };
    show();
    const tap = b => {
      if (fin || b.disabled) return;
      if (Number(b.dataset.k) === order[cur]) {
        b.disabled = true; b.classList.add('got'); ctx.sfx('pick', { i:cur + 1 }); cur++;
        if (cur >= n) { fin = true; const sp = Math.max(0, 1 - (Date.now() - t0) / NW.ms(lim * 1000)); done(miss <= 1, { pts:Math.round(80 + 20 * n - 30 * miss + 80 * sp), reveal:miss <= 1 ? '' : `ミスが ${miss} 回…` }); }
        else show();
      } else { miss++; ctx.sfx('bad'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
    };
    $('.pz-grid', box).addEventListener('click', e => { const b = e.target.closest('.pz-b'); if (b) tap(b); });
    ctx.keys(e => { const k = Number(e.key), b = $$('.pz-b', box)[k - 1]; if (b) { tap(b); return true; } return false; });
    ctx.startQ(() => { if (fin) return; fin = true; $$('.pz-b', box).forEach(b => { b.disabled = true; }); done(false, { reveal:`時間切れ。${list(ps)}` }); }, lim);
    return { selfTimer:true, solve(ok){ if (!ok) miss = 2; while (!fin) tap($(`.pz-b[data-k="${order[cur]}"]`, box)); } };
  } });
})(window.NW);
