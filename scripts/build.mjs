#!/usr/bin/env node
// Builds every generated piece of the profile:
//   assets/terminal.svg  ← live data from the GitHub API (uptime, repos, location)
//   assets/typing.svg    ← rotating taglines
//   assets/footer.svg    ← the closing `exit`
//   assets/streak.svg    ← streak stats from the contribution calendar (GraphQL)
//   assets/stats.svg     ← last-year totals + languages by bytes (GraphQL)
//   assets/activity.svg  ← daily contributions, last 90 days
//   assets/achievements.svg ← tiered badges computed from the above
//   assets/links/*.svg   ← link buttons, plus the HERO_LINKS / LINKS blocks in README
//   README.md            ← today's `fortune | cowsay` between the FORTUNE markers
//
// Runs daily in .github/workflows/daily-boot.yml; run locally with `npm run build`.

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderTerminal } from './lib/terminal.mjs';
import { renderTyping } from './lib/typing.mjs';
import { fortune } from './lib/fortune.mjs';
import { renderFooter } from './lib/footer.mjs';
import { fetchCalendar, computeStreak, renderStreak } from './lib/streak.mjs';
import { fetchStats, renderStats } from './lib/stats.mjs';
import { renderActivity } from './lib/activity.mjs';
import { computeAchievements, renderAchievements } from './lib/achievements.mjs';
import { pending } from './lib/panel.mjs';
import { LINKS, renderLink, linkRow } from './lib/links.mjs';

const USER = process.env.GH_USER ?? 'richabh-exe';
const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));

// Used when the API is unreachable (offline builds, sandboxed CI).
const FALLBACK = { created_at: '2026-02-12T01:23:27Z', public_repos: 4, location: 'Lucknow' };

const TAGLINES = [
  'Building interfaces that feel fast, one pixel at a time.',
  'Teaching machines to do the boring parts.',
  'TypeScript · React · Next.js · Node · Tailwind',
  'Currently: wiring LLM agents into everything.',
  'Design-driven development: the why before the how.',
  'git commit -m "make it nerdier"',
];

async function fetchProfile() {
  try {
    const headers = { 'User-Agent': `${USER}-profile-build`, Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/users/${USER}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.created_at) throw new Error('unexpected payload');
    return json;
  } catch (err) {
    console.warn(`! GitHub API unavailable (${err.message}); using fallback profile data`);
    return FALLBACK;
  }
}

/** Calendar-accurate "1y 2m 3d" between two dates. */
function uptime(from, to) {
  let y = to.getUTCFullYear() - from.getUTCFullYear();
  let m = to.getUTCMonth() - from.getUTCMonth();
  let d = to.getUTCDate() - from.getUTCDate();
  if (d < 0) {
    m -= 1;
    d += new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 0)).getUTCDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return [y && `${y}y`, (y || m) && `${m}m`, `${d}d`].filter(Boolean).join(' ');
}

async function replaceBlock(file, marker, body) {
  const path = root(file);
  const src = await readFile(path, 'utf8');
  const re = new RegExp(`(<!-- ${marker}:START -->)[\\s\\S]*?(<!-- ${marker}:END -->)`);
  if (!re.test(src)) throw new Error(`${marker} markers not found in ${file}`);
  await writeFile(path, src.replace(re, `$1\n${body}\n$2`));
}

const now = new Date();
const profile = await fetchProfile();

const data = {
  version: `${String(now.getUTCFullYear()).slice(2)}.${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
  location: `${(profile.location || FALLBACK.location).split(',')[0].trim()}, IN`,
  uptime: uptime(new Date(profile.created_at), now),
  repos: profile.public_repos ?? FALLBACK.public_repos,
  booted: `${now.toISOString().slice(0, 10)} (daily cron)`,
};

await writeFile(root('assets/terminal.svg'), renderTerminal(data));
await writeFile(root('assets/typing.svg'), renderTyping(TAGLINES));
await writeFile(root('assets/footer.svg'), renderFooter());
await mkdir(root('assets/links'), { recursive: true });
await Promise.all(LINKS.map((l) => writeFile(root(`assets/links/${l.id}.svg`), renderLink(l))));
await replaceBlock('README.md', 'HERO_LINKS', linkRow(LINKS.filter((l) => l.hero)));
await replaceBlock('README.md', 'LINKS', linkRow(LINKS));
await replaceBlock(
  'README.md',
  'FORTUNE',
  ['```text', fortune(now), '```', `<sub>rotates daily · last run ${now.toISOString().slice(0, 10)}</sub>`].join('\n'),
);

// Dashboard cards. On API failure keep the last good card rather than publishing
// zeros; a card that has never synced shows a "syncing" placeholder instead.
// STREAK_TOKEN (the owner's PAT) lets GitHub include private contributions.
const ownerToken = process.env.STREAK_TOKEN;
const token = ownerToken || process.env.GITHUB_TOKEN;

async function card(file, command, build) {
  try {
    await writeFile(root(`assets/${file}`), await build());
  } catch (err) {
    console.warn(`! ${file} not refreshed (${err.message}); keeping the previous card`);
    const exists = await access(root(`assets/${file}`)).then(() => true, () => false);
    if (!exists) await writeFile(root(`assets/${file}`), pending(command));
  }
}

const calendarP = fetchCalendar({ login: USER, since: profile.created_at, token });
const statsP = token ? fetchStats({ login: USER, token }) : Promise.reject(new Error('no token'));
calendarP.catch(() => {});
statsP.catch(() => {});

const scopeOf = (restricted) => (ownerToken || restricted > 0 ? 'public + private' : 'public only');

await card('streak.svg', 'streak --stats', async () => {
  const { days, restricted } = await calendarP;
  const streak = computeStreak(days);
  console.log('✓ streak', { scope: scopeOf(restricted), total: streak.total, current: streak.current, longest: streak.longest });
  return renderStreak(streak, scopeOf(restricted));
});

await card('stats.svg', 'git log --stat', async () => {
  const stats = await statsP;
  console.log('✓ stats', { ...stats, languages: stats.languages.map((l) => l.name) });
  return renderStats(stats, scopeOf(stats.restricted));
});

await card('activity.svg', 'watch -n 86400 git commit', async () => {
  const { days, restricted } = await calendarP;
  return renderActivity(days, computeStreak(days).today, scopeOf(restricted));
});

await card('achievements.svg', 'ls ~/achievements', async () => {
  const [{ days }, stats] = await Promise.all([calendarP, statsP]);
  const list = computeAchievements({ streak: computeStreak(days), stats, calendar: days });
  console.log('✓ achievements', list.map((a) => `${a.name}:${a.level}`).join(' '));
  return renderAchievements(list);
});

console.log('✓ built', data);
