/* ============================================================
   ワイプ・アーケード：画面（ホーム・形式一覧・問題パック・設定・結果）
   ============================================================ */
(function (NW) {
'use strict';
const { $, $$, esc, store } = NW;
const V = window.ArcadeValidate;
const FAM_ORDER = ['all', 'choice', 'action', 'board', 'tf', 'num', 'order', 'pairs', 'groups', 'word', 'mix'];
NW.FAMILIES.action = { name:'アクション', icon:'▲' };
const famName = f => f === 'all' ? 'すべて' : (NW.FAMILIES[f] || {}).name || f;

/* ---------- 遊べるかどうか（ゲーム×しぼりこみごとに覚えておく） ---------- */
let canMemo = {};
const why = (g, filter) => { const k = g.id + '|' + JSON.stringify(filter || null); if (!(k in canMemo)) canMemo[k] = NW.canPlay(g, filter); return canMemo[k]; };
const playable = f => !why(NW.games[f.game], f.filter);
function refresh(){ canMemo = {}; NW.pool.clear(); NW.catalog.reset(); }

/* ---------- 画面の切り替え ---------- */
const TABS = ['home', 'list', 'packs', 'settings'];
let tab = 'home';
NW.show = function (name){
  const app = $('#app');
  if (TABS.includes(name)) {
    tab = name;
    TABS.forEach(n => { $('#scr-' + n).hidden = n !== name; });
    $$('.tab').forEach(t => t.setAttribute('aria-current', t.dataset.go === name ? 'page' : 'false'));
    ({ home:renderHome, list:renderList, packs:renderPacks, settings:renderSettings })[name]();
    $('.main').scrollTop = 0;
  }
  $('#scr-play').hidden = name !== 'play';
  $('#scr-result').hidden = name !== 'result';
  app.dataset.mode = name === 'play' || name === 'result' ? name : 'menu';
  paintTop();
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (!b) return;
  if (NW.session()) NW.quit();
  NW.show(b.dataset.go);
});

function paintTop(){
  $('#top-stars').innerHTML = `<span aria-hidden="true">★</span><b class="num">${NW.records.stars()}</b>`;
  const s = $('#btn-sound'); s.setAttribute('aria-pressed', String(NW.soundOn));
  s.innerHTML = NW.soundOn ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
}
$('#btn-sound').addEventListener('click', () => { NW.soundOn = !NW.soundOn; store.set('sound', NW.soundOn); paintTop(); NW.sfx('tap'); });

/* ---------- ホーム ---------- */
let fam = store.get('fam', 'all');
function daily(){
  const list = NW.catalog().filter(f => !f.custom && playable(f));
  if (!list.length) return null;
  return list[NW.hash('arcade' + NW.today()) % list.length];
}
function renderHome(){
  const d = daily(), all = NW.catalog(), ok = all.filter(playable).length, items = NW.pool.items().length;
  $('#hero-face').innerHTML = NW.art.mascot(d ? 'happy' : 'think');
  $('#hero-date').textContent = NW.today().slice(5).replace('-', '/');
  if (d) {
    const g = NW.games[d.game], r = NW.records.get(d.id);
    $('#hero-title').textContent = d.name;
    $('#hero-sub').innerHTML = `${esc(g.desc)}${r ? `<br><span class="best">きょうのベスト ${NW.stars(r.stars)} ${NW.fmt(r.score)}点</span>` : ''}`;
  } else { $('#hero-title').textContent = '問題パックがありません'; $('#hero-sub').textContent = '「問題パック」から JSON を読みこんでね'; }
  $('#btn-daily').disabled = !d; $('#btn-random').disabled = !ok;
  $('#stat-line').innerHTML = `遊べる形式 <b class="num">${NW.fmt(ok)}</b> ／ 全 <b class="num">${NW.fmt(all.length)}</b> 形式　問題 <b class="num">${NW.fmt(items)}</b> こ　プレイ <b class="num">${NW.fmt(NW.records.plays())}</b> 回`;
  const fams = FAM_ORDER.filter(f => f === 'all' || Object.values(NW.games).some(g => g.family === f));
  $('#fam-chips').innerHTML = fams.map(f => `<button class="chip${f === fam ? ' on' : ''} fam-${f}" data-fam="${f}" type="button" role="tab" aria-selected="${f === fam}">${f === 'all' ? '' : `<i>${esc((NW.FAMILIES[f] || {}).icon || '')}</i>`}${esc(famName(f))}</button>`).join('');
  const games = Object.values(NW.games).filter(g => fam === 'all' || g.family === fam);
  $('#game-grid').innerHTML = games.map(g => {
    const n = all.filter(f => f.game === g.id).length, w = why(g, null), stars = NW.records.gameStars(g.id), done = NW.records.gameDone(g.id);
    return `<button class="gc fam-${g.family}${w ? ' off' : ''}" data-g="${g.id}" type="button"><span class="gc-ic" aria-hidden="true">${esc(g.icon)}</span><span class="gc-body"><b class="gc-name">${esc(g.name)}</b><span class="gc-desc">${esc(g.desc)}</span></span>
      <span class="gc-foot">${w ? '<span class="gc-warn">問題が足りない</span>' : `<span class="gc-st">★ <b class="num">${stars}</b></span><span class="gc-n num">${done}/${n} 形式</span>`}</span></button>`;
  }).join('');
}
$('#fam-chips').addEventListener('click', e => { const c = e.target.closest('[data-fam]'); if (!c) return; fam = c.dataset.fam; store.set('fam', fam); renderHome(); });
$('#game-grid').addEventListener('click', e => { const c = e.target.closest('.gc'); if (c) openGame(c.dataset.g); });
$('#btn-daily').addEventListener('click', () => { const d = daily(); if (d) NW.play(d.id); });
$('#btn-random').addEventListener('click', () => { const l = NW.catalog().filter(playable); if (l.length) NW.play(NW.pick(l).id); });

/* ---------- ゲームの説明と、進め方・ひねりを選ぶシート ---------- */
function openGame(gid){
  const g = NW.games[gid], picks = store.get('pick', {}), p = Object.assign({ flow:'std', twist:'none' }, picks[gid]);
  if (!g.flows.includes(p.flow)) p.flow = g.flows[0]; if (!g.twists.includes(p.twist)) p.twist = g.twists[0];
  const w = why(g, null), custom = NW.catalog().filter(f => f.custom && f.game === gid);
  NW.sheet.open(g.name, `
    <div class="gd fam-${g.family}"><span class="gc-ic" aria-hidden="true">${esc(g.icon)}</span><div><p>${esc(g.desc)}</p><p class="gd-how"><b>あそびかた</b>　${esc(g.how)}</p></div></div>
    ${w ? `<p class="warn">${esc(w)}</p>` : ''}
    <div class="pick"><p class="pick-h">進め方</p><div class="chips small" data-pick="flow">${g.flows.map(f => `<button class="chip${f === p.flow ? ' on' : ''}" data-v="${f}" type="button" title="${esc(NW.FLOWS[f].desc)}">${esc(NW.FLOWS[f].name)}</button>`).join('')}</div></div>
    <div class="pick"><p class="pick-h">ひねり</p><div class="chips small" data-pick="twist">${g.twists.map(t => `<button class="chip${t === p.twist ? ' on' : ''}" data-v="${t}" type="button" title="${esc(NW.TWISTS[t].desc)}">${esc(NW.TWISTS[t].name)}</button>`).join('')}</div></div>
    <div class="gd-fm"><p class="gd-name" id="gd-name"></p><p class="gd-desc" id="gd-desc"></p><p class="gd-best" id="gd-best"></p></div>
    <button class="btn-main wide" id="gd-go" type="button"${w ? ' disabled' : ''}>スタート</button>
    ${custom.length ? `<div class="pick"><p class="pick-h">パックのオリジナル形式</p><ul class="fm-list mini">${custom.map(rowHTML).join('')}</ul></div>` : ''}
    <p class="small-muted">このゲームの形式：${g.flows.length} 進め方 × ${g.twists.length} ひねり ＝ ${g.flows.length * g.twists.length} 形式</p>`);
  const paint = () => {
    const id = `${gid}.${p.flow}.${p.twist}`, f = NW.catalog.byId(id), r = NW.records.get(id);
    $('#gd-name').textContent = f ? f.name : '';
    $('#gd-desc').textContent = `${NW.FLOWS[p.flow].desc}${p.twist !== 'none' ? '／' + NW.TWISTS[p.twist].desc : ''}`;
    $('#gd-best').innerHTML = r ? `ベスト ${NW.stars(r.stars)} <b class="num">${NW.fmt(r.score)}</b>点（${r.plays}回）` : 'まだ遊んでいない形式';
  };
  paint();
  $$('[data-pick]', $('#sheet-body')).forEach(box => box.addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    p[box.dataset.pick] = c.dataset.v; $$('.chip', box).forEach(x => x.classList.toggle('on', x === c));
    picks[gid] = p; store.set('pick', picks); paint(); NW.sfx('tap');
  }));
  $('#gd-go').addEventListener('click', () => { NW.sheet.close(); NW.play(`${gid}.${p.flow}.${p.twist}`); });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-play]'); if (!b) return;
  if (NW.sheet.isOpen()) NW.sheet.close();
  NW.play(b.dataset.play);
});
$('.sheet-close').addEventListener('click', () => NW.sheet.close());
$('#scrim').addEventListener('click', () => NW.sheet.close());
document.addEventListener('keydown', e => { if (e.key === 'Escape' && NW.sheet.isOpen()) NW.sheet.close(); });

