/* ============================================================
   ワイプ・アーケード：AI に問題パックを作ってもらう
   つかいかた：
     node tools/ai-pack.mjs --topic "宇宙"                      … 40問くらい作って packs/ai-○○.json に保存
       --count 60        … 問題の数のめやす（10〜120）
       --level 1         … むずかしさ 1（やさしい）〜3（むずかしい）
       --for "小学生"     … だれ向けか
       --out packs/space.json --id space --title "宇宙のクイズ"
       --ai-from 答え.json … AI を呼ばずに、保存しておいた答えを使う（テスト用）
   API キーは、ファイルに書かずに「環境変数」で渡す（パックを人に配っても、キーがもれない）
     GEMINI_API_KEY     … Google AI Studio のキー（こちらが優先）
     ANTHROPIC_API_KEY  … Claude のキー
     AI_PROVIDER=gemini|claude、AI_MODEL=モデル名 で切りかえもできる
   AI はまちがえることがある。できたパックは、遊ぶ前にざっと読んで確かめてね
   ============================================================ */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, V, gameIds, opt } from './lib.mjs';

const MODELS = { gemini:'gemini-3.1-flash-lite', claude:'claude-sonnet-5-5' };
const topic = opt('--topic');
if (!topic) { console.log('つかいかた：node tools/ai-pack.mjs --topic "宇宙" [--count 40] [--level 1] [--for "小学生"]'); process.exit(1); }
const count = Math.max(10, Math.min(120, Number(opt('--count', 40)) || 40)), level = Number(opt('--level', 0)) || 0, who = opt('--for', 'クイズ好きな小学生〜大人');
const slug = opt('--id', 'ai-' + (topic.replace(/[^\w-]/g, '').toLowerCase() || Date.now().toString(36)));

const system = `あなたはクイズ作家です。指定のテーマで、ミニゲーム用の「問題パック」を JSON で作ります。
かならず事実として正しいことだけを書き、自信のない数字や年は使わないこと。答えが1つに決まる問題にすること。
出力は JSON だけ（説明文やコードブロックの記号は書かない）。`;
const user = `テーマ：「${topic}」
対象：${who}${level ? `／むずかしさ：${level}（1やさしい〜3むずかしい）` : ''}
問題の数：全部で${count}問くらい

次の形の JSON を1つだけ出力してください。
{ "id":"${slug}", "title":"（パックの名前・20文字まで）", "description":"（説明）", "items":[ …問題… ] }

items に入れる問題の種類（type）と、そのまま守ってほしい決まり：
- choice    { "type":"choice", "q":"問題文", "choices":["正解","まちがい","まちがい","まちがい"], "answer":0, "short":"16文字までの短い言い方", "explain":"解説" }
            選択肢は4つ・40文字まで・同じものを入れない。answer は正解の番号（0から）。short は「問題と答えのペア」に使う
- truefalse { "type":"truefalse", "q":"〜である。", "answer":true か false, "explain":"解説" }   うそ（false）の問題も半分くらい入れる
- year      { "type":"year", "q":"〜は何年？", "answer":西暦の整数, "label":"20文字までの出来事名" }   label は「年表」や「どっちが先？」に使う
- number    { "type":"number", "q":"〜は何m？", "answer":数, "unit":"m", "label":"20文字までの名前" }   同じ unit のものを3つ以上そろえる
- order     { "type":"order", "q":"〜の順にならべよう", "items":["1番目","2番目","3番目","4番目"], "values":["数や年（なくてもよい）",…] }   items は正しい順に3〜8こ・30文字まで
- pairs     { "type":"pairs", "q":"〜のペア", "pairs":[["ことば","ペア"],…] }   4〜6組・左20文字・右24文字まで
- groups    { "type":"groups", "q":"〜のなかま分け", "groups":[{"name":"グループ名","items":["…","…","…","…"]},…] }   2〜4グループ・各3〜4こ・16文字まで・全部ちがうことば
- word      { "type":"word", "q":"ヒントになる問題文", "answer":"2〜6文字のことば（カタカナかひらがな）", "hint":"ヒント" }
- blank     { "type":"blank", "text":"[正解]を入れた文", "choices":["正解","まちがい","まちがい","まちがい"] }   [ ] は1か所だけ
どの問題にも "tags":["小さなテーマ名"] と "level":1〜3 を付ける。
おおよその割合：choice 35%・truefalse 20%・year か number 15%・order 8%・pairs 8%・groups 7%・word 5%・blank 2%（テーマに合わないものは少なくてよい）`;

