/* ============================================================
   ワイプ・アーケード：道具（tools）で共通に使うもの
   ============================================================ */
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PACKS = path.join(ROOT, 'packs');

/* ブラウザと同じチェック（js/validate.js）を使う */
await import(new URL('../js/validate.js', import.meta.url));
export const V = globalThis.ArcadeValidate;

/* js/games/*.js から、遊びの種類の id を集める */
export async function gameIds(){
  const dir = path.join(ROOT, 'js', 'games'), ids = [];
  for (const f of (await readdir(dir)).filter(f => f.endsWith('.js') && !f.startsWith('_'))) {
    const src = await readFile(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/NW\.game\(\{\s*id:\s*'([\w-]+)'/g)) ids.push(m[1]);
  }
  return ids;
}

/* JSON を読む。まちがいがあれば、何行目かを教える */
export function parseJSON(text, file){
  try { return JSON.parse(text.replace(/^﻿/, '')); }
  catch (e) {
    const m = /position (\d+)/.exec(e.message);
    if (m) { const pos = Number(m[1]), before = text.slice(0, pos), line = before.split('\n').length, col = pos - before.lastIndexOf('\n'); throw new Error(`${file}：${line}行目 ${col}文字目あたりの書き方がまちがっています（${e.message}）`); }
    throw new Error(`${file}：JSON として読めません（${e.message}）`);
  }
}

/* packs フォルダの JSON の一覧（packs.json に書いてある順 → のこりは名前順） */
export async function packFiles(){
  const all = (await readdir(PACKS)).filter(f => f.endsWith('.json') && f !== 'packs.json').sort();
  let listed = [];
  try { listed = (JSON.parse(await readFile(path.join(PACKS, 'packs.json'), 'utf8')).packs || []).filter(f => all.includes(f)); } catch (e) { listed = []; }
  return listed.concat(all.filter(f => !listed.includes(f)));
}

export const opt = (name, d) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
export const flag = name => process.argv.includes(name);
