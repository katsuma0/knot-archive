import { P, cat, resample, padStart, wrapPost, partial, extend } from './_lib.js';

// Clove hitch tied with the end around a post. Two turns, the second one
// crossing over the first, end tucked under the second turn.
// Post at x = 50, rope wraps at radius 9 (post radius 6 + half rope width).
const post = { type: 'post', x: 50, y1: -12, y2: 112, r: 11 };
const R = 13; // post radius + half the rope width
const N = 44, LEN = 300;

// Rope arrives from the left. Segment structure for every frame:
//  A  standing part from off screen to the front of the post at wrap height 1
//  B  first turn (behind the post, comes back to the front)
//  C  crossing over, second turn (behind again)
//  D  the end, tucked under the second turn and hanging down-right
const nA = 6, nB = 14, nC = 14, nD = 10;

const A = (y) => resample([P(-10, y + 10, 0), P(20, y + 4, 0), P(38, y, 0.6), P(50, y, 1)], nA);
// wrapPost: angle 90 = in front, so a full turn from 90 goes behind (270) and back
// Rope arrives from the left and goes right across the front first, so the
// angle must DEcrease from 90 (front): dir = -1.
// 13 points per turn gives exactly nB = 14 points, so the turn is used as is (no resample, which would cut the corners at the post's edges).
const turn = (y0, y1) => wrapPost(50, R, y0, y1, 90, 1, 13, -1);

// final: first turn from y=46 to y=50 ending in front; second turn from 50 to 56 crossing over, end under
const f = {
  A: A(44),
  B: turn(44, 52),                          // first turn, ends in front at y=52
  C: turn(52, 60),           // second turn, crosses over the first in front, ends in front at y=60
  D: resample([P(50, 60, 1), P(57, 60, -1), P(62, 55, -1), P(68, 56, 0), P(76, 62, 0), P(82, 72, 0)], nD), // tucked under the diagonal of the second turn, out to the right
};

// pose 0: rope lies in front of the post and continues straight on
const p0 = padStart(cat(A(44), resample([P(50, 44, 1), P(60, 44, 1), P(70, 44, 1)], nB), resample([P(70, 44, 1), P(80, 44, 1), P(90, 44, 1)], nC), resample([P(90, 44, 1), P(96, 44, 1), P(104, 44, 1)], nD)), LEN);

// Frames of a turn in progress: the laid part follows the helix, the free
// end hangs toward `toward`, and the segments not tied yet run straight on.
const inProgress = (y0, y1, f, toward, before, nRest) => {
  const t = partial(turn(y0, y1), f, nB, toward);
  const rest = extend(t, 60, nRest, toward);
  return padStart(cat(...before, t, rest), LEN);
};
// pose 1: one turn round the post, end comes back in front and crosses over to the right.
const tail1 = (y) => cat(resample([P(50, y, 1), P(62, y + 1, 1), P(72, y + 1, 1)], nC), resample([P(72, y + 1, 1), P(82, y + 2, 1), P(94, y + 3, 1)], nD));
const p1a = inProgress(44, 52, 0.3, [82, 100], [A(44)], nC + nD);          // going behind at the right edge, end hanging down-right
const p1b = inProgress(44, 52, 0.62, [16, 100], [A(44)], nC + nD);         // behind the post, end hanging out to the left
const p1c = inProgress(44, 52, 0.9, [104, 56], [A(44)], nC + nD);          // back in front at the left edge, end heading right
const p1 = padStart(cat(A(44), f.B, tail1(52)), LEN);
// pose 2: second turn, crossing over the first on the front; end not yet tucked
const p2a = inProgress(52, 60, 0.3, [82, 108], [A(44), f.B], nD);
const p2b = inProgress(52, 60, 0.62, [16, 108], [A(44), f.B], nD);
const p2c = inProgress(52, 60, 0.9, [104, 66], [A(44), f.B], nD);
const p2 = padStart(cat(A(44), f.B, f.C, resample([P(50, 60, 1), P(58, 64, 1), P(66, 68, 0.6), P(76, 72, 0), P(86, 76, 0)], nD)), LEN);

// pose 3: end tucked under the second turn
const p3 = padStart(cat(f.A, f.B, f.C, f.D), LEN);

// pose 4: snug: turns pulled together, end pulled
const p4 = padStart(cat(A(46), turn(46, 52), turn(52, 58), resample([P(50, 58, 1), P(57, 58, -1), P(62, 54, -1), P(68, 55, 0), P(76, 60, 0), P(82, 70, 0)], nD)), LEN);

export default {
  id: 'clove-hitch',
  name: 'Clove Hitch',
  aka: ['Double hitch'],
  category: 'hitches',
  abok: [1177, 1178],
  difficulty: 1,
  summary: 'Two turns round a post, the second crossing the first. Fast, adjustable, and the start of most lashings.',
  uses: [
    'Start and finish a square lashing or a diagonal lashing.',
    'Tie a guy line to a stake or a tarp pole in a hurry.',
    'Hang a bear bag line or a bucket from a branch when the pull stays steady.',
    'Clip in short to an anchor with a carabiner (tie it with two loops instead).',
  ],
  pros: ['Quick to tie and to adjust: feed rope through without untying.', 'Easy to untie after loading.'],
  cons: ['Can slip or roll if the pull changes direction or the post is smooth.', 'Can work loose when the load comes and goes.'],
  warnings: ['Not for a load that swings or jerks. Back it up with a half hitch on the standing part, or use a round turn and two half hitches.'],
  check: 'Both turns run the same way round the post and the end comes out under the diagonal crossing, pointing away from the standing part. The crossing sits on the side facing you.',
  tips: ['Pull both ends apart to set it. The diagonal should pinch the end firmly.'],
  related: ['clove-hitch-loops', 'two-half-hitches', 'round-turn-two-half-hitches', 'constrictor-knot', 'square-lashing'],
  ropeWidth: 4,
  props: [post],
  strands: [{ id: 'a', color: 'blue', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Bring the rope up to the post from the left. The standing part is the long side; the working end is the short side with the pale band.', pose: p0,
      labels: [{ text: 'standing part', at: [6, 46] }, { text: 'working end', at: [94, 38], anchor: 'right' }] },
    { title: 'First turn', text: 'Take the working end round the back of the post and bring it out in front, below the standing part. Carry on across to the right.', frames: [p1a, p1b, p1c, p1], dur: [0.7, 0.7, 0.7, 0.7] },
    { title: 'Second turn, crossing over', text: 'Go round the back of the post again, lower down. On the way, the rope crosses OVER the first turn on the front of the post.', frames: [p2a, p2b, p2c, p2], dur: [0.7, 0.7, 0.7, 0.8] },
    { title: 'Tuck under', text: 'Bring the end up and push it under the diagonal part of the second turn. It should point away from the standing part.', frames: [p3], dur: 1.5, trailBend: 0.3,
      labels: [{ text: 'under the diagonal', at: [66, 48] }] },
    { title: 'Snug it down', text: 'Pull the standing part and the working end in opposite directions. The two turns close up on each other.', frames: [p4], dur: 1.3 },
  ],
};