async function callAI(){
  const fake = opt('--ai-from');
  if (fake) return { text:await readFile(fake, 'utf8'), model:'(テスト用の答え)' };
  const provider = (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : process.env.ANTHROPIC_API_KEY ? 'claude' : '')).toLowerCase();
  if (!provider) throw new Error('API キーがありません。環境変数 GEMINI_API_KEY か ANTHROPIC_API_KEY を設定してください（README の「AIで問題パックを作る」を見てね）');
  const model = process.env.AI_MODEL || MODELS[provider];
  if (!model) throw new Error('AI_PROVIDER は gemini か claude にしてください');
  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY; if (!key) throw new Error('GEMINI_API_KEY がありません');
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method:'POST', headers:{ 'Content-Type':'application/json', 'x-goog-api-key':key }, signal:AbortSignal.timeout(240000),
      body:JSON.stringify({ systemInstruction:{ parts:[{ text:system }] }, contents:[{ role:'user', parts:[{ text:user }] }], generationConfig:{ responseMimeType:'application/json', maxOutputTokens:16000 } })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Gemini API のエラー（${r.status}）: ${(j.error && j.error.message) || ''}`);
    const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
    return { text:parts.filter(p => !p.thought).map(p => p.text || '').join(''), model };
  }
  const key = process.env.ANTHROPIC_API_KEY; if (!key) throw new Error('ANTHROPIC_API_KEY がありません');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', signal:AbortSignal.timeout(240000), headers:{ 'Content-Type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01' },
    body:JSON.stringify({ model, max_tokens:16000, system, messages:[{ role:'user', content:user }] })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Claude API のエラー（${r.status}）: ${(j.error && j.error.message) || ''}`);
  return { text:(j.content || []).filter(c => c.type === 'text').map(c => c.text).join(''), model };
}

/* AI の答えから JSON を取り出す（```json … ``` でかこまれていてもOK） */
function pull(text){
  const t = text.replace(/^﻿/, '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch (e) {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new Error('AI の答えから JSON を見つけられませんでした');
}

try {
  console.log(`「${topic}」の問題を作っています…（${count}問くらい）`);
  const ai = await callAI(), raw = pull(ai.text);
  raw.id = slug; raw.title = opt('--title', raw.title || topic + 'のクイズ'); raw.author = `AI（${ai.model}）`; raw.version = new Date().toISOString().slice(0, 10);
  raw.description = (raw.description || '') + '　※AIが作った問題です。まちがいがあったら直してね';
  const r = V.validatePack(raw, { gameIds:await gameIds() });
  const keep = (raw.items || []).filter((it, i) => !r.errors.some(e => e.startsWith(`items[${i}]`)));
  raw.items = keep;
  const out = opt('--out', path.join(ROOT, 'packs', slug + '.json'));
  await writeFile(out, JSON.stringify(raw, null, 2) + '\n');
  const c = V.countTypes(keep);
  console.log(`\n◯ ${out}\n  ${keep.length} 問：${Object.keys(c).map(t => `${V.TYPE_NAME[t]} ${c[t]}`).join('・')}`);
  if (r.errors.length) { console.log(`  （形がまちがっていた ${r.errors.length} 問は入れませんでした）`); r.errors.slice(0, 8).forEach(e => console.log('   ✕ ' + e)); }
  console.log('\nindex.html を直接開いて遊ぶときは、つぎに node tools/build-bundle.mjs を実行してね（start.bat なら不要）');
} catch (e) { console.log('✕ ' + e.message); process.exitCode = 1; }
