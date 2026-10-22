/* ============================================================
   ワイプ・アーケード：ボード・バトルのなかま
   ボスバトル・ライバル対決・すごろく・タワーづみ・パネル取り・クイズビンゴ・フラッシュ暗記
   クイズに答えると、ボードやキャラクターが動く
   ============================================================ */
(function (NW) {
'use strict';
const { $, $$, esc, ui, fx } = NW;
const TW = ['none', 'hurry', 'mirror', 'shake', 'dark'];
const MONS = ['sokuho', 'buzzrin', 'mukashi', 'mogunyu', 'demagoro', 'fakeraken', 'otopuku', 'gougai', 'yosoul', 'picot'];
const MON_NAME = { sokuho:'ソクホー', buzzrin:'バズリン', mukashi:'ムカシ', mogunyu:'モグニュー', demagoro:'デマゴロ', fakeraken:'フェイクラーケン', otopuku:'オトプク', gougai:'ゴーガイ', yosoul:'ヨソウル', picot:'ピコット' };
const ge3 = it => it.choices.length >= 3;

/* ---------- ボスバトル ---------- */
NW.game({ id:'boss', name:'ボスバトル', icon:'♞', family:'board', shape:'choice', twists:TW,
  desc:'正解するとボスに攻撃！ コンボが続くほど大ダメージ。ボスをたおすと次のもっと強いボスが出てくる。', how:'選択肢をタップして攻撃',
  setup(area, ctx, st){
    st.lv = 1; st.kills = 0;
    area.insertAdjacentHTML('beforeend', `<div class="bs-stage"><div class="bs-me">${ui.mascot('fire')}</div><div class="bs-mon"></div><div class="bs-bar"><span class="bs-name"></span><div class="bs-hp"><i></i></div></div></div><div class="bs-host"></div>`);
    st.host = $('.bs-host', area);
    st.spawn = () => {
      st.id = MONS[(st.lv - 1) % MONS.length]; st.hpMax = 80 + st.lv * 40; st.hp = st.hpMax;
      const m = $('.bs-mon', area); m.innerHTML = NW.art.creature(st.id, { mood:'angry' }); m.className = 'bs-mon in';
      $('.bs-name', area).textContent = `Lv${st.lv} ${MON_NAME[st.id] || 'ボス'}`; st.paint();
    };
    st.paint = () => { $('.bs-hp i', area).style.width = Math.max(0, st.hp / st.hpMax * 100) + '%'; };
    st.spawn();
  },
  render(it, done, ctx, box){
    const st = ctx.st, A = ctx.area;
    let wait = 0;
    return ui.choice(it, done, ctx, box, {
      after(ok){
        const S = NW.session(), me = $('.bs-me', A), mon = $('.bs-mon', A);
        if (ok) {
          const dmg = 25 + Math.min(10, S ? S.combo : 0) * 6;
          fx.fly(me, mon, NW.art.paperBall()).then(() => {
            if (!ctx.alive()) return;
            mon.classList.remove('hit'); void mon.offsetWidth; mon.classList.add('hit'); ctx.sfx('hit');
            ctx.float(mon, '-' + dmg, 'fx-float-dmg');
            st.hp -= dmg; st.paint();
            if (st.hp <= 0) {
              st.kills++; st.lv++; mon.innerHTML = NW.art.creature(st.id, { mood:'ko' }); mon.classList.add('ko');
              ctx.addScore(300); fx.banner(`${MON_NAME[st.id] || 'ボス'}をたおした！ +300`, 'WIN', 'boss'); ctx.sfx('lvup');
              ctx.later(() => st.spawn(), 900);
            }
          });
          wait = st.hp - dmg <= 0 ? 1500 : 900;
        } else {
          mon.classList.remove('atk'); void mon.offsetWidth; mon.classList.add('atk'); ctx.sfx('boss'); fx.flash('boss'); fx.shake(me, 1.2);
        }
      },
      get wait(){ return wait || undefined; }
    });
  },
  summary:st => ({ title:`ボスを ${st.kills} 体たおした` }) });

/* ---------- ライバル対決 ---------- */
NW.game({ id:'duel', name:'ライバル対決', icon:'⚔', family:'board', shape:'choice', twists:['none', 'mirror', 'shake', 'dark', 'blind'],
  desc:'ライバルと早押し勝負。ライバルのゲージがたまる前に答えよう。先に答えられると、ライバルのポイントに！', how:'選択肢をタップ。ライバルより先に！',
  setup(area, ctx, st){
    st.me = 0; st.cpu = 0; st.rv = NW.pick(MONS);
    area.insertAdjacentHTML('beforeend', `<div class="du-top"><div class="du-side me"><span class="du-face">${ui.mascot('fire')}</span><b class="du-pt">0</b></div><span class="du-vs">VS</span><div class="du-side cpu"><b class="du-pt">0</b><span class="du-face">${NW.art.creature(st.rv)}</span></div></div><div class="du-gauge"><i></i><span>ライバル考え中…</span></div><div class="du-host"></div>`);
    st.host = $('.du-host', area);
    st.paint = () => { $('.du-side.me .du-pt', area).textContent = st.me; $('.du-side.cpu .du-pt', area).textContent = st.cpu; };
  },
  render(it, done, ctx, box){
    const st = ctx.st, A = ctx.area, g = $('.du-gauge', A), bar = $('.du-gauge i', A), lab = $('.du-gauge span', A);
    g.classList.remove('locked', 'won'); lab.textContent = 'ライバル考え中…';
    const S = NW.session(), dur = NW.rnd(3, 6.2) - Math.min(1.2, (S ? S.correct : 0) * 0.06);
    let t = 0, locked = false, fin = false;
    const c = ui.choice(it, (ok, info) => { if (fin) return; fin = true; stop(); if (ok) st.me++; st.paint(); done(ok, info); }, ctx, box);
    const stop = ctx.loop(dt => {
      if (fin || locked) return;
      t += dt; bar.style.width = Math.min(100, t / dur * 100) + '%';
      if (t >= dur) {
        if (Math.random() < 0.7) {
          fin = true; stop(); st.cpu++; st.paint(); ui.markOpts(box, it.answer, -1);
          g.classList.add('won'); lab.textContent = 'ライバルが先に正解！'; ctx.sfx('buzzer');
          done(false, { reveal:`ライバルが先に答えた。正解は「${it.choices[it.answer]}」` });
        } else { locked = true; g.classList.add('locked'); lab.textContent = 'ライバルがまちがえた！ チャンス'; ctx.sfx('bad'); }
      }
    });
    return { selfTimer:true, solve:c.solve, destroy:() => stop() };
  },
  summary:st => ({ title:st.me > st.cpu ? `勝ち！ ${st.me} 対 ${st.cpu}` : st.me === st.cpu ? `引き分け ${st.me} 対 ${st.cpu}` : `負け… ${st.me} 対 ${st.cpu}`, stars:st.me > st.cpu ? (st.cpu === 0 ? 3 : 2) : st.me === st.cpu && st.me > 0 ? 1 : 0 }) });

/* ---------- すごろく ---------- */
const SQ = ['start', '', '', 'star', '', 'fwd', '', '', 'back', '', 'star', '', '', 'fwd', '', 'back', '', 'star', '', 'goal'];
const SQ_T = { start:'S', goal:'G', star:'★', fwd:'→2', back:'←2', '':'' };
NW.game({ id:'sugoroku', name:'クイズすごろく', icon:'⚀', family:'board', shape:'choice', twists:TW,
  desc:'正解するとサイコロをふって進める。★マスでボーナス、→で2マス進む、←で2マスもどる。ゴールで大ボーナス！', how:'選択肢をタップ。正解するとサイコロが自動でふられる',
  setup(area, ctx, st){
    st.pos = 0; st.goals = 0;
    area.insertAdjacentHTML('beforeend', `<div class="sg-wrap"><div class="sg-board">${SQ.map((t, i) => { const r = Math.floor(i / 5), c = r % 2 ? 4 - i % 5 : i % 5; return `<div class="sg-sq t-${t || 'n'}" style="grid-row:${r + 1};grid-column:${c + 1}" data-n="${i}"><small>${i || ''}</small><b>${SQ_T[t]}</b></div>`; }).join('')}<div class="sg-me">${ui.mascot('happy')}</div></div><div class="sg-dice" aria-live="polite"></div></div><div class="sg-host"></div>`);
    st.host = $('.sg-host', area);
    st.place = () => { const sq = $(`.sg-sq[data-n="${st.pos}"]`, area), me = $('.sg-me', area); me.style.left = (sq.offsetLeft + sq.offsetWidth / 2) + 'px'; me.style.top = (sq.offsetTop + sq.offsetHeight / 2) + 'px'; };
    requestAnimationFrame(st.place);
  },
  render(it, done, ctx, box){
    const st = ctx.st, A = ctx.area;
    let steps = 0;
    const walk = (n, then) => {
      if (!n || !ctx.alive()) { then(); return; }
      st.pos = Math.max(0, Math.min(SQ.length - 1, st.pos + Math.sign(n))); st.place(); ctx.sfx('pick', { i:(st.pos % 5) + 1 });
      ctx.later(() => walk(n - Math.sign(n), then), 170);
    };
    const land = () => {
      const t = SQ[st.pos];
      if (t === 'goal') { st.goals++; ctx.addScore(500); fx.banner('ゴール！ +500', 'すごろく', 'gold'); ctx.sfx('clear'); ctx.later(() => { st.pos = 0; st.place(); }, 700); }
      else if (t === 'star') { ctx.addScore(150); ctx.float($('.sg-me', A), '+150', 'fx-float-gold'); ctx.sfx('find'); }
      else if (t === 'fwd') ctx.later(() => walk(2, land), 300);
      else if (t === 'back') ctx.later(() => walk(-2, () => {}), 300);
    };
    return ui.choice(it, done, ctx, box, {
      after(ok){
        if (!ok) return;
        steps = NW.irnd(1, 6); const d = $('.sg-dice', A);
        d.textContent = '⚀⚁⚂⚃⚄⚅'[steps - 1]; d.classList.remove('roll'); void d.offsetWidth; d.classList.add('roll'); ctx.sfx('dice');
        ctx.later(() => walk(Math.min(steps, SQ.length - 1 - st.pos), land), 450);
      },
      get wait(){ return steps ? 900 + steps * 170 : undefined; }
    });
  },
  summary:st => ({ title:`ゴール ${st.goals} 回` }) });

/* ---------- タワーづみ ---------- */
NW.game({ id:'tower', name:'タワーづみ', icon:'▤', family:'board', shape:'choice', twists:TW,
  desc:'正解するたびにブロックが1段つみあがる。まちがえると一番上がくずれ落ちる。どこまで高くできる？', how:'選択肢をタップしてブロックをつむ',
  setup(area, ctx, st){
    st.h = 0; st.best = 0;
    area.insertAdjacentHTML('beforeend', `<div class="tr-wrap"><div class="tr-tower"></div><p class="tr-h"><b>0</b>段</p></div><div class="tr-host"></div>`);
    st.host = $('.tr-host', area);
  },
  render(it, done, ctx, box){
    const st = ctx.st, A = ctx.area;
    return ui.choice(it, done, ctx, box, {
      after(ok){
        const tw = $('.tr-tower', A);
        if (ok) {
          st.h++; st.best = Math.max(st.best, st.h);
          const b = document.createElement('i'); b.className = 'tr-b'; b.style.setProperty('--hue', (st.h * 47) % 360); b.style.setProperty('--off', NW.irnd(-10, 10) + 'px');
          tw.appendChild(b); ctx.sfx('drop');
          if (st.h % 10 === 0) fx.banner(`${st.h}段たっせい！`, 'タワー', 'gold');
        } else if (st.h > 0) {
          const top = tw.lastElementChild; st.h--; top.classList.add('fall'); ctx.later(() => top.remove(), 600); ctx.sfx('hurt');
        }
        $('.tr-h b', A).textContent = st.h;
      }
    });
  },
  summary:st => ({ title:`最高 ${st.best} 段` }) });

/* ---------- パネル取り ---------- */
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
function flips(cells, k, who){
  const r = Math.floor(k / 4), c = k % 4, out = [];
  DIRS.forEach(([dr, dc]) => {
    const line = []; let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < 4 && cc >= 0 && cc < 4 && cells[rr * 4 + cc] === 3 - who) { line.push(rr * 4 + cc); rr += dr; cc += dc; }
    if (line.length && rr >= 0 && rr < 4 && cc >= 0 && cc < 4 && cells[rr * 4 + cc] === who) out.push(...line);
  });
  return out;
}
NW.game({ id:'panel', name:'パネル取り', icon:'▦', family:'board', shape:'choice', twists:TW,
  desc:'正解すると好きなパネルを1枚取れる。相手のパネルをはさむと自分の色にひっくり返る。まちがえるとライバルが取る！', how:'正解したら、取りたいパネルをタップ',
  setup(area, ctx, st){
    st.cells = Array(16).fill(0); st.wins = 0; st.boards = 0;
    area.insertAdjacentHTML('beforeend', `<div class="pn-top"><span class="pn-s me">あなた <b>0</b></span><div class="pn-board">${st.cells.map((x, k) => `<button class="pn-c" data-k="${k}" type="button" disabled></button>`).join('')}</div><span class="pn-s cpu">ライバル <b>0</b></span></div><div class="pn-host"></div>`);
    st.host = $('.pn-host', area);
    st.paint = () => {
      $$('.pn-c', area).forEach((b, k) => { b.className = 'pn-c' + (st.cells[k] === 1 ? ' me' : st.cells[k] === 2 ? ' cpu' : ''); });
      $('.pn-s.me b', area).textContent = st.cells.filter(x => x === 1).length; $('.pn-s.cpu b', area).textContent = st.cells.filter(x => x === 2).length;
    };
    st.put = (k, who) => {
      const f = flips(st.cells, k, who); st.cells[k] = who; f.forEach(x => { st.cells[x] = who; }); st.paint();
      const b = $(`.pn-c[data-k="${k}"]`, area); if (b) { b.classList.add('put'); }
      f.forEach(x => { const e = $(`.pn-c[data-k="${x}"]`, area); if (e) e.classList.add('flip'); });
      ctx.sfx(who === 1 ? 'flip' : 'bad');
      if (st.cells.every(x => x)) {
        const me = st.cells.filter(x => x === 1).length; st.boards++;
        if (me > 8) { st.wins++; ctx.addScore(400); fx.banner(`${me}枚で勝ち！ +400`, 'パネル', 'gold'); } else fx.banner(me === 8 ? '引き分け' : `${me}枚… ライバルの勝ち`, 'パネル', 'live');
        ctx.later(() => { st.cells.fill(0); st.paint(); }, 1200);
      }
    };
    st.best = who => { const empt = st.cells.map((x, k) => k).filter(k => !st.cells[k]); let b = -1, bk = empt[0]; NW.shuffle(empt).forEach(k => { const n = flips(st.cells, k, who).length; if (n > b) { b = n; bk = k; } }); return bk; };
  },
  render(it, done, ctx, box){
    const st = ctx.st, A = ctx.area;
    return ui.choice(it, (ok, info) => {
      if (!ok) { const k = st.best(2); if (k != null) ctx.later(() => st.put(k, 2), 500); done(false, info); return; }
      const cont = done(true, Object.assign(info, { hold:true, reveal:'正解！ 取りたいパネルを選んでね', explainAlways:true }));
      if (!cont) return;
      const cells = $$('.pn-c', A); A.classList.add('pn-pick');
      const pick = k => {
        if (st.cells[k]) return; A.classList.remove('pn-pick'); cells.forEach(b => { b.disabled = true; }); st.solve = null;
        st.put(k, 1); ctx.next();
      };
      cells.forEach((b, k) => { b.disabled = !!st.cells[k]; b.onclick = () => pick(k); });
      st.solve = () => pick(st.best(1));
    }, ctx, box);
  },
  summary:st => ({ title:st.boards ? `${st.boards}ボード中 ${st.wins} 勝` : `パネル ${st.cells.filter(x => x === 1).length} 枚` }) });

/* ---------- クイズビンゴ ---------- */
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
NW.game({ id:'bingo', name:'クイズビンゴ', icon:'⊞', family:'board', shape:'choice', kind:'board', accept:ge3, minItems:4, twists:TW,
  desc:'ビンゴカードのマスに答えが書いてある。問題の答えのマスをタップしてあけよう。たて・よこ・ななめがそろうとビンゴ！', how:'問題を読んで、答えが書いてあるマスをタップ',
  mount(A, ctx){
    A.insertAdjacentHTML('beforeend', '<div class="bg-q round"></div><div class="bg-card"></div><p class="bg-info"></p>');
    const qEl = $('.bg-q', A), cardEl = $('.bg-card', A), info = $('.bg-info', A);
    let cells = [], queue = [], cur = null, fin = true, bingos = 0, lines = new Set();
    function newCard(){
      const seen = new Set(), pick = [];
      ctx.peek(60).forEach(it => { const a = it.choices[it.answer]; if (pick.length < 9 && !seen.has(a)) { seen.add(a); pick.push(it); } });
      cells = Array.from({ length:9 }, (_, k) => ({ it:pick[k] || null, st:pick[k] ? 0 : 1 }));
      cells = NW.shuffle(cells); lines = new Set();
      queue = NW.shuffle(cells.filter(c => c.it).map(c => c.it));
      cardEl.innerHTML = cells.map((c, k) => `<button class="bg-c${c.it ? '' : ' free on'}" data-k="${k}" type="button"><span class="opt-t">${c.it ? esc(c.it.choices[c.it.answer]) : 'FREE'}</span></button>`).join('');
    }
    function ask(){
      if (!ctx.alive()) return;
      if (!queue.length) newCard();
      if (!ctx.serve()) { ctx.done('clear'); return; }
      cur = queue.shift(); fin = false;
      qEl.innerHTML = ui.q(cur.q);
      info.textContent = `のこり ${queue.length + 1} 問 ／ ビンゴ ${bingos}`;
      ctx.startQ(() => tap(-1));
    }
    function tap(k){
      if (fin) return; fin = true; ctx.stopQ();
      const c = cells[k], ok = !!c && c.it === cur, ck = cells.findIndex(x => x.it === cur), btn = $(`.bg-c[data-k="${ck}"]`, cardEl);
      if (ok) { c.st = 1; btn.classList.add('on'); ctx.sfx('stamp'); }
      else { cells[ck].st = 2; btn.classList.add('lost'); const w = $(`.bg-c[data-k="${k}"]`, cardEl); if (w) { w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); } }
      const alive = ctx.result(ok, { reveal:ok ? '' : `正解は「${cur.choices[cur.answer]}」`, explain:cur.explain, pts:120 });
      LINES.forEach((L, i) => { if (!lines.has(i) && L.every(x => cells[x].st === 1)) { lines.add(i); bingos++; ctx.addScore(300); fx.banner('ビンゴ！ +300', 'BINGO', 'gold'); ctx.sfx('clear'); L.forEach(x => $(`.bg-c[data-k="${x}"]`, cardEl).classList.add('line')); } });
      if (alive) ctx.later(ask, ok ? 800 : 1600);
    }
    cardEl.addEventListener('click', e => { const b = e.target.closest('.bg-c'); if (b && !b.classList.contains('on') && !b.classList.contains('lost')) tap(Number(b.dataset.k)); });
    newCard(); ask();
    return { solve(ok){ if (fin) return; const ck = cells.findIndex(x => x.it === cur); tap(ok ? ck : cells.findIndex((x, k) => k !== ck && x.st === 0)); } };
  } });

