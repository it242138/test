/* ============================================================
   ワイプ・アーケード：問題パックの読みこみと、ゲーム用の形への変換
   読みこむ順番
     1. packs/packs.json に書いてあるパック（start.bat などのサーバーで開いたとき）
     2. js/packs-bundle.js（index.html をダブルクリックで開いたとき。tools/build-bundle.mjs が作る）
     3. 画面の「パック」から読みこんだ JSON（このブラウザに保存）
     4. かんたんエディタで作った「マイパック」
   ゲームは「形（shape）」で問題を受けとる。1つの問題がいろいろな形に変わる
     choice（選択）・tf（○×）・num（数）・compare（どっち）・order（ならべ）・pairs（ペア）・groups（なかま）・word（ことば）・card（年表カード）
   ============================================================ */
window.NW = window.NW || {};
(function (NW) {
'use strict';
const V = window.ArcadeValidate, store = NW.store, shuffle = NW.shuffle, pick = NW.pick;

const P = NW.packs = { all:[], mode:'', loaded:false };
const off = () => store.get('packOff', {});

function add(raw, source, file){
  const r = V.validatePack(raw, { gameIds:Object.keys(NW.games || {}) });
  const p = r.pack || { id:'broken-' + P.all.length, title:file || '読めないパック', items:[], formats:[] };
  if (P.all.some(x => x.id === p.id)) { r.warnings.unshift(`同じ id「${p.id}」のパックがあるので、あとから読んだものは「${p.id}-2」にしました`); p.id += '-2'; p.items.forEach(i => { i.pack = p.id; }); }
  P.all.push(Object.assign(p, { source, file:file || '', errors:r.errors, warnings:r.warnings }));
  return p;
}

P.load = async function (){
  P.all = [];
  let list = null;
  /* index.html を直接開いたとき（file://）は fetch できないので、同梱ファイルを使う */
  if (location.protocol !== 'file:') {
    try {
      const r = await fetch('packs/packs.json', { cache:'no-store' });
      if (r.ok) list = (await r.json()).packs;
    } catch (e) { list = null; }
  }
  if (Array.isArray(list)) {
    P.mode = 'folder';
    for (const f of list) {
      if (typeof f !== 'string' || !/^[\w.\/-]+\.json$/.test(f)) continue;
      try { const r = await fetch('packs/' + f, { cache:'no-store' }); add(await r.json(), 'folder', f); }
      catch (e) { add(null, 'folder', f).errors = [`packs/${f} を読めませんでした（JSON の書き方がまちがっているかも：${e.message}）`]; }
    }
  } else {
    P.mode = 'bundle';
    (window.ARCADE_BUNDLE || []).forEach(b => add(b.pack, 'bundle', b.file));
  }
  store.get('imports', []).forEach(x => add(x.pack, 'import', x.file));
  const mine = store.get('mypack', null);
  if (mine && Array.isArray(mine.items) && mine.items.length) add(mine, 'mine', 'マイパック');
  P.loaded = true;
};
P.enabled = () => P.all.filter(p => !off()[p.id] && p.items.length);
P.setOn = (id, on) => { const o = off(); if (on) delete o[id]; else o[id] = true; store.set('packOff', o); NW.pool.clear(); };
P.isOn = id => !off()[id];
P.importJSON = function (text, file){
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return { ok:false, errors:[`JSON として読めません：${e.message}`] }; }
  const r = V.validatePack(raw, { gameIds:Object.keys(NW.games || {}) });
  if (!r.pack || !r.pack.items.length) return { ok:false, errors:r.errors.length ? r.errors : ['使える問題がありません'] };
  const list = store.get('imports', []).filter(x => !(x.pack && x.pack.id === raw.id));
  list.push({ file:file || 'はりつけ', pack:raw });
  if (!store.set('imports', list)) return { ok:false, errors:['保存できませんでした（ブラウザの保存できる量をこえたかも）'] };
  return { ok:true, errors:r.errors, warnings:r.warnings, count:r.pack.items.length, title:r.pack.title };
};
P.removeImport = function (id){ store.set('imports', store.get('imports', []).filter(x => !(x.pack && x.pack.id === id))); };
P.rawOf = function (p){
  if (p.source === 'import') { const x = store.get('imports', []).find(y => y.pack && (y.pack.id === p.id || p.id === y.pack.id + '-2')); return x ? x.pack : null; }
  if (p.source === 'mine') return store.get('mypack', null);
  const b = (window.ARCADE_BUNDLE || []).find(y => y.pack && y.pack.id === p.id);
  if (b) return b.pack;
  return { id:p.id, title:p.title, description:p.description, author:p.author, items:p.items.map(i => { const o = Object.assign({}, i); delete o.pack; if (String(o.id).includes('#')) delete o.id; return o; }), formats:p.formats };
};

/* ---------- 問題のしぼりこみ ---------- */
function items(filter){
  let list = P.enabled().flatMap(p => p.items);
  if (filter) {
    if (filter.pack) list = list.filter(i => i.pack === filter.pack);
    if (filter.tags && filter.tags.length) list = list.filter(i => (i.tags || []).some(t => filter.tags.includes(t)));
    if (filter.level && filter.level.length) list = list.filter(i => filter.level.includes(i.level || 1));
  }
  return list;
}

/* ---------- 形への変換 ---------- */
const fmtV = (v, unit) => (unit === '年' ? String(v) : Math.abs(v) >= 10000 ? v.toLocaleString('ja-JP') : String(v)) + (unit || '');
function mixChoices(choices, answer){
  const order = shuffle(choices.map((c, i) => i));
  return { choices:order.map(i => choices[i]), answer:order.indexOf(answer) };
}
function yearChoices(y){
  const set = new Set([y]);
  const offs = shuffle([-12, -9, -7, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 7, 9, 12]);
  for (const o of offs) { if (set.size >= 4) break; set.add(y + o); }
  return [...set].map(v => v + '年');
}
function numChoices(a, unit){
  const int = Number.isInteger(a), set = new Set([a]);
  for (const f of shuffle([0.5, 0.75, 1.25, 1.5, 2, 3, 0.25, 4, 10, 0.1])) {
    if (set.size >= 4) break;
    let v = a * f; v = int ? Math.round(v) : Math.round(v * 10) / 10;
    if (v !== a && v > 0) set.add(v);
  }
  let k = 1; while (set.size < 4) { set.add(a + k * (int ? 1 : 0.1)); k++; }
  return [...set].map(v => fmtV(v, unit));
}
function cardsOf(list){
  const c = [];
  list.forEach(i => { if ((i.type === 'year' || i.type === 'number') && i.label) c.push({ t:i.label, v:i.answer, unit:i.unit || '', disp:fmtV(i.answer, i.unit), src:i }); });
  const byUnit = {};
  c.forEach(x => { (byUnit[x.unit] = byUnit[x.unit] || []).push(x); });
  Object.keys(byUnit).forEach(u => { const seen = new Set(); byUnit[u] = byUnit[u].filter(x => !seen.has(x.t) && seen.add(x.t)); });
  return byUnit;
}
const blankQ = it => it.text.replace(/\[[^\]]+\]/, '［　］');

