import { P, cat, line, arc, resample, padStart, partial, extend } from './_lib.js';

// Square knot (reef knot). Two strands: a (blue) from the left, b (orange)
// from the right, both working. Two half knots stacked up the middle, the
// second the opposite way to the first. Crossings X1..X4 lie on x = 50:
//   X1 a over b   X2 a under b   X3 a under b   X4 a over b     (a: O U U O)
// Each strand is a chain of fixed-count segments:
//   S    standing part, from off screen to X1                 6 points
//   1    lens X1 -> X2   (a bulges right, b bulges left)       8 points
//   2    lens X2 -> X3   (a bulges left,  b bulges right)      8 points
//   3    lens X3 -> X4   (a bulges right, b bulges left)       8 points
//   T    the tail beyond X4                                    5 points
const nS = 6, nL = 8, nT = 5;
const LEN = 170;
const TURN = 120, Y = [61, 49, 37, 25];          // loose knot: turning angle, crossing heights
const TURN5 = 130, Y5 = [55, 46, 37, 28];        // dressed knot

// Lens from (50, yFrom) up to (50, yTo), bulging to side (+1 right, -1 left).
// z holds z0 near the start and z1 near the end, flipping at the widest point.
function lens(yFrom, yTo, side, z0, z1, turn) {
  const half = turn / 2, c = yFrom - yTo;
  const r = c / (2 * Math.sin((half * Math.PI) / 180)), D = r * Math.cos((half * Math.PI) / 180);
  const cy = (yFrom + yTo) / 2;
  const zf = (phi) => (phi > 10 ? z0 : phi < -10 ? z1 : z0 + ((z1 - z0) * (10 - phi)) / 20);
  if (side > 0) return arc(50 - D, cy, r, half, -half, nL, (a) => zf(a));
  return arc(50 + D, cy, r, 180 - half, 180 + half, nL, (a) => zf(180 - a));
}
const lensLen = (c, turn) => (c / (2 * Math.sin((turn / 2) * (Math.PI / 180)))) * ((turn * Math.PI) / 180);
const LL = lensLen(12, TURN);                    // 14.1: length of one loose lens
const ray = (from, to, parts) => {               // straight segments laid end to end from `from` toward `to`
  const d = [to[0] - from[0], to[1] - from[1]], L = Math.hypot(d[0], d[1]), u = [d[0] / L, d[1] / L];
  let p = from; const out = [];
  for (const [len, n, z] of parts) { const q = [p[0] + u[0] * len, p[1] + u[1] * len, z]; out.push(line([p[0], p[1], z], q, n, z)); p = q; }
  return out;
};
const mx = (pts) => pts.map((p) => [100 - p[0], p[1], p[2]]);   // mirror a point list about x = 50
const poseA = (...segs) => padStart(cat(...segs), LEN, [-1, 0]);
const poseB = (...segs) => padStart(cat(...segs), LEN, [1, 0]);

// ---- a (blue) ----
const SA = resample([P(-8, 76, 0), P(18, 76, 0), P(36, 70, 0), P(44, 65, 0.6), P(50, 61, 1)], nS);
const A1 = lens(Y[0], Y[1], 1, 1, -1, TURN);
const A2 = lens(Y[1], Y[2], -1, -1, -1, TURN);
const A3 = lens(Y[2], Y[3], 1, -1, 1, TURN);
const TL = 12;                                   // tail beyond X4
const A4 = extend(A3, TL, nT, [38, 17]);
// ---- b (orange) ----
const SB = mx(SA);
const B1 = lens(Y[0], Y[1], -1, -1, 1, TURN);
const B2 = lens(Y[1], Y[2], 1, 1, 1, TURN);
const B3 = lens(Y[2], Y[3], -1, 1, -1, TURN);
const B4 = extend(B3, TL, nT, [62, 17]);

