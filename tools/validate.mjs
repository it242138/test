/* ============================================================
   ワイプ・アーケード：問題パック（JSON）のチェック
   つかいかた：  node tools/validate.mjs packs/my-pack.json  [ほかのファイル…]
               ファイルを指定しないと packs フォルダの全部をチェック
   ============================================================ */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PACKS, V, gameIds, parseJSON, packFiles, flag } from './lib.mjs';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const files = args.length ? args : (await packFiles()).map(f => path.join(PACKS, f));
const ids = await gameIds();
let fail = 0;
for (const f of files) {
  try {
    const raw = parseJSON(await readFile(f, 'utf8'), path.basename(f));
    const r = V.validatePack(raw, { gameIds:ids });
    const c = V.countTypes(r.pack ? r.pack.items : []);
    console.log(`\n${r.ok ? '◯' : '✕'} ${path.basename(f)}　${r.pack ? r.pack.title : ''}`);
    console.log(`  使える問題 ${r.pack ? r.pack.items.length : 0}：${Object.keys(c).map(t => `${V.TYPE_NAME[t]} ${c[t]}`).join('・')}`);
    r.errors.forEach(e => console.log('  ✕ ' + e));
    if (flag('--warn')) r.warnings.forEach(w => console.log('  ・' + w)); else if (r.warnings.length) console.log(`  （アドバイス ${r.warnings.length} こ。--warn を付けると表示）`);
    if (!r.ok) fail++;
  } catch (e) { console.log('\n✕ ' + e.message); fail++; }
}
console.log(fail ? `\nまちがいのあるファイル：${fail}` : '\nぜんぶOK！');
process.exitCode = fail ? 1 : 0;
