// Link buttons: one small terminal-style SVG per destination, wrapped in an <a>
// in the README (an <img> can't hold its own links). Self-hosted so every logo-
// less network (Peerlist, LinkedIn) looks identical to the rest.

import { color as c, font, esc } from './theme.mjs';

// Single source of truth, mirrored from richabh.com/links.
export const LINKS = [
  { id: 'portfolio', cmd: 'portfolio', arg: 'richabh.com', href: 'https://www.richabh.com/', hero: true, accent: c.green },
  { id: 'project', cmd: 'start-a-project', arg: '/contact', href: 'https://www.richabh.com/contact', hero: true, accent: c.amber },
  { id: 'email', cmd: 'mail', arg: 'work@richabh.com', href: 'mailto:work@richabh.com', hero: true, accent: c.green },
  { id: 'linkedin', cmd: 'linkedin', arg: 'richabh-exe', href: 'https://www.linkedin.com/in/richabh-exe', hero: true, accent: c.cyan },
  { id: 'x', cmd: 'x', arg: '@_richabh', href: 'https://x.com/_richabh', accent: c.ink },
  { id: 'peerlist', cmd: 'peerlist', arg: 'richabh', href: 'https://peerlist.io/richabh', accent: c.green },
  { id: 'medium', cmd: 'medium', arg: '@richabh', href: 'https://medium.com/@richabh', accent: c.ink },
  { id: 'leetcode', cmd: 'leetcode', arg: 'richabh', href: 'https://leetcode.com/u/richabh', accent: c.amber },
];

const SIZE = 13;
const CW = SIZE * 0.6;
const H = 34;
const PAD = 14;

/** `> cmd arg` pill; width derives from the text so every button hugs its label. */
export function renderLink({ cmd, arg, accent }) {
  const cmdW = cmd.length * CW;
  const argW = [...arg].length * CW;
  const w = Math.ceil(PAD + CW * 2 + cmdW + CW + argW + PAD);
  const x1 = PAD + CW * 2;
  const x2 = x1 + cmdW + CW;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="${esc(`${cmd} ${arg}`)}">
  <style>text { font-family: ${font}; font-size: ${SIZE}px; white-space: pre; }</style>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${H - 1}" rx="8" fill="#0d1117" stroke="#1f2a24"/>
  <rect x="0.5" y="${H - 3}" width="${w - 1}" height="2.5" rx="1" fill="${accent}" opacity="0.55"/>
  <text x="${PAD}" y="22" fill="${c.amber}" font-weight="700">&gt;</text>
  <text x="${x1}" y="22" fill="${c.ink}" textLength="${cmdW.toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(cmd)}</text>
  <text x="${x2.toFixed(1)}" y="22" fill="${c.muted}" textLength="${argW.toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(arg)}</text>
</svg>
`;
}

/** README markup for a set of links: each pill is an image wrapped in its link. */
export const linkRow = (links) =>
  links
    .map((l) => `<a href="${l.href}"><img src="assets/links/${l.id}.svg" height="34" alt="${esc(`${l.cmd}: ${l.arg}`)}" /></a>`)
    .join('\n');
