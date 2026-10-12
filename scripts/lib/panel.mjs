// Shared chrome for the dashboard cards: a dark panel with a shell prompt as
// its title and a muted meta line on the right, so every card reads as one
// terminal session.

import { color as c, font, esc } from './theme.mjs';

export const PANEL = { w: 860, pad: 24, top: 62 };

export function panel({ h, command, meta = '', body, label, style = '' }) {
  const { w, pad } = PANEL;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
  <style>
    text { font-family: ${font}; white-space: pre; }
    ${style}
  </style>
  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="12" fill="#0d1117" stroke="#1f2a24"/>
  <text x="${pad}" y="32" font-size="13"><tspan fill="${c.green}">richabh@github</tspan><tspan fill="${c.ink}">:</tspan><tspan fill="${c.cyan}">~</tspan><tspan fill="${c.ink}">$ ${esc(command)}</tspan></text>
  <text x="${w - pad}" y="32" font-size="11" text-anchor="end" fill="${c.muted}">${esc(meta)}</text>
  <line x1="${pad}" y1="46" x2="${w - pad}" y2="46" stroke="#1f2a24"/>
  ${body}
</svg>
`;
}

/** Shown only before the first successful sync, so no fake numbers ever ship. */
export const pending = (command) =>
  panel({
    h: 84,
    command,
    label: `${command}: syncing`,
    body: `<text x="${PANEL.pad}" y="66" font-size="13" fill="${c.muted}">syncing with the GitHub API…</text>`,
  });
