import { P, cat, line, resample, padStart } from './_lib.js';

// Bowline. Standing part comes straight down from the top; the big loop hangs
// below. Every frame is built from the same four segments with fixed point
// counts, so the parts that do not move stay perfectly still during tweens:
//   S  standing part, from off screen down to the crossing E
//   H  the small loop ("the hole") from E round and back under E to the right leg
//   R  right leg, bottom of the big loop, left leg up to (37,55)
//   W  the working end from (37,55) onward
const nS = 8, nH = 18, nR = 18;
const LEN = 340;

const E = P(50, 38, 1);
// Standing part: behind the end where the collar crosses over it (y 20), in front at E.
const S = resample([P(50, -12, 0.5), P(50, 2, 0.4), P(50, 20, -1), P(50, 30, 0.2), E], nS);

// The hole. Bottom edge in front (+1): the end passes under it twice. Top
// edge and exit arm behind (-1): the end passes over them.
const holeOpen = [E, P(45, 45, 1), P(37, 46, 1), P(30, 40, 0.4), P(28, 31, -0.4), P(32, 23, -1), P(39, 21, -1), P(44, 27, -1), P(50, 38, -1), P(56, 45.5, -0.5)];
const holeNone = [E, P(51, 40.5, 0.5), P(52.5, 42.5, 0.2), P(54.2, 44.2, 0), P(56, 45.5, 0)];
const holeTight = [E, P(46, 44, 1), P(39, 45, 1), P(33, 40, 0.4), P(31, 32, -0.4), P(34, 25, -1), P(40, 23, -1), P(45, 29, -1), P(50, 38, -1), P(56, 45.5, -0.5)];
const H = (pts) => resample(pts, nH);

// Big loop: never moves.
const R = resample([P(56, 45.5, 0), P(57.6, 48.2, 0), P(59.2, 54, 0), P(60, 70, 0), P(54, 84, 0), P(44, 86, 0), P(35, 78, 0), P(33, 66, 0), P(36, 57, 0), P(37, 55, 0)], nR);

// The working end is three locked segments: UP through the hole (6 points),
// TREE round the standing part (6), DOWN through the hole again (6). A
// segment that is not laid yet runs straight on from the last laid point, so
// nothing slides once it is in place.
const nUp = 6, nTree = 6, nDown = 6;
const UP = resample([P(37, 55, 0), P(37, 50, -1), P(37, 46, -1), P(37.5, 38, 0), P(37, 30, 0.6), P(37, 22, 1)], nUp);
const TREE = resample([P(37, 22, 1), P(37, 12, 1), P(41, 3, 0.5), P(50, 0, -1), P(58, 4, -0.5), P(57, 13, 0.6), P(50, 20, 1)], nTree);
const DOWN = resample([P(50, 20, 1), P(45, 29, 1), P(43, 37, -0.4), P(43, 45, -1), P(44, 54, -0.5), P(46, 64, 0)], nDown);
const W = (up, tree, down) => cat(up, tree, down);
const W0 = resample([P(37, 55, 0), P(35, 48, 0), P(28, 42, 0), P(18, 40, 0), P(8, 44, 0), P(2, 52, 0)], nUp + nTree + nDown); // tail lying out to the left
const W1a = W(resample([P(37, 55, 0), P(37, 50, -1), P(37, 46, -1), P(37, 41, 0.6)], nUp), line(P(37, 41, 0.8), P(37, 36, 1), nTree), line(P(37, 36, 1), P(37, 31, 1), nDown)); // tucked behind the bottom edge, tip already in front inside the hole
const W1 = W(UP, line(P(37, 22, 1), P(37, 6, 1), nTree), line(P(37, 6, 1), P(37, -10, 1), nDown));           // up out of the hole
const W2a = W(UP, resample([P(37, 22, 1), P(37, 14, 0.5), P(38, 6, -1), P(42, 0, -1), P(46, -3, -1), P(48, -4, -1)], nTree), line(P(48, -4, -1), P(48, -14, -1), nDown)); // dropped behind, still left of the standing part
const W2b = W(UP, resample([P(37, 22, 1), P(37, 12, 1), P(41, 3, 0.5), P(50, 0, -1), P(58, 4, -1), P(62, 10, -1)], nTree), line(P(62, 10, -1), P(66, 20, -1), nDown)); // behind, now right of the standing part
const W2 = W(UP, TREE, line(P(50, 20, 1), P(45, 27, 1), nDown));                                                 // over the front of the standing part, pointing at the hole
const W3a = W(UP, TREE, resample([P(50, 20, 1), P(46, 26, 1), P(44, 33, 0.4)], nDown));                        // pointing into the hole from the front
const W3 = W(UP, TREE, DOWN);                                                                                     // down through the hole
const W4 = W(resample([P(37, 55, 0), P(37, 50, -1), P(37.5, 46, -1), P(38.5, 38, 0), P(38.5, 30, 0.6), P(38.5, 24, 1)], nUp),
  resample([P(38.5, 24, 1), P(39, 14, 1), P(43, 7, 0.5), P(50, 4, -1), P(56, 8, -0.5), P(55, 15, 0.6), P(49, 21, 1)], nTree),
  resample([P(49, 21, 1), P(45, 29, 1), P(43.5, 37, -0.4), P(43.5, 45, -1), P(44.5, 54, -0.5), P(46, 64, 0)], nDown)); // dressed