const ADAPT = {
  choice(list){
    const out = [], words = list.filter(i => i.type === 'word').map(i => i.answer);
    list.forEach(it => {
      const base = { explain:it.explain, src:it };
      if (it.type === 'choice') out.push(Object.assign({ q:it.q }, mixChoices(it.choices, it.answer), base));
      else if (it.type === 'blank') out.push(Object.assign({ q:'［　］に入るのは？\n' + blankQ(it) }, mixChoices(it.choices, it.choices.indexOf(it.answerText)), base));
      else if (it.type === 'truefalse') out.push(Object.assign({ q:it.q, choices:['◯ ほんと', '✕ うそ'], answer:it.answer ? 0 : 1 }, base));
      else if (it.type === 'year') { const ch = yearChoices(it.answer); out.push(Object.assign({ q:it.q }, mixChoices(ch, 0), base)); }
      else if (it.type === 'number') { const ch = numChoices(it.answer, it.unit); out.push(Object.assign({ q:it.q }, mixChoices(ch, 0), base)); }
      else if (it.type === 'pairs') it.pairs.forEach((p, k) => {
        const others = shuffle(it.pairs.filter((x, j) => j !== k).map(x => x[1])).slice(0, 3);
        out.push(Object.assign({ q:`「${p[0]}」とペアになるのは？` }, mixChoices([p[1], ...others], 0), base));
      });
      else if (it.type === 'groups') it.groups.forEach((g, k) => {
        const others = it.groups.filter((x, j) => j !== k); if (g.items.length < 3 || !others.length) return;
        const o = pick(others), odd = pick(o.items);
        out.push(Object.assign({ q:'なかまはずれはどれ？' + (it.q ? '\n（' + it.q + '）' : '') }, mixChoices([odd, ...shuffle(g.items).slice(0, 3)], 0),
          { explain:`「${odd}」は${o.name}。ほかは${g.name}のなかま。`, src:it }));
      });
      else if (it.type === 'word' && words.length >= 4) {
        const others = shuffle(words.filter(w => w !== it.answer)).slice(0, 3);
        out.push(Object.assign({ q:it.q }, mixChoices([it.answer, ...others], 0), base));
      }
      else if (it.type === 'order') {
        const ch = it.items.slice(0, Math.min(4, it.items.length));
        out.push(Object.assign({ q:`${it.q}\nいちばん最初（1番目）はどれ？` }, mixChoices(ch, 0), { explain:it.explain || `正しい順：${it.items.join(' → ')}`, src:it }));
      }
    });
    return out;
  },
  tf(list){
    const out = [];
    list.forEach(it => {
      const base = { explain:it.explain, src:it }, coin = Math.random() < 0.5;
      if (it.type === 'truefalse') out.push(Object.assign({ q:it.q, answer:it.answer }, base));
      else if (it.type === 'choice') {
        const wrong = it.choices.filter((c, i) => i !== it.answer), opt = coin ? it.choices[it.answer] : pick(wrong);
        out.push(Object.assign({ q:`${it.q}\n→ 答えは「${opt}」`, answer:coin }, base, { explain:`正解は「${it.choices[it.answer]}」。${it.explain || ''}` }));
      } else if (it.type === 'year' && /何年[？?]?$/.test(it.q)) {
        const y = coin ? it.answer : it.answer + pick([-5, -3, -2, -1, 1, 2, 3, 5]);
        out.push(Object.assign({ q:it.q.replace(/何年[？?]?$/, `${y}年。`), answer:coin }, base, { explain:`正しくは${it.answer}年。${it.explain || ''}` }));
      } else if (it.type === 'number' && it.unit && it.q.includes('何' + it.unit)) {
        const v = coin ? it.answer : numChoices(it.answer, '').map(Number).find(x => x !== it.answer);
        out.push(Object.assign({ q:it.q.replace('何' + it.unit, fmtV(v, it.unit)).replace(/[？?]$/, '。'), answer:coin }, base, { explain:`正しくは${fmtV(it.answer, it.unit)}。${it.explain || ''}` }));
      } else if (it.type === 'pairs') {
        const k = Math.floor(Math.random() * it.pairs.length), p = it.pairs[k];
        const b = coin ? p[1] : pick(it.pairs.filter((x, j) => j !== k))[1];
        out.push(Object.assign({ q:`「${p[0]}」と「${b}」はペア`, answer:coin }, base, { explain:`「${p[0]}」とペアなのは「${p[1]}」。` }));
      } else if (it.type === 'groups') {
        const g = pick(it.groups), other = pick(it.groups.filter(x => x !== g)), x = coin ? pick(g.items) : pick(other.items);
        out.push(Object.assign({ q:`「${x}」は「${g.name}」のなかま`, answer:coin }, base, { explain:`「${x}」は${coin ? g.name : other.name}。` }));
      } else if (it.type === 'blank') {
        const wrong = it.choices.filter(c => c !== it.answerText), w = coin ? it.answerText : pick(wrong);
        out.push(Object.assign({ q:it.text.replace(/\[[^\]]+\]/, w), answer:coin }, base, { explain:`正しくは「${it.text.replace(/\[([^\]]+)\]/, '$1')}」` }));
      }
    });
    return out;
  },
  num(list){
    return list.filter(i => i.type === 'number' || i.type === 'year').map(it => ({ q:it.q, answer:it.answer, unit:it.unit || '', min:it.min, max:it.max, step:it.step, label:it.label, explain:it.explain, src:it }));
  },
  compare(list){
    const out = [], byUnit = cardsOf(list);
    Object.keys(byUnit).forEach(u => {
      const cs = byUnit[u]; if (cs.length < 2) return;
      for (let n = 0; n < Math.min(40, cs.length * 2); n++) {
        const [a, b] = shuffle(cs).slice(0, 2); if (a.v === b.v) continue;
        const early = u === '年';
        out.push({ q:early ? 'どっちが先（古い）？' : 'どっちが大きい？', a, b, pickSmaller:early, answer:early ? (a.v < b.v ? 0 : 1) : (a.v > b.v ? 0 : 1), unit:u });
      }
    });
    return out;
  },
  order(list){
    const out = [];
    list.forEach(it => { if (it.type === 'order') out.push({ q:it.q, items:it.items, values:it.values, explain:it.explain, src:it }); });
    const byUnit = cardsOf(list);
    Object.keys(byUnit).forEach(u => {
      const cs = byUnit[u]; if (cs.length < 4) return;
      for (let n = 0; n < Math.min(12, Math.floor(cs.length / 2)); n++) {
        const four = shuffle(cs).slice(0, 4); if (new Set(four.map(x => x.v)).size < 4) continue;
        four.sort((x, y) => x.v - y.v);
        out.push({ q:u === '年' ? '古い順にならべよう' : `数の小さい順にならべよう（${u || '数'}）`, items:four.map(x => x.t), values:four.map(x => x.disp) });
      }
    });
    return out;
  },
  pairs(list){
    const out = [];
    list.forEach(it => { if (it.type === 'pairs') out.push({ q:it.q || 'ペアをそろえよう', pairs:it.pairs, explain:it.explain, src:it }); });
    const byUnit = cardsOf(list);
    Object.keys(byUnit).forEach(u => {
      const cs = byUnit[u]; if (cs.length < 4) return;
      for (let n = 0; n < Math.min(6, Math.floor(cs.length / 4)); n++) {
        const four = shuffle(cs).slice(0, 4); if (new Set(four.map(x => x.disp)).size < 4) continue;
        out.push({ q:u === '年' ? '出来事と年をペアにしよう' : 'ものと数字をペアにしよう', pairs:four.map(x => [x.t, x.disp]) });
      }
    });
    const shorts = list.filter(i => i.type === 'choice' && i.short);
    for (let n = 0; n + 4 <= shorts.length && n < 24; n += 4) {
      const four = shorts.slice(n, n + 4);
      if (new Set(four.map(x => x.choices[x.answer])).size === 4) out.push({ q:'問題と答えをペアにしよう', pairs:four.map(x => [x.short, x.choices[x.answer]]) });
    }
    return out;
  },
  groups(list){ return list.filter(i => i.type === 'groups').map(it => ({ q:it.q || 'なかまに分けよう', groups:it.groups, explain:it.explain, src:it })); },
  word(list){ return list.filter(i => i.type === 'word').map(it => ({ q:it.q, answer:it.answer, hint:it.hint, explain:it.explain, src:it })); },
  card(list){
    const byUnit = cardsOf(list), best = Object.keys(byUnit).sort((a, b) => byUnit[b].length - byUnit[a].length)[0];
    return best ? byUnit[best].map(c => Object.assign({}, c)) : [];
  }
};

/* 形ごとの問題のあつまり（しぼりこみごとに作って、とっておく） */
const cache = {};
NW.pool = function (shape, filter){
  const key = shape + '|' + JSON.stringify(filter || {});
  if (!cache[key]) cache[key] = ADAPT[shape] ? ADAPT[shape](items(filter)) : [];
  return cache[key];
};
NW.pool.clear = () => { Object.keys(cache).forEach(k => { delete cache[k]; }); };
NW.pool.items = items;
NW.pool.count = function (filter){ return V.countTypes(items(filter)); };
NW.pool.fmtV = fmtV;
})(window.NW);
