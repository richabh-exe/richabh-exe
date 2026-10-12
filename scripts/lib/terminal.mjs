// Renders assets/terminal.svg: a CRT monitor that powers on, runs a systemd-style
// boot log, clears, types `neofetch`, prints a live system card, then waits at a
// blinking prompt. Pure SVG + CSS/SMIL, so it animates inside GitHub's <img> sandbox.

import { color as c, grid, font, esc, width } from './theme.mjs';

const W = 860;
const H = 540;
const SCREEN = { x: 22, y: 50, w: 816, h: 448 };
const X0 = 46; // left margin of the text grid
const PROMPT = 'richabh@github:~$';

/* ---------- small builders ---------- */

const at = (delay) => `style="animation-delay:${delay}s"`;

/** A prompt: `richabh@github:~$`, colour-split, width pinned to the grid. */
// Kept on one line on purpose: with white-space:pre, indentation inside <text>
// would count toward textLength and squash the prompt.
const prompt = (x, y) =>
  `<text x="${x}" y="${y}" textLength="${width(PROMPT)}" lengthAdjust="spacingAndGlyphs">` +
  `<tspan fill="${c.green}">richabh@github</tspan><tspan fill="${c.ink}">:</tspan>` +
  `<tspan fill="${c.cyan}">~</tspan><tspan fill="${c.ink}">$</tspan></text>`;

/** Shell-style colouring: anything after `#` is a dim comment. */
const colorize = (cmd) => {
  const [code, ...rest] = cmd.split('#');
  return rest.length ? `${esc(code)}<tspan fill="${c.muted}">#${esc(rest.join('#'))}</tspan>` : esc(cmd);
};

/**
 * Types `cmd` after a prompt using a clip rect whose width steps one cell at a
 * time (SMIL, calcMode=discrete), with a caret riding the edge.
 */
function typed({ id, y, cmd, start, speed = 0.09, caretUntil = null }) {
  const x = +(X0 + width(PROMPT) + grid.cw).toFixed(1);
  const n = [...cmd].length;
  const steps = Array.from({ length: n + 1 }, (_, i) => (i * grid.cw).toFixed(1));
  const keyTimes = steps.map((_, i) => (i / n).toFixed(4)).join(';');
  const dur = (n * speed).toFixed(2);
  const hide = caretUntil ? `<set attributeName="opacity" to="0" begin="${caretUntil}s" fill="freeze"/>` : '';
  return `
  <clipPath id="${id}"><rect x="${x}" y="${y - 15}" width="0" height="20">
    <animate attributeName="width" values="${steps.join(';')}" keyTimes="${keyTimes}" calcMode="discrete" begin="${start}s" dur="${dur}s" fill="freeze"/>
  </rect></clipPath>
  <text x="${x}" y="${y}" fill="${c.ink}" clip-path="url(#${id})" textLength="${width(cmd)}" lengthAdjust="spacingAndGlyphs">${colorize(cmd)}</text>
  <rect class="caret" x="${x}" y="${y - 13}" width="${grid.cw}" height="16" fill="${c.green}">
    <animate attributeName="x" values="${steps.map((s) => (x + Number(s)).toFixed(1)).join(';')}" keyTimes="${keyTimes}" calcMode="discrete" begin="${start}s" dur="${dur}s" fill="freeze"/>
    <animate attributeName="opacity" values="1;0" calcMode="discrete" dur="1s" repeatCount="indefinite"/>
    ${hide}
  </rect>`;
}

/* ---------- phase 1: boot log ---------- */

const BOOT = [
  ['OK', 'Reached target Caffeine.'],
  ['OK', 'Mounted /dev/imagination.'],
  ['OK', 'Started Pixel-Perfect Renderer (design.service).'],
  ['OK', 'Started Neural Co-Pilot Bridge (claude.service).'],
  ['OK', 'Loaded MCP servers: github, figma, vercel, supabase.'],
  ['WARN', 'Coffee level below threshold. Brewing a fresh pot...'],
  ['OK', 'Started Curiosity Engine.'],
  ['OK', 'Reached target Ship It.'],
];

function bootLog() {
  let t = 0.45;
  const lines = BOOT.map(([status, msg], i) => {
    const y = 112 + i * 22;
    const tone = status === 'OK' ? c.green : c.amber;
    const tag = status === 'OK' ? '  OK  ' : ' WARN ';
    const line = `
    <g class="in" ${at(t.toFixed(2))}>
      <text x="${X0}" y="${y}" textLength="${width('[' + tag + ']')}" lengthAdjust="spacingAndGlyphs"><tspan fill="${c.ink}">[</tspan><tspan fill="${tone}" font-weight="700">${tag.replace(/ /g, '&#160;')}</tspan><tspan fill="${c.ink}">]</tspan></text>
      <text x="${X0 + 10 * grid.cw}" y="${y}" fill="${status === 'OK' ? c.ink : c.amber}">${esc(msg)}</text>
    </g>`;
    t += status === 'WARN' ? 0.55 : 0.26;
    return line;
  }).join('');

  return `
  <g class="boot">
    <text class="in" ${at(0.15)} x="${X0}" y="82" fill="${c.muted}">PHOSPHOR BIOS v4.2.0 · booting richabh-OS (kernel 6.9.0-curiosity)</text>
    ${lines}
    <g class="in" ${at(0.2)}>
      <text x="${X0}" y="470" fill="${c.muted}" font-size="12">loading richabh-OS</text>
      <rect x="${X0 + 150}" y="461" width="420" height="10" rx="2" fill="none" stroke="${c.greenFaint}"/>
      <rect class="bar" x="${X0 + 152}" y="463" width="416" height="6" rx="1" fill="${c.green}"/>
    </g>
  </g>`;
}

