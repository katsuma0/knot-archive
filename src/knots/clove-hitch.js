import { P, cat, line, resample, padStart, wrapPost, partial, extend } from './_lib.js';

// Clove hitch tied with the end round a post. It is two half hitches: the
// rope goes round the post, comes back across the front UNDER the standing
// part (the diagonal), goes round again higher up, and the end is tucked
// UNDER the diagonal. Standing part leaves left, end leaves right.
//
// Post at x = 50, radius 11; the rope centre line wraps at R = 13.
// Segments (fixed point counts), all helix pieces straight from wrapPost:
//   A    standing part, from off screen to the post's left edge
//   F1   across the front, left edge to right edge            (part of turn 1)
//   B1   round the back, right edge to left edge, dropping    (rest of turn 1)
//   C    the diagonal: left edge up across the front to the right edge, under A's front pass
//   B2   round the back again, right edge to left edge, higher up
//   E    the end: left edge across the front under the diagonal, out to the right
const post = { type: 'post', x: 50, y1: -12, y2: 112, r: 11 };
const R = 13;
const LEN = 300;
const nA = 5, nW = 8, nE = 8;
const zs = (pts, k) => pts.map((p) => [p[0], p[1], p[2] * k]);

const A = resample([P(-10, 56, 0), P(22, 53, 0), P(37, 49, 0)], nA);
const F1 = zs(wrapPost(50, R, 49, 52, 180, 0.5, 13, -1), 1.6); // left edge -> front (z 1.6, on top) -> right edge
const B1 = wrapPost(50, R, 52, 60, 0, 0.5, 13, -1);            // right edge -> behind -> left edge at y 60
const C = wrapPost(50, R, 60, 40, 180, 0.5, 13, -1);           // left edge -> front (z 1, under the standing part) -> right edge at y 40
const B2 = wrapPost(50, R, 40, 40, 0, 0.5, 13, -1);            // right edge -> behind -> left edge at y 40
const E = resample([P(37, 40, 0), P(44, 42, 0.4), P(52, 44, 0.4), P(58, 45, 0.4), P(65, 46, 0.4), P(74, 48, 0.1), P(86, 52, 0)], nE); // in front of the post (z 0.4) but under the diagonal

const pose = (...segs) => padStart(cat(...segs), LEN);
const chain = (from, n, len, toward) => {
  // lay the segments not tied yet as straight runs from the end of `from`
  const out = [];
  let prev = from;
  for (let i = 0; i < n; i++) { const seg = extend(prev, len, nW, toward); out.push(seg); prev = seg; }
  return out;
};

// 0: rope lies across the front, end off to the right
const p0 = pose(A, F1, ...chain(F1, 3, 14, [110, 56]), extend(chain(F1, 3, 14, [110, 56])[2], 14, nE, [110, 56]));
// 1: round the back, coming out on the left below the standing part
const b1a = partial(B1, 0.5, nW, [20, 112]);
const p1a = pose(A, F1, b1a, ...chain(b1a, 2, 14, [20, 112]), extend(chain(b1a, 2, 14, [20, 112])[1], 14, nE, [20, 112]));
const p1 = pose(A, F1, B1, ...chain(B1, 2, 14, [16, 110]), extend(chain(B1, 2, 14, [16, 110])[1], 14, nE, [16, 110]));
// 2: up across the front, under the standing part, to the right edge above it
const c1 = partial(C, 0.7, nW, [84, 26]);
const p2a = pose(A, F1, B1, c1, extend(c1, 14, nW, [84, 26]), extend(extend(c1, 14, nW, [84, 26]), 14, nE, [84, 26]));
const p2 = pose(A, F1, B1, C, extend(C, 14, nW, [100, 30]), extend(extend(C, 14, nW, [100, 30]), 14, nE, [100, 30]));
// 3: round the back again, higher, coming out on the left above the standing part
const b2a = partial(B2, 0.5, nW, [20, 6]);
const p3a = pose(A, F1, B1, C, b2a, extend(b2a, 16, nE, [20, 6]));
const p3 = pose(A, F1, B1, C, B2, extend(B2, 16, nE, [8, 34]));
// 4: tuck the end right, under the diagonal
const p4 = pose(A, F1, B1, C, B2, E);
// 5: snug: the passes close up on the diagonal
const p5 = pose(
  resample([P(-10, 56, 0), P(22, 53, 0), P(37, 50, 0)], nA),
  zs(wrapPost(50, R, 50, 53, 180, 0.5, 13, -1), 1.6),
  wrapPost(50, R, 53, 59, 0, 0.5, 13, -1),
  wrapPost(50, R, 59, 42, 180, 0.5, 13, -1),
  wrapPost(50, R, 42, 42, 0, 0.5, 13, -1),
  resample([P(37, 42, 0), P(44, 44, 0.4), P(52, 45.5, 0.4), P(58, 46.5, 0.4), P(65, 47.5, 0.4), P(74, 50, 0.1), P(86, 54, 0)], nE),
);