const pose = (hole, w) => padStart(cat(S, H(hole), R, w), LEN, [0, -1]);
const p0 = pose(holeNone, W0);
const p1 = pose(holeOpen, W0);
const p1a = pose(holeOpen, W1a);
const p2 = pose(holeOpen, W1);
const p2a = pose(holeOpen, W2a);
const p2b = pose(holeOpen, W2b);
const p3 = pose(holeOpen, W2);
const p3a = pose(holeOpen, W3a);
const p4 = pose(holeOpen, W3);
const p5 = pose(holeTight, W4);

export default {
  id: 'bowline',
  name: 'Bowline',
  aka: ['King of knots'],
  category: 'loops',
  abok: [1010],
  difficulty: 2,
  summary: 'A fixed loop that holds under load and still unties easily afterwards. The loop you reach for first.',
  uses: [
    'A loop in the end of a line to drop over a stake, a post or a branch.',
    'Tie the ridgeline of a tarp around a tree, then tension the other end.',
    'Hauling: a loop to clip a pack or a bag to.',
    'Rescue: a loop a person can sit in or put under the arms (then back it up).',
  ],
  pros: ['Holds well, does not slip or jam under a steady pull.', 'Comes apart easily after heavy loading: break the collar back over the loop.'],
  cons: ['Can shake loose when the rope is slack and jiggled.', 'Weak if ring loaded (pulled sideways across the loop).'],
  warnings: ['For climbing, finish it with a stopper knot (double overhand on the tail) or use a figure eight follow through.', 'Keep the tail at least ten rope widths long.'],
  check: 'The tail sits inside the big loop, next to the right leg, and the collar wraps the standing part. If the tail points outside the loop you tied a cowboy bowline; it works but is weaker.',
  tips: ['Remember it as a story: the rabbit comes up out of the hole, runs round the tree, and goes back down the hole.', 'The small loop must have the standing part on top of the crossing. If it is underneath, the knot falls apart when you pull.'],
  related: ['yosemite-bowline', 'figure-eight-follow-through', 'bowline-on-a-bight', 'running-bowline', 'sheet-bend'],
  ropeWidth: 4,
  strands: [{ id: 'a', color: 'orange', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Hold the rope so the standing part runs up to whatever is holding it. Make the big loop the size you want. The working end comes up the left side.', pose: p0,
      labels: [{ text: 'standing part', at: [54, 8] }, { text: 'working end', at: [14, 34] }] },
    { title: 'Make the hole', text: 'Twist a small loop in the standing part just above the big loop. The standing part, coming down from the top, must lie ON TOP of the crossing. This small loop is the rabbit hole.', frames: [p1], dur: 1.6,
      labels: [{ text: 'standing part on top', at: [54, 34] }] },
    { title: 'Up out of the hole', text: 'Pass the working end up through the small loop from behind. The rabbit comes up out of the hole.', frames: [p1a, p2], dur: [1.3, 1.5], trailBend: 0.25 },
    { title: 'Round the tree', text: 'Take the end behind the standing part, from left to right. The rabbit runs round the tree.', frames: [p2a, p2b, p3], dur: [0.9, 1.0, 1.1], trailBend: -0.3 },
    { title: 'Back down the hole', text: 'Bring the end over the front of the standing part and back down through the small loop, next to where it came up. The tail finishes inside the big loop.', frames: [p3a, p4], dur: [1.2, 1.6], trailBend: 0.2 },
    { title: 'Dress and tighten', text: 'Hold the tail against the right leg of the loop and pull the standing part. The small loop closes into a collar round the two strands.', frames: [p5], dur: 1.4 },
  ],
};
