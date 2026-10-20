import { P, cat, line, arc, resample, padStart, wrapBar, mirrorX, reverse } from './_lib.js';

// Girth hitch with a sling on a horizontal bar (a branch). ONE flat strand is
// the sling: leg 1 comes up from off screen bottom, round the bar, down the
// front as arm 1, round the U, up arm 2, round the bar and down as leg 2. The
// knot is symmetric about x = 50, so every pose is built as HALF a strand (leg
// end to the middle of the U) and mirrored. Segments of the half, fixed counts:
//   LEG    standing part, from the bottom up to the bar's lower edge      8
//   BACK   under the bar, up behind it, over the top                      7
//   FRONT  the arm, down the front of the bar to its lower edge           7
//   UH     half of the U, from the arm's foot to the middle               7
// Seen from this side the finished knot shows the two arms over the bar and
// the standing parts coming out over the lower edge of the U.
// Passing the standing parts through the U needs the far end of the sling,
// which is off screen: the U is lowered past it, the parts swing forward, and
// the U comes back up behind them.
const cy = 36, r = 10, W = 6, R = r + W / 2; // bar centre, bar radius, sling width, wrap radius
const bar = { type: 'bar', x1: -12, y1: cy, x2: 112, y2: cy, r };
const xL = 46.5, xA = 39.5, xO = 33; // leg, arm (snug), arm (U opened)
const yE = cy + R; // lower edge of the wrap
const nL = 8, nU = 7;
const HALF = 262;
const pose = (...segs) => {
  const h = padStart(cat(...segs), HALF, [0, 1]);
  return cat(h, reverse(mirrorX(h)).slice(1));
};
// the U laid straight up: its top, from the leg at y up to the middle
const cap = (y, z) => arc(50, y, 50 - xL, 180, 270, nU, z);
// the U hanging from the arms' feet: a quarter ellipse down to the middle, z from z0 to z1
const hang = (xa, depth, z0, z1) => Array.from({ length: nU }, (_, i) => {
  const t = (i / (nU - 1)) * Math.PI / 2;
  return P(50 - (50 - xa) * Math.cos(t), yE + depth * Math.sin(t), z0 + (z1 - z0) * Math.sin(t));
});
const back = (xa) => wrapBar(cy, R, xL, xa, 0, 0.5, 12, -1);   // bottom edge, behind, top
// top, front, bottom edge; the lower half kept well in front so it never grazes the bar at its own depth
const front = (xa) => wrapBar(cy, R, xa, xa, 180, 0.5, 12, -1).map((p) => (p[1] > cy ? [p[0], p[1], Math.max(p[2], 0.45)] : p));

// 0: the sling folded into a U, held under the bar
const p0 = pose(line(P(xL, 96, 0), P(xL, 84, 0), nL), line(P(xL, 84, 0), P(xL, 74, 0), 7), line(P(xL, 74, 0), P(xL, 64, 0), 7), cap(64, 0));
// 1a: U dropped behind, just under the bar
const p1a = pose(resample([P(xL, 96, 0), P(xL, 82, 0), P(xL, 70, -1)], nL), line(P(xL, 70, -1), P(xL, 64, -1), 7), line(P(xL, 64, -1), P(xL, 59, -1), 7), cap(59, -1));
// 1b: pushed up behind the bar, U above it
const p1b = pose(resample([P(xL, 96, 0), P(xL, 76, 0), P(xL, 54, -1)], nL), line(P(xL, 54, -1), P(xL, 34, -1), 7), line(P(xL, 34, -1), P(xL, 21, -1), 7), cap(21, -1));
// 1c: over the top, the U standing up and leaning toward you
const LEGb = resample([P(xL, 96, 0), P(xL, 78, -0.6), P(xL, 60, -0.8), P(xL, yE, 0)], nL);
const p1c = pose(LEGb, back(xA), resample([P(xA, cy - R, 0), P(38.5, 17, 0.7), P(39, 14, 1)], 7),
  resample([P(39, 14, 1), P(41, 10, 1), P(45, 8.5, 1), P(50, 8, 1)], nU));