/* ---------- 形式一覧 ---------- */
const LF = { q:'', flow:'all', twist:'all', state:'all', fam:'all', n:120 };
function rowHTML(f){
  const g = NW.games[f.game], r = NW.records.get(f.id), ok = playable(f);
  return `<li><button class="fm-row fam-${g.family}${ok ? '' : ' off'}" data-play="${esc(f.id)}" type="button"${ok ? '' : ' disabled'}><span class="fm-ic" aria-hidden="true">${esc(g.icon)}</span><span class="fm-name">${esc(f.name)}<small>${f.custom ? `${esc(f.pack_title)}のオリジナル　` : ''}${esc(f.description || g.desc)}</small></span><span class="fm-best">${r ? NW.stars(r.stars) + `<small class="num">${NW.fmt(r.score)}</small>` : ok ? '<small>未プレイ</small>' : '<small>問題不足</small>'}</span></button></li>`;
}
function renderList(){
  const chip = (k, v, label) => `<button class="chip${LF[k] === v ? ' on' : ''}" data-k="${k}" data-v="${v}" type="button">${esc(label)}</button>`;
  $('#list-flow').innerHTML = chip('fam', 'all', 'なかま：すべて') + FAM_ORDER.slice(1).filter(f => Object.values(NW.games).some(g => g.family === f)).map(f => chip('fam', f, famName(f))).join('');
  $('#list-twist').innerHTML = chip('flow', 'all', '進め方：すべて') + Object.keys(NW.FLOWS).map(f => chip('flow', f, NW.FLOWS[f].name)).join('') + '<span class="sep"></span>' + chip('twist', 'all', 'ひねり：すべて') + Object.keys(NW.TWISTS).map(t => chip('twist', t, NW.TWISTS[t].name)).join('');
  $('#list-state').innerHTML = [['all', 'すべて'], ['new', '未プレイ'], ['nostar', '★3 じゃない'], ['done', '遊んだ'], ['custom', 'パックのオリジナル']].map(([v, l]) => chip('state', v, l)).join('');
  paintList();
}
function paintList(){
  const q = LF.q.trim();
  const list = NW.catalog().filter(f => {
    const g = NW.games[f.game], r = NW.records.get(f.id);
    if (LF.fam !== 'all' && g.family !== LF.fam) return false;
    if (LF.flow !== 'all' && f.flow !== LF.flow) return false;
    if (LF.twist !== 'all' && f.twist !== LF.twist) return false;
    if (LF.state === 'new' && r) return false; if (LF.state === 'done' && !r) return false; if (LF.state === 'nostar' && r && r.stars >= 3) return false; if (LF.state === 'custom' && !f.custom) return false;
    if (q && !(f.name + g.desc + (f.pack_title || '')).includes(q)) return false;
    return true;
  });
  $('#list-count').textContent = `${NW.fmt(list.length)} 形式`;
  $('#fm-list').innerHTML = list.slice(0, LF.n).map(rowHTML).join('') || '<li class="empty">見つかりませんでした</li>';
  $('#list-more').hidden = list.length <= LF.n;
}
$('#scr-list').addEventListener('click', e => { const c = e.target.closest('.chip[data-k]'); if (!c) return; LF[c.dataset.k] = c.dataset.v; LF.n = 120; renderList(); });
$('#list-q').addEventListener('input', e => { LF.q = e.target.value; LF.n = 120; paintList(); });
$('#list-more').addEventListener('click', () => { LF.n += 200; paintList(); });

