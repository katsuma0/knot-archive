import { P, cat, line, resample, padStart, wrapPost, partial, extend, pathLength } from './_lib.js';

// Two half hitches round a post. The rope comes from the left at mid height,
// passes BEHIND the post, round its right side and back across the front, so
// the end comes out below the standing part heading left. Then two identical
// half hitches on the standing part: up behind it, over the top, down in
// front, and behind its own part. The second one sits to the left of the
// first. Finished: a clove hitch tied round the standing part, against the post.
//
// Segments (fixed point counts, same order in every pose):
//   S     standing part, off screen left to the back of the post       8
//   TURN  half a turn: behind the post, round the right side, to the front  9
//   A     across the front heading left, then up to the first hitch    7
//   H1    first half hitch: up behind S, over the top, down in front   9
//   D1    down in front of S, then behind A, hanging below             5
//   B     the connecting part: under A, left along below S, up to H2   9
//   H2    second half hitch, same shape as the first                   9
//   D2    down in front of S, then behind B                            5
//   TAIL  the free end, hanging down and left                          5
const post = { type: 'post', x: 50, y1: -12, y2: 112, r: 11 };
const R = 13; // post radius + half the rope width
const LEN = 300;
const nS = 8, nT = 9, nA = 7, nH = 9, nD = 5, nB = 9, nTail = 5;
const nRestAfterTurn = nA + nH + nD + nB + nH + nD + nTail; // 49
const SY = 42; // height of the standing part
const AY = 53; // height of the end after the turn

const pose = (...segs) => padStart(cat(...segs), LEN);

// Standing part: flat, dips behind as it reaches the post.
const S = resample([P(-16, SY, 0), P(20, SY, 0), P(30, SY, 0), P(34, SY, -0.5), P(38, SY, -1), P(50, SY, -1)], nS);
// Half a turn, angle 270 (behind) -> 360 (right edge) -> 450 (front). 16 per turn gives 9 points.
const TURN = wrapPost(50, R, SY, AY, 270, 0.5, 16, 1);

// A half hitch loop over the standing part: a half ellipse from the left leg
// (behind S) over the top to the right leg (in front of S). Legs meet S at
// right angles. rx is the half width, ry the height; the top's radius of
// curvature is rx*rx/ry, kept above half the rope width.
const arch = (xa, xb, ry) => {
  const m = (xa + xb) / 2, rx = (xb - xa) / 2;
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24, t = Math.PI * (1 + u);
    const z = u <= 0.3 ? -1 : u >= 0.7 ? 1 : -1 + 2 * (u - 0.3) / 0.4;
    pts.push(P(m + rx * Math.cos(t), SY + ry * Math.sin(t), z));
  }
  return resample(pts, nH);
};
// Down in front of S, then dropping behind the strand that lies at height AY (or near it), to yEnd.
const down = (x, yEnd, yBehind = AY) => resample([P(x, SY, 1), P(x, SY + 5.5, 1), P(x, yBehind - 1.5, -0.8), P(x, yBehind + 1, -1), P(x, yEnd, -1)], nD);

// ---- loose positions (while tying) and set positions (dressed) ----
const L = { x1: 24.5, x2: 35.5, x3: 3.5, x4: 14.5, ry: 12, dip: 60.5, by: 57, d1: 58 };
const T = { x1: 25.3, x2: 35.7, x3: 4.8, x4: 15.2, ry: 8.5, dip: 57.5, by: 55, d1: 56 };

const partsFor = (k) => {
  const A = resample([P(50, AY, 1), P(40, AY, 1), P(31, AY, 1), P(k.x1 + 2.5, 51, 0.3), P(k.x1 + 0.3, 47, -0.7), P(k.x1, SY, -1)], nA);
  const H1 = arch(k.x1, k.x2, k.ry);
  const D1 = down(k.x2, k.d1);
  const B = resample([P(k.x2, k.d1, -1), P(k.x2 - 3, k.dip, -0.6), P(26, k.dip, 0.3), P(19, k.by + 1.5, 0.9), P(k.x4, k.by, 1), P(9, k.by - 3.5, 0.9), P(k.x3 + 1.5, 48, -0.3), P(k.x3, SY, -1)], nB);
  const H2 = arch(k.x3, k.x4, k.ry);
  const D2 = down(k.x4, k.by + 4, k.by);
  return { A, H1, D1, B, H2, D2 };
};
const f = partsFor(L);
const g = partsFor(T);
const TAIL = resample([P(L.x4, L.by + 4, -1), P(L.x4 - 1.5, 67, -0.7), P(L.x4 - 4.5, 73, -0.3), P(L.x4 - 8.5, 78, 0)], nTail);
const TAIL_SET = resample([P(T.x4, T.by + 4, -1), P(T.x4 - 1.5, 66, -0.6), P(T.x4 - 5, 72.5, -0.2), P(T.x4 - 9.5, 78, 0)], nTail);