/* ---------- フラッシュ暗記 ---------- */
NW.game({ id:'flash', name:'フラッシュ暗記', icon:'⚡', family:'board', shape:'choice', kind:'board', accept:ge3, twists:['none', 'mirror', 'shake', 'dark'],
  desc:'問題と答えが3つずつ、少しのあいだだけ表示される。しっかりおぼえてから、テストに答えよう！', how:'答えをおぼえて「おぼえた！」→ テストで答えを選ぶ',
  mount(A, ctx){
    let batch = [], quiz = [], cur = null, phase = '', fin = true, cnt = null, ctl = null;
    const host = document.createElement('div'); host.className = 'round'; A.prepend(host);
    function memo(){
      if (!ctx.alive()) return;
      batch = []; for (let i = 0; i < 3; i++) { const it = ctx.take(); if (!it) break; batch.push(it); }
      if (!batch.length) { ctx.done('clear'); return; }
      phase = 'memo';
      host.innerHTML = `<p class="fl-title">おぼえよう！</p><ol class="fl-list">${batch.map(it => `<li><span class="fl-q">${ui.br(it.q)}</span><b class="fl-a">${esc(it.choices[it.answer])}</b></li>`).join('')}</ol><div class="fl-bar"><i></i></div><button class="btn-main fl-go" type="button">おぼえた！</button>`;
      const bar = $('.fl-bar i', host); let t = 0; const lim = 4 + batch.length * 2;
      cnt = ctx.loop(dt => { t += dt; bar.style.width = Math.max(0, 100 - t / lim * 100) + '%'; if (t >= lim) test(); });
      $('.fl-go', host).addEventListener('click', test);
    }
    function test(){
      if (phase !== 'memo') return; phase = 'test'; if (cnt) cnt();
      quiz = NW.shuffle(batch); ask();
    }
    function ask(){
      if (!ctx.alive()) return;
      cur = quiz.shift(); if (!cur) { memo(); return; }
      fin = false;
      host.innerHTML = `<p class="fl-title">テスト（のこり ${quiz.length + 1}）</p>`;
      const box = document.createElement('div'); host.appendChild(box);
      const it = cur;
      ctl = ui.choice(it, (ok, info) => { if (fin) return; fin = true; if (ctx.result(ok, Object.assign(info, { pts:140, explain:it.explain }))) ctx.later(ask, ok ? 700 : 1500); }, ctx, box);
    }
    memo();
    return { solve(ok){ if (phase === 'memo') test(); if (!fin && ctl) ctl.solve(ok); } };
  } });
})(window.NW);