export default {
  id: 'clove-hitch',
  name: 'Clove Hitch',
  aka: ['Double hitch'],
  category: 'hitches',
  abok: [1177, 1178],
  difficulty: 1,
  summary: 'Two half hitches round a post, one on top of the other. Fast, adjustable, and the start of most lashings.',
  uses: [
    'Start and finish a square lashing or a diagonal lashing.',
    'Tie a guy line to a stake or a tarp pole in a hurry.',
    'Hang a bear bag line or a bucket from a branch when the pull stays steady.',
    'Clip in short to an anchor with a carabiner (tie it with two loops instead).',
  ],
  pros: ['Quick to tie and to adjust: feed rope through without untying.', 'Easy to untie after loading.'],
  cons: ['Can slip or roll if the pull changes direction or the post is smooth.', 'Can work loose when the load comes and goes.'],
  warnings: ['Not for a load that swings or jerks. Back it up with a half hitch on the standing part, or use a round turn and two half hitches.'],
  check: 'From the front you see one diagonal strand. The standing part lies over it on one side and the end is tucked under it on the other, and the two ends leave in opposite directions. If both ends leave on the same side, or the diagonal is missing, you tied two round turns.',
  tips: ['Pull both ends apart to set it. The diagonal should pinch the end firmly.'],
  related: ['clove-hitch-loops', 'two-half-hitches', 'round-turn-two-half-hitches', 'constrictor-knot', 'square-lashing'],
  ropeWidth: 4,
  props: [post],
  strands: [{ id: 'a', color: 'blue', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Lay the rope across the front of the post. The standing part is the long side on the left; the working end, with the pale band, runs off to the right.', pose: p0,
      labels: [{ text: 'standing part', at: [6, 62] }, { text: 'working end', at: [94, 47], anchor: 'right' }] },
    { title: 'Round the back', text: 'Take the working end round the back of the post and bring it out on the left, below the standing part.', frames: [p1a, p1], dur: [0.9, 0.9] },
    { title: 'Up across the front, under', text: 'Bring the end diagonally up across the front of the post, passing UNDER the standing part, and out past the right edge above it. This diagonal is the first half hitch.', frames: [p2a, p2], dur: [1.0, 0.9],
      labels: [{ text: 'under', at: [66, 56] }] },
    { title: 'Round the back again', text: 'Take the end round the back of the post a second time, higher up, and bring it out on the left above the standing part.', frames: [p3a, p3], dur: [0.9, 0.9] },
    { title: 'Tuck under the diagonal', text: 'Pass the end to the right across the front, UNDER the diagonal, so it comes out on the right side. The diagonal now pinches the end against the post.', frames: [p4], dur: 1.5,
      labels: [{ text: 'under the diagonal', at: [66, 40] }] },
    { title: 'Snug it down', text: 'Pull the standing part and the working end in opposite directions. The two half hitches close up on each other.', frames: [p5], dur: 1.2 },
  ],
};
