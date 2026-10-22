/* ============================================================
   ワイプ・アーケード：ニュースワイプの「毎日の問題」（daily/*.js）を問題パックに変える
   つかいかた：
     node tools/from-newswipe.mjs ../newswipe/daily              … フォルダの中の日付ファイルを全部
     node tools/from-newswipe.mjs ../newswipe/daily/2026-10-15.js  … ファイルを指定
       --out packs/newswipe-news.json   … 書き出す先（ふだんはこれ）
       --id newswipe-news --title "ニュースワイプの問題"
   変わり方
     いまのニュース（ほんと？うそ？） → ○×（truefalse）
     むかしの年号                     → 年号（year）
     年表ならべ                       → ならべかえ（order）＋ 出来事ごとの年号（year・label付き）
     見出し穴うめ                     → 穴うめ（blank）
     まちがい見出し                   → 選択（choice）
     ボス戦の文                       → ○×（truefalse）
     未来の予想（答えがまだないもの）は入れない
   ============================================================ */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT, V, opt } from './lib.mjs';

const args = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(all[i - 1] || '').startsWith('--'));
if (!args.length) { console.log('つかいかた：node tools/from-newswipe.mjs <daily フォルダ または .js ファイル> [--out packs/newswipe-news.json]'); process.exit(1); }
const files = [];
for (const a of args) {
  const s = await stat(a).catch(() => null);
  if (!s) { console.log('見つかりません：' + a); continue; }
  if (s.isDirectory()) (await readdir(a)).filter(f => /^\d{4}-\d{2}-\d{2}\.js$/.test(f)).sort().forEach(f => files.push(path.join(a, f)));
  else files.push(a);
}
const cut = (s, n) => { s = String(s || '').trim(); return Array.from(s).length > n ? Array.from(s).slice(0, n - 1).join('') + '…' : s; };
const items = [], seenQ = new Set(), seenLabel = new Set();
const push = it => { const k = it.type + '|' + (it.q || it.text || it.label); if (seenQ.has(k)) return; seenQ.add(k); items.push(it); };

for (const f of files) {
  const sandbox = { window:{} };
  try { vm.runInNewContext(await readFile(f, 'utf8'), sandbox, { timeout:2000 }); } catch (e) { console.log(`✕ ${f}：読めませんでした（${e.message}）`); continue; }
  const d = sandbox.window.NW_DAILY; if (!d) { console.log(`✕ ${f}：NW_DAILY がありません`); continue; }
  const tags = ['ニュース', d.date].filter(Boolean), src = q => q.src && q.src.label ? { label:cut(q.src.label, 120), url:/^https?:\/\//.test(q.src.url || '') ? q.src.url : undefined } : undefined;
  let n = 0;
  for (const q of Object.values(d.questions || {})) {
    const t = q.genre ? tags.concat(cut(q.genre, 20)) : tags;
    if (q.kind === 'now' && typeof q.answer === 'boolean') { push({ type:'truefalse', q:cut(q.q, 200), answer:q.answer, explain:cut(q.note || '', 300) || undefined, source:src(q), tags:t, level:q.rate >= 75 ? 1 : q.rate >= 55 ? 2 : 3 }); n++; }
    if (q.kind === 'past' && Number.isInteger(q.year)) { push({ type:'year', q:cut(q.q, 200), answer:q.year, explain:cut(q.note || '', 300) || undefined, source:src(q), tags:t }); n++; }
  }
  for (const z of Object.values(d.nazo || {})) {
    if (z.type === 'order' && Array.isArray(z.items) && z.items.length >= 3) {
      const list = z.items.slice().sort((a, b) => a.y - b.y);
      push({ type:'order', q:cut(z.prompt || '古い順にならべよう', 200), items:list.map(x => cut(x.t, 30)), values:list.map(x => x.y + '年'), explain:cut(z.explain || '', 300) || undefined, tags });
      list.forEach(x => { const label = cut(x.t, 20); if (Number.isInteger(x.y) && !seenLabel.has(label)) { seenLabel.add(label); push({ type:'year', q:`「${x.t}」は何年？`, answer:x.y, label, tags }); } });
      n++;
    }
    if (z.type === 'blank' && Array.isArray(z.choices) && Number.isInteger(z.answer)) { push({ type:'blank', text:cut(`${z.before || ''}[${z.choices[z.answer]}]${z.after || ''}`, 200), choices:z.choices.map(c => cut(c, 30)), explain:cut(z.explain || '', 300) || undefined, tags }); n++; }
    if (z.type === 'mistake' && Array.isArray(z.tiles) && Number.isInteger(z.wrong) && z.tiles.length >= 2 && z.tiles.length <= 6) {
      push({ type:'choice', q:cut(`この見出しのまちがいはどこ？\n「${z.tiles.join('')}」`, 200), choices:z.tiles.map(c => cut(c, 40)), answer:z.wrong, explain:cut(`正しくは「${z.fixText}」。${z.explain || ''}`, 300), tags }); n++;
    }
  }
  for (const b of d.boss || []) if (typeof b.a === 'boolean' && b.s) { push({ type:'truefalse', q:cut(b.s, 200), answer:b.a, explain:b.fix ? cut(b.fix, 300) : undefined, tags }); n++; }
  console.log(`◯ ${path.basename(f)}：${d.label || d.date} から ${n} 問`);
}
const pack = { id:opt('--id', 'newswipe-news'), title:opt('--title', 'ニュースワイプの問題'), description:'ニュースワイプの毎日の問題から作ったパック（tools/from-newswipe.mjs）', author:'ニュースワイプ', version:new Date().toISOString().slice(0, 10), items:JSON.parse(JSON.stringify(items)),
  formats:[{ id:'news-furiwake', name:'ニュースふりわけ', game:'furiwake', flow:'std', twist:'none', description:'ニュースの○×をテンポよくふりわける', filter:{ tags:['ニュース'], thisPackOnly:true } }] };
const r = V.validatePack(pack);
pack.items = pack.items.filter((it, i) => !r.errors.some(e => e.startsWith(`items[${i}]`)));
const out = opt('--out', path.join(ROOT, 'packs', pack.id + '.json'));
await writeFile(out, JSON.stringify(pack, null, 2) + '\n');
console.log(`\n${out} に ${pack.items.length} 問を書き出しました${r.errors.length ? `（使えなかった問題 ${r.errors.length}）` : ''}\nindex.html を直接開いて遊ぶときは、つぎに node tools/build-bundle.mjs を実行してね`);
