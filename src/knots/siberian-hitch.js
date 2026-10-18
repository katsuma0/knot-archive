import { P, cat, line, arc, resample, padStart, wrapPost, partial, extend } from './_lib.js';

// Siberian (Evenk) hitch round a tree on the left. The standing part comes in
// from the right, goes round behind the tree and the working end comes back
// round the front, below the standing part. The end then makes a loop ROUND
// the standing part: up UNDER it, over the top, down OVER it and over its own
// first strand. A bight of the tail goes up from behind through that loop,
// under the bottom edge, over the standing part and out over the top. So the
// knot is a slipped overhand in the end with the standing part through its loop.
// Segments (fixed point counts), in rope order:
//   S     standing part, off screen right to the tree's right edge
//   TURN  one turn round the tree: behind, left edge, front, right edge
//   W1    from the tree to the right, the bottom edge of the loop
//   LOOP  up the right side under S, across the top, down the left side over S and W1
//   U, LEG1, TIP, LEG2, END   the tail: a U, then the bight, then the free end
const post = { type: 'post', x: 20, y1: -12, y2: 112, r: 11 };
const R = 13, ys = 40, LEN = 470;
const nS = 6, nTurn = 14, nW = 10, nL = 14, nU = 6, nLg = 8, nTip = 7, nEnd = 6;
const zs = (pts, f) => pts.map((p) => [p[0], p[1], f(p)]);
const pose = (...segs) => padStart(cat(...segs), LEN, [1, 0]);

const S = line(P(108, ys, 0), P(33, ys, 0), nS);
const S0 = line(P(108, ys, 0), P(50, ys, 0), nS);
const TURN = wrapPost(20, R, ys, ys + 14, 0, 1, 13, -1);

// The knot for a given size. o: xl left side, xa xb bight legs, xr right side,
// yt top, yb bottom edge (W1), end: where the tail end points.
const LOOSE = { xl: 42, xa: 51, xb: 57, xr: 66, yt: 24, yb: 56.5, end: [64, 86] };
const TIGHT = { xl: 38, xa: 47, xb: 52.5, xr: 59.5, yt: 31, yb: 55, end: [58, 84] };
const W1of = (o) => resample([P(33, ys + 14, 0), P(36, o.yb - 0.6, -0.6), P(o.xl, o.yb, -1), P((o.xl + o.xa) / 2, o.yb + 0.3, 0.2),
  P(o.xa, o.yb + 0.3, 1), P(o.xb, o.yb + 0.3, 1), P(o.xr - 4, o.yb - 0.6, 0.2), P(o.xr - 0.6, o.yb - 4, -0.6), P(o.xr, o.yb - 8, -1)], nW);
const LOOPof = (o) => resample([P(o.xr, o.yb - 8, -1), P(o.xr, ys, -1), P(o.xr - 1, (ys + o.yt) / 2, -0.8), P(o.xr - 4.5, o.yt + 1, -0.6),
  P(o.xb, o.yt, -0.6), P(o.xa, o.yt, -0.6), P(o.xl + 3, o.yt + 1.8, 0.3), P(o.xl + 0.4, (ys + o.yt) / 2, 0.9), P(o.xl, ys, 1),
  P(o.xl, (ys + o.yb) / 2, 1), P(o.xl, o.yb, 1), P(o.xl + 0.5, o.yb + 4.5, 0.6)], nL);
const Uof = (o) => resample([P(o.xl + 0.5, o.yb + 4.5, 0.6), P(o.xl - 0.2, o.yb + 9, 0.2), P(o.xl + 1.8, o.yb + 12.6, -0.3),
  P((o.xl + o.xa) / 2 + 0.5, o.yb + 13.4, -0.7), P(o.xa - 1, o.yb + 11.5, -1), P(o.xa, o.yb + 7, -1)], nU);
