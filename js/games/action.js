/* ============================================================
   ワイプ・アーケード：アクションのなかま
   風船わり・もぐらたたき・レーンラン・キャッチ
   動くものに答えが書いてある。問題を読みながら、すばやく正解をつかまえる
   ============================================================ */
(function (NW) {
'use strict';
const { $, $$, esc, ui } = NW;
const TW = ['none', 'mirror', 'shake', 'dark'];

/* ---------- 風船わり ---------- */
NW.game({ id:'fuusen', name:'風船わり', icon:'○', family:'action', shape:'choice', twists:TW,
  desc:'答えの書いた風船が下から飛んでくる。正解の風船が逃げる前にわろう！', how:'正解の風船をタップ（数字キーでもOK）',
  render(it, done, ctx, box){
    box.innerHTML = ui.q(it.q) + '<div class="fs-field field"></div>';
    const f = $('.fs-field', box), W = f.clientWidth || 320, H = f.clientHeight || 300, n = it.choices.length;
    const lanes = NW.shuffle(it.choices.map((c, i) => i));
    const colors = NW.shuffle(['var(--c-pink)', 'var(--c-blue)', 'var(--c-green)', 'var(--c-yellow)', 'var(--c-orange)', 'var(--c-lilac)']);
    const bs = it.choices.map((c, i) => {
      const el = document.createElement('button'); el.type = 'button'; el.className = 'fs-b'; el.dataset.i = i;
      el.style.setProperty('--bc', colors[i % colors.length]); el.style.width = Math.min(150, W / n - 8) + 'px';
      el.innerHTML = `<span class="fs-in"><kbd>${i + 1}</kbd><span class="opt-t">${esc(c)}</span></span><i class="fs-str" aria-hidden="true"></i>`;
      f.appendChild(el);
      return { el, i, x:(lanes[i] + 0.5) * W / n, y:H + 20 + Math.random() * 70 + lanes[i] * 18, v:H / NW.rnd(6.2, 7.6), ph:Math.random() * 6, gone:false };
    });
    let fin = false, t = 0;
    const judge = (i, why) => {
      if (fin) return; fin = true; stop();
      const b = bs[i], ok = i === it.answer;
      if (b) { b.el.classList.add(ok ? 'pop' : 'pop-ng'); ctx.sfx(ok ? 'pop' : 'bad'); }
      bs.forEach(x => { x.el.disabled = true; if (x.i === it.answer && !ok) x.el.classList.add('is-right'); });
      done(ok, { pts:Math.round(80 + 80 * Math.max(0, Math.min(1, b ? b.y / H : 0))), reveal:ok ? '' : (why || '') + `正解は「${it.choices[it.answer]}」` });
    };
    const stop = ctx.loop(dt => {
      t += dt;
      bs.forEach(b => {
        if (b.gone) return;
        b.y -= b.v * dt;
        const h = b.el.offsetHeight || 60;
        b.el.style.transform = `translate(${b.x - b.el.offsetWidth / 2 + Math.sin(t * 1.7 + b.ph) * 7}px,${b.y}px)`;
        if (b.y < -h - 10) { b.gone = true; b.el.hidden = true; if (b.i === it.answer) judge(-1, '正解の風船が逃げちゃった。'); }
      });
    });
    f.addEventListener('pointerdown', e => { const b = e.target.closest('.fs-b'); if (b && !b.disabled) judge(Number(b.dataset.i)); });
    ctx.keys(e => { const k = Number(e.key); if (k >= 1 && k <= n) { judge(k - 1); return true; } return false; });
    return { selfTimer:true, solve:ok => judge(ok ? it.answer : (it.answer + 1) % n), destroy:() => stop() };
  } });

/* ---------- もぐらたたき ---------- */
NW.game({ id:'mogura', name:'もぐらたたき', icon:'◒', family:'action', shape:'choice', twists:['none', 'hurry', 'mirror', 'shake', 'dark'], hurry:5,
  desc:'穴からもぐらが答えを持って顔を出す。正解のもぐらだけをたたこう！ まちがいをたたくとアウト。', how:'正解を持ったもぐらをタップ',
  render(it, done, ctx, box){
    box.innerHTML = ui.q(it.q) + `<div class="mg-field field">${Array.from({ length:6 }, (_, h) => `<div class="mg-hole" data-h="${h}"><button class="mg-m" type="button" tabindex="-1"><span class="mg-cr">${NW.art.creature('mogunyu')}</span><span class="mg-sign opt-t"></span></button></div>`).join('')}</div>`;
    const holes = $$('.mg-hole', box), up = new Map();
    let fin = false, since = 0;
    const pop = () => {
      if (fin) return;
      const free = holes.filter(h => !up.has(h)); if (!free.length) return;
      const h = NW.pick(free), wrong = it.choices.map((c, i) => i).filter(i => i !== it.answer);
      const showRight = since >= 2 || Math.random() < 0.34 || !wrong.length;
      if ([...up.values()].includes(it.answer) && showRight) return;
      const i = showRight ? it.answer : NW.pick(wrong); since = showRight ? 0 : since + 1;
      const m = $('.mg-m', h); m.dataset.i = i; $('.mg-sign', m).textContent = it.choices[i];
      h.classList.add('up'); up.set(h, i);
      ctx.later(() => { if (!fin) { h.classList.remove('up'); up.delete(h); } }, NW.rnd(1300, 1800));
    };
    pop(); const tm = ctx.every(pop, 620);
    const hit = (i, h) => {
      if (fin) return; fin = true; clearInterval(tm);
      const ok = i === it.answer;
      if (h) { h.classList.add(ok ? 'hit' : 'miss'); ctx.sfx(ok ? 'hit' : 'bad'); }
      done(ok, { pts:110, reveal:ok ? '' : `正解は「${it.choices[it.answer]}」` });
    };
    $('.mg-field', box).addEventListener('pointerdown', e => { const m = e.target.closest('.mg-m'); const h = m && m.closest('.mg-hole'); if (h && h.classList.contains('up')) hit(Number(m.dataset.i), h); });
    ctx.startQ(() => hit(-1, null), ctx.rules.perQ || 9);
    return { selfTimer:true, solve:ok => hit(ok ? it.answer : (it.answer + 1) % it.choices.length, null) };
  } });

/* ---------- レーンラン ---------- */
NW.game({ id:'lane', name:'レーンラン', icon:'║', family:'action', shape:'choice', accept:it => it.choices.length >= 2, twists:TW,
  desc:'3本のレーンを走る。前から答えのゲートがせまってくるので、正しいゲートのレーンへ移動！', how:'レーンをタップ／← → キーで移動',
  render(it, done, ctx, box){
    const three = ui.narrow(it, Math.min(3, it.choices.length)), n = three.choices.length;
    box.innerHTML = ui.q(three.q) + `<div class="ln-field field n${n}">${three.choices.map((c, i) => `<div class="ln-lane" data-l="${i}"></div>`).join('')}
      <div class="ln-gates">${three.choices.map((c, i) => `<div class="ln-gate"><span class="opt-t">${esc(c)}</span></div>`).join('')}</div><div class="ln-me">${NW.art.mascot('fire')}</div></div>`;
    const f = $('.ln-field', box), g = $('.ln-gates', box), me = $('.ln-me', box);
    let lane = Math.floor(n / 2), y = 0, fin = false;
    const S = NW.session(), dur = Math.max(3.4, 6 - Math.min(8, S ? S.combo : 0) * 0.3);
    const place = () => { me.style.left = ((lane + 0.5) / n * 100) + '%'; };
    place();
    const judge = () => {
      if (fin) return; fin = true; stop();
      const ok = lane === three.answer;
      $$('.ln-gate', box).forEach((x, i) => x.classList.add(i === three.answer ? 'is-right' : i === lane ? 'is-wrong' : 'dim'));
      ctx.sfx(ok ? 'up' : 'hurt');
      done(ok, { pts:110, reveal:ok ? '' : `正解は「${three.choices[three.answer]}」` });
    };
    const stop = ctx.loop(dt => {
      const H = f.clientHeight, end = H - me.offsetHeight - g.offsetHeight - 4;
      y += (end / dur) * dt; g.style.transform = `translateY(${Math.min(y, end)}px)`;
      if (y >= end) judge();
    });
    const go = l => { if (fin) return; lane = NW.clamp(l, 0, n - 1); place(); ctx.sfx('tap'); };
    f.addEventListener('pointerdown', e => { const r = f.getBoundingClientRect(); go(Math.floor((e.clientX - r.left) / r.width * n)); });
    ctx.keys(e => { if (e.key === 'ArrowLeft') { go(lane - 1); return true; } if (e.key === 'ArrowRight') { go(lane + 1); return true; } const k = Number(e.key); if (k >= 1 && k <= n) { go(k - 1); return true; } return false; });
    return { selfTimer:true, solve(ok){ lane = ok ? three.answer : (three.answer + 1) % n; judge(); }, destroy:() => stop() };
  } });

/* ---------- キャッチ ---------- */
NW.game({ id:'catch', name:'こたえキャッチ', icon:'▽', family:'action', shape:'choice', twists:TW,
  desc:'上から答えがふってくる。カゴを動かして正解だけをキャッチ！ まちがいを取るとアウト。', how:'指（マウス）を左右に動かすとカゴが動く。← → キーでもOK',
  render(it, done, ctx, box){
    const four = ui.narrow(it, Math.min(4, it.choices.length)), n = four.choices.length;
    box.innerHTML = ui.q(four.q) + `<div class="ct-field field">${four.choices.map((c, i) => `<div class="ct-item" data-i="${i}"><span class="opt-t">${esc(c)}</span></div>`).join('')}<div class="ct-basket"><span>${NW.art.mascot('happy')}</span></div></div>`;
    const f = $('.ct-field', box), bk = $('.ct-basket', box), W = f.clientWidth || 320;
    const lanes = NW.shuffle(four.choices.map((c, i) => i)), order = NW.shuffle(four.choices.map((c, i) => i));
    const items = $$('.ct-item', box).map((el, i) => { el.style.width = Math.min(160, W / n - 6) + 'px'; return { el, i, x:(lanes[i] + 0.5) * W / n, y:-80 - order.indexOf(i) * 95, gone:false }; });
    let bx = W / 2, fin = false;
    const S = NW.session(), v = (f.clientHeight || 320) / Math.max(3.2, 4.8 - Math.min(8, S ? S.combo : 0) * 0.15);
    const placeB = () => { bk.style.transform = `translateX(${bx - bk.offsetWidth / 2}px)`; };
    placeB();
    const judge = (i, why) => {
      if (fin) return; fin = true; stop();
      const ok = i === four.answer;
      items.forEach(x => x.el.classList.toggle('is-right', x.i === four.answer && !ok));
      if (items[i]) items[i].el.classList.add(ok ? 'caught' : 'is-wrong');
      ctx.sfx(ok ? 'match' : 'bad');
      done(ok, { pts:110, reveal:ok ? '' : (why || '') + `正解は「${four.choices[four.answer]}」` });
    };
    const stop = ctx.loop(dt => {
      const H = f.clientHeight, top = H - bk.offsetHeight + 6, bw = bk.offsetWidth;
      items.forEach(x => {
        if (x.gone) return;
        x.y += v * dt; const h = x.el.offsetHeight, w = x.el.offsetWidth;
        x.el.style.transform = `translate(${x.x - w / 2}px,${x.y}px)`;
        if (x.y + h >= top && x.y + h < top + 30 && Math.abs(x.x - bx) < (bw + w) / 2 - 10) { judge(x.i); return; }
        if (x.y > H) { x.gone = true; x.el.hidden = true; if (x.i === four.answer) judge(-1, '正解を取りのがした。'); }
      });
    });
    const move = e => { const r = f.getBoundingClientRect(); bx = NW.clamp(e.clientX - r.left, bk.offsetWidth / 2, r.width - bk.offsetWidth / 2); placeB(); };
    f.addEventListener('pointermove', move); f.addEventListener('pointerdown', move);
    ctx.keys(e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const w = f.clientWidth; bx = NW.clamp(bx + (e.key === 'ArrowLeft' ? -1 : 1) * w / n, bk.offsetWidth / 2, w - bk.offsetWidth / 2); placeB(); return true; } return false; });
    return { selfTimer:true, solve:ok => judge(ok ? four.answer : (four.answer + 1) % n), destroy:() => stop() };
  } });
})(window.NW);
