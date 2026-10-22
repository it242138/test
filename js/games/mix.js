/* ============================================================
   ワイプ・アーケード：ごちゃまぜ
   1問ごとに、遊び方がランダムに変わる（使える問題の形から選ぶ）
   ============================================================ */
(function (NW) {
'use strict';
const BASIC = { choice:'yontaku', tf:'marubatsu', num:'pitari', compare:'docchi', order:'narabe', pairs:'senmusubi', groups:'bunrui', word:'mojinarabe' };
NW.game({ id:'mix', name:'ごちゃまぜ', icon:'★', family:'mix', shape:['choice', 'tf', 'num', 'compare', 'order', 'pairs', 'groups', 'word'], twists:['none', 'mirror', 'shake', 'dark'],
  desc:'1問ごとに遊び方が変わる。4択の次はもぐらたたき、その次はならべかえ…なにが来るかはお楽しみ！', how:'画面の上に出る遊び方にしたがって答える',
  before(ctx, st){
    const shapes = ctx.shapes();
    const cands = Object.values(NW.games).filter(g => g.kind === 'round' && !g.setup && !g.need && g.id !== 'mix' && !Array.isArray(g.shape) && shapes.includes(g.shape) && NW.gpool(g, g.shape, ctx.rules.filter).length);
    st.sub = NW.pick(cands.filter(g => g !== st.sub)) || NW.pick(cands);
    st.shape = st.sub.shape;
  },
  render(it, done, ctx, box){
    let g = ctx.st.sub;
    if (g.accept && !g.accept(it)) g = NW.games[BASIC[g.shape]];
    box.innerHTML = `<p class="mx-now"><span>${NW.esc(g.icon)}</span> いまは <b>${NW.esc(g.name)}</b></p>`;
    const inner = document.createElement('div'); inner.className = 'mx-in'; box.appendChild(inner);
    return g.render(it, done, ctx, inner);
  } });
})(window.NW);
