#!/usr/bin/env node
// Builds every generated piece of the profile:
//   assets/terminal.svg  ← live data from the GitHub API (uptime, repos, location)
//   assets/typing.svg    ← rotating taglines
//   assets/footer.svg    ← the closing `exit`
//   README.md            ← today's `fortune | cowsay` between the FORTUNE markers
//
// Runs daily in .github/workflows/daily-boot.yml; run locally with `npm run build`.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderTerminal } from './lib/terminal.mjs';
import { renderTyping } from './lib/typing.mjs';
import { fortune } from './lib/fortune.mjs';
import { renderFooter } from './lib/footer.mjs';

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
await replaceBlock(
  'README.md',
  'FORTUNE',
  ['```text', fortune(now), '```', `<sub>rotates daily · last run ${now.toISOString().slice(0, 10)}</sub>`].join('\n'),
);

console.log('✓ built', data);
