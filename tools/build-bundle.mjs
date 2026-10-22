/* ============================================================
   ワイプ・アーケード：packs フォルダの JSON を js/packs-bundle.js にまとめる
   index.html をダブルクリックで開いたとき（サーバーなし）は、このファイルから問題を読みこむ

   つかいかた：  node tools/build-bundle.mjs
               （Windows は make-bundle.bat をダブルクリックでもOK）
   ・packs フォルダにある .json を全部チェックして、まとめる
   ・packs/packs.json（サーバーで開いたときの一覧）も、いっしょに書きなおす
   ============================================================ */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, PACKS, V, gameIds, parseJSON, packFiles } from './lib.mjs';

const ids = await gameIds(), files = await packFiles(), out = [];
let bad = 0, items = 0;
for (const f of files) {
  try {
    const pack = parseJSON(await readFile(path.join(PACKS, f), 'utf8'), f);
    const r = V.validatePack(pack, { gameIds:ids });
    if (!r.pack || !r.pack.items.length) { console.log(`✕ ${f}：使える問題がないので、入れませんでした`); r.errors.slice(0, 10).forEach(e => console.log('   ' + e)); bad++; continue; }
    out.push({ file:f, pack });
    items += r.pack.items.length;
    console.log(`${r.errors.length ? '△' : '◯'} ${f}：${r.pack.title}（${r.pack.items.length} 問${r.errors.length ? `、使えない問題 ${r.errors.length}` : ''}${r.pack.formats.length ? `、オリジナル形式 ${r.pack.formats.length}` : ''}）`);
    r.errors.slice(0, 10).forEach(e => console.log('   ✕ ' + e));
  } catch (e) { console.log('✕ ' + e.message); bad++; }
}
const head = '/* ワイプ・アーケード：問題パックのまとめ（tools/build-bundle.mjs が作るファイル。手で直さず、packs フォルダの JSON を直してね） */\n';
await writeFile(path.join(ROOT, 'js', 'packs-bundle.js'), head + 'window.ARCADE_BUNDLE = ' + JSON.stringify(out) + ';\n');
await writeFile(path.join(PACKS, 'packs.json'), JSON.stringify({ packs:out.map(x => x.file) }, null, 2) + '\n');
console.log(`\njs/packs-bundle.js を作りました：${out.length} パック・${items} 問${bad ? `（入れられなかったファイル ${bad}）` : ''}`);
