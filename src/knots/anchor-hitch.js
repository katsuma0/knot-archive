import { P, cat, line, resample, padStart, arc, bunch } from './_lib.js';

// Anchor hitch (fisherman's bend). The ring hangs at the top; the standing
// part comes up from below on the right. The end goes up through the ring
// from front to back twice (a round turn on the bottom bar, the second pass
// to the left of the first), comes forward, goes OVER the standing part to
// the right, up its right side, and then left along the ring UNDER both turns
// (inside the round turn, between the turns and the ring). A half hitch round
// the standing part below finishes it.
//
// Segments (fixed point counts), every frame built from the same chain:
//   SP standing part      F1 B1  first pass: up in front, hairpin in the hole, down behind
//   F2 B2 second pass     Ha Hb Hc  forward, over the standing part, up its right side
//   K1 K2 K3  the tuck along the ring, under F1, over B1, under F2, over B2
//   Ja Jb Jc1 Jc2  the half hitch     TL the tail
// Segments not laid yet wait bunched at the end of the last laid one.
const ring = { type: 'ring', cx: 50, cy: 22, r: 10, t: 3 };
const pol = (th, r, z) => P(50 + r * Math.cos((th * Math.PI) / 180), 22 + r * Math.sin((th * Math.PI) / 180), z);
const R = resample;
const LEN = 350;
const nS = 7, nF = 7, nB = 9, nH = 6, nK = 7, nJ = 6, nT = 7;
const CN = [nS, nF, nB, nB, nF, nH, nH, nH, nK, nK, nK, nJ, nJ, nJ, nJ, nT];
const pose = (...segs) => {
  const last = segs[segs.length - 1], tip = last[last.length - 1];
  const all = [...segs];
  for (let i = segs.length; i < CN.length; i++) all.push(bunch(tip, CN[i]));
  return padStart(cat(...all), LEN, [0, 1]);
};
const at = (p, z) => P(p[0], p[1], z);

// ---- the round turn. Hairpins A1, A2 sit inside the hole, where the rope goes from front to back.
const SP = R([P(62, 100, 0), P(62, 76, 0), P(61.8, 58, 0), P(61.3, 46, 0), P(60.5, 38, 0.5)], nS);
const A1 = pol(67, 6, 0), A2 = pol(113, 6, 0);
const f1 = (za) => R([P(60.5, 38, 0.5), pol(54, 15, 0.9), pol(61, 10, 1), pol(64, 8, 0.8), at(A1, za)], nF);
const b1 = (lo) => R([A1, pol(72, 8, -0.8), pol(75, 10, -1), pol(78, 15, -0.9), ...(lo ? [P(52.8, 40.5, -0.6), P(51.8, 43, -0.3), P(50, 44.3, 0)] : [pol(85, 17.5, -0.5), pol(90, 19, 0)])], nB);
const f2 = (lo, za) => R([...(lo ? [P(50, 44.3, 0), P(48.2, 43, 0.3), P(47.2, 40.5, 0.6)] : [pol(90, 19, 0), pol(95, 17.5, 0.5)]), pol(102, 15, 0.9), pol(105, 10, 1), pol(108, 8, 0.8), at(A2, za)], nB);
const b2 = (lo) => R([A2, pol(116, 8, -0.8), pol(119, 10, -1), pol(126, 15, -0.9), lo ? P(38.5, 40, -0.5) : P(39.5, 38, -0.4)], nF);
const F1 = f1(0), B1L = b1(true), B1S = b1(false), F2L = f2(true, 0), F2S = f2(false, 0), B2L = b2(true), B2S = b2(false);

// ---- first hitch: forward, over the standing part, up its right side to the ring (L loose, S snug)
const E = pol(35, 15, 0);
const HaL = R([P(38.5, 40, -0.5), P(39.5, 44.5, 0.2), P(44, 48.5, 0.8), P(52, 50.5, 1), P(56, 50.8, 1)], nH);
const HaS = R([P(39.5, 38, -0.4), P(41.5, 42.5, 0.2), P(46, 45.5, 0.8), P(52, 46.5, 1), P(56, 46.6, 1)], nH);
const HbL = R([P(56, 50.8, 1), P(62, 51.2, 1), P(67, 49.7, 0.6), P(69, 44, 0.2)], nH);
const HbS = R([P(56, 46.6, 1), P(61.5, 46.8, 1), P(65.5, 45.5, 0.6), P(67, 41.5, 0.2)], nH);
const HcL = R([P(69, 44, 0.2), P(68.5, 39, 0.1), P(67.5, 34, 0), P(65, 30.7, 0), E], nH);
const HcS = R([P(67, 41.5, 0.2), P(66.8, 37, 0.1), P(65.8, 33, 0), P(64.3, 31, 0), E], nH);
// the tuck, in three pushes along the ring (z 0: under the front legs, over the back legs)
const K1 = arc(50, 22, 15, 35, 70, nK, 0), K2 = arc(50, 22, 15, 70, 110, nK, 0), K3 = arc(50, 22, 15, 110, 142, nK, 0);

