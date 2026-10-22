/* ============================================================
   ワイプ・アーケード：Netlify Drawer よけ（保険）
   Netlify が Deploy Preview の HTML に差しこむ Drawer（フィードバック
   ツールバー）を、見つけしだい取りのぞく。
   ・本命は Netlify の画面で Drawer をオフにすること（netlify.toml 参照）。
     CSP でも読みこみをブロックしているので、これは残りかすの掃除役。
   ・アプリ自身の要素には netlify という名前を使っていないので、まちがって
     消すことはない。
   ============================================================ */
(function () {
  'use strict';
  var RE = /netlify/i;

  function isDrawer(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = el.tagName.toLowerCase();
    if (RE.test(tag)) return true;                                   // <netlify-drawer> など
    if (el.id && RE.test(el.id)) return true;                        // id="netlify-..."
    var cls = typeof el.className === 'string' ? el.className : '';
    if (cls && RE.test(cls)) return true;
    if (tag === 'iframe' || tag === 'script' || tag === 'link') {
      var src = el.getAttribute('src') || el.getAttribute('href') || '';
      if (/(^|\/\/|\.)netlify\.(com|app)\b|netlify-cdp|ntl-/i.test(src)) return true;
    }
    return false;
  }

  function sweep(root) {
    if (!root || !root.querySelectorAll) return;
    var list = root.querySelectorAll('iframe,script[src],link[href],[id*="etlify"],[class*="etlify"]');
    for (var i = 0; i < list.length; i++) if (isDrawer(list[i])) list[i].remove();
    // カスタム要素（<netlify-...>）はセレクタで拾えないので、body 直下だけ名前で見る
    var kids = (document.body && document.body.children) || [];
    for (var j = kids.length - 1; j >= 0; j--) if (isDrawer(kids[j])) kids[j].remove();
  }

  function onMut(muts) {
    for (var i = 0; i < muts.length; i++) {
      var added = muts[i].addedNodes;
      for (var k = 0; k < added.length; k++) {
        var n = added[k];
        if (isDrawer(n)) n.remove();
        else if (n.nodeType === 1 && n.tagName === 'BODY') sweep(n);
      }
    }
  }

  if (!window.MutationObserver) return;
  // 読みこみ中：HTML 全体を見張る（</body> の直前に差しこまれる分をつかまえる）
  var mo = new MutationObserver(onMut);
  mo.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', function () {
    sweep(document);
    // 読みこみ後：ゲームの描きかえで重くならないよう、body 直下だけを見張る
    mo.disconnect();
    mo = new MutationObserver(onMut);
    mo.observe(document.documentElement, { childList: true });
    if (document.body) mo.observe(document.body, { childList: true });
  });
  window.addEventListener('load', function () { sweep(document); });
})();
