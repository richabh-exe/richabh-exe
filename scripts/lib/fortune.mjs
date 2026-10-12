// `fortune | cowsay`, re-implemented in ~60 lines. A quote and a speaker are picked
// from the day number, so the README changes once a day and is stable within a day.

const QUOTES = [
  ['There are only two hard things in Computer Science: cache invalidation and naming things.', 'Phil Karlton'],
  ['Talk is cheap. Show me the code.', 'Linus Torvalds'],
  ['Programs must be written for people to read, and only incidentally for machines to execute.', 'Harold Abelson'],
  ['Simplicity is prerequisite for reliability.', 'Edsger W. Dijkstra'],
  ['Premature optimization is the root of all evil.', 'Donald Knuth'],
  ['Any sufficiently advanced technology is indistinguishable from magic.', 'Arthur C. Clarke'],
  ['Make it work, make it right, make it fast.', 'Kent Beck'],
  ['The best way to predict the future is to invent it.', 'Alan Kay'],
  ['Debugging is twice as hard as writing the code in the first place.', 'Brian Kernighan'],
  ['Good design is as little design as possible.', 'Dieter Rams'],
  ['Design is not just what it looks like and feels like. Design is how it works.', 'Steve Jobs'],
  ['The function of good software is to make the complex appear to be simple.', 'Grady Booch'],
  ['Deleted code is debugged code.', 'Jeff Sickel'],
  ['To iterate is human, to recurse divine.', 'L. Peter Deutsch'],
  ['It always takes longer than you expect, even when you take into account Hofstadter\'s Law.', 'Douglas Hofstadter'],
  ['Walking on water and developing software from a specification are easy if both are frozen.', 'Edward V. Berard'],
  ['A user interface is like a joke. If you have to explain it, it\'s not that good.', 'Martin LeBlanc'],
  ['Have you tried turning it off and on again?', 'The IT Crowd'],
  ['There\'s no place like 127.0.0.1', 'every sysadmin, ever'],
  ['It works on my machine.', 'every developer, ever'],
  ['Weeks of coding can save you hours of planning.', 'unknown, but painfully true'],
  ['A prompt is just a function signature written in English.', 'a tinkerer\'s notebook'],
  ['Pixels are cheap. Attention is not.', 'a tinkerer\'s notebook'],
  ['Ship it, then make it pretty. Or make it pretty, then ship it. Just ship it.', 'a tinkerer\'s notebook'],
  ['The agent did exactly what I asked. That was the bug.', 'a tinkerer\'s notebook'],
  ['// TODO: write a better fortune', 'git blame says: me'],
];

const SPEAKERS = [
  // the classic cow
  `        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`,
  // tux
  `        \\
         \\   .--.
            |o_o |
            |:_/ |
           //   \\ \\
          (|     | )
         /'\\_   _/\`\\
         \\___)=(___/`,
  // unit R-1, the build bot from the terminal above
  `        \\
         \\    .-[ ]-.
             | o   o |
             |  ___  |
             '-------'
              /|   |\\`,
];

/** Greedy word wrap to `max` columns. */
function wrap(text, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > max) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws the speech bubble exactly like cowsay does. */
function bubble(lines) {
  const w = Math.max(...lines.map((l) => l.length));
  const pad = (l) => l.padEnd(w);
  const body =
    lines.length === 1
      ? [`< ${pad(lines[0])} >`]
      : lines.map((l, i) => {
          const [a, b] = i === 0 ? ['/', '\\'] : i === lines.length - 1 ? ['\\', '/'] : ['|', '|'];
          return `${a} ${pad(l)} ${b}`;
        });
  return [` ${'_'.repeat(w + 2)}`, ...body, ` ${'-'.repeat(w + 2)}`].join('\n');
}

export function fortune(date = new Date()) {
  const day = Math.floor(date.getTime() / 86_400_000);
  const [quote, author] = QUOTES[day % QUOTES.length];
  const speaker = SPEAKERS[day % SPEAKERS.length];
  const lines = wrap(quote, 44);
  lines.push(`  — ${author}`);
  return `${bubble(lines)}\n${speaker}`;
}