// z of a bight leg pushed through: behind at the bottom edge, in front from S up.
const zThrough = (o) => (y) => (y >= o.yb - 1 ? -1 : y <= o.yb - 9 ? 1 : -1 + (2 * (o.yb - 1 - y)) / 8);
const zBehind = () => -1;
const vline = (x, y0, y1, n, zf) => Array.from({ length: n }, (_, i) => { const y = y0 + ((y1 - y0) * i) / (n - 1); return P(x, y, zf(y)); });
// tail with the bight tip at height T
const TAILof = (o, T, zf) => {
  const r = (o.xb - o.xa) / 2, cy = T + r;
  return cat(Uof(o), vline(o.xa, o.yb + 7, cy, nLg, zf), arc(o.xa + r, cy, r, 180, 360, nTip, zf(cy)),
    vline(o.xb, cy, o.yb + 7, nLg, zf),
    resample([P(o.xb, o.yb + 7, -1), P(o.xb + 1, o.yb + 11.5, -0.6), P(o.xb + 3, o.yb + 17, 0), P(...o.end, 0)], nEnd));
};
const knot = (o, T, zf) => [W1of(o), LOOPof(o), TAILof(o, T, zf)];
const W1 = W1of(LOOSE), LOOP = LOOPof(LOOSE);

// unlaid segments: short straight stubs carrying on from the tip
const stubs = (prev, toward, ...spec) => spec.map(([len, n]) => (prev = extend(prev, len, n, toward)));
const nTail = nU + 2 * nLg + nTip + nEnd;

// 0: rope from the right, end held near the tree
const T0 = resample([P(50, ys, 0), P(44.5, ys + 1.5, 0), P(41, ys + 5, 0), P(39.5, ys + 10, 0)], nTurn);
const p0 = pose(S0, T0, ...stubs(T0, null, [1, nW], [1, nL], [2, nTail]));
// 1a: end dropped behind, 1b: behind the tree, end hanging out on the left
const T1a = zs(T0, (p) => (p[0] < 49 ? -1 : 0));
const p1a = pose(S0, T1a, ...stubs(T1a, null, [1, nW], [1, nL], [2, nTail]));
// first k points of the turn laid exactly; the rest of the turn hangs straight on
const turnTo = (k, toward, len, z) => { const a = TURN.slice(0, k); return cat(a, zs(extend(a, len, nTurn - k + 1, toward).slice(1), () => z)); };
const T1b = zs(turnTo(7, [-4, 56], 6, -1), (p) => (p[0] < 33 ? Math.min(p[2], -0.6) : p[2]));
const hang = (t, z) => stubs(t, [-4, 62], [3, nW], [3, nL], [4, nTail]).map((s) => zs(s, () => z));
const p1b = pose(S, T1b, ...hang(T1b, -1));
const T1c = T1b.map((p, i) => (i >= 7 ? [p[0], p[1], 1] : p));
const p1c = pose(S, T1c, ...hang(T1c, 1));
// 1d: round the front; 1: out to the right below the standing part
const T1d = turnTo(11, [44, 56], 5, 1);
const p1d = pose(S, T1d, ...stubs(T1d, [44, 56], [3, nW], [3, nL], [5, nTail]).map((s) => zs(s, () => 1)));
const W1flat = resample([P(33, ys + 14, 0), P(48, ys + 16, 0), P(66, ys + 16.5, 0)], nW);
const p1 = pose(S, TURN, W1flat, ...stubs(W1flat, [90, 57], [6, nL], [10, nTail]));
// 2a: end turned up toward the standing part, dropped behind; 2: up under it and over the top
const p2a = pose(S, TURN, W1, ...stubs(W1, [66, 30], [3, nL], [4, nTail]).map((s) => zs(s, () => -1)));
const L2 = partial(LOOP, 0.5, nL, null, 0);
const p2 = pose(S, TURN, W1, L2, zs(extend(L2, 9, nTail), (p) => (p[0] < 48 ? 1 : -0.6)));
// 3: down over the standing part and over W1, tail hanging
const L3 = partial(LOOP, 0.8, nL, null, 0);
const p3a = pose(S, TURN, W1, L3, zs(extend(L3, 10, nTail, [40, 30]), () => 1));
const p3 = pose(S, TURN, W1, LOOP, cat(resample([P(42.5, 61, 0.6), P(42.6, 66, 0.2), P(44.8, 70.5, -0.2), P(49, 72.5, -0.4)], nU),
  resample([P(49, 72.5, -0.4), P(55, 75, -0.6), P(60.5, 79.5, -0.6), P(64, 86, -0.4)], nTail - nU)));