/* ---------- phase 2: neofetch ---------- */

// 15×15 LED-matrix mascot. # body · o eyes (blink) · a antenna (pulse) · m mouth
const ROBOT = [
  '......aaa......',
  '.......#.......',
  '..###########..',
  '.#...........#.',
  '.#..oo...oo..#.',
  '##..oo...oo..##',
  '##...........##',
  '.#..m.....m..#.',
  '.#...mmmmm...#.',
  '.#...........#.',
  '..###########..',
  '......###......',
  '..###########..',
  '.#.#.#.#.#.#.#.',
  '.#############.',
];

function robot(ox, oy, cell = 10) {
  const px = { '#': [], o: [], a: [], m: [] };
  ROBOT.forEach((row, r) =>
    [...row].forEach((ch, col) => {
      if (px[ch]) px[ch].push(`<rect x="${ox + col * cell}" y="${oy + r * cell}" width="${cell - 1}" height="${cell - 1}" rx="1.5"/>`);
    }),
  );
  return `
  <g fill="${c.green}">${px['#'].join('')}</g>
  <g fill="${c.greenDim}">${px.m.join('')}</g>
  <g class="eyes" fill="${c.ink}">${px.o.join('')}</g>
  <g class="antenna" fill="${c.amber}">${px.a.join('')}</g>`;
}

function neofetch(data, start) {
  const IX = 262; // info column
  const VX = IX + 10 * grid.cw; // value column
  const rows = [
    ['OS', `richabh-OS ${data.version} "Phosphor" x86_64`],
    ['Host', `${data.location} · Earth (Sol III)`],
    ['Kernel', 'curiosity-6.9.0-lts'],
    ['Uptime', `${data.uptime} on GitHub`],
    ['Packages', `${data.repos} (gh) · 1337 (node_modules)`],
    ['Shell', 'zsh 5.9 + coffee.sh'],
    ['Role', 'Builder · AI Tinkerer · Pixel Pusher'],
    ['Stack', 'TypeScript · React · Next.js · Node · Tailwind'],
    ['AI', 'Claude · MCP · Agents · Automations'],
    ['Editor', 'VS Code (vim keys, obviously)'],
    ['Memory', '87 browser tabs / 16384 MiB'],
    ['Booted', data.booted],
  ];

  const info = rows
    .map(([k, v], i) => {
      const y = 166 + i * 20;
      return `
    <g class="in" ${at((start + 0.25 + i * 0.07).toFixed(2))}>
      <text x="${IX}" y="${y}" fill="${c.amber}" font-weight="700">${k}:</text>
      <text x="${VX}" y="${y}" fill="${c.ink}">${esc(v)}</text>
    </g>`;
    })
    .join('');

  const swatches = ['#0d1117', c.red, c.lime, c.yellow, c.cyan, '#c678dd', c.green, c.ink]
    .map((fill, i) => `<rect x="${IX + i * 28}" y="414" width="24" height="12" rx="2" fill="${fill}" stroke="${c.greenFaint}"/>`)
    .join('');

  const tail = start + 0.25 + rows.length * 0.07;
  return `
  <g class="in" ${at(start.toFixed(2))}>
    ${robot(64, 176)}
    <text x="139" y="350" fill="${c.muted}" font-size="11" text-anchor="middle">[ unit R-1 · build bot ]</text>
  </g>
  <g class="in" ${at((start + 0.1).toFixed(2))}>
    <text x="${IX}" y="124" font-weight="700"><tspan fill="${c.green}">richabh</tspan><tspan fill="${c.ink}">@</tspan><tspan fill="${c.green}">github</tspan></text>
    <text x="${IX}" y="142" fill="${c.greenDim}" textLength="${width('──────────────')}" lengthAdjust="spacingAndGlyphs">──────────────</text>
  </g>
  ${info}
  <g class="in" ${at((tail + 0.1).toFixed(2))}>${swatches}</g>`;
}

/* ---------- CRT chrome & effects ---------- */

