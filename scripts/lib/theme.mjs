// Single source of truth for the phosphor palette and terminal grid.
// Every SVG and every third-party card URL in the README derives from these.

export const color = {
  bezel: '#11161b',
  bezelEdge: '#2a333c',
  screen: '#060a07',
  green: '#4dff9a',
  greenDim: '#2c8f58',
  greenFaint: '#16402a',
  ink: '#d4ffe6',
  amber: '#ffb547',
  cyan: '#5ee7ff',
  red: '#ff5f56',
  yellow: '#ffbd2e',
  lime: '#27c93f',
  muted: '#6b8f7a',
};

// A monospace grid. Text that must line up is pinned with textLength,
// so the layout holds no matter which fallback font the viewer has.
export const grid = { size: 14, cw: 8.4, lh: 20 };

export const font = `'JetBrains Mono','Fira Code','SFMono-Regular',Menlo,Consolas,'DejaVu Sans Mono',monospace`;

/** Escape text for safe inclusion inside SVG/XML. */
export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Monospace width of a string on the grid (code points, not UTF-16 units). */
export const width = (s, cw = grid.cw) => [...s].length * cw;
