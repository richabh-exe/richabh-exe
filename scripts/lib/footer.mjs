// Renders assets/footer.svg: the session closes politely at the bottom of the page.

import { color as c, font, grid, width } from './theme.mjs';

const LOGOUT = 'logout · Connection to richabh-exe closed. Thanks for reading the source.';

export function renderFooter() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 84" width="860" height="84" role="img" aria-label="$ exit · logout · Connection to richabh-exe closed.">
  <style>text { font-family: ${font}; font-size: 14px; white-space: pre; }</style>
  <rect x="1" y="1" width="858" height="82" rx="12" fill="#0d1117" stroke="#1f2a24"/>
  <text x="24" y="34"><tspan fill="${c.green}">richabh@github</tspan><tspan fill="${c.ink}">:</tspan><tspan fill="${c.cyan}">~</tspan><tspan fill="${c.ink}">$ exit</tspan></text>
  <text x="24" y="58" fill="${c.muted}" textLength="${width(LOGOUT)}" lengthAdjust="spacingAndGlyphs">${LOGOUT}</text>
  <rect x="${24 + width(LOGOUT) + grid.cw}" y="46" width="8.4" height="16" fill="${c.green}">
    <animate attributeName="opacity" values="1;0" calcMode="discrete" dur="1s" repeatCount="indefinite"/>
  </rect>
</svg>
`;
}