// 0: both ropes lie toward the middle, ends a little apart, not yet crossing.
const u0 = [0.983, -0.184];
const T0 = [46, 64];
const a0 = poseA(...ray([T0[0] - 88 * u0[0], T0[1] - 88 * u0[1]], T0, [[34, nS, 1], [LL, nL, 1], [LL, nL, 1], [LL, nL, 1], [TL, nT, 1]]));
const b0 = poseB(mx(cat(...ray([T0[0] - 88 * u0[0], T0[1] - 88 * u0[1]], T0, [[34, nS, -1], [LL, nL, -1], [LL, nL, -1], [LL, nL, -1], [TL, nT, -1]]))));
// 1: blue over orange at X1, both ends pointing up and out.
const a1s = [line(P(50, 61, 1), P(61.5, 53, 1), nL)];
a1s.push(extend(a1s[0], LL, nL, [76, 40])); a1s.push(extend(a1s[1], LL, nL, [88, 30])); a1s.push(extend(a1s[2], TL, nT, [92, 22]));
const a1 = poseA(SA, ...a1s);
const b1 = poseB(SB, ...a1s.map((s) => mx(s).map((p) => [p[0], p[1], -1])));
// Lifted end: the lens laid 60 percent (past its widest point, so its depth has already flipped),
// the rest of the rope up at about 70 degrees leaning outward, the tail curling out.
const lift = (L, side, rest) => {
  const far = [50 + side * 40, -60], s = [partial(L, 0.6, nL, far)];
  rest.forEach((len, i) => s.push(extend(s[s.length - 1], len, i === rest.length - 1 ? nT : nL, i === rest.length - 1 ? [50 + side * 45, 20] : far)));
  return s;
};
// 2a: both ends lifted, blue (right) already behind. 2b: orange swings right over. 2: blue swings left under: first half knot.
const a2a = poseA(SA, ...lift(A1, 1, [LL, LL, TL])), b2a = poseB(SB, ...lift(B1, -1, [LL, LL, TL]));
const b2s = [B1, extend(B1, LL, nL)]; b2s.push(extend(b2s[1], LL, nL, [84, 28])); b2s.push(extend(b2s[2], TL, nT, [96, 26]));
const a2s = [A1, extend(A1, LL, nL)]; a2s.push(extend(a2s[1], LL, nL, [16, 28])); a2s.push(extend(a2s[2], TL, nT, [4, 26]));
const b2 = poseB(SB, ...b2s), a2 = poseA(SA, ...a2s);
// 3a: lifted again, blue left, orange right (in front). 3b: blue swings right under it. 3: orange swings left over.
const a3a = poseA(SA, A1, ...lift(A2, -1, [LL, TL])), b3a = poseB(SB, B1, ...lift(B2, 1, [LL, TL]));
const a3s = [A1, A2, extend(A2, LL, nL)]; a3s.push(extend(a3s[2], TL, nT, [86, 18]));
const b3s = [B1, B2, extend(B2, LL, nL)]; b3s.push(extend(b3s[2], TL, nT, [14, 18]));
const a3 = poseA(SA, ...a3s), b3 = poseB(SB, ...b3s);
// 4a: lifted, blue right (in front), orange left (behind). 4b: blue swings left over. 4: orange swings right under: second half knot.
const a4a = poseA(SA, A1, A2, ...lift(A3, 1, [TL])), b4a = poseB(SB, B1, B2, ...lift(B3, -1, [TL]));
const a4 = poseA(SA, A1, A2, A3, A4), b4 = poseB(SB, B1, B2, B3, B4);
// 5: pulled tight: same crossings, closer together, ends folded out beside their standing parts.
const SA5 = resample([P(-8, 70, 0), P(20, 69, 0), P(38, 62, 0), P(44, 59, 0.6), P(50, 55, 1)], nS);
const A15 = lens(Y5[0], Y5[1], 1, 1, -1, TURN5), A25 = lens(Y5[1], Y5[2], -1, -1, -1, TURN5), A35 = lens(Y5[2], Y5[3], 1, -1, 1, TURN5);
const A45 = resample([P(50, 28, 1), P(45.5, 25, 1), P(38, 24, 0.5), P(26, 26, 0)], nT);
const a5 = poseA(SA5, A15, A25, A35, A45);
const b5 = poseB(mx(SA5), lens(Y5[0], Y5[1], -1, -1, 1, TURN5), lens(Y5[1], Y5[2], 1, 1, 1, TURN5), lens(Y5[2], Y5[3], -1, 1, -1, TURN5), mx(A45).map((p) => [p[0], p[1], -p[2]]));

const F = (a, b) => ({ a, b });

