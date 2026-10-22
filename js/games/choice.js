/* ============================================================
   ワイプ・アーケード：選ぶクイズのなかま
   4択・早押し・2択ダッシュ・消去法・じわじわ・ベット・ルーレット・ミリオネア・とびら
   ============================================================ */
(function (NW) {
'use strict';
const { $, $$, esc, ui } = NW;
const ALL = ['none', 'hurry', 'mirror', 'shake', 'dark', 'blind', 'shuffle'];
const ge3 = it => it.choices.length >= 3;

/* ---------- 4択クイズ ---------- */
NW.game({ id:'yontaku', name:'4択クイズ', icon:'Ａ', family:'choice', shape:'choice', twists:ALL,
  desc:'選択肢の中から正しいものを選ぶ、いちばん基本のクイズ。', how:'選択肢をタップ（キーボードの数字キーでもOK）',
  render:(it, done, ctx, box) => ui.choice(it, done, ctx, box) });

/* ---------- 早押しクイズ ---------- */
NW.game({ id:'hayaoshi', name:'早押しクイズ', icon:'⏺', family:'choice', shape:'choice', twists:['none', 'mirror', 'shake', 'dark', 'blind'],
  desc:'問題文が少しずつ出てくる。わかった瞬間にボタン！ 早いほど高得点。', how:'「早押し！」ボタン（スペースキー）で止めて、選択肢を選ぶ',
  render(it, done, ctx, box){
    const chars = Array.from(it.q);
    box.innerHTML = `<div class="q-box hy"><p class="q-text"><span class="hy-t"></span><i class="hy-cur"></i></p></div><div class="hy-zone"><button class="btn-buzz" type="button">早押し！</button></div>`;
    const t = $('.hy-t', box), zone = $('.hy-zone', box);
    let n = 0, buzzed = false, auto = 0;
    const tick = ctx.every(() => { if (buzzed) return; n++; t.textContent = chars.slice(0, n).join(''); if (n >= chars.length) { clearInterval(tick); auto = ctx.later(() => open(true), 2500); } }, 110);
    let inner = null;
    function open(late){
      if (buzzed) return; buzzed = true; clearInterval(tick); clearTimeout(auto);
      const rate = late ? 0 : 1 - n / chars.length;
      if (!late) { ctx.sfx('buzzer'); zone.innerHTML = '<p class="hy-stop">ピンポン！ 答えをどうぞ</p>'; } else zone.innerHTML = '<p class="hy-stop">時間です。答えをどうぞ</p>';
      const q = $('.q-box', box); q.classList.add('stopped');
      const wrap = document.createElement('div'); zone.appendChild(wrap);
      inner = ui.choice({ q:'', choices:it.choices, answer:it.answer }, (ok, info) => done(ok, Object.assign(info, { pts:Math.round(80 + 140 * rate), reveal:ok ? (rate > 0.4 ? `${Math.round(rate * 100)}%残して正解！` : '') : info.reveal })), ctx, wrap);
      $('.q-box', wrap).remove();
      ctx.startQ(() => inner.timeout(), 6);
    }
    $('.btn-buzz', box).addEventListener('click', () => open(false));
    ctx.keys(e => { if (!buzzed && (e.key === ' ' || e.key === 'Enter')) { open(false); return true; } return false; });
    return { selfTimer:true, solve(ok){ open(false); inner.solve(ok); } };
  } });

/* ---------- 2択ダッシュ ---------- */
NW.game({ id:'nitaku', name:'2択ダッシュ', icon:'⇆', family:'choice', shape:'choice', twists:['none', 'hurry', 'mirror', 'shake', 'dark', 'blind'], hurry:2.5,
  desc:'選択肢は2つだけ。そのかわり4秒以内！ 左右にスワイプしても答えられる。', how:'左か右をタップ（← → キー・スワイプでもOK）',
  render(it, done, ctx, box){
    const two = ui.narrow(it, 2), t0 = Date.now(), lim = ctx.rules.perQ || 4;
    box.innerHTML = `<div class="q-box nt-card">${'<p class="q-text">' + ui.br(two.q) + '</p>'}<p class="nt-hint">← スワイプでも答えられる →</p></div>
      <div class="opts nt n2">${two.choices.map((c, i) => `<button class="opt nt-${i ? 'r' : 'l'}" data-i="${i}" type="button"><kbd>${i ? '→' : '←'}</kbd><span class="opt-t">${esc(c)}</span></button>`).join('')}</div>`;
    let fin = false;
    const pick = i => {
      if (fin) return; fin = true;
      ui.markOpts(box, two.answer, i);
      const ok = i === two.answer, sp = Math.max(0, 1 - (Date.now() - t0) / NW.ms(lim * 1000));
      const card = $('.nt-card', box); if (!NW.reduce) card.animate([{ transform:'none' }, { transform:`translateX(${i ? 40 : -40}%) rotate(${i ? 8 : -8}deg)`, opacity:0.3 }], { duration:260, fill:'forwards' });
      done(ok, { pts:Math.round(70 + 60 * sp), reveal:ok ? '' : `正解は「${two.choices[two.answer]}」` });
    };
    $$('.opt', box).forEach(b => b.addEventListener('click', () => pick(Number(b.dataset.i))));
    ui.swipe($('.nt-card', box), d => pick(d === 'left' ? 0 : 1), { drag:(dx, end) => { const c = $('.nt-card', box); if (!fin && c) c.style.transform = end ? '' : `translateX(${dx * 0.4}px) rotate(${dx * 0.03}deg)`; } });
    ctx.keys(e => { if (e.key === 'ArrowLeft' || e.key === '1') { pick(0); return true; } if (e.key === 'ArrowRight' || e.key === '2') { pick(1); return true; } return false; });
    ctx.twistOpts(box);
    ctx.startQ(() => { if (fin) return; fin = true; ui.markOpts(box, two.answer, -1); done(false, { reveal:`時間切れ。正解は「${two.choices[two.answer]}」` }); }, lim);
    return { selfTimer:true, solve:ok => pick(ok ? two.answer : 1 - two.answer) };
  } });

/* ---------- 消去法 ---------- */
NW.game({ id:'shokyo', name:'消去法クイズ', icon:'✂', family:'choice', shape:'choice', accept:ge3, twists:['none', 'hurry', 'mirror', 'shake', 'dark', 'shuffle'], hurry:8,
  desc:'正解を選ぶのではなく「まちがい」を全部消していく。正解を消したらアウト！', how:'まちがいだと思う選択肢をタップして消す。最後の1つが残れば正解',
  render(it, done, ctx, box){
    box.innerHTML = ui.q(it.q) + `<p class="sk-left">あと <b>${it.choices.length - 1}</b> こ消す</p>` + ui.opts(it.choices, 'sk');
    let left = it.choices.length - 1, fin = false;
    const erase = (i, b) => {
      if (fin) return;
      b = b || $(`.opt[data-i="${i}"]`, box);
      if (i === it.answer) { fin = true; b.classList.add('is-wrong'); ui.markOpts(box, it.answer, i); done(false, { reveal:`それが正解でした「${it.choices[it.answer]}」` }); return; }
      b.disabled = true; b.classList.add('erased'); ctx.sfx('pop2'); left--;
      $('.sk-left b', box).textContent = left;
      if (left === 0) { fin = true; ui.markOpts(box, it.answer, -1); done(true, { pts:130 }); }
    };
    ui.bindOpts(box, ctx, erase);
    ctx.twistOpts(box);
    return {
      solve(ok){ if (!ok) { erase(it.answer); return; } it.choices.forEach((c, i) => { if (i !== it.answer) erase(i); }); },
      timeout(){ fin = true; ui.markOpts(box, it.answer, -1); done(false, { reveal:`時間切れ。正解は「${it.choices[it.answer]}」` }); }
    };
  } });

/* ---------- じわじわクイズ ---------- */
NW.game({ id:'jiwajiwa', name:'じわじわクイズ', icon:'◌', family:'choice', shape:'choice', twists:['none', 'hurry', 'mirror', 'shake', 'dark', 'shuffle'],
  desc:'問題文がぼやけた状態から、じわじわ見えてくる。早く答えるほど高得点。', how:'読めた！と思ったら選択肢をタップ',
  render(it, done, ctx, box){
    let t = 0;
    const c = ui.choice(it, done, ctx, box, { pts:ok => Math.round(60 + 160 * Math.max(0, 1 - t / 8)), head:'<div class="jw-meter"><i></i></div>' });
    const q = $('.q-text', box), m = $('.jw-meter i', box);
    const stop = ctx.loop(dt => { t += dt; const k = Math.max(0, 1 - t / 8); q.style.filter = k > 0 ? `blur(${(k * 9).toFixed(2)}px)` : ''; m.style.width = (k * 100) + '%'; if (k <= 0) stop(); });
    box.addEventListener('click', e => { if (e.target.closest('.opt')) { stop(); q.style.filter = ''; } });
    return Object.assign({}, c, { solve(ok){ stop(); q.style.filter = ''; c.solve(ok); } });
  } });

/* ---------- ベットクイズ ---------- */
NW.game({ id:'bet', name:'ベットクイズ', icon:'＄', family:'choice', shape:'choice', twists:['none', 'hurry', 'mirror', 'shake', 'dark', 'blind'],
  desc:'問題だけを見て、自信の大きさをかける。×3で当てれば大もうけ、外せば大損。', how:'まず ×1・×2・×3 を選んでから、選択肢が出てくる',
  render(it, done, ctx, box){
    box.innerHTML = ui.q(it.q) + `<div class="bet-zone"><p class="bet-ask">自信は？</p><div class="bet-btns">${[1, 2, 3].map(k => `<button class="bet-b b${k}" data-k="${k}" type="button"><b>×${k}</b><small>${['ちょっと', 'まあまあ', 'ぜったい'][k - 1]}</small></button>`).join('')}</div></div>`;
    let inner = null, k = 0;
    const bet = n => {
      if (k) return; k = n; ctx.sfx('dice');
      const zone = $('.bet-zone', box);
      zone.innerHTML = `<p class="bet-on">×${k} でかけた！</p>`;
      inner = ui.choice({ q:'', choices:it.choices, answer:it.answer }, (ok, info) => done(ok, Object.assign(info, { pts:100 * k, penalty:ok ? 0 : 50 * k, reveal:ok ? `+${100 * k}点` : `${info.reveal}（-${50 * k}点）` })), ctx, zone);
      $('.q-box', zone).remove();
      if (ctx.rules.perQ) ctx.startQ(() => inner.timeout());
    };
    $$('.bet-b', box).forEach(b => b.addEventListener('click', () => bet(Number(b.dataset.k))));
    ctx.keys(e => { const n = Number(e.key); if (!k && n >= 1 && n <= 3) { bet(n); return true; } return false; });
    return { selfTimer:true, solve(ok){ bet(2); inner.solve(ok); } };
  } });

/* ---------- ルーレットクイズ ---------- */
NW.game({ id:'roulette', name:'ルーレットクイズ', icon:'◎', family:'choice', shape:'choice', twists:['none', 'hurry', 'mirror', 'shake', 'dark'],
  desc:'光が選択肢をぐるぐる回る。正解のところで「ストップ」！ 知識とタイミングの勝負。', how:'光が正解に来たらストップ（スペースキー）',
  render(it, done, ctx, box){
    const n = it.choices.length;
    box.innerHTML = ui.q(it.q) + `<div class="rl n${n}">${it.choices.map((c, i) => `<div class="rl-c" data-i="${i}"><span class="opt-t">${esc(c)}</span></div>`).join('')}</div><button class="btn-stop" type="button">ストップ</button>`;
    let cur = 0, fin = false;
    const cells = $$('.rl-c', box), paint = () => cells.forEach((c, i) => c.classList.toggle('on', i === cur));
    paint();
    const sp = Math.max(260, 620 - (NW.session() ? NW.session().combo : 0) * 40);
    const tm = ctx.every(() => { if (fin) return; cur = (cur + 1) % n; paint(); ctx.sfx('tick'); }, sp);
    const stop = () => {
      if (fin) return; fin = true; clearInterval(tm);
      const ok = cur === it.answer;
      cells.forEach((c, i) => { c.classList.toggle('is-right', i === it.answer); c.classList.toggle('is-wrong', i === cur && !ok); });
      $('.btn-stop', box).disabled = true;
      done(ok, { pts:120, reveal:ok ? '' : `正解は「${it.choices[it.answer]}」` });
    };
    $('.btn-stop', box).addEventListener('click', stop);
    ctx.keys(e => { if (e.key === ' ' || e.key === 'Enter') { stop(); return true; } return false; });
    return { solve(ok){ cur = ok ? it.answer : (it.answer + 1) % n; stop(); }, timeout(){ cur = -1; stop(); } };
  } });

/* ---------- ミリオネア ---------- */
const PRIZE = [1, 2, 3, 5, 10, 20, 50, 100, 300, 1000];
NW.game({ id:'million', name:'ミリオネア', icon:'♛', family:'choice', shape:'choice', accept:ge3, twists:['none', 'hurry', 'mirror', 'shake', 'dark'],
  desc:'正解するたびに賞金がアップ。ピンチのときは「50:50」「みんなに聞く」「パス」の3つの助けを1回ずつ使える。', how:'選択肢をタップ。下の助けボタンは1回ずつ',
  setup(area, ctx, st){
    st.lv = 0; st.best = 0; st.life = { half:true, aud:true, pass:true };
    area.insertAdjacentHTML('beforeend', `<div class="ml-ladder">${PRIZE.map((p, i) => `<span data-l="${i}"${i === 2 || i === 5 ? ' class="safe"' : ''}>${p >= 1000 ? '1000万' : p + '万'}</span>`).join('')}</div><div class="ml-host"></div>`);
    st.host = $('.ml-host', area);
    st.paint = () => $$('.ml-ladder span', area).forEach((s, i) => { s.classList.toggle('on', i === st.lv); s.classList.toggle('got', i < st.lv); });
    st.paint();
  },
  render(it, done, ctx, box){
    const st = ctx.st;
    const c = ui.choice(it, (ok, info) => {
      if (ok) { st.lv = Math.min(PRIZE.length - 1, st.lv + 1); st.best = Math.max(st.best, st.lv); if (st.lv === PRIZE.length - 1) NW.fx.banner('1000万円に到達！', 'ミリオネア', 'gold'); }
      else st.lv = st.lv >= 5 ? 5 : st.lv >= 2 ? 2 : 0;
      st.paint(); done(ok, info);
    }, ctx, box, { pts:() => 60 + st.lv * 30,
      foot:`<div class="ml-life"><button data-l="half" type="button"${st.life.half ? '' : ' disabled'}>50:50</button><button data-l="aud" type="button"${st.life.aud ? '' : ' disabled'}>みんなに聞く</button><button data-l="pass" type="button"${st.life.pass ? '' : ' disabled'}>パス</button></div>` });
    $$('.ml-life button', box).forEach(b => b.addEventListener('click', () => {
      const l = b.dataset.l; if (!st.life[l]) return; st.life[l] = false; b.disabled = true; ctx.sfx('pop');
      if (l === 'half') { NW.shuffle(it.choices.map((x, i) => i).filter(i => i !== it.answer)).slice(0, Math.max(1, it.choices.length - 2)).forEach(i => { const o = $(`.opt[data-i="${i}"]`, box); o.disabled = true; o.classList.add('erased'); }); }
      if (l === 'aud') {
        const v = it.choices.map(() => 0); v[it.answer] = NW.irnd(45, 75);
        const others = it.choices.map((x, i) => i).filter(i => i !== it.answer), w = others.map(() => Math.random() + 0.2), sw = w.reduce((a, b) => a + b, 0);
        let rest = 100 - v[it.answer];
        others.forEach((i, k) => { v[i] = k === others.length - 1 ? Math.max(0, rest) : Math.round((100 - v[it.answer]) * w[k] / sw); rest -= k === others.length - 1 ? 0 : v[i]; });
        $$('.opt', box).forEach((o, k) => { o.insertAdjacentHTML('beforeend', `<i class="ml-aud" style="--p:${v[Number(o.dataset.i)]}%">${v[Number(o.dataset.i)]}%</i>`); });
      }
      if (l === 'pass') { ui.markOpts(box, it.answer, -1); done(true, { pts:0, quiet:true, reveal:'パス！ つぎの問題へ' }); }
    }));
    return c;
  },
  summary:st => ({ title:`最高 ${PRIZE[st.best] >= 1000 ? '1000万' : PRIZE[st.best] + '万'}円` }) });

/* ---------- とびらクイズ ---------- */
const MONS = ['sokuho', 'buzzrin', 'mukashi', 'mogunyu', 'demagoro', 'fakeraken', 'otopuku'];
NW.game({ id:'tobira', name:'とびらダンジョン', icon:'▯', family:'choice', shape:'choice', accept:ge3, twists:['none', 'hurry', 'mirror', 'shake', 'dark', 'blind'],
  desc:'3つのとびらに答えが書いてある。正しいとびらを開けると宝箱、まちがえるとモンスター！ どこまで深くもぐれる？', how:'正しい答えのとびらをタップ',
  setup(area, ctx, st){ st.floor = 1; area.insertAdjacentHTML('beforeend', '<p class="tb-floor">地下 <b>1</b> 階</p><div class="tb-host"></div>'); st.host = $('.tb-host', area); },
  render(it, done, ctx, box){
    const st = ctx.st, three = ui.narrow(it, 3);
    box.innerHTML = ui.q(three.q) + `<div class="tb-doors">${three.choices.map((c, i) => `<button class="tb-door opt" data-i="${i}" type="button"><span class="tb-plate"><kbd>${i + 1}</kbd><span class="opt-t">${esc(c)}</span></span><span class="tb-in" aria-hidden="true"></span></button>`).join('')}</div>`;
    let fin = false;
    const pick = i => {
      if (fin) return; fin = true;
      const ok = i === three.answer, d = $(`.tb-door[data-i="${i}"]`, box);
      $$('.tb-door', box).forEach(b => { b.disabled = true; });
      if (d) { d.classList.add('open', ok ? 'is-right' : 'is-wrong'); $('.tb-in', d).innerHTML = ok ? '<span class="tb-chest">★</span>' : NW.art.creature(NW.pick(MONS), { mood:'angry' }); }
      if (!ok) $(`.tb-door[data-i="${three.answer}"]`, box).classList.add('is-right');
      if (ok) { st.floor++; ctx.sfx('prize'); } else ctx.sfx('hurt');
      $('.tb-floor b', ctx.area).textContent = st.floor;
      done(ok, { pts:90 + st.floor * 10, reveal:ok ? `宝箱！ 地下${st.floor}階へ` : `モンスターだ！ 正解は「${three.choices[three.answer]}」`, wait:ok ? 900 : 1700 });
    };
    ui.bindOpts(box, ctx, pick);
    ctx.twistOpts(box);
    return { solve:ok => pick(ok ? three.answer : (three.answer + 1) % 3), timeout(){ fin = true; $$('.tb-door', box).forEach(b => { b.disabled = true; }); $(`.tb-door[data-i="${three.answer}"]`, box).classList.add('is-right'); done(false, { reveal:'時間切れ' }); } };
  },
  summary:st => ({ title:`地下 ${st.floor} 階まで到達` }) });
})(window.NW);