const defs = `
  <defs>
    <linearGradient id="bezel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b2229"/><stop offset="1" stop-color="${c.bezel}"/>
    </linearGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/>
    </radialGradient>
    <radialGradient id="bloom" cx="45%" cy="40%" r="60%">
      <stop offset="0" stop-color="${c.green}" stop-opacity="0.07"/><stop offset="1" stop-color="${c.green}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.green}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${c.green}" stop-opacity="0.06"/>
      <stop offset="1" stop-color="${c.green}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.06"/><stop offset="0.35" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <pattern id="scan" width="4" height="3" patternUnits="userSpaceOnUse">
      <rect width="4" height="1" fill="#000" opacity="0.45"/>
    </pattern>
    <filter id="glow" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="1.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="screen"><rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="10"/></clipPath>
  </defs>`;

const style = (sessionAt) => `
  <style>
    text { font-family: ${font}; font-size: ${grid.size}px; white-space: pre; }
    .in   { opacity: 0; animation: on .01s forwards; }
    .boot { animation: off .01s ${sessionAt - 0.15}s forwards; }
    .bar  { transform-box: fill-box; transform-origin: left; transform: scaleX(0); animation: fill 2.9s cubic-bezier(.6,.05,.3,1) .25s forwards; }
    .power{ transform-box: fill-box; transform-origin: center; animation: power .55s ease-out forwards; }
    .band { animation: sweep 7s linear infinite; }
    .eyes { transform-box: fill-box; transform-origin: center; animation: blink 4.2s infinite; }
    .antenna { animation: pulse 1.6s ease-in-out infinite; }
    .flicker { animation: flicker 6s steps(1) infinite; }
    .led  { animation: pulse 2.4s ease-in-out infinite; }
    /* constant keyframes: the value holds for the whole active + fill period,
       immune to the float rounding that can leave steps(1) on its start value */
    @keyframes on    { from, to { opacity: 1; } }
    @keyframes off   { from, to { opacity: 0; } }
    @keyframes fill  { to { transform: scaleX(1); } }
    @keyframes power { 0% { transform: scale(1,.004); opacity: 1; } 45% { transform: scale(1,.004); opacity: 1; } 100% { transform: scale(1,1); opacity: 0; } }
    @keyframes sweep { from { transform: translateY(-120px); } to { transform: translateY(${SCREEN.h + 120}px); } }
    @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(.1); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
    @keyframes flicker { 0%, 100% { opacity: 1; } 31% { opacity: .96; } 32% { opacity: 1; } 77% { opacity: .97; } 78% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .in { animation-duration: 0s; animation-delay: 0s !important; }
      .band, .flicker, .eyes, .antenna, .led { animation: none; }
    }
  </style>`;

/* ---------- compose ---------- */

export function renderTerminal(data) {
  const SESSION = 3.9; // boot log clears, interactive session begins
  const RUN = SESSION + 0.5; // start typing `neofetch`
  const OUT = RUN + 0.75 + 0.35; // output after <Enter>
  const IDLE = OUT + 1.6; // final prompt

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
  <title id="t">richabh-OS: a CRT terminal booting up</title>
  <desc id="d">A retro terminal boots, runs neofetch and shows Rishabh's profile: builder, AI tinkerer, TypeScript and React developer from ${esc(data.location)}.</desc>
  ${defs}
  ${style(SESSION)}

  <!-- monitor -->
  <rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="18" fill="url(#bezel)" stroke="${c.bezelEdge}"/>
  <circle cx="34" cy="29" r="6" fill="${c.red}"/><circle cx="54" cy="29" r="6" fill="${c.yellow}"/><circle cx="74" cy="29" r="6" fill="${c.lime}"/>
  <text x="${W / 2}" y="33" fill="${c.muted}" font-size="12" text-anchor="middle">richabh@github: ~ — zsh — 96×24</text>

  <!-- screen -->
  <g clip-path="url(#screen)">
    <rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" fill="${c.screen}"/>
    <rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" fill="url(#bloom)"/>

    <g class="flicker" filter="url(#glow)">
      ${bootLog()}

      <g class="in" ${at(SESSION)}>${prompt(X0, 82)}</g>
      <g class="in" ${at(SESSION)}>${typed({ id: 'cmd1', y: 82, cmd: 'neofetch', start: RUN, caretUntil: OUT - 0.2 })}</g>

      ${neofetch(data, OUT)}

      <g class="in" ${at(IDLE.toFixed(2))}>${prompt(X0, 468)}</g>
      <g class="in" ${at(IDLE.toFixed(2))}>${typed({ id: 'cmd2', y: 468, cmd: 'man richabh   # scroll ↓', start: IDLE + 0.9, speed: 0.07 })}</g>
    </g>

    <!-- glass -->
    <rect class="band" x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="120" fill="url(#band)"/>
    <rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" fill="url(#scan)" opacity="0.55"/>
    <rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" fill="url(#vignette)"/>
    <rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" fill="url(#glass)"/>
    <rect class="power" x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" fill="${c.ink}"/>
  </g>

  <!-- chin -->
  <text x="34" y="${H - 18}" fill="#56616b" font-size="11" letter-spacing="3">PHOSPHOR · P1-860</text>
  <circle class="led" cx="${W - 36}" cy="${H - 22}" r="4" fill="${c.green}" filter="url(#glow)"/>
</svg>
`;
}