// 1: down the front, the U hanging over the standing parts
const p1 = pose(LEGb, back(xA), front(xA), hang(xA, 16, 0.45, 1));
// 2a: U opened wide and lowered past the far end of the sling (off screen)
const p2a = pose(LEGb, back(xO), front(xO), resample([P(xO, yE, 0.45), P(xO, 90, 1), P(xO, 135, 1), P(38, 150, 1), P(50, 154, 1)], nU));
// 2b: both standing parts swung forward through the open U
const LEGf = resample([P(xL, 96, 1), P(xL, 78, 1), P(xL, 60, 1), P(xL, yE, 0)], nL);
const p2b = pose(LEGf, back(xO), front(xO), resample([P(xO, yE, 0.45), P(xO, 90, 1), P(xO, 135, 1), P(38, 150, 1), P(50, 154, 1)], nU));
// 2: U lifted back up, now behind the standing parts
const p2 = pose(LEGf, back(xO), front(xO), hang(xO, 21, 0.45, -0.8));
// 3: pulled down: the U closes up under the bar round both parts
const p3 = pose(resample([P(xL, 96, 1), P(xL, 78, 1), P(xL, 56, 1), P(xL, yE, 0)], nL), back(xA), front(xA),
  hang(xA, 10.5, 0.45, -0.7));

export default {
  id: 'girth-hitch',
  name: 'Girth Hitch',
  aka: ["Lark's head", 'Cow hitch', 'Strap hitch'],
  category: 'hitches',
  abok: [1673],
  difficulty: 1,
  summary: 'A bight of sling or doubled rope choked round a branch, a bar or a harness. The quickest way to fix a sling to something.',
  uses: [
    'Anchor a sewn sling round a tree trunk or a rock horn so it cannot slide up or off.',
    'Hang a pack or a food bag from a branch with a loop of webbing.',
    'Fix a sling or a personal anchor to the tie-in points of a harness.',
    'Attach a lanyard, a key cord or a luggage tag to a ring or a strap.',
  ],
  pros: ['Ties in seconds in a sling that has no free ends.', 'Chokes down on a trunk or a strap and holds its place under a steady downward pull.', 'Easy to undo: open the U and pull the sling back out.'],
  cons: ['Weakens a sling, more so round a thin bar or another sling.', 'Can slide along a smooth bar when the pull comes from the side.'],
  warnings: [
    'A girth hitch round a thin bar or a carabiner bends the sling sharply and weakens it. For a tree anchor, a basket hitch, with the sling simply passed round and both loops clipped, is stronger.',
    'Two slings girth hitched to each other are weaker than either sling alone. Join them with a carabiner instead.',
  ],
  check: 'The two standing parts pass together through the U and come out side by side, flat. From one side you see two parallel strands over the bar; from the other, the U lies across both standing parts as a single collar. If the standing parts leave on opposite sides of the bar, they never went through the U and the sling will pull straight off.',
  tips: ['Dress the strands flat and side by side before you load it. A twisted girth hitch is weaker.', 'On a harness, thread the sling through both tie-in points, the same path the rope takes.'],
  related: ['prusik', 'klemheist', 'clove-hitch', 'two-half-hitches', 'timber-hitch', 'daisy-chain'],
  ropeWidth: W,
  view: { x: 13, y: 3, w: 74, h: 74 },
  props: [bar],
  strands: [{ id: 'a', color: 'red', end: 'none', flat: true, width: W }],
  steps: [
    { title: 'Fold a bight', text: 'Fold the sling so it makes a U and hold the U under the bar. The two standing parts hang down to the load.', pose: p0,
      labels: [{ text: 'bight', at: [56, 58], anchor: 'left' }, { text: 'standing parts', at: [58, 72], anchor: 'left' }, { text: 'bar', at: [86, 28], anchor: 'right' }] },
    { title: 'Behind and over', text: 'Push the U up behind the bar, over the top and down the front. Spread its two sides apart on the front of the bar.', frames: [p1a, p1b, p1c, p1], dur: [0.6, 0.9, 0.8, 0.9],
      labels: [{ text: 'U in front', at: [65, 58], anchor: 'left' }] },
    { title: 'Through the U', text: 'Open the U wide and pass the far end of the sling, both standing parts together, through it from behind. They now lie in front of its lower edge.', frames: [p2a, p2b, p2], dur: [1.0, 0.7, 1.0],
      labels: [{ text: 'through', at: [71, 62], anchor: 'left' }] },
    { title: 'Pull down to choke', text: 'Pull both standing parts down. The U slides up behind them and closes snug under the bar, the two strands side by side.', frames: [p3], dur: 1.3,
      labels: [{ text: 'U', at: [35, 60], anchor: 'right' }] },
  ],
};