// ---- second half hitch: down the left, over the standing part, round, behind it, out under its own strand
const X = pol(142, 15, 0);
const JaL = R([X, P(35.5, 30.2, 0.2), P(32.3, 32.8, 0.5), P(31, 38.5, 0.8), P(31.5, 46, 1)], nJ);
const JaS = R([X, P(35.5, 30.5, 0.2), P(33.3, 34, 0.5), P(33.5, 40, 0.8), P(35.5, 45.5, 1)], nJ);
const JbL = R([P(31.5, 46, 1), P(33.5, 54, 1), P(37.5, 61.5, 1), P(45, 66, 1), P(55, 67.6, 1)], nJ);
const JbS = R([P(35.5, 45.5, 1), P(38.5, 51, 1), P(43, 56, 1), P(50, 59.3, 1), P(55, 60.2, 1)], nJ);
const Jc1L = R([P(55, 67.6, 1), P(62, 68, 1), P(66.5, 66.5, 0.6), P(68.5, 62, 0)], nJ);
const Jc1S = R([P(55, 60.2, 1), P(61.5, 60.5, 1), P(65.5, 59.3, 0.6), P(67.3, 56, 0)], nJ);
const Jc2L = R([P(68.5, 62, 0), P(67.5, 59, -0.4), P(65.5, 57.8, -0.8), P(62, 57.5, -1), P(55, 57.5, -1)], nJ);
const Jc2S = R([P(67.3, 56, 0), P(66.3, 53.8, -0.4), P(64.3, 53, -0.8), P(61.5, 52.8, -1), P(55, 53, -1)], nJ);
const TLL = R([P(55, 57.5, -1), P(46, 57.8, -1), P(40, 58.2, -1), P(35.8, 58.6, -1), P(30, 60, -0.6), P(23, 63, -0.2)], nT);
const TLS = R([P(55, 53, -1), P(47, 53.2, -1), P(42.5, 53.4, -1), P(38, 54, -1), P(32, 55.5, -0.6), P(25, 58.5, -0.2)], nT);

// 0: end held in front of the ring, just below it
const p0 = pose(SP, line(P(60.5, 38, 0.5), P(58, 34.8, 1), nF));
// 1: up through the ring from front to back, then down behind the bottom bar
const p1a0 = pose(SP, f1(0.7), line(at(A1, 0.7), P(51.5, 22, 0.2), nB));
const p1a = pose(SP, F1, line(A1, P(50.5, 8, -1), nB));
const p1b0 = pose(SP, F1, line(A1, P(34, 24, -1), nB));
const p1b = pose(SP, F1, B1L, line(P(50, 44.3, 0), P(50.5, 57, -0.3), nB));
// 2: forward under the ring, up through it again to the left, down behind: the round turn
const p2a0 = pose(SP, F1, B1L, line(P(50, 44.3, 0), P(38, 47, 1), nB));
const p2a = pose(SP, F1, B1L, f2(true, 0.7), line(at(A2, 0.7), P(46.5, 22, 0.2), nF));
const p2b = pose(SP, F1, B1L, F2L, line(A2, P(47, 8, -1), nF));
const p2c = pose(SP, F1, B1L, F2L, line(A2, P(32, 30, -1), nF));
const p2d = pose(SP, F1, B1L, F2L, B2L, line(P(38.5, 40, -0.5), P(38, 53, -0.4), nH));
// 3: over the standing part, up its right side, and left under both turns
const RT = [SP, F1, B1L, F2L, B2L];
const p3a = pose(...RT, HaL);
const p3b = pose(...RT, HaL, HbL);
const p3c = pose(...RT, HaL, HbL, HcL);
const p3d = pose(...RT, HaL, HbL, HcL, K1);
const p3e = pose(...RT, HaL, HbL, HcL, K1, K2);
const p3f = pose(...RT, HaL, HbL, HcL, K1, K2, K3);
// 4: half hitch round the standing part
const H1 = [...RT, HaL, HbL, HcL, K1, K2, K3];
const p4a = pose(...H1, JaL);
const p4b = pose(...H1, JaL, JbL);
const p4c = pose(...H1, JaL, JbL, Jc1L);
const p4d = pose(...H1, JaL, JbL, Jc1L, Jc2L);
const p4e = pose(...H1, JaL, JbL, Jc1L, Jc2L, TLL);
// 5: snug
const p5 = pose(SP, F1, B1S, F2S, B2S, HaS, HbS, HcS, K1, K2, K3, JaS, JbS, Jc1S, Jc2S, TLS);