/* ---------- 結果 ---------- */
const REASON = { clear:'クリア！', time:'タイムアップ！', lives:'ゲームオーバー', quit:'おしまい', error:'エラー' };
NW.showResult = function (r){
  NW.show('result');
  const g = r.g, fm = r.fm, el = $('#scr-result');
  const others = g.twists.filter(t => t !== fm.twist);
  const nextT = others.length ? NW.pick(others) : fm.twist;
  const sameFam = NW.catalog().filter(f => !f.custom && NW.games[f.game].family === g.family && f.game !== g.id && f.flow === fm.flow && f.twist === 'none' && playable(f));
  const recs = NW.shuffle(sameFam).slice(0, 3);
  el.innerHTML = `<div class="rs-card fam-${g.family}">
      <p class="rs-reason">${esc(REASON[r.reason] || 'おしまい')}</p>
      <h2 class="rs-name">${esc(fm.name)}</h2>
      <div class="rs-stars s${r.stars}">${[0, 1, 2].map(i => `<span class="${i < r.stars ? 'on' : ''}" style="--d:${i * 0.18}s">★</span>`).join('')}</div>
      <p class="rs-score"><b class="num">${NW.fmt(r.score)}</b>点</p>
      ${r.best ? '<p class="rs-best">ベスト更新！</p>' : ''}
      ${r.extra && r.extra.title ? `<p class="rs-title">${esc(r.extra.title)}</p>` : ''}
      <dl class="rs-stats"><div><dt>正解</dt><dd class="num">${r.correct}/${r.answered}</dd></div><div><dt>最大コンボ</dt><dd class="num">${r.maxCombo}</dd></div><div><dt>時間</dt><dd class="num">${r.secs}秒</dd></div></dl>
      <div class="rs-act">
        <button class="btn-main" data-play="${esc(fm.id)}" type="button">もう一回</button>
        ${!fm.custom && nextT !== fm.twist ? `<button class="btn-sub" data-play="${esc(`${g.id}.${fm.flow}.${nextT}`)}" type="button">ひねりを変える：${esc(NW.TWISTS[nextT].name)}</button>` : ''}
        <button class="btn-sub" data-go="home" type="button">ホームへ</button>
      </div>
    </div>
    ${r.miss && r.miss.length ? `<section class="rs-miss"><h3 class="h3">ふりかえり（まちがえた問題）</h3><ul>${r.miss.slice(0, 8).map(m => `<li><p>${NW.ui.br(m.q)}</p>${m.reveal ? `<b>${esc(m.reveal)}</b>` : ''}${m.explain ? `<small>${esc(m.explain)}</small>` : ''}</li>`).join('')}</ul></section>` : ''}
    ${recs.length ? `<section class="rs-next"><h3 class="h3">つぎはこれもどう？</h3><ul class="fm-list mini">${recs.map(rowHTML).join('')}</ul></section>` : ''}`;
  el.scrollTop = 0;
  if (r.stars >= 3 || r.best) { const c = NW.fx.center($('.rs-stars', el)); NW.fx.burst(c.x, c.y, { n:28 }); NW.sfx('clear'); } else if (r.stars) NW.sfx('prize'); else NW.sfx('ng');
  paintTop();
  setTimeout(() => { const b = $('.rs-act .btn-main', el); if (b) b.focus({ preventScroll:true }); }, 60);
};
$('#ph-quit').addEventListener('click', () => NW.quit());

