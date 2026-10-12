// `$ watch -n 86400 git commit`: daily contributions for the last 90 days as
// thin bars rising from a shared baseline, with one dashed reference line for
// the daily average and a single direct label on the peak day.

import { color as c, esc } from './theme.mjs';
import { panel, PANEL } from './panel.mjs';

const DAYS = 90;

/** Smallest friendly even ceiling ≥ v, so the midline gridline is an integer too. */
const niceMax = (v) => {
  for (let e = 0; ; e++)
    for (const m of [0.4, 0.6, 0.8, 1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8]) {
      const n = Math.round(m * 10 ** e);
      if (n >= v && n >= 4 && n % 2 === 0) return n;
    }
};

const monthName = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });

/** Bar with a rounded data-end (top) and a square foot on the baseline. */
const bar = (x, y, w, base, r = 2) => {
  const rr = Math.min(r, w / 2, base - y);
  return `M${x} ${base}V${y + rr}Q${x} ${y} ${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${base}Z`;
};

export function renderActivity(calendar, today, scope) {
  const { w, pad } = PANEL;
  const H = 280;
  const days = calendar.filter((d) => d.date <= today).slice(-DAYS);
  const max = Math.max(1, ...days.map((d) => d.count));
  const top = niceMax(max);
  const sum = days.reduce((n, d) => n + d.count, 0);
  const avg = sum / (days.length || 1);

  const X0 = pad + 32;
  const X1 = w - pad;
  const Y0 = 76; // plot top
  const BASE = 206; // baseline
  const slot = (X1 - X0) / DAYS;
  const bw = Math.max(2, slot - 2); // 2px surface gap between bars
  const y = (v) => BASE - (v / top) * (BASE - Y0);

  const grid = [0, top / 2, top]
    .map((v) => `
    <line x1="${X0}" y1="${y(v).toFixed(1)}" x2="${X1}" y2="${y(v).toFixed(1)}" stroke="${v === 0 ? '#2a333c' : '#1a2128'}"/>
    <text x="${X0 - 8}" y="${(y(v) + 4).toFixed(1)}" font-size="10" text-anchor="end" fill="${c.muted}">${v}</text>`)
    .join('');

  // Align so the most recent day sits in the right-most slot.
  const offset = DAYS - days.length;
  let peak = null;
  const bars = days
    .map((d, i) => {
      if (!d.count) return '';
      const bx = X0 + (offset + i) * slot + (slot - bw) / 2;
      if (!peak || d.count >= peak.count) peak = { ...d, x: bx + bw / 2 };
      return `<path class="bar" style="animation-delay:${(i * 0.008).toFixed(3)}s" d="${bar(+bx.toFixed(1), +y(d.count).toFixed(1), +bw.toFixed(1), BASE)}" fill="${c.green}"/>`;
    })
    .join('');

  const months = days
    .map((d, i) => (d.date.endsWith('-01') ? { label: monthName(d.date), x: X0 + (offset + i) * slot } : null))
    .filter(Boolean)
    .map((m) => `
    <line x1="${m.x.toFixed(1)}" y1="${BASE}" x2="${m.x.toFixed(1)}" y2="${BASE + 5}" stroke="#2a333c"/>
    <text x="${(m.x + 4).toFixed(1)}" y="${BASE + 18}" font-size="10" fill="${c.muted}">${m.label}</text>`)
    .join('');

  const avgY = y(avg).toFixed(1);
  const reference = sum
    ? `<line x1="${X0}" y1="${avgY}" x2="${X1}" y2="${avgY}" stroke="${c.amber}" stroke-width="1" stroke-dasharray="4 4" opacity="0.8"/>`
    : '';
  const KY = BASE + 46;
  const key = `
    <rect x="${X0}" y="${KY - 9}" width="8" height="10" rx="2" fill="${c.green}"/>
    <text x="${X0 + 14}" y="${KY}" font-size="10" fill="${c.muted}">contributions per day</text>
    ${sum ? `<line x1="${X0 + 170}" y1="${KY - 4}" x2="${X0 + 190}" y2="${KY - 4}" stroke="${c.amber}" stroke-dasharray="4 4"/>
    <text x="${X0 + 196}" y="${KY}" font-size="10" fill="${c.muted}">avg ${avg.toFixed(1)}/day</text>` : ''}`;
  // Direct label on the peak: anchored toward the plot centre so it never clips.
  const anchor = peak && peak.x > X1 - 70 ? 'end' : peak && peak.x < X0 + 70 ? 'start' : 'middle';
  const peakLabel = peak
    ? `<text x="${peak.x.toFixed(1)}" y="${(y(peak.count) - 8).toFixed(1)}" font-size="10" text-anchor="${anchor}" fill="${c.ink}">peak ${peak.count} · ${new Date(`${peak.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</text>`
    : '';
  const activeDays = days.filter((d) => d.count).length;

  return panel({
    h: H,
    command: 'watch -n 86400 git commit',
    meta: `last ${DAYS} days · ${activeDays} active · ${scope}`,
    label: `Daily contributions, last ${days.length} days: ${sum} total, average ${avg.toFixed(1)} per day, peak ${peak?.count ?? 0}${peak ? ` on ${peak.date}` : ''}.`,
    style: `.bar { transform-box: fill-box; transform-origin: bottom; transform: scaleY(0); animation: grow .6s cubic-bezier(.3,.7,.3,1) forwards; }
    @keyframes grow { to { transform: scaleY(1); } }
    @media (prefers-reduced-motion: reduce) { .bar { animation: none; transform: none; } }`,
    body: `${grid}
  ${bars}
  ${reference}
  ${peakLabel}
  ${months}
  ${key}
  <text x="${X1}" y="${BASE + 18}" font-size="10" text-anchor="end" fill="${c.muted}">today</text>`,
  });
}