// 0: rope comes up to the post from the left, the end hangs short of the post
const p0 = pose(
  resample([P(-16, SY, 0), P(8, SY, 0), P(23, SY, 0)], nS),
  resample([P(23, SY, 0), P(26, 42.3, 0), P(28.3, 43.3, 0), P(30, 45, 0), P(31.1, 47.2, 0), P(31.6, 50, 0), P(31.6, 60, 0), P(31.6, 74, 0)], nT + nRestAfterTurn),
);

// 1: the end goes behind the post (left to right) and pokes out on the right
const inTurn = (frac, toward, len) => {
  const t = partial(TURN, frac, nT, toward);
  return pose(S, t, extend(t, len, nRestAfterTurn, toward));
};
const p1a = inTurn(0.35, [80, 80], 14); // behind the post, end coming out the right side, hanging down-right
const p1b = inTurn(0.5, [67, 95], 16);  // at the right edge, end hanging straight down beside the post
// 2: back across the front, heading left, below the standing part
const p1c = inTurn(0.88, [10, 56], 18);
const p1 = pose(S, TURN, line(P(50, AY, 1), P(29, AY, 1), nA, 1),
  resample([P(29, AY, 1), P(27.5, AY + 0.1, -0.5), P(26, AY + 0.2, -1), P(17, AY + 1.2, -1)], nH),
  resample([P(17, AY + 1.2, -1), P(6, AY + 2.5, -1)], nRestAfterTurn - nA - nH));

// A hanging tail: the first `frac` of seg laid as in the final knot, the rest
// of its length (plus `more`) hanging straight toward `target` at depth zTip.
// Like partial(), but the hanging part gets its own depth so a tail that will
// rise behind the standing part can already be behind it while it hangs.
const hang = (seg, frac, n, target, zTip, more = 0) => {
  const fine = resample(seg, 200);
  const k = Math.max(2, Math.round(frac * 200));
  const laid = fine.slice(0, k);
  const last = laid[laid.length - 1];
  const rest = (1 - frac) * pathLength(seg) + more;
  const d = [target[0] - last[0], target[1] - last[1]];
  const dl = Math.hypot(d[0], d[1]) || 1;
  return resample(cat(laid, [P(last[0] + (d[0] / dl) * rest, last[1] + (d[1] / dl) * rest, zTip)]), n);
};

// 3: first half hitch, four moves of about a quarter turn each: up behind,
// flip over the top, down in front, tuck behind.
const nAfterH1 = nD + nB + nH + nD + nTail; // 33
const h1b = hang(f.H1, 0.2, nH, [L.x1 + 1.5, -20], -1, -10);
const p2b = pose(S, TURN, f.A, h1b, extend(h1b, 10, nAfterH1));                                        // pushed up behind the standing part, sticking straight up
const h1c = hang(f.H1, 0.7, nH, [L.x2 + 2, SY + 2], 0.9, -5);
const p2c = pose(S, TURN, f.A, h1c, extend(h1c, 1.5, nAfterH1));                                      // flipped over the top, tip pointing down at the standing part
const d1d = line(P(L.x2, SY, 1), P(L.x2, SY + 5.5, 1), nD, 1);
const p2d = pose(S, TURN, f.A, f.H1, d1d, extend(d1d, 1.5, nAfterH1 - nD, [L.x2, 70]));              // down in front, tip resting on its own part
const p2 = pose(S, TURN, f.A, f.H1, f.D1, resample([P(L.x2, L.d1, -1), P(L.x2 - 2.5, 65, -1), P(L.x2 - 5, 72, -1)], nAfterH1 - nD)); // tucked behind, hanging down

// 4: second half hitch, the same moves further left
const nAfterH2 = nD + nTail; // 10
const b3a = hang(f.B, 0.5, nB, [-8, 51], -1, -6);
const p3a = pose(S, TURN, f.A, f.H1, f.D1, b3a, extend(b3a, 8, nH + nAfterH2));                      // end carried left below the standing part
const h2b = hang(f.H2, 0.2, nH, [L.x3 + 1.5, -20], -1, -10);
const p3b = pose(S, TURN, f.A, f.H1, f.D1, f.B, h2b, extend(h2b, 7, nAfterH2));                       // up behind the standing part
const h2c = hang(f.H2, 0.7, nH, [L.x4 + 2, SY + 2], 0.9, -5);
const p3c = pose(S, TURN, f.A, f.H1, f.D1, f.B, h2c, extend(h2c, 1.5, nAfterH2));                     // over the top, tip pointing down
const d2d = line(P(L.x4, SY, 1), P(L.x4, SY + 5.5, 1), nD, 1);
const p3d = pose(S, TURN, f.A, f.H1, f.D1, f.B, f.H2, d2d, extend(d2d, 2, nTail, [L.x4, 70]));         // down in front, tip resting on the connecting part
const p3 = pose(S, TURN, f.A, f.H1, f.D1, f.B, f.H2, f.D2, TAIL);