// 4: bight formed behind, pushed up under the bottom edge, then over S and the top
const p4a = pose(S, TURN, W1, LOOP, TAILof(LOOSE, LOOSE.yb + 1.5, zBehind));
const p4b = pose(S, TURN, W1, LOOP, TAILof(LOOSE, 46, zThrough(LOOSE)));
const p4 = pose(S, TURN, ...knot(LOOSE, 12, zThrough(LOOSE)));
// 5: standing part pulled, the knot closes and slides to the tree
const p5 = pose(S, TURN, ...knot(TIGHT, 17, zThrough(TIGHT)));

export default {
  id: 'siberian-hitch',
  name: 'Siberian Hitch',
  aka: ['Evenk hitch'],
  category: 'hitches',
  difficulty: 2,
  summary: 'A quick-release hitch round a tree. The end makes a slipped overhand round the standing part, so one pull on the tail undoes it.',
  uses: [
    'Tie the first end of a tarp ridgeline to a tree, then tension the far end with a trucker\'s hitch.',
    'Tie off a hammock suspension line or a clothes line between two trees.',
    'Tie a canoe painter or a bear bag line to a tree or a dock post when you want it off again in a second.',
    'Any line you will take down in the cold: it ties and unties with gloves on.',
  ],
  pros: ['Ties in a few seconds once you know the hand movement, with gloves on.', 'Holds well under a steady pull.', 'Releases with one pull on the tail, even after a hard load.'],
  cons: ['Not adjustable once tied: it is a fixed hitch, not a tensioner.', 'The open bight can snag on brush or get pulled by accident.'],
  warnings: [
    'A tug on the tail releases it, so keep the tail where branches, kids and dogs cannot pull it.',
    'Not for climbing or for lifting people.',
    'If the load jerks hard, like a tarp in wind, leave a long bight and check it each morning.',
  ],
  check: 'The standing part runs straight through a loop of the end, and a bight of the tail comes out over the top of that loop. Pull the tail: the bight slides out and the whole hitch falls off the tree. If pulling the tail does nothing, you tucked the end instead of a bight.',
  tips: [
    'Leave the bight a hand long so it is easy to grab and does not pull out by itself.',
    'Pull the standing part, not the bight, to set it. The knot slides up snug against the tree.',
    'Pass the tail through the bight to lock it if the line will sit for days.',
  ],
  related: ['truckers-hitch', 'taut-line-hitch', 'slip-knot', 'two-half-hitches', 'highwaymans-hitch', 'timber-hitch'],
  ropeWidth: 4,
  view: { x: -6, y: 2, w: 96, h: 96 },
  props: [post],
  strands: [{ id: 'a', color: 'green', end: 'working' }],
  steps: [
    { title: 'Start', text: 'The standing part comes in from the right, from the far tree or the tarp. Hold the working end next to the tree.', pose: p0,
      labels: [{ text: 'standing part', at: [87, 34], anchor: 'right' }, { text: 'working end', at: [44, 58], anchor: 'left' }, { text: 'tree', at: [35, 14], anchor: 'left' }] },
    { title: 'Round the tree', text: 'Pass the working end round BEHIND the tree from right to left. Bring it round the front and out to the right, below the standing part.',
      frames: [p1a, p1b, p1c, p1d, p1], dur: [0.5, 1.0, 0.3, 0.8, 0.9] },
    { title: 'Up under the standing part', text: 'Turn the end up and pass it UNDER the standing part, then over the top toward the tree.',
      frames: [p2a, p2], dur: [0.8, 1.1], labels: [{ text: 'under', at: [72, 34], anchor: 'left' }] },
    { title: 'Back down over', text: 'Bring the end down OVER the standing part and over its own first strand. You now have a loop round the standing part.',
      frames: [p3a, p3], dur: [0.8, 1.0], labels: [{ text: 'over', at: [38.5, 33], anchor: 'right' }] },
    { title: 'Push a bight through', text: 'Fold a bight in the tail. Push it up from behind, under the bottom of the loop, then in front of the standing part and out over the top.',
      frames: [p4a, p4b, p4], dur: [1.0, 0.9, 1.0], labels: [{ text: 'bight', at: [61, 12], anchor: 'left' }] },
    { title: 'Pull the standing part', text: 'Hold the bight and pull the standing part to the right. The loop closes on the bight and the knot slides up to the tree. To release, pull the tail.',
      frames: [p5], dur: 1.4, labels: [{ text: 'pull to release', at: [62, 90], anchor: 'left' }] },
  ],
};
