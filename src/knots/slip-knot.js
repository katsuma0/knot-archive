import { P, cat, line, resample, padStart, arc } from './_lib.js';

// Slip knot. A loop is made with the working end crossing OVER the standing
// part, then a bight of the STANDING part is pushed through the loop. For the
// result to be a true slipped overhand (and not a tangle that falls out), the
// bight of the under-strand goes through from the front: both legs pass OVER
// the bottom edge of the loop and the tip of the bight sits behind.
// Segments (fixed point counts), in rope order:
//   S0    standing part, off screen to the foot of leg A
//   B     foot curve, up leg A, round the tip, down leg B, round a U to the
//         crossing C1 (under the end). Flat until step 2.
//   LOOP  from C1 up the right side, over the top, down the left, along the
//         bottom (under the legs) back to C1 (over the standing part)
//   TAIL  the working end
const nS0 = 5, nB = 21, nL = 16, nT = 6;
const LEN = 340;
const xA = 37, xB = 47, xM = 42, rT = 5;
const C1 = P(56, 57, -1);

const S0 = resample([P(-8, 68, 0), P(14, 68, 0), P(31, 68, 0)], nS0);
const Bflat0 = line(P(31, 68, 0), P(58, 66.5, 0), nB);
const Bflat = resample([P(31, 68, 0), P(44, 67.5, 0), P(51, 67, 0), P(53.5, 65, -0.4), P(55, 61, -0.8), C1], nB);

// z profile of a leg once the bight is through: over the bottom edge of the
// loop (y >= 54), behind inside the loop (y <= 42).
const zThrough = (y) => (y >= 54 ? 1 : y <= 42 ? -1 : 1 - (2 * (54 - y)) / 12);
const zFront = () => 1;
// The bight with its tip at yTop. Legs rise straight from the standing part;
// leg B rounds a U (radius 4.5) into the crossing.
const bight = (yTop, zf) => {
  const cy = yTop + rT;
  const ys = [61, 55, 48, 42, 36, 30].filter((y) => y > cy + 0.5);
  const up = [P(31, 68, 0), P(34, 67.3, 0), P(36.3, 65, 0), ...ys.map((y) => P(xA, y, zf(y))), P(xA, cy, zf(cy))];
  const tip = arc(xM, cy, rT, 180, 360, 7, zf(cy));
  const down = [P(xB, cy, zf(cy)), ...ys.filter((y) => y < 57).reverse().map((y) => P(xB, y, zf(y)))];
  const u = arc(51.5, 58, 4.5, 180, 0, 6, [1, -1]);
  return resample([...up, ...tip, ...down, ...u, C1], nB);
};

const LOOP = resample([C1, P(58, 52.5, -0.7), P(63, 47, -0.3), P(68, 37, 0), P(64, 22, 0), P(51, 13, 0), P(36, 16, 0), P(28, 29, 0), P(28, 44, -0.5), P(33, 52, -1), P(37, 54.4, -1), P(47, 55.7, -1), P(54, 56.5, 1)], nL);
const LOOPhover = resample([C1, P(58.5, 52.5, -0.4), P(65, 47, 0.6), P(71, 38, 1), P(68, 21, 1), P(54, 11, 1), P(38, 14, 1), P(30, 26, 1), P(30, 40, 1), P(35, 47, 1)], nL);
// The loop closed round the two legs: top passes over them, bottom under.
const RING = resample([C1, P(58, 52, -0.6), P(58.5, 47, -0.1), P(57, 43, 0.5), P(52, 38.5, 1), P(xM, 37.5, 1), P(34, 40, 0.6), P(31.5, 47, 0), P(34.5, 53.3, -1), P(37, 54.3, -1), P(47, 55.8, -1), P(54, 56.5, 1)], nL);

const TAIL = resample([P(54, 56.5, 1), P(63, 60, 0.6), P(74, 64, 0.3), P(86, 67, 0)], nT);
const TAILsnug = resample([P(54, 56.5, 1), P(64, 59.5, 0.6), P(75, 62.5, 0.3), P(86, 65.5, 0)], nT);

const pose = (...segs) => padStart(cat(...segs), LEN);