export default {
  id: 'square-knot',
  name: 'Square Knot',
  aka: ['Reef knot'],
  category: 'binding',
  abok: [1204],
  difficulty: 1,
  summary: 'Two half knots, the second tied the opposite way to the first. Binds a bundle or the two ends of a cord round something. Not for joining two ropes.',
  uses: [
    'Tie a bundle of firewood or tent poles together with a length of cord.',
    'Tie off a bandage or an arm sling.',
    'Close a rolled tarp or sleeping pad with its own straps or a cord.',
    'Reef points on a sail, the original use. Shoelaces are a square knot with both ends slipped.',
  ],
  pros: ['Fast and easy to remember.', 'Lies flat against the bundle.', 'Unties easily, even after the cord has been wet.'],
  cons: ['Holds only while the bundle presses back against it.', 'Spills when one end is tugged: it turns into a girth hitch and slides off.'],
  warnings: [
    'Never use it to join two ropes under load: climbing, hauling, towing, a rope swing. It capsizes and slips. Use a double fisherman\'s, a figure eight bend or a sheet bend.',
    'Loose cord round a soft bundle works free. Add an overhand knot in each end, or use a constrictor knot or a packer\'s knot.',
  ],
  check: 'Look at one side of the knot. The end and the standing part leave together, parallel, both over or both under the bight of the other cord. Say it as you look: left over right, then right over left. If the ends poke out at right angles to the standing parts and the knot twists on itself, both half knots were tied the same way. That is a granny knot. It slips under load and jams when it does hold. Untie it and tie the second half knot the other way.',
  tips: [
    'Say it as you tie: left over right and under, right over left and under.',
    'To untie, pull one end back along its own standing part. That cord straightens, the other cord becomes a girth hitch round it, and slides off.',
  ],
  related: ['surgeons-knot', 'constrictor-knot', 'packers-knot', 'sheet-bend', 'overhand'],
  ropeWidth: 4,
  strands: [
    { id: 'b', color: 'orange', end: 'working' },
    { id: 'a', color: 'blue', end: 'working' },
  ],
  steps: [
    { title: 'Start', text: 'The cord comes round the bundle from both sides: blue from the left, orange from the right. Both ends are working ends, marked with a pale band. Bring them together in the middle.', pose: F(a0, b0),
      labels: [{ text: 'standing part', at: [6, 83] }, { text: 'standing part', at: [94, 83], anchor: 'right' }, { text: 'working ends', at: [50, 56], anchor: 'center' }] },
    { title: 'Blue over orange', text: 'Lift both ends. Cross the blue end over the orange end, left over right. The blue lies on top at the crossing.', frames: [F(a1, b1)], dur: 1.4,
      labels: [{ text: 'blue over', at: [50, 77], anchor: 'center' }] },
    { title: 'Tuck blue under', text: 'Bring both ends up. Swing the orange end out to the right, then take the blue end behind it and out to the left, under the orange. This is the first half knot. Blue now points up and left, orange up and right.', frames: [F(a2a, b2a), F(a2a, b2), F(a2, b2)], dur: [1.0, 1.0, 1.2],
      labels: [{ text: 'blue under', at: [68, 50] }] },
    { title: 'Orange over blue', text: 'Bring both ends up again. Swing the blue end to the right, then cross the orange end over it to the left, right over left. The orange lies on top.', frames: [F(a3a, b3a), F(a3, b3a), F(a3, b3)], dur: [1.0, 1.0, 1.2],
      labels: [{ text: 'orange over', at: [68, 38] }] },
    { title: 'Tuck orange under', text: 'Lift the ends. Swing the blue end out to the left, then take the orange end behind it and out to the right, under the blue. This second half knot is tied the opposite way to the first.', frames: [F(a4a, b4a), F(a4, b4a), F(a4, b4)], dur: [1.0, 1.0, 1.2],
      labels: [{ text: 'orange under', at: [32, 22], anchor: 'right' }] },
    { title: 'Pull tight', text: 'Pull the two standing parts apart and hold the ends too. The knot flattens into two interlocked bights. Each end lies beside its own standing part, on the same side.', frames: [F(a5, b5)], dur: 1.5,
      labels: [{ text: 'ends beside their standing parts', at: [50, 14], anchor: 'center' }] },
  ],
};
