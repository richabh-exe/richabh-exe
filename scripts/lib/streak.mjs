// Self-hosted streak card. Numbers come straight from the GitHub contribution
// calendar, the same data as the green squares on the profile.
//
// Private contributions: GitHub only reveals them to the calendar query when
//   a) the token belongs to the profile owner (STREAK_TOKEN secret), or
//   b) the owner turned on "Private contributions" in Contribution settings.
// The card says which of the two views it is showing.

import { color as c, font, esc } from './theme.mjs';

const TZ = 'Asia/Kolkata';
const W = 860;
const H = 258;

/* ---------- data ---------- */

const QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      restrictedContributionsCount
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

/**
 * Fetches every calendar day since the account was created (and at least the
 * last year, so the total covers everything the profile graph shows). GitHub
 * caps each contributionsCollection window at one year, so it pages.
 * `restricted` counts private contributions shared anonymously by the owner.
 */
export async function fetchCalendar({ login, since, token }) {
  if (!token) throw new Error('a token (STREAK_TOKEN or GITHUB_TOKEN) is required for the GraphQL API');
  const days = new Map();
  let restricted = 0;
  const now = new Date();
  let from = new Date(Math.min(new Date(since).getTime(), now.getTime() - 365 * 86_400_000));
  while (from < now) {
    const to = new Date(Math.min(now.getTime(), from.getTime() + 365 * 86_400_000));
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': `${login}-streak` },
      body: JSON.stringify({ query: QUERY, variables: { login, from: from.toISOString(), to: to.toISOString() } }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = await res.json();
    if (!res.ok || json.errors) throw new Error(json.errors?.[0]?.message ?? `HTTP ${res.status}`);
    const collection = json.data.user.contributionsCollection;
    restricted += collection.restrictedContributionsCount;
    for (const week of collection.contributionCalendar.weeks)
      for (const d of week.contributionDays) days.set(d.date, d.contributionCount);
    from = to;
  }
  return {
    days: [...days].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    restricted,
  };
}

/** YYYY-MM-DD for "today" in the profile owner's timezone. */
const todayIn = (tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

/**
 * Streak maths, matching how GitHub users read their graph: today with zero
 * contributions doesn't break the current streak yet (the day isn't over).
 */
export function computeStreak(calendar, today = todayIn(TZ)) {
  const days = calendar.filter((d) => d.date <= today);
  const total = days.reduce((n, d) => n + d.count, 0);

  let longest = { length: 0, start: null, end: null };
  let run = { length: 0, start: null, end: null };
  for (const d of days) {
    if (d.count > 0) {
      run = run.length ? { ...run, length: run.length + 1, end: d.date } : { length: 1, start: d.date, end: d.date };
      if (run.length > longest.length) longest = run;
    } else {
      run = { length: 0, start: null, end: null };
    }
  }

  const tail = days.at(-1)?.date === today && days.at(-1).count === 0 ? days.slice(0, -1) : days;
  let current = { length: 0, start: null, end: null };
  for (let i = tail.length - 1; i >= 0 && tail[i].count > 0; i--) {
    current = { length: current.length + 1, start: tail[i].date, end: current.end ?? tail[i].date };
  }

  const first = days.find((d) => d.count > 0)?.date ?? days[0]?.date;
  return { total, current, longest, first, recent: days.slice(-30), today };
}

/* ---------- render ---------- */

const fmt = (iso, year = false) =>
  iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(year && { year: 'numeric' }),
        timeZone: 'UTC',
      })
    : '—';

const range = (s) => (s.length ? (s.start === s.end ? fmt(s.start) : `${fmt(s.start)} – ${fmt(s.end)}`) : 'start one today');

/** Phosphor ramp for the last-30-days strip, scaled to the busiest day. */
function shade(count, max) {
  if (!count) return '#161b22';
  const q = count / max;
  return q > 0.75 ? c.green : q > 0.5 ? '#26a641' : q > 0.25 ? '#006d32' : '#0e4429';
}

