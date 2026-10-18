import { P, cat, line, arc, resample, padStart, partial, extend } from './_lib.js';

// Sheet bend. Strand a (blue, thick) is a static bight: short end along the
// top, standing part along the bottom, crown on the right, both ends off left.
// Strand b (orange, thin) comes in from the lower right. Along b:
//   S     under the crown, up through the bight, over the top part    12 pts
//   TOP   over the top and down behind on the left                     7 pts
//   BACK  down behind both parts of the bight                          6 pts
//   BOT   round the bottom, up over the bottom part into the bight     8 pts
//   TUCK  under S (the crossing E), over the top part, tail out        8 pts
// Crossings along b from the standing end: crown U, E O, top O, top U,
// bottom U, bottom O, E U, top O.
const nA = 31, nS = 12, nT = 7, nB = 6, nO = 8, nU = 8;
const LEN = 250;

const bight = (yU, yL, xc) => {
  const r = (yL - yU) / 2, cy = (yU + yL) / 2;
  return resample(cat(line(P(-14, yU), P(xc, yU), 8), arc(xc, cy, r, -90, 90, 13), line(P(xc, yL), P(-14, yL), 8)), nA);
};
const A = bight(38, 62, 60);

const S = resample([P(110, 78, 0), P(96, 70, -0.4), P(84, 62, -1), P(72, 55, -1), P(64, 51, -0.8), P(58, 48, 0.4), P(53, 45, 1.3), P(49, 40, 1.1), P(47.5, 35, 1), P(47, 30, 1)], nS);
const TOP = resample([P(47, 30, 1), P(45, 25, 0.7), P(40, 22, 0.2), P(34, 23, -0.5), P(30.5, 27, -0.9), P(30, 32, -1)], nT);
const BACK = resample([P(30, 32, -1), P(30, 38, -1), P(30, 50, -1), P(30, 62, -1), P(30.5, 68, -1)], nB);
const BOT = resample([P(30.5, 68, -1), P(33, 73, -0.6), P(38, 75, 0.2), P(43, 72, 0.8), P(45.5, 66, 1), P(46.5, 62, 1), P(49, 54, 0.5)], nO);
const TUCK = resample([P(49, 54, 0.5), P(51, 49.5, 0.5), P(53, 45, 0.5), P(55, 40, 0.5), P(56, 35, 0.5), P(57, 29, 0.5), P(58, 23, 0.4)], nU);

// segments not laid yet: short straight runs carrying on from `prev`
const runs = (prev, specs, toward = null) => {
  const out = [];
  let p = prev;
  for (const [len, n] of specs) { const s = extend(p, len, n, toward); out.push(s); p = s; }
  return out;
};
const pose = (b, a = A, dir = [1, 0.55]) => ({ a, b: padStart(cat(...b), LEN, dir) });

// 0: thin rope lying in from the lower right, end pointing at the bight
const S0 = line(P(110, 80, 0), P(90, 74, 0), nS);
const p0 = pose([S0, ...runs(S0, [[3, nT], [3, nB], [3, nO], [3, nU]])]);
// 1: behind the crown, up through the bight, over the top part
const Sa = partial(S, 0.37, nS, null, 0);
const p1a = pose([Sa, ...runs(Sa, [[1.5, nT], [1.5, nB], [1.5, nO], [1.5, nU]])]);
const Sb = partial(S, 0.647, nS, null, 0);
const p1b = pose([Sb, ...runs(Sb, [[1.5, nT], [1.5, nB], [1.5, nO], [1.5, nU]])]);
const Sc = partial(S, 0.78, nS, null, 0);
const p1c = pose([Sc, ...runs(Sc, [[1, nT], [1, nB], [1, nO], [1, nU]])]);
const p1 = pose([S, ...runs(S, [[3, nT], [3, nB], [3, nO], [3, nU]], [45, 10])]);
// 2: left over the top, then down behind both parts
const p2a = pose([S, TOP, ...runs(TOP, [[2, nB], [2, nO], [2, nU]], [20, 28])]);
const p2 = pose([S, TOP, BACK, ...runs(BACK, [[3, nO], [3, nU]], [31, 90])]);
// 3: round the bottom, up over the bottom part, under itself, out over the top
const Bp = partial(BOT, 0.475, nO, null, 0);
const p3a = pose([S, TOP, BACK, Bp, ...runs(Bp, [[2.5, nU]])]);
const p3b = pose([S, TOP, BACK, BOT, ...runs(BOT, [[3, nU]])]);
const p3 = pose([S, TOP, BACK, BOT, TUCK]);
// 4: pulled tight. The bight narrows and the thin rope closes round its neck.
const A4 = bight(42, 58, 62);
const p4 = pose([
  resample([P(110, 53, 0), P(92, 52, -0.4), P(80, 51, -1), P(70, 50, -1), P(63, 50, -0.6), P(58, 50, 0.6), P(54, 49.5, 1.3), P(51.5, 46, 1.2), P(50.5, 42, 1), P(50, 38.5, 1), P(49.5, 36, 1)], nS),
  resample([P(49.5, 36, 1), P(48.5, 32.5, 0.7), P(45, 30.5, 0.1), P(41.5, 32, -0.6), P(40, 36, -1)], nT),
  resample([P(40, 36, -1), P(39.5, 42, -1), P(39.5, 50, -1), P(39.5, 58, -1), P(40, 64, -1)], nB),
  resample([P(40, 64, -1), P(41.5, 67.5, -0.5), P(44.5, 68.5, 0.3), P(47, 66.5, 0.9), P(48.5, 62.5, 1), P(49.3, 58, 1), P(50.5, 54, 0.5)], nO),
  resample([P(50.5, 54, 0.5), P(52.3, 51.5, 0.5), P(54, 49.5, 0.5), P(55.5, 45.5, 0.5), P(56.5, 42, 0.5), P(58, 36, 0.5), P(59.5, 30, 0.5), P(61, 24, 0.4)], nU),
], A4, [1, 0.05]);