// 5: set: hitches pulled up snug against each other and the post
const p5 = pose(S, TURN, g.A, g.H1, g.D1, g.B, g.H2, g.D2, TAIL_SET);

export default {
  id: 'two-half-hitches',
  name: 'Two Half Hitches',
  aka: ['Double half hitch'],
  category: 'hitches',
  abok: [1710],
  difficulty: 1,
  summary: 'A turn round a post or ring, locked with two half hitches on the standing part. Quick to tie, easy to untie, and it ties the same way on a post, a ring or a rail.',
  uses: [
    'Tie a guy line or a ridgeline to a tent stake, a tree or a tarp pole.',
    'Tie a canoe painter or a dinghy line to a dock post or a ring.',
    'Hang a clothesline or a bear bag line from a tree trunk.',
    'Fasten a load to a roof rack bar or a pack frame.',
  ],
  pros: ['Fast, and ties the same way on a post of any size, a ring or a rail.', 'Comes apart easily after loading: push the hitches back toward the post.', 'Tied loose, the hitches can be pushed up the standing part to snug the turn against the post before you load it.'],
  cons: ['Can slip on a smooth, wet post when the load jerks or changes direction.', 'Works loose if the line goes slack and tight again many times.', 'Not adjustable under load; for a guy line you will tension later, use a taut-line hitch.'],
  warnings: ['For a heavy or jerking load (a boat in a swell, a hammock, a swinging load) take a full round turn round the post first: the round turn and two half hitches.', 'Both half hitches must go round the standing part the same way. If the second one goes the other way, the hitches can roll over each other and work loose.'],
  check: 'The two hitches sit side by side on the standing part and both loops run round it the same way, like a clove hitch tied on the rope itself. The tail comes out of the second hitch pointing away from the post. If the two loops run opposite ways, undo the second hitch and tie it again.',
  tips: ['Say it as you tie: round the post, round the rope, round the rope.', 'Tie the first hitch right against the post and slide the second one up to it.', 'A ring or a carabiner works the same as the post: pass the end through it instead of behind it.'],
  related: ['round-turn-two-half-hitches', 'clove-hitch', 'taut-line-hitch', 'buntline-hitch', 'anchor-hitch', 'siberian-hitch'],
  ropeWidth: 4,
  view: { x: -12, y: 5, w: 90, h: 90 },
  props: [post],
  strands: [{ id: 'a', color: 'orange', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Bring the rope up to the post from the left. The long side is the standing part. The short side you will move is the working end, marked with the pale band. Let it hang for now.', pose: p0,
      labels: [{ text: 'standing part', at: [-10, 49] }, { text: 'working end', at: [27.5, 70], anchor: 'right' }] },
    { title: 'Behind the post', text: 'Take the working end behind the post, from left to right. It comes out on the right side of the post.', frames: [p1a, p1b], dur: [1.1, 0.9], trailBend: -0.3,
      labels: [{ text: 'behind', at: [63, 38] }] },
    { title: 'Back across the front', text: 'Bring the end round the right side of the post and back across the front, heading left. It now lies below the standing part and points back the way the rope came.', frames: [p1c, p1], dur: [0.9, 1.1], trailBend: 0.25,
      labels: [{ text: 'below the standing part', at: [4, 61] }] },
    { title: 'First half hitch', text: 'Push the end up behind the standing part so it sticks up above it. Flip it over the top toward you and bring it down in front of the standing part. Tuck it behind its own part, the piece coming from the post, and let it hang.', frames: [p2b, p2c, p2d, p2], dur: [1.0, 0.9, 0.9, 0.8], trailBend: 0.3,
      labels: [{ text: 'up behind', at: [21, 29], anchor: 'right' }, { text: 'tuck behind', at: [28, 63], anchor: 'right' }] },
    { title: 'Second half hitch', text: 'Carry the end to the left and do the same again: up behind the standing part, over the top toward you, down in front, and behind its own part. Both hitches must go round the standing part the same way.', frames: [p3a, p3b, p3c, p3d, p3], dur: [1.0, 1.0, 0.9, 0.9, 0.8], trailBend: 0.3,
      labels: [{ text: 'same way round', at: [-2, 23] }] },
    { title: 'Set the hitches', text: 'Pull the standing part and the working end apart. The two hitches close up against each other and against the post. Leave a tail at least five rope widths long.', frames: [p5], dur: 1.3,
      labels: [{ text: 'tail points away', at: [-10, 84] }, { text: 'from the post', at: [-10, 88] }] },
  ],
};