// 0: straight rope
const p0 = pose(S0, Bflat0, line(P(58, 66.5, 0), P(74, 65.5, 0.5), nL), line(P(74, 65.5, 0.5), P(88, 64.5, 0.5), nT));
// 1a: end swung up and round, hovering in front above the standing part
const p1a = pose(S0, Bflat, LOOPhover, line(P(35, 47, 1), P(50, 58, 1), nT));
// 1: loop made, end lying over the standing part
const p1 = pose(S0, Bflat, LOOP, TAIL);
// 2a: bight of the standing part lifted over the bottom edge, still in front
const p2a = pose(S0, bight(43, zFront), LOOP, TAIL);
// 2: bight pushed through the loop, tip behind
const p2 = pose(S0, bight(26, zThrough), LOOP, TAIL);
// 3a: loop closed round the two legs
const p3a = pose(S0, bight(26, zThrough), RING, TAIL);
// 3: bight pulled further out, tail snugged
const p3 = pose(S0, bight(19, zThrough), RING, TAILsnug);
// 4: standing part pulled, the loop slides smaller
const p4a = pose(S0, bight(24, zThrough), RING, TAILsnug);
const p4 = pose(S0, bight(28, zThrough), RING, TAILsnug);

export default {
  id: 'slip-knot',
  name: 'Slip Knot',
  aka: ['Running knot'],
  category: 'loops',
  abok: [529],
  difficulty: 1,
  summary: 'A loop that slides shut and comes undone with one pull on the end. An overhand knot tied round a bight of the standing part.',
  uses: [
    'Start a lashing or tie up a bundle of poles: drop the loop over the pole, pull the standing part snug, then wrap.',
    'A quick loop over a tent stake or a branch stub for a guy line you will move again soon.',
    'A quick-release stopper: it blocks a tarp grommet or a line tensioner and shakes out with a pull on the end.',
    'A handle in a cord: the loop takes a finger or a carabiner while the knot holds the slack.',
  ],
  pros: ['Tied in two seconds and untied in one.', 'The loop fits anything: slide the standing part to size it.'],
  cons: ['Holds only while the standing part is under load. Slack rope and a bump will loosen it.', 'Not a fixed loop. It closes on whatever is inside it.'],
  warnings: ['Never put it round a person or an animal. It tightens like a noose and jams under load.', 'For a loop that must keep its size use a bowline or a figure eight on a bight.'],
  check: 'Pull the standing part and the loop shrinks. Pull the working end and the whole knot falls out. If pulling the end only tightens a lump, you pushed a bight of the end through instead of the standing part: that is a slipped overhand stopper, not a slip knot.',
  tips: ['Pinch the crossing between finger and thumb while you pull the bight through. The knot then forms where you want it.', 'Leave the bight long. A short one is awkward to grip and to release.'],
  related: ['overhand', 'running-bowline', 'marlinspike-hitch', 'arbor-knot', 'highwaymans-hitch'],
  ropeWidth: 4,
  view: { x: 3, y: -8, w: 100, h: 100 },
  strands: [{ id: 'a', color: 'green', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Lay the rope out. The long side on the left is the standing part. The short side with the pale band is the working end.', pose: p0,
      labels: [{ text: 'standing part', at: [10, 76] }, { text: 'working end', at: [86, 58], anchor: 'right' }] },
    { title: 'Make a loop', text: 'Swing the working end up and round, then lay it across the top of the standing part. The end sits on top at the crossing.', frames: [p1a, p1], dur: [1.3, 1.3],
      labels: [{ text: 'end on top', at: [70, 54] }] },
    { title: 'Pull a bight through', text: 'Reach through the loop from behind. Hook the standing part just left of the crossing and pull a bight of it up over the bottom of the loop and through, so the bight comes out behind. Use the standing part, not the end.', frames: [p2a, p2], dur: [1.2, 1.3], trail: false,
      labels: [{ text: 'bight', at: [53, 31] }, { text: 'over', at: [32, 61], anchor: 'right' }] },
    { title: 'Tighten', text: 'Pull the bight up and the working end down to the right. The loop closes round the two legs of the bight.', frames: [p3a, p3], dur: [1.3, 1.1], trail: false },
    { title: 'Slide it', text: 'Pull the standing part and the loop slides smaller. Pull the working end instead and the knot falls out.', frames: [p4a, p4], dur: [1.0, 1.0], trail: false,
      arrows: [{ from: [20, 62], to: [4, 62], bend: 0 }],
      labels: [{ text: 'loop shrinks', at: [53, 27] }] },
  ],
};
