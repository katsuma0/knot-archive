import { P, cat, line, resample, padStart } from './_lib.js';

// Overhand knot. The simplest knot, written the way every knot here is:
// the rope is a chain of named SEGMENTS, each with a fixed point count. A
// segment that has not been tied yet is laid as a straight run; once it is in
// place it never changes, so nothing wobbles during the tweens.
//
//   S     standing part, from off screen to crossing 1          6 points
//   LOOP  round the loop, back over the standing part            10 points
//   TUCK  under the right side of the loop                        6 points
//   OUT   through the middle, over the left side, out             6 points
const nS = 6, nLoop = 10, nTuck = 6, nOut = 6;
const LEN = 260; // total rope length in every frame

const S = resample([P(-8, 60, 0), P(18, 60, 0), P(32, 57, -1), P(42, 51, -1)], nS);
const LOOP = resample([P(42, 51, -1), P(55, 41, 1), P(61, 27, 0.4), P(52, 13, 0), P(37, 15, 0), P(28, 27, -1), P(29, 42, 0), P(39, 52, 1)], nLoop);
const TUCK = resample([P(39, 52, 1), P(52, 61, 0.3), P(64, 54, 0), P(61, 42, -1), P(50, 34, -0.4)], nTuck);
const OUT = resample([P(50, 34, -0.4), P(45, 31, 0.2), P(31, 28, 1), P(16, 31, 0.3), P(4, 35, 0)], nOut);

const pose = (...segs) => padStart(cat(...segs), LEN);

// 0: straight rope
const p0 = pose(
  resample([P(-8, 60, 0), P(18, 60, 0), P(42, 58, 0)], nS),
  line(P(42, 58, 0), P(60, 57, 0.5), nLoop),
  line(P(60, 57, 0.5), P(74, 56, 0.5), nTuck),
  line(P(74, 56, 0.5), P(88, 55, 0.5), nOut),
);
// 1a: end lifted and swung up and round, hovering in front
const p1a = pose(S,
  resample([P(42, 51, -1), P(56, 46, 0.5), P(67, 36, 1), P(67, 22, 1), P(55, 12, 1), P(40, 15, 1), P(33, 30, 1), P(37, 44, 1)], nLoop),
  line(P(37, 44, 1), P(49, 56, 1), nTuck),
  line(P(49, 56, 1), P(62, 66, 1), nOut),
);
// 1: loop made, end lying across the top of the standing part
const p1 = pose(S, LOOP, line(P(39, 52, 1), P(53, 62, 1), nTuck), line(P(53, 62, 1), P(68, 70, 0.6), nOut));
// 2a: end swung out to the right and dropped behind, clear of the loop
const p2a = pose(S, LOOP, resample([P(39, 52, 1), P(52, 61, 0.5), P(64, 57, 0), P(71, 48, -1)], nTuck), line(P(71, 48, -1), P(73, 36, -1), nOut));
// 2: end pushed under the right side, pointing into the loop
const p2 = pose(S, LOOP, TUCK, line(P(50, 34, -0.4), P(44, 32, -0.4), nOut));
// 3: through the loop and over the left side
const p3 = pose(S, LOOP, TUCK, OUT);
// 4: snugged down: same topology, loop pulled small
const p4 = pose(
  resample([P(-8, 60, 0), P(24, 59, 0), P(35, 55, -1), P(43, 50, -1)], nS),
  resample([P(43, 50, -1), P(52, 42, 1), P(56, 31, 0.4), P(50, 22, 0), P(40, 23, 0), P(33, 31, -1), P(34, 42, 0), P(41, 51, 1)], nLoop),
  resample([P(41, 51, 1), P(50, 56, 0.3), P(58, 50, 0), P(56, 41, -1), P(48, 35, -0.4)], nTuck),
  resample([P(48, 35, -0.4), P(44, 33, 0.2), P(36, 33, 1), P(22, 35, 0.3), P(2, 39, 0)], nOut),
);

export default {
  id: 'overhand',
  name: 'Overhand Knot',
  aka: ['Thumb knot', 'Simple knot'],
  category: 'stoppers',
  abok: [46, 514],
  difficulty: 1,
  summary: 'The simplest stopper. Stops a rope end running through a hole, a grommet or a hand.',
  uses: [
    'Stop the end of a guy line sliding out of a tarp grommet or line tensioner.',
    'Keep a cord end from fraying until you can melt or whip it.',
    'Building block: the water knot, the fisherman\'s knot and the flat overhand bend are all overhands.',
  ],
  pros: ['Fastest knot there is.', 'Small and tidy.'],
  cons: ['Jams hard after loading and can be miserable to untie in thin cord.', 'Weakens the rope more than a figure eight.'],
  warnings: ['As a stopper on a rappel rope it is too small; use a double overhand or a figure eight.'],
  check: 'One tight lump with the end and the standing part leaving on opposite sides. Three crossings, over, under, over.',
  related: ['figure-eight', 'double-overhand', 'slip-knot'],
  ropeWidth: 5,
  strands: [{ id: 'a', color: 'orange', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Lay the rope out. The long side on the left is the standing part. The short side you will move is the working end, marked with the pale band.', pose: p0,
      labels: [{ text: 'standing part', at: [8, 69] }, { text: 'working end', at: [86, 47], anchor: 'right' }] },
    { title: 'Make a loop', text: 'Swing the working end up and round, then lay it across the top of the standing part. The end sits on top at the crossing.', frames: [p1a, p1], dur: [1.3, 1.3],
      labels: [{ text: 'end crosses on top', at: [46, 71] }] },
    { title: 'Tuck under', text: 'Swing the end round to the right, then push it under the right side of the loop so it points into the loop.', frames: [p2a, p2], dur: [1.0, 1.3],
      labels: [{ text: 'under', at: [67, 40] }] },
    { title: 'Pull it through', text: 'Keep pushing: the end comes up through the middle of the loop and goes over the left side on its way out.', frames: [p3],
      labels: [{ text: 'over', at: [30, 21], anchor: 'center' }] },
    { title: 'Snug it down', text: 'Pull the standing part and the working end apart. The loop shrinks onto itself. Leave a tail at least a few rope widths long.', frames: [p4], dur: 1.4 },
  ],
};