/* ---------- 問題パック ---------- */
const SRC = { folder:'フォルダ', bundle:'同梱', import:'読みこみ', mine:'マイパック' };
function renderPacks(){
  const all = NW.packs.all, c = V.countTypes(NW.pool.items());
  $('#packs-lead').innerHTML = `${NW.packs.mode === 'folder' ? '<b>packs フォルダ</b>から読みこんでいます（サーバーで開いたとき）。' : '<b>js/packs-bundle.js</b> から読みこんでいます（index.html を直接開いたとき）。'}　オンの問題：${Object.keys(c).map(t => `${V.TYPE_NAME[t]} ${c[t]}`).join('・') || 'なし'}`;
  $('#packs').innerHTML = all.map(p => {
    const n = V.countTypes(p.items), on = NW.packs.isOn(p.id);
    return `<article class="pk${on ? '' : ' is-off'}" data-id="${esc(p.id)}">
      <div class="pk-head"><div class="pk-t"><b>${esc(p.title)}</b><small>${esc(SRC[p.source] || p.source)}${p.author ? '・' + esc(p.author) : ''}${p.file ? '・' + esc(p.file) : ''}</small></div>
        <label class="sw"><input type="checkbox" data-act="on"${on ? ' checked' : ''}${p.items.length ? '' : ' disabled'}><span aria-hidden="true"></span><span class="vh">${esc(p.title)}を使う</span></label></div>
      ${p.description ? `<p class="pk-d">${esc(p.description)}</p>` : ''}
      <p class="pk-n">${p.items.length} 問：${Object.keys(n).map(t => `${V.TYPE_NAME[t]} ${n[t]}`).join('・')}${p.formats.length ? `　オリジナル形式 ${p.formats.length}` : ''}</p>
      ${p.errors.length ? `<details class="pk-err"><summary>まちがい ${p.errors.length} こ（その問題は使われません）</summary><ul>${p.errors.slice(0, 30).map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
      ${p.warnings.length ? `<details class="pk-warn"><summary>アドバイス ${p.warnings.length} こ</summary><ul>${p.warnings.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
      <div class="pk-act"><button class="btn-sub" data-act="play" type="button"${on && p.items.length ? '' : ' disabled'}>このパックだけで遊ぶ</button><button class="btn-sub" data-act="dl" type="button">JSON を保存</button>${p.source === 'import' ? '<button class="btn-sub danger" data-act="rm" type="button">けす</button>' : ''}</div>
    </article>`;
  }).join('') || '<p class="empty">パックがありません</p>';
  renderMine();
}
$('#packs').addEventListener('change', e => {
  const i = e.target.closest('[data-act="on"]'); if (!i) return;
  const id = i.closest('.pk').dataset.id; NW.packs.setOn(id, i.checked); refresh(); renderPacks();
});
$('#packs').addEventListener('click', e => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const p = NW.packs.all.find(x => x.id === b.closest('.pk').dataset.id); if (!p) return;
  if (b.dataset.act === 'dl') NW.download(`${p.id}.json`, JSON.stringify(NW.packs.rawOf(p), null, 2));
  if (b.dataset.act === 'rm') { NW.packs.removeImport(p.id); reload('「' + p.title + '」をけしました'); }
  if (b.dataset.act === 'play') packPlay(p);
});
/* このパックだけ：遊べるゲームから1つ選ぶシート */
function packPlay(p){
  const filter = { pack:p.id };
  const list = Object.values(NW.games).filter(g => !why(g, filter));
  NW.sheet.open(p.title, `<p>このパックの問題だけで遊べるゲーム（${list.length}）</p><div class="game-grid mini">${list.map(g => `<button class="gc fam-${g.family}" data-pk-g="${g.id}" type="button"><span class="gc-ic" aria-hidden="true">${esc(g.icon)}</span><span class="gc-body"><b class="gc-name">${esc(g.name)}</b></span></button>`).join('')}</div>`);
  $('.game-grid.mini', $('#sheet-body')).addEventListener('click', e => {
    const b = e.target.closest('[data-pk-g]'); if (!b) return;
    const g = NW.games[b.dataset.pkG];
    NW.sheet.close();
    NW.play({ id:`pack:${p.id}:${g.id}`, game:g.id, flow:'std', twist:'none', name:`${g.name}（${p.title}）`, filter, custom:true, pack:p.id, pack_title:p.title });
  });
}

async function reload(msg){ await NW.packs.load(); refresh(); NW.show(tab); if (msg) NW.toast(msg); }
function importText(text, file){
  const r = NW.packs.importJSON(text, file);
  if (!r.ok) { NW.sheet.open('読みこめませんでした', `<p>${esc(file || 'はりつけたテキスト')}</p><ul class="errs">${r.errors.slice(0, 30).map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="small-muted">「ひな形をダウンロード」で書き方の見本を見られます。</p>`); return false; }
  reload(`「${r.title}」を読みこみました（${r.count} 問${r.errors.length ? `、使えない問題 ${r.errors.length}` : ''}）`);
  return true;
}
function readFiles(files){ [...files].forEach(f => { const rd = new FileReader(); rd.onload = () => importText(String(rd.result), f.name); rd.readAsText(f); }); }
$('#file-in').addEventListener('change', e => { readFiles(e.target.files); e.target.value = ''; });
const drop = $('#drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files.length) readFiles(e.dataTransfer.files); });
$('#btn-paste').addEventListener('click', () => {
  NW.sheet.open('はりつけて読みこむ', '<p>問題パックの JSON をはりつけてください。</p><textarea class="ta" id="paste-ta" rows="10" spellcheck="false" placeholder="{ &quot;id&quot;: &quot;my-pack&quot;, &quot;title&quot;: …"></textarea><button class="btn-main wide" id="paste-go" type="button">読みこむ</button>');
  $('#paste-go').addEventListener('click', () => { const t = $('#paste-ta').value.trim(); if (!t) return; NW.sheet.close(); importText(t, 'はりつけ'); });
});

/* ひな形（すべての種類の見本入り） */
const TEMPLATE = {
  id:'my-pack', title:'わたしの問題パック', description:'ここにパックの説明を書く', author:'なまえ', version:'1',
  items:[
    { type:'choice', q:'日本でいちばん高い山は？', choices:['富士山', '北岳', '槍ヶ岳', '穂高岳'], answer:0, short:'いちばん高い山', explain:'富士山は 3776m。', tags:['ちり'], level:1 },
    { type:'truefalse', q:'ペンギンは鳥のなかまである。', answer:true, explain:'飛べないけれど鳥類です。' },
    { type:'number', q:'富士山の高さは何m？', answer:3776, unit:'m', label:'富士山の高さ', explain:'3776（みななろ）m。' },
    { type:'year', q:'東京スカイツリーが開業したのは何年？', answer:2012, label:'スカイツリー開業' },
    { type:'order', q:'小さい順にならべよう', items:['1円玉', '5円玉', '10円玉', '100円玉'], values:['1円', '5円', '10円', '100円'] },
    { type:'pairs', q:'国と首都のペア', pairs:[['日本', '東京'], ['フランス', 'パリ'], ['イギリス', 'ロンドン'], ['イタリア', 'ローマ']] },
    { type:'groups', q:'くだものと野菜', groups:[{ name:'くだもの', items:['りんご', 'みかん', 'ぶどう', 'もも'] }, { name:'野菜', items:['にんじん', 'たまねぎ', 'キャベツ', 'なす'] }] },
    { type:'word', q:'黄色くて長いくだものは？', answer:'バナナ', hint:'さるが好き' },
    { type:'blank', text:'「[犬] も歩けば棒に当たる」', choices:['犬', '猫', '猿', '馬'], explain:'いろはかるたの最初の札。' }
  ],
  formats:[{ id:'easy-boss', name:'やさしいボスバトル', game:'boss', flow:'quick', twist:'none', description:'level 1 の問題だけでボスと戦う', filter:{ level:[1], thisPackOnly:true } }]
};
$('#btn-template').addEventListener('click', () => NW.download('my-pack-template.json', JSON.stringify(TEMPLATE, null, 2)));

/* ---------- マイパック（かんたんエディタ） ---------- */
const mine = () => store.get('mypack', null) || { id:'mypack', title:'マイパック', author:'わたし', description:'かんたんエディタで作った問題', items:[] };
function renderMine(){
  const m = mine();
  $('#mine-list').innerHTML = m.items.map((it, i) => `<li><span class="chip">${esc(V.TYPE_NAME[it.type])}</span><span class="mine-q">${esc(it.q || it.text || (it.pairs ? it.pairs.map(p => p.join('=')).join('、') : it.groups ? it.groups.map(g => g.name).join('・') : ''))}</span><button class="btn-sub" data-edit="${i}" type="button">なおす</button><button class="btn-sub danger" data-del="${i}" type="button">けす</button></li>`).join('') || '<li class="empty">まだ問題がありません</li>';
  $('#btn-mine-dl').disabled = !m.items.length;
}
$('#mine-list').addEventListener('click', e => {
  const d = e.target.closest('[data-del]'), ed = e.target.closest('[data-edit]');
  if (d) { const m = mine(); m.items.splice(Number(d.dataset.del), 1); store.set('mypack', m); reload('けしました'); }
  if (ed) editor(Number(ed.dataset.edit));
});
$('#btn-mine-dl').addEventListener('click', () => NW.download('mypack.json', JSON.stringify(mine(), null, 2)));
$('#btn-new-item').addEventListener('click', () => editor(-1));

const ED_TYPES = ['choice', 'truefalse', 'number', 'year', 'order', 'pairs', 'groups', 'word', 'blank'];
const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
function editor(idx){
  const m = mine(), old = idx >= 0 ? m.items[idx] : null;
  let type = old ? old.type : store.get('edType', 'choice');
  const field = (id, label, html) => `<label class="fld"><span>${label}</span>${html}</label>`;
  const val = (k, d) => old && old.type === type && old[k] != null ? old[k] : d;
  const form = () => {
    const ex = val('explain', '');
    const q = (lab, ph) => field('ed-q', lab || '問題文', `<textarea class="ta" id="ed-q" rows="2" placeholder="${esc(ph || '')}">${esc(val('q', ''))}</textarea>`);
    let h = '';
    if (type === 'choice') { const ch = val('choices', ['', '', '', '']), a = val('answer', 0); h = q('問題文', '例：日本でいちばん高い山は？') + `<div class="fld"><span>選択肢（正解に ◉ を付ける）</span>${[0, 1, 2, 3, 4, 5].map(i => `<div class="ed-ch"><input type="radio" name="ed-a" value="${i}"${i === a ? ' checked' : ''} aria-label="${i + 1}つめが正解"><input class="in" data-ch="${i}" value="${esc(ch[i] || '')}" placeholder="${i < 2 ? '選択肢（ひつよう）' : '選択肢（なくてもOK）'}"></div>`).join('')}</div>`; }
    if (type === 'truefalse') h = q('文（ほんと？うそ？）', '例：ペンギンは鳥のなかまである。') + `<div class="fld"><span>答え</span><div class="seg"><label><input type="radio" name="ed-tf" value="1"${val('answer', true) ? ' checked' : ''}>◯ ほんと</label><label><input type="radio" name="ed-tf" value="0"${val('answer', true) ? '' : ' checked'}>✕ うそ</label></div></div>`;
    if (type === 'number' || type === 'year') h = q('問題文', type === 'year' ? '例：東京スカイツリーが開業したのは何年？' : '例：富士山の高さは何m？') + field('', '答え（数）', `<input class="in" id="ed-n" type="number" step="any" value="${esc(val('answer', ''))}">`) + (type === 'number' ? field('', '単位（例：m、人、円）', `<input class="in" id="ed-u" value="${esc(val('unit', ''))}">`) : '') + field('', '短い名前（「どっち？」や年表で使う。20文字まで）', `<input class="in" id="ed-l" value="${esc(val('label', ''))}" placeholder="例：スカイツリー開業">`);
    if (type === 'order') h = q('問題文', '例：小さい順にならべよう') + field('', '正しい順に1行に1つ（3〜8こ）', `<textarea class="ta" id="ed-items" rows="5">${esc((val('items', [])).join('\n'))}</textarea>`);
    if (type === 'pairs') h = q('問題文（なくてもOK）', '例：国と首都') + field('', '1行に「ことば=ペア」（3〜8組）', `<textarea class="ta" id="ed-pairs" rows="5" placeholder="日本=東京">${esc(val('pairs', []).map(p => p.join('=')).join('\n'))}</textarea>`);
    if (type === 'groups') h = q('問題文（なくてもOK）', '例：くだものと野菜') + field('', '1行に「なかまの名前: ことば, ことば, …」（2〜4行）', `<textarea class="ta" id="ed-groups" rows="4" placeholder="くだもの: りんご, みかん, ぶどう">${esc(val('groups', []).map(g => g.name + ': ' + g.items.join(', ')).join('\n'))}</textarea>`);
    if (type === 'word') h = q('ヒントになる問題文', '例：黄色くて長いくだものは？') + field('', '答えのことば（2〜10文字）', `<input class="in" id="ed-w" value="${esc(val('answer', ''))}">`) + field('', 'ヒント（なくてもOK）', `<input class="in" id="ed-h" value="${esc(val('hint', ''))}">`);
    if (type === 'blank') h = field('', '文（正解を [ ] でかこむ）', `<textarea class="ta" id="ed-t" rows="2" placeholder="「[犬] も歩けば棒に当たる」">${esc(val('text', ''))}</textarea>`) + field('', '選択肢（正解もふくめて「,」で区切る）', `<input class="in" id="ed-bc" value="${esc(val('choices', []).join(', '))}" placeholder="犬, 猫, 猿, 馬">`);
    return h + field('', '解説（なくてもOK）', `<textarea class="ta" id="ed-x" rows="2">${esc(ex)}</textarea>`);
  };
  const open = () => {
    NW.sheet.open(old ? '問題をなおす' : '問題を作る', `<div class="chips small" id="ed-type">${ED_TYPES.map(t => `<button class="chip${t === type ? ' on' : ''}" data-t="${t}" type="button">${V.TYPE_NAME[t]}</button>`).join('')}</div><div class="ed" id="ed">${form()}</div><ul class="errs" id="ed-err" hidden></ul><button class="btn-main wide" id="ed-save" type="button">保存する</button>`);
    $('#ed-type').addEventListener('click', e => { const c = e.target.closest('[data-t]'); if (!c) return; type = c.dataset.t; store.set('edType', type); open(); });
    $('#ed-save').addEventListener('click', save);
  };
  const g = id => { const e = $('#' + id); return e ? e.value.trim() : ''; };
  function save(){
    const it = { type };
    if (type !== 'blank') { const qq = g('ed-q'); if (qq) it.q = qq; }
    if (type === 'choice') {
      const rows = $$('[data-ch]').map(x => x.value.trim()), a = Number(($('input[name="ed-a"]:checked') || {}).value || 0);
      const keep = rows.map((c, i) => ({ c, i })).filter(x => x.c);
      it.choices = keep.map(x => x.c); it.answer = keep.findIndex(x => x.i === a);
      if (it.answer < 0) { showErr(['正解に ◉ を付けた選択肢が空です']); return; }
    }
    if (type === 'truefalse') it.answer = ($('input[name="ed-tf"]:checked') || {}).value === '1';
    if (type === 'number' || type === 'year') { it.answer = g('ed-n') === '' ? NaN : Number(g('ed-n')); if (g('ed-u')) it.unit = g('ed-u'); if (g('ed-l')) it.label = g('ed-l'); }
    if (type === 'order') it.items = lines(g('ed-items'));
    if (type === 'pairs') it.pairs = lines(g('ed-pairs')).map(l => { const k = l.search(/[=＝]/); return k < 0 ? [l, ''] : [l.slice(0, k).trim(), l.slice(k + 1).trim()]; });
    if (type === 'groups') it.groups = lines(g('ed-groups')).map(l => { const k = l.search(/[:：]/); return { name:(k < 0 ? '' : l.slice(0, k)).trim(), items:(k < 0 ? l : l.slice(k + 1)).split(/[,、，]/).map(x => x.trim()).filter(Boolean) }; });
    if (type === 'word') { it.answer = g('ed-w'); if (g('ed-h')) it.hint = g('ed-h'); }
    if (type === 'blank') { it.text = g('ed-t'); it.choices = g('ed-bc').split(/[,、，]/).map(x => x.trim()).filter(Boolean); }
    if (g('ed-x')) it.explain = g('ed-x');
    const err = [], warn = [], ok = V.checkItem(it, 0, err, warn);
    if (!ok) { showErr(err.map(x => x.replace(/^items\[0\]（\w+）：/, ''))); return; }
    if (idx >= 0) m.items[idx] = it; else m.items.push(it);
    if (!store.set('mypack', m)) { showErr(['保存できませんでした']); return; }
    NW.sheet.close(); reload(idx >= 0 ? 'なおしました' : 'マイパックに入れました');
  }
  function showErr(list){ const u = $('#ed-err'); u.hidden = false; u.innerHTML = list.map(x => `<li>${esc(x)}</li>`).join(''); NW.sfx('ng'); }
  open();
}

/* ---------- 設定 ---------- */
function renderSettings(){
  const P = NW.prefs, seg = (k, opts) => `<div class="seg" data-pref="${k}">${opts.map(([v, l]) => `<button class="chip${String(P[k]) === String(v) ? ' on' : ''}" data-v="${v}" type="button">${l}</button>`).join('')}</div>`;
  $('#set').innerHTML = `
    <div class="set-row"><span>効果音の音量</span><input type="range" min="0" max="100" step="5" value="${P.volume}" id="set-vol" aria-label="音量"></div>
    <div class="set-row"><span>画面の色</span>${seg('theme', [['auto', '自動'], ['light', '明るい'], ['dark', '暗い']])}</div>
    <div class="set-row"><span>動き・演出</span>${seg('motion', [['normal', 'ふつう'], ['off', 'なし（目にやさしい）']])}</div>
    <div class="set-row"><span>紙吹雪の量</span>${seg('confetti', [[0, 'なし'], [0.5, '少し'], [1, 'ふつう'], [2, 'たくさん']])}</div>
    <div class="set-row"><span>振動（スマホ）</span>${seg('vibrate', [[true, 'オン'], [false, 'オフ']])}</div>
    <div class="set-row col"><span>記録</span><p class="small-muted">あつめた星 ${NW.records.stars()}・プレイ ${NW.records.plays()} 回。記録はこのブラウザの中だけに保存されています。</p><div class="mine-act"><button class="btn-sub danger" id="set-rec" type="button">記録をリセット</button><button class="btn-sub danger" id="set-all" type="button">すべてのデータをけす</button></div></div>
    <div class="set-row col"><span>このアプリについて</span><p class="small-muted">遊びの種類 ${Object.keys(NW.games).length}・進め方 ${Object.keys(NW.FLOWS).length}・ひねり ${Object.keys(NW.TWISTS).length} の組み合わせで、全 ${NW.fmt(NW.catalog().length)} 形式。問題は JSON の問題パックで自由に追加できます。くわしくは README.md を見てね。</p></div>`;
}
$('#set').addEventListener('click', e => {
  const c = e.target.closest('[data-pref] .chip');
  if (c) {
    const k = c.closest('[data-pref]').dataset.pref; let v = c.dataset.v;
    if (k === 'confetti') v = Number(v); if (k === 'vibrate') v = v === 'true';
    NW.prefs[k] = v; NW.savePrefs();
    if (k === 'theme') { if (v === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', v); }
    renderSettings(); NW.sfx('tap'); return;
  }
  if (e.target.id === 'set-rec') { if (confirmTwice(e.target, 'もう一度おすとリセット')) { NW.records.clear(); NW.toast('記録をリセットしました'); renderSettings(); paintTop(); } }
  if (e.target.id === 'set-all') { if (confirmTwice(e.target, 'もう一度おすと全部けす')) { NW.store.clear(); location.reload(); } }
});
$('#set').addEventListener('input', e => { if (e.target.id === 'set-vol') { NW.prefs.volume = Number(e.target.value); NW.savePrefs(); } });
$('#set').addEventListener('change', e => { if (e.target.id === 'set-vol') NW.sfx('ok'); });
/* うっかり押し防止：1回目はボタンの文字が変わるだけ */
function confirmTwice(b, msg){ if (b.dataset.armed) return true; b.dataset.armed = '1'; const t = b.textContent; b.textContent = msg; setTimeout(() => { delete b.dataset.armed; b.textContent = t; }, 3000); return false; }

/* ---------- はじまり ---------- */
(async function boot(){
  await NW.packs.load();
  refresh();
  const m = location.hash.match(/^#play=(.+)$/);
  NW.show('home');
  if (m) NW.play(decodeURIComponent(m[1]));
  window.ARCADE_READY = true;
})();
})(window.NW);
