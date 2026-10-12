// `$ git log --stat` card: contribution totals for the last year on the left,
// languages by bytes across owned repos on the right. Replaces the public
// github-readme-stats cards, which only ever see public activity.

import { color as c, esc } from './theme.mjs';
import { panel, PANEL } from './panel.mjs';

const QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    followers { totalCount }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } }
      }
    }
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      totalRepositoriesWithContributedCommits
      restrictedContributionsCount
    }
  }
}`;

export async function fetchStats({ login, token }) {
  const to = new Date();
  const from = new Date(to.getTime() - 365 * 86_400_000);
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': `${login}-stats` },
    body: JSON.stringify({ query: QUERY, variables: { login, from: from.toISOString(), to: to.toISOString() } }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(json.errors?.[0]?.message ?? `HTTP ${res.status}`);

  const { followers, repositories, contributionsCollection: cc } = json.data.user;
  const bytes = new Map();
  for (const repo of repositories.nodes)
    for (const { size, node } of repo.languages.edges) {
      const prev = bytes.get(node.name) ?? { size: 0, color: node.color };
      bytes.set(node.name, { size: prev.size + size, color: node.color ?? '#8b949e' });
    }

  return {
    commits: cc.totalCommitContributions,
    prs: cc.totalPullRequestContributions,
    issues: cc.totalIssueContributions,
    reviews: cc.totalPullRequestReviewContributions,
    repos: cc.totalRepositoriesWithContributedCommits,
    restricted: cc.restrictedContributionsCount,
    stars: repositories.nodes.reduce((n, r) => n + r.stargazerCount, 0),
    followers: followers.totalCount,
    languages: [...bytes].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.size - a.size),
  };
}

/** Top `n` languages by share; the tail folds into "Other" (never a new hue). */
function topLanguages(langs, n = 6) {
  const total = langs.reduce((s, l) => s + l.size, 0) || 1;
  const head = langs.slice(0, n).map((l) => ({ ...l, pct: (l.size / total) * 100 }));
  const rest = langs.slice(n).reduce((s, l) => s + l.size, 0);
  if (rest) head.push({ name: 'Other', color: '#6e7681', pct: (rest / total) * 100 });
  return head;
}

export function renderStats(s, scope) {
  const { w, pad } = PANEL;
  const H = 240;

  const rows = [
    ['commits', s.commits],
    ['pull requests', s.prs],
    ['issues', s.issues],
    ['code reviews', s.reviews],
    ['repos contributed to', s.repos],
    ['stars earned', s.stars],
    s.restricted > 0 ? ['private contributions', s.restricted] : ['followers', s.followers],
  ];
  const LX = pad;
  const VX = 400;
  const stats = rows
    .map(([k, v], i) => {
      const y = 82 + i * 22;
      return `
    <g class="row" style="animation-delay:${(0.05 * i).toFixed(2)}s">
      <text x="${LX}" y="${y}" font-size="13" fill="${c.muted}">${esc(k)}</text>
      <line x1="${LX + 186}" y1="${y - 4}" x2="${VX - 44}" y2="${y - 4}" stroke="#1f2a24" stroke-dasharray="2 4"/>
      <text x="${VX}" y="${y}" font-size="14" font-weight="700" text-anchor="end" fill="${c.ink}">${v.toLocaleString('en-US')}</text>
    </g>`;
    })
    .join('');

  // Languages: one stacked bar with a 2px surface gap between segments.
  const langs = topLanguages(s.languages);
  const BX = 456;
  const BW = w - pad - BX;
  const GAP = 2;
  const usable = BW - GAP * Math.max(0, langs.length - 1);
  let x = BX;
  const segments = langs
    .map((l) => {
      const segW = Math.max(2, (l.pct / 100) * usable);
      const seg = `<rect x="${x.toFixed(1)}" y="88" width="${segW.toFixed(1)}" height="10" rx="2" fill="${l.color}"/>`;
      x += segW + GAP;
      return seg;
    })
    .join('');
  const colW = BW / 2;
  const legend = langs
    .map((l, i) => {
      const lx = BX + (i % 2) * colW;
      const ly = 130 + Math.floor(i / 2) * 24;
      return `
    <rect x="${lx}" y="${ly - 9}" width="10" height="10" rx="2" fill="${l.color}"/>
    <text x="${lx + 18}" y="${ly}" font-size="12" fill="${c.ink}">${esc(l.name)}</text>
    <text x="${lx + colW - 16}" y="${ly}" font-size="12" text-anchor="end" fill="${c.muted}">${l.pct.toFixed(1)}%</text>`;
    })
    .join('');
  const languages = langs.length
    ? `<text x="${BX}" y="72" font-size="11" letter-spacing="2" fill="${c.amber}">LANGUAGES · BY BYTES</text>${segments}${legend}`
    : `<text x="${BX}" y="72" font-size="12" fill="${c.muted}">no language data yet</text>`;

  return panel({
    h: H,
    command: 'git log --stat --since="1 year ago"',
    meta: scope,
    label: `${rows.map(([k, v]) => `${k}: ${v}`).join(', ')}. Languages: ${langs.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(', ')}`,
    style: `.row { opacity: 0; animation: in .4s ease-out forwards; }
    @keyframes in { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .row { animation: none; opacity: 1; } }`,
    body: `${stats}
  <line x1="430" y1="62" x2="430" y2="${H - 22}" stroke="#1f2a24"/>
  ${languages}`,
  });
}