const stat = (x, value, label, sub, tone) => `
    <text x="${x}" y="122" text-anchor="middle" font-size="34" font-weight="700" fill="${tone}">${esc(value)}</text>
    <text x="${x}" y="182" text-anchor="middle" font-size="11" letter-spacing="2" fill="${c.amber}">${esc(label)}</text>
    <text x="${x}" y="200" text-anchor="middle" font-size="12" fill="${c.muted}">${esc(sub)}</text>`;

export function renderStreak(s, scope = 'public only') {
  const R = 46;
  const C = 2 * Math.PI * R;
  const max = Math.max(1, ...s.recent.map((d) => d.count));
  const cell = 14;
  const gap = 4;
  const stripW = s.recent.length * (cell + gap) - gap;
  const stripX = (W - stripW) / 2;

  const strip = s.recent
    .map((d, i) => `<rect x="${stripX + i * (cell + gap)}" y="222" width="${cell}" height="${cell}" rx="3" fill="${shade(d.count, max)}"><title>${d.date}: ${d.count}</title></rect>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
  <title id="t">Contribution streak: current ${s.current.length} days, longest ${s.longest.length} days, ${s.total} total contributions</title>
  <style>
    text { font-family: ${font}; white-space: pre; }
    .ring { stroke-dasharray: ${C.toFixed(1)}; stroke-dashoffset: ${C.toFixed(1)}; animation: draw 1.2s cubic-bezier(.6,.05,.3,1) .2s forwards; }
    .flame { transform-box: fill-box; transform-origin: bottom; animation: flicker 1.4s ease-in-out infinite; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes flicker { 0%,100% { transform: scale(1); } 50% { transform: scale(.9, 1.08); } }
    @media (prefers-reduced-motion: reduce) { .ring { animation: none; stroke-dashoffset: 0; } .flame { animation: none; } }
  </style>
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12" fill="#0d1117" stroke="#1f2a24"/>
  <text x="24" y="32" font-size="13"><tspan fill="${c.green}">richabh@github</tspan><tspan fill="${c.ink}">:</tspan><tspan fill="${c.cyan}">~</tspan><tspan fill="${c.ink}">$ streak --stats --tz ${TZ}</tspan></text>
  <text x="${W - 24}" y="32" font-size="11" text-anchor="end" fill="${c.muted}">synced ${s.today} · ${esc(scope)}</text>
  <line x1="24" y1="46" x2="${W - 24}" y2="46" stroke="#1f2a24"/>

  <line x1="287" y1="66" x2="287" y2="204" stroke="#1f2a24"/>
  <line x1="573" y1="66" x2="573" y2="204" stroke="#1f2a24"/>

  ${stat(143, s.total.toLocaleString('en-US'), 'TOTAL CONTRIBUTIONS', `${fmt(s.first, true)} – Present`, c.ink)}

  <g filter="url(#glow)">
    <circle cx="430" cy="110" r="${R}" fill="none" stroke="#16402a" stroke-width="5"/>
    <circle class="ring" cx="430" cy="110" r="${R}" fill="none" stroke="${c.green}" stroke-width="5" stroke-linecap="round" transform="rotate(-90 430 110)"/>
    <path class="flame" d="M430 52c-6 7-10 12-10 18a10 10 0 0 0 20 0c0-6-4-11-10-18z" fill="${c.amber}" stroke="#0d1117" stroke-width="3"/>
    <text x="430" y="122" text-anchor="middle" font-size="34" font-weight="700" fill="${c.green}">${s.current.length}</text>
  </g>
  <text x="430" y="182" text-anchor="middle" font-size="11" letter-spacing="2" fill="${c.green}">CURRENT STREAK</text>
  <text x="430" y="200" text-anchor="middle" font-size="12" fill="${c.muted}">${esc(range(s.current))}</text>

  ${stat(717, String(s.longest.length), 'LONGEST STREAK', range(s.longest), c.ink)}

  <text x="${stripX - 12}" y="234" text-anchor="end" font-size="10" fill="${c.muted}">30d</text>
  ${strip}
  <text x="${stripX + stripW + 12}" y="234" font-size="10" fill="${c.muted}">today</text>
</svg>
`;
}