export default {
  id: 'anchor-hitch',
  name: 'Anchor Hitch',
  aka: ["Fisherman's bend", 'Anchor bend'],
  category: 'hitches',
  abok: [1841],
  difficulty: 2,
  summary: 'A round turn through a ring, locked by a half hitch tucked under the turns and backed by a second half hitch. It holds when the line goes slack, wet and tight again.',
  uses: [
    'Tie the rode to the ring or shackle of a kayak, canoe or small boat anchor.',
    'Tie a canoe painter to a bow ring or a mooring ring.',
    'Tie a bear bag line to a steel ring or a carabiner.',
    'Fix a line to a ring bolt on a dock or a rock anchor that will be loaded and unloaded all day.',
  ],
  pros: [
    'Stays put when the line goes slack and tight over and over, as an anchor line does in waves.',
    'The round turn spreads the load on the ring and cuts chafe.',
    'Compact. It does not slide round a smooth metal ring.',
  ],
  cons: [
    'Hard to untie after a heavy load, worst in wet rope. Treat it as semi-permanent.',
    'Must be tied with the end. You cannot tie it in a bight.',
    'The ring or eye must be big enough for two passes of the rope.',
  ],
  warnings: [
    'On an anchor that stays down for days, seize or tape the tail to the standing part. Constant working can loosen the last hitch.',
    'In stiff or slick synthetic rope, add a third half hitch.',
    'If you need to cast off fast under load, tie a round turn and two half hitches instead.',
  ],
  check: 'Find the first half hitch. Its end runs under both turns of the round turn, between the turns and the ring, so the turns pinch it against the ring. If the first hitch only goes round the standing part, you tied a round turn and two half hitches.',
  tips: [
    'Keep the round turn slack until the tuck is through. Tight turns leave no room for the end.',
    'Pull the standing part hard to clamp the turns on the tucked end, then work the last half hitch up snug.',
    'Leave a tail at least ten rope widths long.',
  ],
  related: ['round-turn-two-half-hitches', 'two-half-hitches', 'buntline-hitch', 'clove-hitch', 'bowline'],
  ropeWidth: 4,
  view: { x: 13, y: 2, w: 74, h: 74 },
  props: [ring],
  strands: [{ id: 'a', color: 'orange', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Bring the rope up to the ring from below. The standing part runs down to the load. Hold the working end, with the pale band, in front of the ring.', pose: p0,
      labels: [{ text: 'standing part', at: [58, 70], anchor: 'right' }, { text: 'working end', at: [65, 36] }, { text: 'ring', at: [50, 6], anchor: 'center' }] },
    { title: 'Through the ring', text: 'Push the end up through the ring from front to back. Bring it down behind the bottom of the ring and let it hang.', frames: [p1a0, p1a, p1b0, p1b], dur: [0.8, 0.6, 0.7, 0.8] },
    { title: 'Through again: the round turn', text: 'Bring the end forward under the ring and up through it a second time, to the left of the first pass. Bring it down behind. Leave both turns slack.', frames: [p2a0, p2a, p2b, p2c, p2d], dur: [0.7, 0.8, 0.6, 0.7, 0.8],
      labels: [{ text: 'round turn', at: [66, 22] }] },
    { title: 'Round the standing part, under both turns', text: 'Bring the end forward and over the standing part to the right. Take it up the right side, then left along the ring UNDER both turns, between the turns and the ring. It comes out on the left.', frames: [p3a, p3b, p3c, p3d, p3e, p3f], dur: [0.8, 0.7, 0.7, 0.6, 0.7, 0.6],
      labels: [{ text: 'under', at: [35, 18], anchor: 'right' }, { text: 'both turns', at: [35, 22], anchor: 'right' }] },
    { title: 'Half hitch', text: 'Take the end down the left and over the standing part to the right. Bring it round and back left behind the standing part, then out under its own strand.', frames: [p4a, p4b, p4c, p4d, p4e], dur: [0.8, 0.8, 0.7, 0.7, 0.8],
      labels: [{ text: 'half hitch', at: [47, 73.5], anchor: 'center' }] },
    { title: 'Snug it down', text: 'Pull the standing part hard. The turns close up and pinch the tucked end against the ring. Push the half hitch up snug under the first.', frames: [p5], dur: 1.4 },
  ],
};
