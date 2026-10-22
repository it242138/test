/* ============================================================
   ワイプ・アーケード：あたらしいゲームのひな形（このファイルは読みこまれていません）
   使い方
     1. このファイルをコピーして js/games/mygame.js などの名前にする
     2. index.html の「自分で作ったゲームは、ここに…」のところに
          <script src="js/games/mygame.js"></script>
        を足す
     3. id・名前・render の中身を書きかえる
   これだけで「進め方6種類 × ひねり」の形式が自動でカタログに追加されます
   ============================================================ */
(function (NW) {
'use strict';
const { $, $$, esc, ui } = NW;

NW.game({
  id:'mygame',                 /* 英数字。ほかのゲームとかぶらないように */
  name:'わたしのゲーム',
  icon:'☆',                     /* カードに出る1文字 */
  family:'choice',             /* なかま：choice action board tf num order pairs groups word mix */
  shape:'choice',              /* 問題の形：choice tf num compare order pairs groups word card */
  twists:['none', 'hurry', 'mirror', 'shake', 'dark'],   /* 使えるひねり */
  desc:'カードに出る説明',
  how:'あそびかた（1行）',
  /* it … 問題（choice なら { q, choices, answer, explain }）
     done(ok, { pts, reveal }) … 答えが決まったら1回だけ呼ぶ
     ctx … 道具（ctx.sfx・ctx.keys・ctx.later・ctx.loop・ctx.rules など。engine.js を見てね）
     box … このゲームが使う箱（毎問あたらしくなる） */
  render(it, done, ctx, box){
    box.innerHTML = ui.q(it.q) + ui.opts(it.choices);
    const pick = i => {
      ui.markOpts(box, it.answer, i);
      done(i === it.answer, { pts:100, reveal:i === it.answer ? '' : `正解は「${it.choices[it.answer]}」` });
    };
    ui.bindOpts(box, ctx, pick);
    ctx.twistOpts(box);
    /* solve は自動テスト用（ok=true なら正解、false ならまちがいを選ぶ）。timeout は「せかせか」の時間切れ */
    return { solve:ok => pick(ok ? it.answer : (it.answer + 1) % it.choices.length), timeout:() => pick(-1) };
  }
});
})(window.NW);
