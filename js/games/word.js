/* ============================================================
   ワイプ・アーケード：ことばのなかま
   文字ならべ・ことばあて・文字さがし
   ============================================================ */
(function (NW) {
'use strict';
const { $, $$, esc, ui } = NW;
const TW = ['none', 'hurry', 'mirror', 'shake', 'dark'];
const HIRA = Array.from('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだでどばびぶべぼ');
const KATA = Array.from('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダデドバビブベボー');
const isKata = c => /[゠-ヿ]/.test(c), isHira = c => /[぀-ゟ]/.test(c);
/* まぎらわしい文字（ほかの答えの文字＋同じ種類のかな） */
function decoys(word, ctx, n){
  const own = new Set(Array.from(word)), out = new Set();
  ctx.peek(30).forEach(w => Array.from(w.answer).forEach(c => { if (!own.has(c)) out.add(c); }));
  const kana = Array.from(word).some(isKata) ? KATA : HIRA;
  let list = NW.shuffle([...out]).filter(c => Array.from(word).some(isKata) ? isKata(c) : Array.from(word).some(isHira) ? isHira(c) || !isKata(c) : true);
  if (list.length < n) list = list.concat(NW.shuffle(kana.filter(c => !own.has(c))));
  return list.slice(0, n);
}

/* ---------- 文字ならべ ---------- */
NW.game({ id:'mojinarabe', name:'文字ならべ', icon:'あ', family:'word', shape:'word', twists:TW, hurry:12,
  desc:'バラバラになった文字をならべて、答えのことばを作る。まちがえても1回だけやり直せる。', how:'文字を順にタップ。入れた文字をタップすると、もどせる',
  render(it, done, ctx, box){
    const ch = Array.from(it.answer), n = ch.length;
    let tiles = NW.shuffle(ch.map((c, i) => ({ c, i }))); if (tiles.map(t => t.c).join('') === it.answer && n > 1) tiles = tiles.reverse();
    box.innerHTML = ui.q(it.q) + `<div class="mj-slots">${ch.map((c, k) => `<button class="mj-s" data-k="${k}" type="button"></button>`).join('')}</div><div class="mj-tiles">${tiles.map((t, k) => `<button class="mj-t" data-k="${k}" type="button">${esc(t.c)}</button>`).join('')}</div>
      <div class="nb-act">${it.hint ? '<button class="btn-sub mj-hint" type="button">ヒント（-40点）</button>' : ''}<button class="btn-sub mj-clr" type="button">ぜんぶもどす</button></div><p class="mj-msg"></p>`;
    let slot = [], retry = false, hint = false, fin = false;
    const paint = () => {
      $$('.mj-s', box).forEach((s, k) => { s.textContent = slot[k] != null ? tiles[slot[k]].c : ''; s.classList.toggle('on', slot[k] != null); });
      $$('.mj-t', box).forEach((t, k) => { t.disabled = fin || slot.includes(k); });
    };
    const check = () => {
      const w = slot.map(k => tiles[k].c).join('');
      if (w === it.answer) { fin = true; paint(); $('.mj-slots', box).classList.add('is-right'); ctx.sfx('find'); done(true, { pts:(retry ? 90 : 150) - (hint ? 40 : 0) }); return; }
      if (!retry) { retry = true; ctx.sfx('bad'); NW.fx.shake($('.mj-slots', box)); $('.mj-msg', box).textContent = 'ちがうみたい… もう1回だけ！'; ctx.later(() => { slot = []; paint(); }, 500); return; }
      fin = true; paint(); $('.mj-slots', box).classList.add('is-wrong'); done(false, { reveal:`答えは「${it.answer}」` });
    };
    const put = k => { if (fin || slot.includes(k) || slot.length >= n) return; slot.push(k); ctx.sfx('pick', { i:slot.length }); paint(); if (slot.length === n) check(); };
    $('.mj-tiles', box).addEventListener('click', e => { const t = e.target.closest('.mj-t'); if (t && !t.disabled) put(Number(t.dataset.k)); });
    $('.mj-slots', box).addEventListener('click', e => { const s = e.target.closest('.mj-s'); if (!s || fin) return; const k = Number(s.dataset.k); if (slot[k] != null) { slot = slot.slice(0, k); paint(); } });
    $('.mj-clr', box).addEventListener('click', () => { if (!fin) { slot = []; paint(); } });
    const hb = $('.mj-hint', box); if (hb) hb.addEventListener('click', () => { hint = true; hb.disabled = true; $('.mj-msg', box).textContent = 'ヒント：' + it.hint; });
    ctx.keys(e => { if (e.key === 'Backspace') { slot.pop(); paint(); return true; } const k = tiles.findIndex((t, i) => t.c === e.key && !slot.includes(i)); if (k >= 0) { put(k); return true; } return false; });
    return {
      solve(ok){ if (fin) return; if (!ok) { retry = true; slot = tiles.map((t, k) => k).reverse(); if (slot.map(k => tiles[k].c).join('') === it.answer) { fin = true; done(false, { reveal:'' }); return; } check(); return; } const used = new Set(); slot = ch.map(c => { const k = tiles.findIndex((t, i) => t.c === c && !used.has(i)); used.add(k); return k; }); check(); },
      timeout(){ if (fin) return; fin = true; paint(); done(false, { reveal:`時間切れ。答えは「${it.answer}」` }); }
    };
  } });

/* ---------- ことばあて ---------- */
NW.game({ id:'kotobaate', name:'ことばあて', icon:'？', family:'word', shape:'word', twists:TW, hurry:15,
  desc:'かくれたことばを、1文字ずつ当てていく。まちがえていいのは4回まで。', how:'入っていそうな文字をタップ',
  render(it, done, ctx, box){
    const ch = Array.from(it.answer), uniq = [...new Set(ch)], MISS = 4;
    const pal = NW.shuffle(uniq.concat(decoys(it.answer, ctx, Math.max(5, 12 - uniq.length))));
    box.innerHTML = ui.q(it.q) + `<div class="ka-word">${ch.map((c, k) => `<span class="ka-c" data-k="${k}"></span>`).join('')}</div><p class="ka-life">ミスできる回数 <b></b></p><div class="ka-pal">${pal.map((c, k) => `<button class="ka-k" data-c="${esc(c)}" type="button">${esc(c)}</button>`).join('')}</div>`;
    const got = new Set(); let miss = 0, fin = false;
    const paint = () => { $$('.ka-c', box).forEach((s, k) => { s.textContent = got.has(ch[k]) || fin ? ch[k] : ''; s.classList.toggle('on', got.has(ch[k])); }); $('.ka-life b', box).textContent = '●'.repeat(MISS - miss) + '○'.repeat(miss); };
    paint();
    const tap = c => {
      if (fin) return;
      const b = $$('.ka-k', box).find(x => x.dataset.c === c); if (!b || b.disabled) return; b.disabled = true;
      if (uniq.includes(c)) { got.add(c); b.classList.add('is-right'); ctx.sfx('pick', { i:got.size }); }
      else { miss++; b.classList.add('is-wrong'); ctx.sfx('bad'); }
      if (uniq.every(x => got.has(x))) { fin = true; paint(); done(true, { pts:100 + 25 * (MISS - miss) }); return; }
      if (miss >= MISS) { fin = true; paint(); $('.ka-word', box).classList.add('is-wrong'); done(false, { reveal:`答えは「${it.answer}」` }); return; }
      paint();
    };
    $('.ka-pal', box).addEventListener('click', e => { const b = e.target.closest('.ka-k'); if (b) tap(b.dataset.c); });
    ctx.keys(e => { if (pal.includes(e.key)) { tap(e.key); return true; } return false; });
    return { solve(ok){ if (ok) uniq.forEach(c => tap(c)); else pal.filter(c => !uniq.includes(c)).forEach(c => tap(c)); if (!fin) { fin = true; paint(); done(false, {}); } }, timeout(){ if (fin) return; fin = true; paint(); done(false, { reveal:`時間切れ。答えは「${it.answer}」` }); } };
  } });

/* ---------- 文字さがし ---------- */
const DIR = [[0, 1], [1, 0], [1, 1]];
NW.game({ id:'wordsearch', name:'文字さがし', icon:'⌗', family:'word', shape:'word', kind:'board', accept:it => Array.from(it.answer).length <= 6, twists:TW,
  desc:'文字がならんだマスの中に、ヒントの答えがかくれている。たて・よこ・ななめにさがそう。', how:'ことばの最初の文字と最後の文字をタップ',
  mount(A, ctx){
    const N = 6;
    A.insertAdjacentHTML('beforeend', `<div class="round ws"><ul class="ws-clues"></ul><div class="ws-grid" style="--n:${N}"></div><div class="nb-act"><button class="btn-sub ws-give" type="button">こうさん</button></div></div>`);
    const grid = $('.ws-grid', A), clues = $('.ws-clues', A);
    let G = [], words = [], first = null, live = false;
    function build(){
      if (!ctx.alive()) return;
      G = Array.from({ length:N * N }, () => null); words = [];
      const seen = new Set();
      for (const w of ctx.peek(40)) {
        if (words.length >= 4) break;
        if (seen.has(w.answer)) continue;
        const ch = Array.from(w.answer);
        for (let t = 0; t < 80; t++) {
          const [dr, dc] = NW.pick(DIR), r0 = NW.irnd(0, N - 1 - dr * (ch.length - 1)), c0 = NW.irnd(0, N - 1 - dc * (ch.length - 1));
          if (r0 < 0 || c0 < 0) break;
          const cells = ch.map((c, k) => (r0 + dr * k) * N + c0 + dc * k);
          if (cells.every((x, k) => G[x] === null || G[x] === ch[k])) { if (!ctx.serve()) break; cells.forEach((x, k) => { G[x] = ch[k]; }); words.push({ it:w, cells, found:false }); seen.add(w.answer); break; }
        }
      }
      if (!words.length) { ctx.done('clear'); return; }
      const fill = decoys(words.map(w => w.it.answer).join(''), ctx, 30);
      G = G.map(c => c || NW.pick(fill.length ? fill : HIRA));
      grid.innerHTML = G.map((c, k) => `<button class="ws-c" data-k="${k}" type="button">${esc(c)}</button>`).join('');
      paintClues(); live = true; first = null;
      ctx.startQ(giveUp, ctx.rules.perQ ? 10 * words.length : 30 * words.length);
    }
    function paintClues(){ clues.innerHTML = words.map((w, i) => `<li class="${w.found ? 'got' : ''}${w.miss ? ' miss' : ''}"><b>${Array.from(w.it.answer).length}文字</b> ${ui.br(w.it.q)}${w.found || w.miss ? ` → <em>${esc(w.it.answer)}</em>` : ''}</li>`).join(''); }
    function line(a, b){
      const r1 = Math.floor(a / N), c1 = a % N, r2 = Math.floor(b / N), c2 = b % N, dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1), len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)) + 1;
      if (!(r1 === r2 || c1 === c2 || Math.abs(r2 - r1) === Math.abs(c2 - c1))) return null;
      return Array.from({ length:len }, (_, k) => (r1 + dr * k) * N + c1 + dc * k);
    }
    function pickCells(cells){
      const w = words.find(x => !x.found && !x.miss && (x.cells.join() === cells.join() || x.cells.slice().reverse().join() === cells.join()));
      $$('.ws-c.sel', grid).forEach(b => b.classList.remove('sel'));
      if (!w) { ctx.sfx('bad'); cells.forEach(k => { const b = grid.children[k]; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }); return; }
      w.found = true; w.cells.forEach(k => grid.children[k].classList.add('got')); paintClues();
      const alive = ctx.result(true, { pts:120 + Array.from(w.it.answer).length * 10, explain:w.it.explain });
      next(alive);
    }
    function next(alive){ if (!alive) return; if (words.every(w => w.found || w.miss)) { live = false; ctx.stopQ(); ctx.later(build, 1000); } }
    function giveUp(){
      if (!live) return; ctx.stopQ();
      let alive = true;
      words.filter(w => !w.found && !w.miss).forEach(w => { if (!alive) return; w.miss = true; w.cells.forEach(k => grid.children[k].classList.add('miss')); alive = ctx.result(false, { reveal:`「${w.it.answer}」でした`, quiet:false }); });
      paintClues(); live = false; if (alive) ctx.later(build, 1600);
    }
    grid.addEventListener('click', e => {
      const b = e.target.closest('.ws-c'); if (!b || !live) return;
      const k = Number(b.dataset.k);
      if (first == null) { first = k; b.classList.add('sel'); ctx.sfx('tap'); return; }
      if (first === k) { first = null; b.classList.remove('sel'); return; }
      const cells = line(first, k); first = null;
      if (!cells) { $$('.ws-c.sel', grid).forEach(x => x.classList.remove('sel')); b.classList.add('sel'); first = k; return; }
      pickCells(cells);
    });
    $('.ws-give', A).addEventListener('click', giveUp);
    build();
    return { solve(ok){ if (!live) return; const w = words.find(x => !x.found && !x.miss); if (!w) return; if (ok) pickCells(w.cells); else { w.miss = true; paintClues(); next(ctx.result(false, { reveal:`「${w.it.answer}」でした` })); } } };
  } });
})(window.NW);
