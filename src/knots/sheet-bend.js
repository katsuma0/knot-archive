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
