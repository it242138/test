/* ============================================================
   ワイプ・アーケード：○×のなかま
   ○×クイズ・ふりわけスワイプ・うそつきさがし
   ============================================================ */
(function (NW) {
'use strict';
const { $, $$, esc, ui } = NW;
const TF = ['none', 'hurry', 'mirror', 'shake', 'dark', 'reverse'];
const truthText = v => v ? '◯ ほんと' : '✕ うそ';

/* ---------- ○×クイズ ---------- */
NW.game({ id:'marubatsu', name:'○×クイズ', icon:'○', family:'tf', shape:'tf', twists:TF,
  desc:'書いてあることが「ほんと」か「うそ」かを答える。', how:'◯ か ✕ をタップ（← → キー・スワイプでもOK）',
  render(it, done, ctx, box){
    const rev = ctx.reverse();
    box.innerHTML = ui.revNote(ctx) + `<div class="q-box mb-card"><p class="q-text">${ui.br(it.q)}</p></div><div class="mb-btns"><button class="mb-b o" data-v="1" type="button"><kbd>←</kbd><b>◯</b><small>ほんと</small></button><button class="mb-b x" data-v="0" type="button"><kbd>→</kbd><b>✕</b><small>うそ</small></button></div>`;
    let fin = false;
    const pick = v => {
      if (fin) return; fin = true;
      const ok = rev ? v !== it.answer : v === it.answer, want = rev ? !it.answer : it.answer;
      $$('.mb-b', box).forEach(b => { b.disabled = true; const bv = b.dataset.v === '1'; if (bv === want) b.classList.add('is-right'); else if (bv === v) b.classList.add('is-wrong'); });
      done(ok, { pts:100, reveal:ok ? '' : `答えは「${truthText(it.answer)}」${rev ? '（あまのじゃくなので逆の ' + (want ? '◯' : '✕') + ' が正解）' : ''}` });
    };
    $$('.mb-b', box).forEach(b => b.addEventListener('click', () => pick(b.dataset.v === '1')));
    ui.swipe($('.mb-card', box), d => pick(d === 'left'));
    ctx.keys(e => { if (['ArrowLeft', 'o', 'O', '1'].includes(e.key)) { pick(true); return true; } if (['ArrowRight', 'x', 'X', '2'].includes(e.key)) { pick(false); return true; } return false; });
    return { solve:ok => pick(ok ? (rev ? !it.answer : it.answer) : (rev ? it.answer : !it.answer)), timeout(){ if (fin) return; fin = true; $$('.mb-b', box).forEach(b => { b.disabled = true; }); done(false, { reveal:`時間切れ。答えは「${truthText(it.answer)}」` }); } };
  } });

/* ---------- ふりわけスワイプ ---------- */
NW.game({ id:'furiwake', name:'ふりわけスワイプ', icon:'⇋', family:'tf', shape:'tf', twists:TF, hurry:2,
  desc:'カードがどんどん来る。ほんとは左へ、うそは右へ、3.5秒以内にふりわけよう。テンポよく進むスピード勝負。', how:'カードを左（◯）か右（✕）にスワイプ。← → キーでもOK',
  render(it, done, ctx, box){
    const rev = ctx.reverse(), lim = ctx.rules.perQ || 3.5, t0 = Date.now();
    box.innerHTML = ui.revNote(ctx) + `<div class="fw-zone"><span class="fw-side o">◯<small>ほんと</small></span><div class="fw-stack"><i></i><i></i><div class="fw-card"><p class="q-text">${ui.br(it.q)}</p></div></div><span class="fw-side x">✕<small>うそ</small></span></div>
      <div class="fw-btns"><button class="fw-b o" type="button">← ◯</button><button class="fw-b x" type="button">✕ →</button></div>`;
    const card = $('.fw-card', box);
    let fin = false;
    const pick = v => {
      if (fin) return; fin = true;
      const ok = rev ? v !== it.answer : v === it.answer, sp = Math.max(0, 1 - (Date.now() - t0) / NW.ms(lim * 1000));
      if (!NW.reduce) card.animate([{ transform:card.style.transform || 'none' }, { transform:`translateX(${v ? -130 : 130}%) rotate(${v ? -18 : 18}deg)`, opacity:0 }], { duration:280, fill:'forwards' });
      $(v ? '.fw-side.o' : '.fw-side.x', box).classList.add(ok ? 'is-right' : 'is-wrong');
      done(ok, { pts:Math.round(60 + 60 * sp), reveal:ok ? '' : `答えは「${truthText(it.answer)}」`, wait:ok ? 420 : 1600 });
    };
    ui.swipe(card, d => pick(d === 'left'), { drag:(dx, end) => { if (!fin) { card.style.transform = end ? '' : `translateX(${dx}px) rotate(${dx * 0.06}deg)`; box.classList.toggle('lean-o', !end && dx < -30); box.classList.toggle('lean-x', !end && dx > 30); } } });
    $('.fw-b.o', box).addEventListener('click', () => pick(true)); $('.fw-b.x', box).addEventListener('click', () => pick(false));
    ctx.keys(e => { if (e.key === 'ArrowLeft' || e.key === '1') { pick(true); return true; } if (e.key === 'ArrowRight' || e.key === '2') { pick(false); return true; } return false; });
    ctx.startQ(() => { if (fin) return; fin = true; done(false, { reveal:`時間切れ。答えは「${truthText(it.answer)}」` }); }, lim);
    return { selfTimer:true, solve:ok => pick(ok ? (rev ? !it.answer : it.answer) : (rev ? it.answer : !it.answer)) };
  } });

/* ---------- うそつきさがし ---------- */
const PEOPLE = ['haremochi', 'picot', 'tabippo', 'goldon', 'otopuku', 'yosoul', 'buzzrin', 'mukashi'];
NW.game({ id:'usotsuki', name:'うそつきさがし', icon:'☻', family:'tf', shape:'tf', twists:['none', 'hurry', 'mirror', 'shake', 'dark', 'reverse'], hurry:8,
  desc:'3人のうち1人だけがうそをついている。うそつきはだれ？（あまのじゃくでは、1人だけの正直者をさがす）', how:'うそをついていると思うキャラクターをタップ',
  need(filter){
    const p = NW.pool('tf', filter), t = p.filter(x => x.answer).length, f = p.length - t;
    return t >= 2 && f >= 2 ? '' : 'うそつきさがしには、○×にできる問題が「ほんと」「うそ」それぞれ2つ以上ひつようです';
  },
  render(it, done, ctx, box){
    const rev = ctx.reverse(), odd = rev ? true : false;      /* 1人だけちがうのは、ふだんは「うそ」、あまのじゃくでは「ほんと」 */
    const pool = ctx.peek(40).filter(x => x !== it && x.q !== it.q);
    let three;
    if (it.answer === odd) three = [it, ...pool.filter(x => x.answer !== odd).slice(0, 2)];
    else three = [it, ...pool.filter(x => x.answer !== odd).slice(0, 1), ...pool.filter(x => x.answer === odd).slice(0, 1)];
    three = NW.shuffle(three.filter(Boolean)).slice(0, 3);
    const ans = three.findIndex(x => x.answer === odd);
    const who = NW.shuffle(PEOPLE);
    box.innerHTML = `<p class="us-ask">${rev ? '1人だけ<b>正直者</b>がいる。だれ？' : '1人だけ<b>うそつき</b>がいる。だれ？'}</p><div class="us-row">${three.map((x, i) => `<button class="us-p opt" data-i="${i}" type="button"><span class="us-say"><span class="opt-t">${ui.br(x.q)}</span></span><span class="us-face">${NW.art.creature(who[i])}</span><kbd>${i + 1}</kbd></button>`).join('')}</div>`;
    let fin = false;
    const pick = i => {
      if (fin) return; fin = true;
      $$('.us-p', box).forEach((b, k) => { b.disabled = true; b.classList.add(three[k].answer ? 'tell-t' : 'tell-f'); if (k === ans) b.classList.add('is-right'); else if (k === i) b.classList.add('is-wrong'); });
      const lie = three[ans];
      done(i === ans, { pts:150, reveal:i === ans ? '' : `${rev ? '正直者' : 'うそつき'}は ${ans + 1} 番目でした`, explain:(lie && lie.explain) || '' });
    };
    ui.bindOpts(box, ctx, pick);
    return { solve:ok => pick(ok ? ans : (ans + 1) % three.length), timeout(){ pick(-1); } };
  } });
})(window.NW);
