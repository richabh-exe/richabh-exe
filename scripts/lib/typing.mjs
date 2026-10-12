// Renders assets/typing.svg: a one-line terminal that types, holds and erases a
// rotating list of taglines. Each phrase is a SMIL animation chained to the end of
// the previous one, so the loop needs no JavaScript and no third-party service.

import { color as c, font, esc } from './theme.mjs';

const W = 860;
const H = 60;
const SIZE = 18;
const CW = SIZE * 0.6; // monospace advance
const X = 58;
const Y = 37;

const TYPE = 0.055; // s per char typed
const ERASE = 0.022; // s per char erased
const HOLD = 1.9;
const GAP = 0.35;

/**
 * Builds discrete (t, value) keyframes for one phrase: type up, hold, erase down.
 * Returns SMIL-ready `values`, `keyTimes` and the total duration.
 */
function frames(n) {
  const typeT = n * TYPE;
  const eraseT = n * ERASE;
  const dur = typeT + HOLD + eraseT + GAP;
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([i * TYPE, i]);
  for (let i = n - 1; i >= 0; i--) pts.push([typeT + HOLD + (n - i) * ERASE, i]);
  return {
    dur: dur.toFixed(3),
    keyTimes: pts.map(([t]) => (t / dur).toFixed(4)).join(';'),
    chars: pts.map(([, v]) => v),
  };
}

export function renderTyping(phrases) {
  const ids = phrases.map((_, i) => `p${i}`);
  const last = ids.at(-1);

  const layers = phrases
    .map((text, i) => {
      const n = [...text].length;
      const { dur, keyTimes, chars } = frames(n);
      const begin = i === 0 ? `0.4s;${last}.end` : `${ids[i - 1]}.end`;
      const widths = chars.map((k) => (k * CW).toFixed(1)).join(';');
      const xs = chars.map((k) => (X + k * CW).toFixed(1)).join(';');
      return `
  <clipPath id="c${i}"><rect x="${X}" y="${Y - 20}" width="0" height="28">
    <animate id="${ids[i]}" attributeName="width" values="${widths}" keyTimes="${keyTimes}" calcMode="discrete" begin="${begin}" dur="${dur}s"/>
  </rect></clipPath>
  <text x="${X}" y="${Y}" clip-path="url(#c${i})" textLength="${(n * CW).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>
  <animate xlink:href="#caret" attributeName="x" values="${xs}" keyTimes="${keyTimes}" calcMode="discrete" begin="${begin}" dur="${dur}s"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(phrases.join(' · '))}">
  <style>
    text { font-family: ${font}; font-size: ${SIZE}px; fill: ${c.ink}; white-space: pre; }
  </style>
  <defs>
    <filter id="glow" x="-5%" y="-50%" width="110%" height="200%">
      <feGaussianBlur stdDeviation="1.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12" fill="#0d1117" stroke="#1f2a24"/>
  <g filter="url(#glow)">
    <text x="26" y="${Y}" fill="${c.amber}" font-weight="700" style="fill:${c.amber}">&gt;</text>
    ${layers}
    <rect id="caret" x="${X}" y="${Y - 16}" width="${CW}" height="20" fill="${c.green}">
      <animate attributeName="opacity" values="1;0" calcMode="discrete" dur="1s" repeatCount="indefinite"/>
    </rect>
  </g>
</svg>
`;
}
