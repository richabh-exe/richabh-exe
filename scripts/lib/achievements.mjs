// `$ ls ~/achievements`: six tiered badges computed from real activity, so every
// unlock is earned rather than decorative. Replaces the public trophy service.

import { color as c, esc } from './theme.mjs';
import { panel, PANEL } from './panel.mjs';

const ROMAN = ['', 'I', 'II', 'III'];

/** Level 0-3 for a value against three ascending thresholds. */
const level = (value, tiers) => tiers.filter((t) => value >= t).length;

export function computeAchievements({ streak, stats, calendar }) {
  const weekendDays = calendar.filter((d) => d.count && [0, 6].includes(new Date(`${d.date}T00:00:00Z`).getUTCDay())).length;
  return [
    { name: 'ON FIRE', unit: 'day streak', value: streak.longest.length, tiers: [7, 30, 100] },
    { name: 'CENTURION', unit: 'contributions', value: streak.total, tiers: [100, 500, 1000] },
    { name: 'POLYGLOT', unit: 'languages', value: stats.languages.length, tiers: [3, 5, 8] },
    { name: 'SHIPPER', unit: 'pull requests', value: stats.prs, tiers: [1, 10, 50] },
    { name: 'WEEKENDER', unit: 'weekend days', value: weekendDays, tiers: [4, 12, 30] },
    { name: 'STARGAZER', unit: 'stars earned', value: stats.stars, tiers: [1, 10, 50] },
  ].map((a) => ({ ...a, level: level(a.value, a.tiers) }));
}

function badge(a, x, y, bw, bh, i) {
  const unlocked = a.level > 0;
  const next = a.tiers[a.level];
  const pips = a.tiers
    .map((_, k) => `<rect x="${x + 14 + k * 16}" y="${y + bh - 24}" width="10" height="10" rx="2" ${k < a.level ? `fill="${c.green}"` : `fill="none" stroke="#2a333c"`}/>`)
    .join('');
  return `
  <g class="badge" style="animation-delay:${(i * 0.08).toFixed(2)}s" opacity="${unlocked ? 1 : 0.5}">
    <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="8" fill="#0f151a" stroke="${unlocked ? '#1f3a2b' : '#1f2a24'}"/>
    <text x="${x + 14}" y="${y + 24}" font-size="10" letter-spacing="1.5" fill="${unlocked ? c.amber : c.muted}">${esc(a.name)}</text>
    <text x="${x + bw - 14}" y="${y + 24}" font-size="12" font-weight="700" text-anchor="end" fill="${unlocked ? c.green : c.muted}">${unlocked ? ROMAN[a.level] : '—'}</text>
    <text x="${x + 14}" y="${y + 54}" font-size="22" font-weight="700" fill="${c.ink}">${a.value.toLocaleString('en-US')}</text>
    <text x="${x + 14}" y="${y + 70}" font-size="10" fill="${c.muted}">${esc(a.unit)}</text>
    ${pips}
    <text x="${x + bw - 14}" y="${y + bh - 15}" font-size="9" text-anchor="end" fill="${c.muted}">${next ? `next ${next}` : 'maxed'}</text>
  </g>`;
}

export function renderAchievements(list) {
  const { w, pad } = PANEL;
  const gap = 10;
  const bw = (w - pad * 2 - gap * (list.length - 1)) / list.length;
  const bh = 112;
  const unlocked = list.filter((a) => a.level).length;
  return panel({
    h: 196,
    command: 'ls ~/achievements',
    meta: `${unlocked}/${list.length} unlocked · tiers I–III`,
    label: list.map((a) => `${a.name}: ${a.value} ${a.unit}, tier ${a.level} of 3`).join('; '),
    style: `.badge { animation: pop .45s cubic-bezier(.3,.7,.3,1.2) both; transform-box: fill-box; transform-origin: center; }
    @keyframes pop { from { transform: scale(.92); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .badge { animation: none; } }`,
    body: list.map((a, i) => badge(a, +(pad + i * (bw + gap)).toFixed(1), 62, +bw.toFixed(1), bh, i)).join(''),
  });
}
