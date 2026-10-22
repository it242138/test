/* ============================================================
   ニュースワイプ：キャラクターの絵（すべてSVGで手描きしたオリジナル）
   NW.art.mascot(mood)   … 案内役ワイプン
   NW.art.creature(id)   … 集めるワダイたち
   色は css/style.css の --c-* で決めています。
   ============================================================ */
window.NW = window.NW || {};
(function (NW) {
'use strict';
const OL = 'var(--ol)';

function eye(x, y, r){
  return `<g class="eye"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${(r * 1.15).toFixed(2)}" fill="var(--eye-w)" stroke="${OL}" stroke-width="2"/>` +
    `<circle cx="${(x + r * 0.12).toFixed(2)}" cy="${(y + r * 0.16).toFixed(2)}" r="${(r * 0.58).toFixed(2)}" fill="var(--eye-k)"/>` +
    `<circle cx="${(x + r * 0.34).toFixed(2)}" cy="${(y - r * 0.2).toFixed(2)}" r="${(r * 0.22).toFixed(2)}" fill="var(--eye-w)"/></g>`;
}
const eyes = (x1, x2, y, r) => eye(x1, y, r) + eye(x2, y, r);
const arc = (x, y, w, up, sw) => `<path d="M${x - w} ${y} q${w} ${up ? -w * 1.1 : w * 1.1} ${w * 2} 0" fill="none" stroke="${OL}" stroke-width="${sw || 2.6}" stroke-linecap="round"/>`;
const smile = (x, y, w) => arc(x, y, w || 5, false);
const open = (x, y, w) => `<path d="M${x - w} ${y} q${w} ${w * 1.7} ${w * 2} 0 z" fill="var(--c-mouth)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>`;
const blush = (x1, x2, y, r) => `<ellipse cx="${x1}" cy="${y}" rx="${r || 4.5}" ry="${(r || 4.5) * 0.6}" fill="var(--c-blush)" opacity=".8"/><ellipse cx="${x2}" cy="${y}" rx="${r || 4.5}" ry="${(r || 4.5) * 0.6}" fill="var(--c-blush)" opacity=".8"/>`;
const heart = (x, y, s) => `<path d="M${x} ${y + s * 0.9} C${x - s * 1.4} ${y} ${x - s * 0.9} ${y - s * 1.1} ${x} ${y - s * 0.35} C${x + s * 0.9} ${y - s * 1.1} ${x + s * 1.4} ${y} ${x} ${y + s * 0.9} Z" fill="var(--c-red)" stroke="${OL}" stroke-width="1.6"/>`;
const sparkle = (x, y, s, c) => `<path d="M${x} ${y - s} Q${x + s * 0.2} ${y - s * 0.2} ${x + s} ${y} Q${x + s * 0.2} ${y + s * 0.2} ${x} ${y + s} Q${x - s * 0.2} ${y + s * 0.2} ${x - s} ${y} Q${x - s * 0.2} ${y - s * 0.2} ${x} ${y - s} Z" fill="${c || 'var(--c-gold)'}"/>`;
function rays(cx, cy, r1, r2, n, fill, op){
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, b = a + Math.PI / n * 0.55, c = a - Math.PI / n * 0.55;
    d += `M${(cx + Math.cos(c) * r1).toFixed(1)} ${(cy + Math.sin(c) * r1).toFixed(1)}L${(cx + Math.cos(a) * r2).toFixed(1)} ${(cy + Math.sin(a) * r2).toFixed(1)}L${(cx + Math.cos(b) * r1).toFixed(1)} ${(cy + Math.sin(b) * r1).toFixed(1)}Z`;
  }
  return `<path d="${d}" fill="${fill}" opacity="${op || 1}"/>`;
}

/* ---------- 案内役：ワイプン（テレビのすみの小窓の精） ---------- */
function mascotFace(mood){
  const L = 46, R = 74, Y = 56;
  switch (mood) {
    case 'happy':
      return arc(L, Y + 2, 6, true, 3.4) + arc(R, Y + 2, 6, true, 3.4) + open(60, 66, 8) + blush(34, 86, 68, 5);
    case 'wow':
      return `<g class="eye"><circle cx="${L}" cy="${Y}" r="8.5" fill="var(--eye-w)" stroke="${OL}" stroke-width="2.2"/><circle cx="${L}" cy="${Y}" r="3" fill="var(--eye-k)"/></g>` +
        `<g class="eye"><circle cx="${R}" cy="${Y}" r="8.5" fill="var(--eye-w)" stroke="${OL}" stroke-width="2.2"/><circle cx="${R}" cy="${Y}" r="3" fill="var(--eye-k)"/></g>` +
        `<ellipse cx="60" cy="73" rx="4.5" ry="5.5" fill="var(--c-mouth)" stroke="${OL}" stroke-width="2.2"/>`;
    case 'sad':
      return eyes(L, R, Y + 2, 6) + `<path d="M37 46 l13 -4 M83 46 l-13 -4" stroke="${OL}" stroke-width="3" stroke-linecap="round"/>` +
        `<path d="M52 74 q8 -7 16 0" fill="none" stroke="${OL}" stroke-width="2.8" stroke-linecap="round"/>` +
        `<path d="M90 40 q5 8 0 11 q-5 -3 0 -11 z" fill="var(--c-blue)" stroke="${OL}" stroke-width="1.6"/>`;
    case 'think':
      return eye(L, Y, 6) + `<path d="M${R - 7} ${Y} h14" stroke="${OL}" stroke-width="3.2" stroke-linecap="round"/>` +
        `<path d="M55 71 h11" stroke="${OL}" stroke-width="3" stroke-linecap="round"/>` + blush(34, 86, 67, 4.5);
    case 'fire':
      return eyes(L, R, Y + 1, 6.2) + `<path d="M37 43 l13 5 M83 43 l-13 5" stroke="${OL}" stroke-width="3.4" stroke-linecap="round"/>` +
        `<path d="M49 66 q11 12 22 0 z" fill="var(--c-mouth)" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>`;
    default:
      return eyes(L, R, Y, 6.2) + smile(60, 68, 6) + blush(34, 86, 67, 4.5);
  }
}
/* ---------- ワイプンの着せかえ（v5）。体の上にかさねる ---------- */
const WEAR_ART = {
  hat: () => `<path d="M30 26 Q60 32 90 26 L84 8 Q60 2 36 8 Z" fill="#3D4458" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>` +
    `<ellipse cx="60" cy="27" rx="42" ry="6.5" fill="#4A5266" stroke="${OL}" stroke-width="3"/>` +
    `<path d="M33 20 Q60 25 87 20" stroke="var(--c-red)" stroke-width="4.5" fill="none"/>` +
    `<rect x="64" y="9" width="17" height="10" rx="1.5" fill="var(--c-paper)" stroke="${OL}" stroke-width="1.8" transform="rotate(8 72 14)"/>` +
    `<path d="M67 13 h10 M67 16 h7" stroke="${OL}" stroke-width="1.4" transform="rotate(8 72 14)"/>`,
  ribbon: () => `<g transform="translate(92 24) rotate(18)"><path d="M0 0 L-17 -11 Q-21 0 -17 11 Z M0 0 L17 -11 Q21 0 17 11 Z" fill="var(--c-pink)" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<circle r="5.5" fill="var(--c-pink)" stroke="${OL}" stroke-width="2.6"/></g>`,
  glasses: () => `<g fill="rgba(255,255,255,.25)" stroke="${OL}" stroke-width="3"><circle cx="46" cy="57" r="11.5"/><circle cx="74" cy="57" r="11.5"/></g>` +
    `<path d="M57.5 56 q2.5 -3 5 0 M34.5 55 L22 50 M85.5 55 L98 50" stroke="${OL}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  hachimaki: () => `<path d="M13 31 Q60 23 107 31 L107 39 Q60 31 13 39 Z" fill="#FFFFFF" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<circle cx="60" cy="31" r="4.6" fill="var(--c-red)"/>` +
    `<path d="M106 34 l12 -9 l2 8 Z M106 35 l10 9 l-8 3 Z" fill="#FFFFFF" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>`,
  headphones: () => `<path d="M17 52 Q15 -2 60 -2 Q105 -2 103 52" fill="none" stroke="${OL}" stroke-width="5.5" stroke-linecap="round"/>` +
    `<path d="M17 52 Q15 -2 60 -2 Q105 -2 103 52" fill="none" stroke="var(--c-purple)" stroke-width="2.6" stroke-linecap="round"/>` +
    `<rect x="4" y="44" width="16" height="26" rx="7" fill="var(--c-purple)" stroke="${OL}" stroke-width="3"/>` +
    `<rect x="100" y="44" width="16" height="26" rx="7" fill="var(--c-purple)" stroke="${OL}" stroke-width="3"/>`,
  crown: () => `<path d="M38 26 L34 4 L47 15 L60 0 L73 15 L86 4 L82 26 Z" fill="var(--c-gold)" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>` +
    `<circle cx="60" cy="18" r="3.4" fill="var(--c-red)" stroke="${OL}" stroke-width="1.6"/><circle cx="46" cy="21" r="2.4" fill="var(--c-blue)"/><circle cx="74" cy="21" r="2.4" fill="var(--c-green)"/>`,
  cat: () => `<path d="M24 28 L28 2 L48 22 Z M96 28 L92 2 L72 22 Z" fill="#3D4458" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M30 22 L31 10 L41 20 Z M90 22 L89 10 L79 20 Z" fill="var(--c-pink)"/>`,
  pumpkin: () => `<path d="M58 2 q3 -6 9 -5" stroke="${OL}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="60" cy="16" rx="27" ry="13" fill="var(--c-orange)" stroke="${OL}" stroke-width="3"/>` +
    `<path d="M47 6 Q42 16 47 27 M73 6 Q78 16 73 27 M60 3 V29" stroke="${OL}" stroke-width="1.8" fill="none" opacity=".55"/>` +
    `<path d="M50 14 l4 -4 l4 4 Z M62 14 l4 -4 l4 4 Z M52 20 q8 5 16 0 l-3 2 l-2 -2 l-3 2 l-3 -2 l-2 2 Z" fill="${OL}"/>`,
  santa: () => `<path d="M24 28 Q50 10 78 6 Q100 4 108 22 L96 22 Q88 14 82 20 Q90 24 96 28 Z" fill="var(--c-red)" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M20 30 Q60 18 98 30" stroke="#FFFFFF" stroke-width="9" fill="none" stroke-linecap="round"/>` +
    `<path d="M20 30 Q60 18 98 30" stroke="${OL}" stroke-width="1.2" fill="none" opacity=".3"/>` +
    `<circle cx="106" cy="25" r="7" fill="#FFFFFF" stroke="${OL}" stroke-width="2.4"/>`,
  mizuhiki: () => `<g transform="translate(90 24)"><path d="M0 0 C-14 -16 -24 4 -6 2 M0 0 C14 -16 24 4 6 2" fill="none" stroke="var(--c-red)" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M0 0 C-12 -10 -18 2 -5 4 M0 0 C12 -10 18 2 5 4" fill="none" stroke="var(--c-gold)" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M-3 2 L-8 18 M3 2 L8 18" stroke="var(--c-red)" stroke-width="3" stroke-linecap="round"/></g>`,
  sakura: () => `<g transform="translate(90 26)">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-7" rx="5" ry="7.5" fill="#FFC6DD" stroke="${OL}" stroke-width="1.8" transform="rotate(${a})"/>`).join('')}<circle r="3.2" fill="var(--c-gold)"/></g>`,
  star: () => `<g transform="translate(92 22)"><path d="M0 -14 L4 -4 L14 -4 L6 3 L9 13 L0 7 L-9 13 L-6 3 L-14 -4 L-4 -4 Z" fill="var(--c-gold)" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/></g>` +
    `<path d="M84 34 l-6 14 M90 35 l2 15" stroke="var(--c-teal)" stroke-width="2.6" stroke-linecap="round"/>`
};
const wearArt = id => (WEAR_ART[id] ? `<g class="m-wear m-wear-${id}">${WEAR_ART[id]()}</g>` : '');

function mascot(mood, cls, wearId){
  return `<svg class="mascot ${cls || ''}" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><g class="m-all">` +
    `<g class="m-ant"><path d="M44 25 L35 8 M76 25 L85 8" stroke="${OL}" stroke-width="3.4" stroke-linecap="round"/>` +
    `<circle cx="35" cy="8" r="5.2" fill="var(--c-red)" stroke="${OL}" stroke-width="2.4"/><circle cx="85" cy="8" r="5.2" fill="var(--c-red)" stroke="${OL}" stroke-width="2.4"/></g>` +
    `<path class="m-arm m-arm-l" d="M14 64 q-11 4 -8 15" fill="none" stroke="${OL}" stroke-width="4.4" stroke-linecap="round"/>` +
    `<path class="m-arm m-arm-r" d="M106 64 q11 4 8 15" fill="none" stroke="${OL}" stroke-width="4.4" stroke-linecap="round"/>` +
    `<ellipse cx="44" cy="104" rx="11" ry="6" fill="var(--c-cream)" stroke="${OL}" stroke-width="3"/><ellipse cx="76" cy="104" rx="11" ry="6" fill="var(--c-cream)" stroke="${OL}" stroke-width="3"/>` +
    `<rect x="12" y="22" width="96" height="80" rx="24" fill="var(--c-cream)" stroke="${OL}" stroke-width="3.4"/>` +
    `<rect x="22" y="31" width="76" height="52" rx="14" fill="var(--c-screen)" stroke="${OL}" stroke-width="3"/>` +
    `<path d="M28 38 h22" stroke="var(--eye-w)" stroke-width="3" stroke-linecap="round" opacity=".7"/>` +
    `<g class="m-face">${mascotFace(mood)}</g>` +
    `<circle class="m-live" cx="96" cy="92" r="4" fill="var(--c-red)"/><path d="M24 92 h18" stroke="${OL}" stroke-width="2.4" stroke-linecap="round" opacity=".35"/>` +
    wearArt(wearId === undefined ? (NW.wearNow ? NW.wearNow() : '') : wearId) +
    `</g></svg>`;
}

/* ---------- ワダイたち ---------- */
const BODY = {
  sokuho: () =>
    `<path d="M10 30 h12 M6 43 h14 M10 56 h9" stroke="var(--c-yellow)" stroke-width="4" stroke-linecap="round" opacity=".8"/>` +
    `<path d="M60 4 L18 56 H44 L34 96 L84 38 H56 L70 4 Z" fill="var(--c-yellow)" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>` +
    eyes(44, 61, 45, 5.4) + smile(53, 54, 4) + blush(36, 69, 52, 3.4),
  buzzrin: () =>
    heart(80, 22, 6) + heart(18, 30, 4.5) +
    `<path d="M50 6 C60 22 80 32 80 58 C80 80 66 94 50 94 C34 94 20 80 20 60 C20 46 28 38 34 32 C35 42 40 47 45 48 C42 34 44 18 50 6 Z" fill="var(--c-orange)" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M50 42 C56 52 66 57 66 69 C66 81 58 87 50 87 C42 87 34 81 34 71 C34 63 40 59 44 55 C45 61 48 63 50 63 C48 55 48 47 50 42 Z" fill="var(--c-yellow)"/>` +
    eyes(42, 58, 66, 5) + smile(50, 76, 4.5),
  mukashi: () =>
    `<rect x="24" y="20" width="52" height="64" rx="4" fill="var(--c-beige)" stroke="${OL}" stroke-width="3"/>` +
    `<path d="M32 30 h36 M32 35 h26" stroke="var(--c-brown)" stroke-width="2" opacity=".55"/>` +
    `<rect x="15" y="12" width="70" height="13" rx="6.5" fill="var(--c-brown)" stroke="${OL}" stroke-width="3"/>` +
    `<rect x="15" y="79" width="70" height="13" rx="6.5" fill="var(--c-brown)" stroke="${OL}" stroke-width="3"/>` +
    `<path d="M33 43 q6 -6 12 0 M55 43 q6 -6 12 0" fill="none" stroke="${OL}" stroke-width="6.5" stroke-linecap="round"/>` +
    `<path d="M33 43 q6 -6 12 0 M55 43 q6 -6 12 0" fill="none" stroke="var(--eye-w)" stroke-width="3.4" stroke-linecap="round"/>` +
    `<g class="eye">${arc(39, 51, 4, false, 2.6)}${arc(61, 51, 4, false, 2.6)}</g>` +
    `<path d="M37 60 q3 15 13 17 q10 -2 13 -17 q-13 6 -26 0 z" fill="var(--eye-w)" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<path d="M41 59 q9 -6 18 0" fill="none" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/>`,
  haremochi: () =>
    rays(50, 40, 27, 40, 10, 'var(--c-yellow)') +
    `<circle cx="50" cy="40" r="24" fill="var(--c-yellow)" stroke="${OL}" stroke-width="3"/>` +
    `<path d="M13 72 C13 54 30 46 50 46 C70 46 87 54 87 72 C87 86 72 92 50 92 C28 92 13 86 13 72 Z" fill="var(--c-cream)" stroke="${OL}" stroke-width="3"/>` +
    `<g class="eye">${arc(40, 68, 5, true, 2.8)}${arc(60, 68, 5, true, 2.8)}</g>` + open(50, 75, 4) + blush(31, 69, 76, 4.5),
  goldon: () =>
    `<circle cx="50" cy="55" r="34" fill="var(--c-green)" stroke="${OL}" stroke-width="3"/>` +
    `<path d="M22 37 C36 49 36 67 24 77 M78 37 C64 49 64 67 76 77" stroke="var(--eye-w)" stroke-width="3" fill="none" opacity=".75"/>` +
    `<path d="M17 43 C30 34 70 34 83 43 L82 52 C70 44 30 44 18 52 Z" fill="var(--c-red)" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="M81 45 l12 -7 l-2 12 z" fill="var(--c-red)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>` +
    `<path d="M35 55 l10 3 M65 55 l-10 3" stroke="${OL}" stroke-width="3" stroke-linecap="round"/>` +
    eyes(42, 58, 64, 5) + open(50, 75, 5),
  picot: () =>
    `<rect x="21" y="11" width="14" height="14" fill="var(--c-teal)" stroke="${OL}" stroke-width="3"/><rect x="65" y="11" width="14" height="14" fill="var(--c-teal)" stroke="${OL}" stroke-width="3"/>` +
    `<rect x="15" y="21" width="70" height="66" rx="12" fill="var(--c-teal)" stroke="${OL}" stroke-width="3"/>` +
    `<rect x="25" y="31" width="50" height="31" rx="5" fill="var(--c-navy)" stroke="${OL}" stroke-width="2.4"/>` +
    `<g class="eye"><rect x="34" y="39" width="8" height="9" fill="var(--c-mint)"/><rect x="58" y="39" width="8" height="9" fill="var(--c-mint)"/></g>` +
    `<rect x="44" y="53" width="12" height="4" fill="var(--c-mint)"/>` +
    `<rect x="32" y="67" width="5" height="15" fill="${OL}"/><rect x="27" y="72" width="15" height="5" fill="${OL}"/>` +
    `<circle cx="62" cy="77" r="4.4" fill="var(--c-red)" stroke="${OL}" stroke-width="2"/><circle cx="72" cy="70" r="4.4" fill="var(--c-yellow)" stroke="${OL}" stroke-width="2"/>`,
  tabippo: () =>
    `<path d="M38 31 V21 a6 6 0 0 1 6 -6 h12 a6 6 0 0 1 6 6 V31" fill="none" stroke="${OL}" stroke-width="4.2"/>` +
    `<circle cx="28" cy="90" r="5" fill="${OL}"/><circle cx="72" cy="90" r="5" fill="${OL}"/>` +
    `<rect x="13" y="29" width="74" height="58" rx="10" fill="var(--c-brown)" stroke="${OL}" stroke-width="3"/>` +
    `<path d="M28 31 v54 M72 31 v54" stroke="var(--c-beige)" stroke-width="5"/>` +
    `<circle cx="78" cy="74" r="6" fill="var(--c-yellow)" stroke="${OL}" stroke-width="2"/>` +
    eyes(42, 58, 54, 5) + smile(50, 66, 5) + blush(36, 64, 63, 3.6),
  mogunyu: () =>
    `<path d="M50 12 C58 12 88 64 86 74 C84 86 16 86 14 74 C12 64 42 12 50 12 Z" fill="var(--c-rice)"/>` +
    `<path d="M33 62 H67 V86 H33 Z" fill="var(--c-nori)"/>` +
    `<path d="M50 12 C58 12 88 64 86 74 C84 86 16 86 14 74 C12 64 42 12 50 12 Z" fill="none" stroke="${OL}" stroke-width="3"/>` +
    `<path d="M33 63 V84 M67 63 V84" stroke="${OL}" stroke-width="2.2"/>` +
    `<circle cx="36" cy="38" r="1.6" fill="var(--c-beige)"/><circle cx="64" cy="40" r="1.6" fill="var(--c-beige)"/>` +
    eyes(42, 58, 47, 5) + open(50, 54, 3.6) + blush(34, 66, 56, 4),
  otopuku: () =>
    `<rect x="62" y="12" width="9" height="60" rx="3" fill="var(--c-pink)" stroke="${OL}" stroke-width="3"/>` +
    `<path d="M71 12 C83 18 91 29 86 43 C82 35 76 31 71 31 Z" fill="var(--c-pink)" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>` +
    `<ellipse cx="44" cy="70" rx="28" ry="21" transform="rotate(-18 44 70)" fill="var(--c-pink)" stroke="${OL}" stroke-width="3"/>` +
    eyes(35, 52, 67, 4.8) + open(45, 77, 4) + blush(28, 60, 76, 3.8) + sparkle(18, 30, 6, 'var(--c-gold)'),
  yosoul: () =>
    sparkle(84, 16, 6) + sparkle(14, 70, 4.5) +
    `<path d="M28 78 H72 L79 92 H21 Z" fill="var(--c-navy)" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>` +
    `<circle cx="50" cy="46" r="32" fill="var(--c-blue)" stroke="${OL}" stroke-width="3"/>` +
    `<path d="M29 35 a24 24 0 0 1 17 -13" stroke="var(--eye-w)" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>` +
    eyes(40, 60, 48, 6) + smile(50, 60, 5),
  demagoro: () =>
    `<path d="M30 23 L23 6 L41 18 Z M70 23 L77 6 L59 18 Z" fill="var(--c-purple)" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M50 14 C74 14 86 30 86 50 C86 74 70 90 50 90 C30 90 14 74 14 50 C14 30 26 14 50 14 Z" fill="var(--c-lilac)" stroke="${OL}" stroke-width="3"/>` +
    `<path d="M50 14 C26 14 14 30 14 50 C14 74 30 90 50 90 Z" fill="var(--c-purple)"/>` +
    `<path d="M50 14 C74 14 86 30 86 50 C86 74 70 90 50 90 C30 90 14 74 14 50 C14 30 26 14 50 14 Z M50 14 V90" fill="none" stroke="${OL}" stroke-width="3"/>` +
    eye(35, 46, 6) + `<g class="eye">${arc(64, 48, 6, true, 3)}</g>` +
    `<path d="M31 64 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6" fill="none" stroke="${OL}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`,
  gougai: () =>
    rays(50, 52, 26, 49, 14, 'var(--c-gold)', '.75') +
    `<g transform="rotate(-6 50 52)">` +
    `<rect x="22" y="16" width="56" height="72" rx="3" fill="var(--c-paper)" stroke="${OL}" stroke-width="3"/>` +
    `<rect x="22" y="16" width="56" height="19" fill="var(--c-red)" stroke="${OL}" stroke-width="3"/>` +
    `<text x="50" y="31" text-anchor="middle" font-size="13" font-weight="900" fill="var(--eye-w)" style="font-family:var(--f-display)">号外</text>` +
    `<path d="M30 72 h40 M30 78 h28" stroke="var(--c-ink2)" stroke-width="2.6" opacity=".5"/>` +
    eyes(40, 60, 51, 5.4) + open(50, 61, 4.4) + blush(32, 68, 62, 3.6) + `</g>` +
    sparkle(86, 18, 6, 'var(--eye-w)') + sparkle(14, 84, 5, 'var(--eye-w)'),
  fakeraken: mood => {
    const tent = (d) => `<path d="${d}" fill="none" stroke="${OL}" stroke-width="13" stroke-linecap="round"/><path d="${d}" fill="none" stroke="var(--c-purple)" stroke-width="8" stroke-linecap="round"/>`;
    let face;
    if (mood === 'angry') face = eyes(37, 63, 47, 7) + `<path d="M26 34 l17 7 M74 34 l-17 7" stroke="${OL}" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M35 59 Q50 72 65 59 Z" fill="var(--c-mouth)" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/><path d="M40 60 l3 4 l3 -4 M54 60 l3 4 l3 -4" fill="var(--eye-w)" stroke="${OL}" stroke-width="1.4"/>`;
    else if (mood === 'hurt' || mood === 'ko') face = `<path d="M31 41 l12 12 M43 41 l-12 12 M57 41 l12 12 M69 41 l-12 12" stroke="${OL}" stroke-width="3.6" stroke-linecap="round"/>` +
      `<path d="M40 64 q5 -5 10 0 q5 5 10 0" fill="none" stroke="${OL}" stroke-width="3" stroke-linecap="round"/>`;
    else face = eyes(37, 63, 46, 6.4) + smile(50, 60, 6) + blush(27, 73, 58, 5);
    return tent('M24 66 C14 76 20 88 9 93') + tent('M37 70 C34 82 40 90 33 96') + tent('M50 71 C50 82 54 90 50 96') + tent('M63 70 C66 82 60 90 67 96') + tent('M76 66 C86 76 80 88 91 93') +
      `<path d="M13 60 C13 28 30 10 50 10 C70 10 87 28 87 60 C87 70 76 74 50 74 C24 74 13 70 13 60 Z" fill="var(--c-purple)" stroke="${OL}" stroke-width="3"/>` +
      `<g transform="rotate(12 66 25)"><rect x="57" y="18" width="18" height="13" rx="1" fill="var(--c-paper)" stroke="${OL}" stroke-width="2"/><path d="M60 22 h12 M60 26 h8" stroke="var(--c-ink2)" stroke-width="1.6" opacity=".6"/></g>` +
      `<text x="31" y="31" font-size="15" font-weight="900" fill="var(--c-lilac)" style="font-family:var(--f-display)">？</text>` + face;
  }
};

function creature(id, opt){
  const o = opt || {};
  const f = BODY[id];
  if (!f) return '';
  return `<svg class="cr cr-${id} ${o.cls || ''}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g class="cr-body">${f(o.mood)}</g></svg>`;
}

/* 投げる新聞（ボス戦の攻撃） */
const paperBall = () => `<svg viewBox="0 0 40 40" class="paperball" aria-hidden="true"><rect x="6" y="9" width="28" height="22" rx="2" fill="var(--c-paper)" stroke="${OL}" stroke-width="2.4" transform="rotate(-12 20 20)"/><path d="M11 16 h18 M11 21 h14 M11 26 h16" stroke="var(--c-ink2)" stroke-width="2" opacity=".6" transform="rotate(-12 20 20)"/><rect x="6" y="9" width="28" height="6" fill="var(--c-red)" transform="rotate(-12 20 20)"/></svg>`;

NW.art = { mascot, creature, paperBall, sparkle, wear:wearArt };
})(window.NW);
