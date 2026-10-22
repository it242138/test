/* ============================================================
   ワイプ・アーケード：問題パック（JSON）のチェックと整形
   ブラウザでも Node（tools/validate.mjs・build-bundle.mjs）でも同じものを使う
   問題の種類（type）
     choice     … 選択肢から選ぶ      { q, choices:[2〜6], answer:正解の番号(0から) }
     truefalse  … ほんと？うそ？      { q, answer:true/false }
     number     … 数を答える          { q, answer:数, unit?, label?, min?, max?, step? }
     year       … 年を答える          { q, answer:年, label? }
     order      … ならべかえ          { q, items:[正しい順に3〜8], values?:[年など] }
     pairs      … ペア                { q?, pairs:[[a,b] を3〜8組] }
     groups     … なかま分け          { q?, groups:[{ name, items:[2〜8] } を2〜4つ] }
     word       … ことば              { q:ヒント, answer:ことば(2〜10文字) }
     blank      … 穴うめ              { text:'…[正解]…', choices:[正解をふくむ2〜6] }
   どの種類にも付けられるもの：id, tags:[…], level:1〜3, explain, source:{ label, url }
   ============================================================ */
(function (root) {
'use strict';
const TYPES = ['choice', 'truefalse', 'number', 'year', 'order', 'pairs', 'groups', 'word', 'blank'];
const TYPE_NAME = { choice:'選択', truefalse:'○×', number:'数字', year:'年号', order:'ならべかえ', pairs:'ペア', groups:'なかま分け', word:'ことば', blank:'穴うめ' };
const isStr = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= (max || 200);
const isNum = v => typeof v === 'number' && isFinite(v);
const strArr = (a, min, max, len) => Array.isArray(a) && a.length >= min && a.length <= max && a.every(x => isStr(x, len || 60));
const uniq = a => new Set(a.map(x => String(x).trim())).size === a.length;

function checkItem(it, i, err, warn){
  const at = `items[${i}]` + (it && it.type ? `（${it.type}）` : '');
  const E = m => { err.push(`${at}：${m}`); return null; };
  if (!it || typeof it !== 'object' || Array.isArray(it)) return E('問題は { } の形で書いてください');
  if (!TYPES.includes(it.type)) return E(`type は ${TYPES.join(' / ')} のどれかにしてください`);
  /* 空の文字（""）は「書いていない」のと同じにする */
  it = Object.assign({}, it);
  ['explain', 'short', 'hint', 'unit', 'label', 'id'].forEach(k => { if (typeof it[k] === 'string' && !it[k].trim()) delete it[k]; });
  if ((it.type === 'pairs' || it.type === 'groups') && typeof it.q === 'string' && !it.q.trim()) delete it.q;
  const o = { type:it.type };
  if (it.id != null) { if (!isStr(String(it.id), 60)) return E('id は60文字までの文字にしてください'); o.id = String(it.id); }
  if (it.tags != null) { if (!strArr(it.tags, 0, 10, 20)) return E('tags は20文字までの文字の配列（10こまで）にしてください'); o.tags = it.tags.map(t => t.trim()); }
  if (it.level != null) { if (![1, 2, 3].includes(it.level)) return E('level は 1・2・3 のどれかにしてください'); o.level = it.level; }
  if (it.explain != null) { if (!isStr(it.explain, 300)) return E('explain は300文字までにしてください'); o.explain = it.explain.trim(); }
  if (it.source != null) {
    if (!it.source || !isStr(it.source.label, 120) || (it.source.url != null && !(typeof it.source.url === 'string' && /^https?:\/\//.test(it.source.url)))) return E('source は { "label":"出典名", "url":"https://…" } の形にしてください');
    o.source = { label:it.source.label.trim() }; if (it.source.url) o.source.url = it.source.url;
  }
  const needQ = () => { if (!isStr(it.q, 200)) { E('q（問題文）を200文字までで書いてください'); return false; } o.q = it.q.trim(); return true; };
  switch (it.type) {
    case 'choice':
      if (!needQ()) return null;
      if (!strArr(it.choices, 2, 6, 40)) return E('choices は2〜6この選択肢（40文字まで）にしてください');
      if (!uniq(it.choices)) return E('choices に同じものがあります');
      if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer >= it.choices.length) return E(`answer は正解の番号（0〜${it.choices.length - 1}）にしてください。1つめの選択肢が 0 です`);
      o.choices = it.choices.map(c => c.trim()); o.answer = it.answer;
      if (it.short != null) { if (!isStr(it.short, 16)) return E('short は16文字までにしてください'); o.short = it.short.trim(); }
      break;
    case 'truefalse':
      if (!needQ()) return null;
      if (typeof it.answer !== 'boolean') return E('answer は true（ほんと）か false（うそ）にしてください');
      o.answer = it.answer;
      break;
    case 'number':
    case 'year':
      if (!needQ()) return null;
      if (!isNum(it.answer)) return E('answer は数（"" で囲まない）にしてください');
      if (it.type === 'year' && (!Number.isInteger(it.answer) || it.answer < -3000 || it.answer > 3000)) return E('year の answer は年（整数）にしてください');
      o.answer = it.answer;
      if (it.unit != null) { if (!isStr(it.unit, 10)) return E('unit は10文字までにしてください'); o.unit = it.unit.trim(); }
      if (it.type === 'year') o.unit = '年';
      if (it.label != null) { if (!isStr(it.label, 20)) return E('label（カードに出す短い名前）は20文字までにしてください'); o.label = it.label.trim(); }
      for (const k of ['min', 'max', 'step']) if (it[k] != null) { if (!isNum(it[k])) return E(`${k} は数にしてください`); o[k] = it[k]; }
      if (o.min != null && o.max != null && !(o.min < o.answer && o.answer < o.max)) return E('min ＜ answer ＜ max になるようにしてください');
      if (o.step != null && o.step <= 0) return E('step は0より大きくしてください');
      if (!o.label) warn.push(`${at}：label（短い名前）があると「どっちが先？」「年表さしこみ」などでも使えます`);
      break;
    case 'order':
      if (!needQ()) return null;
      if (!strArr(it.items, 3, 8, 30)) return E('items は正しい順に3〜8こ（30文字まで）にしてください');
      if (!uniq(it.items)) return E('items に同じものがあります');
      o.items = it.items.map(x => x.trim());
      if (it.values != null) { if (!Array.isArray(it.values) || it.values.length !== it.items.length || !it.values.every(v => isStr(String(v), 20))) return E('values は items と同じ数にしてください'); o.values = it.values.map(String); }
      break;
    case 'pairs':
      if (it.q != null) { if (!isStr(it.q, 200)) return E('q は200文字までにしてください'); o.q = it.q.trim(); }
      if (!Array.isArray(it.pairs) || it.pairs.length < 3 || it.pairs.length > 8 || !it.pairs.every(p => Array.isArray(p) && p.length === 2 && isStr(p[0], 20) && isStr(p[1], 24))) return E('pairs は [["ことば","中身"], …] を3〜8組にしてください（20文字まで）');
      if (!uniq(it.pairs.map(p => p[0])) || !uniq(it.pairs.map(p => p[1]))) return E('pairs に同じものがあります');
      o.pairs = it.pairs.map(p => [p[0].trim(), p[1].trim()]);
      break;
    case 'groups':
      if (it.q != null) { if (!isStr(it.q, 200)) return E('q は200文字までにしてください'); o.q = it.q.trim(); }
      if (!Array.isArray(it.groups) || it.groups.length < 2 || it.groups.length > 4) return E('groups は2〜4つにしてください');
      for (const [k, g] of it.groups.entries()) if (!g || !isStr(g.name, 20) || !strArr(g.items, 2, 8, 16)) return E(`groups[${k}] は { "name":"グループ名", "items":[2〜8こ] } にしてください`);
      { const all = it.groups.flatMap(g => g.items.map(x => x.trim())); if (!uniq(all)) return E('groups の中に同じことばがあります'); }
      o.groups = it.groups.map(g => ({ name:g.name.trim(), items:g.items.map(x => x.trim()) }));
      break;
    case 'word':
      if (!needQ()) return null;
      if (!isStr(it.answer, 10) || Array.from(it.answer.trim()).length < 2) return E('answer は2〜10文字のことばにしてください');
      if (/\s/.test(it.answer.trim())) return E('answer にスペースを入れないでください');
      o.answer = it.answer.trim();
      if (it.hint != null) { if (!isStr(it.hint, 100)) return E('hint は100文字までにしてください'); o.hint = it.hint.trim(); }
      break;
    case 'blank': {
      if (!isStr(it.text, 200)) return E('text（[ ] で正解をかこんだ文）を200文字までで書いてください');
      const m = it.text.match(/\[([^\]]+)\]/g);
      if (!m || m.length !== 1) return E('text の中に [正解] を1つだけ入れてください');
      const ans = m[0].slice(1, -1).trim();
      if (!strArr(it.choices, 2, 6, 30) || !uniq(it.choices)) return E('choices は正解をふくむ、ちがう2〜6こにしてください');
      if (!it.choices.map(c => c.trim()).includes(ans)) return E(`choices に正解「${ans}」を入れてください`);
      o.text = it.text.trim(); o.choices = it.choices.map(c => c.trim()); o.answerText = ans;
      break;
    }
  }
  return o;
}

function checkFormat(f, i, err, gameIds){
  const at = `formats[${i}]`;
  if (!f || !isStr(f.id, 40) || !/^[\w-]+$/.test(f.id)) { err.push(`${at}：id は英数字と - _ で40文字までにしてください`); return null; }
  if (!isStr(f.name, 40)) { err.push(`${at}：name（形式の名前）を40文字までで書いてください`); return null; }
  if (!isStr(f.game, 30) || (gameIds && !gameIds.includes(f.game))) { err.push(`${at}：game は遊びの種類のid（例：yontaku）にしてください`); return null; }
  const o = { id:f.id, name:f.name.trim(), game:f.game, flow:f.flow || 'std', twist:f.twist || 'none' };
  if (f.description != null) { if (!isStr(f.description, 200)) { err.push(`${at}：description は200文字までにしてください`); return null; } o.description = f.description.trim(); }
  if (f.filter != null) {
    const F = f.filter, ok = typeof F === 'object' && (F.tags == null || strArr(F.tags, 1, 10, 20)) && (F.level == null || (Array.isArray(F.level) && F.level.every(l => [1, 2, 3].includes(l)))) && (F.thisPackOnly == null || typeof F.thisPackOnly === 'boolean');
    if (!ok) { err.push(`${at}：filter は { "tags":[…], "level":[1,2], "thisPackOnly":true } の形にしてください`); return null; }
    o.filter = { tags:F.tags, level:F.level, thisPackOnly:!!F.thisPackOnly };
  }
  return o;
}

/* パック全体をチェック。ok:false でも、正しい問題だけは items に入る */
function validatePack(pack, opt){
  opt = opt || {};
  const errors = [], warnings = [];
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) return { ok:false, errors:['パックは { "id":…, "title":…, "items":[…] } の形にしてください'], warnings, pack:null };
  if (!isStr(pack.id, 40) || !/^[\w.-]+$/.test(pack.id)) errors.push('id は英数字と . - _ で40文字までにしてください（例："my-pack-1"）');
  if (!isStr(pack.title, 60)) errors.push('title（パックの名前）を60文字までで書いてください');
  if (!Array.isArray(pack.items) || !pack.items.length) errors.push('items（問題の配列）に1つ以上の問題を入れてください');
  const out = { id:isStr(pack.id, 40) ? pack.id.trim() : 'pack-' + Date.now(), title:isStr(pack.title, 60) ? pack.title.trim() : '名前のないパック',
    description:isStr(pack.description, 300) ? pack.description.trim() : '', author:isStr(pack.author, 60) ? pack.author.trim() : '', version:pack.version != null ? String(pack.version).slice(0, 20) : '', items:[], formats:[] };
  (Array.isArray(pack.items) ? pack.items : []).forEach((it, i) => {
    const o = checkItem(it, i, errors, warnings);
    if (o) { o.id = o.id || `${out.id}#${i}`; o.pack = out.id; out.items.push(o); }
  });
  const ids = new Set();
  out.items.forEach(o => { if (ids.has(o.id)) { warnings.push(`id「${o.id}」が重なっています（あとのものに番号を付けました）`); o.id += '~' + ids.size; } ids.add(o.id); });
  (Array.isArray(pack.formats) ? pack.formats : []).forEach((f, i) => { const o = checkFormat(f, i, errors, opt.gameIds); if (o) out.formats.push(o); });
  if (pack.formats != null && !Array.isArray(pack.formats)) errors.push('formats は配列にしてください');
  return { ok:!errors.length, errors, warnings:warnings.slice(0, 30), pack:out };
}

/* 種類ごとの数 */
function countTypes(items){ const c = {}; items.forEach(i => { c[i.type] = (c[i.type] || 0) + 1; }); return c; }

root.ArcadeValidate = { validatePack, checkItem, countTypes, TYPES, TYPE_NAME };
})(typeof window !== 'undefined' ? window : globalThis);