export default {
  id: 'sheet-bend',
  name: 'Sheet Bend',
  aka: ['Becket bend', "Weaver's knot"],
  category: 'bends',
  abok: [1431],
  difficulty: 1,
  summary: 'Joins two ropes, even of different thickness. The thin rope wraps the neck of a bight in the thick rope and locks under itself.',
  uses: [
    'Join two guy lines when one is too short to reach the stake.',
    'Tie a thin cord to a thicker rope, such as a light throw line to a heavier haul line.',
    'Extend a bear bag line or a clothesline with whatever cord is left in the pack.',
    'Tie a line to a tarp corner loop or a rope eye. Tied to an eye it is called a becket hitch.',
  ],
  pros: ['Works with ropes of different size and stiffness.', 'Quick to tie and easy to untie after a load.', 'Uses very little rope.'],
  cons: ['Can shake loose when it flaps without load, as on a tarp line in gusty wind.', 'Less secure in slippery synthetic cord or when the sizes differ a lot.'],
  warnings: [
    "Not for climbing or any life load. Join climbing ropes with a double fisherman's or a figure eight bend.",
    'Always make the bight in the thicker or stiffer rope. Made the other way round it can pull through.',
    'For slippery cord or a big size difference, take one more turn and tie a double sheet bend.',
  ],
  check: 'The end of the thin rope and the short end of the thick rope come out on the same side of the knot. If they come out on opposite sides you have a left-handed sheet bend, which slips sooner. Retie it.',
  tips: [
    'Leave tails at least ten rope diameters long.',
    'To untie, push the bight of the thick rope toward the knot. The thin collar loosens and slides off.',
  ],
  related: ['double-sheet-bend', 'bowline', 'zeppelin-bend', 'carrick-bend', 'square-knot'],
  ropeWidth: 4,
  strands: [
    { id: 'a', color: 'blue', width: 5, end: 'none' },
    { id: 'b', color: 'orange', width: 4, end: 'working' },
  ],
  steps: [
    { title: 'Start', text: 'Fold a bight in the thick rope and lay it flat, curve to the right. Its short end runs along the top, its standing part along the bottom. The thin rope comes in from the right; its working end has the pale band.', pose: p0,
      labels: [{ text: 'short end', at: [4, 32] }, { text: 'standing part', at: [4, 70] }, { text: 'bight', at: [76, 40] }, { text: 'working end', at: [80, 84], anchor: 'center' }] },
    { title: 'Up through the bight', text: 'Take the thin end behind the curve of the bight, then push it up through the bight from behind. Lay it up and over the top part.', frames: [p1a, p1b, p1c, p1], dur: [0.9, 0.8, 0.6, 0.8],
      labels: [{ text: 'up through', at: [64, 28] }] },
    { title: 'Round behind both parts', text: 'Take the end left over the top, then down behind both parts of the bight. Bring it out below the bottom part.', frames: [p2a, p2], dur: [1.0, 1.0],
      labels: [{ text: 'behind both', at: [24, 50], anchor: 'right' }] },
    { title: 'Tuck under itself', text: 'Bring the end up over the bottom part, then tuck it under the thin rope where that crosses the top of the bight. Do not take it back through the bight.', frames: [p3a, p3b, p3], dur: [0.9, 0.8, 1.2],
      labels: [{ text: 'under itself', at: [63, 31] }] },
    { title: 'Pull it tight', text: 'Hold the thick standing part and pull the thin standing part to the right. The thin rope closes round the neck of the bight. Both short ends sit on the top side.', frames: [p4], dur: 1.4,
      labels: [{ text: 'both ends on top', at: [64, 22] }, { text: 'short end', at: [4, 36] }] },
  ],
};
