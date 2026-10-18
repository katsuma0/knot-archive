import { P, cat, resample, padStart, pathLength } from './_lib.js';

// Figure eight on a bight. ONE strand models the doubled rope: it comes down
// from off screen top (leg A), runs through the knot to the bight end, turns
// through a half circle (U) and runs back along the same path 1.1 rope widths
// to the side (leg B), then off the top again. The poses describe only the
// CENTRE LINE of the doubled rope, as a chain of named segments with fixed
// point counts; doubled() offsets it to both sides and adds the U.
//   S     standing part, off screen top down to the loop start          8 points
//   LOOP  bottom side (X4, over), round the right end, top side (X3, under),
//         back OVER the standing part (X1), pointing down-left          14 points
//   ROUND round the left lobe and right BEHIND the standing part (X2)   10 points
//   THRU  right, OVER the top side of the loop (X3), down the middle     8 points
//   OUT   UNDER the bottom side of the loop (X4), down to the bight      6 points
// Along the centre line the crossings alternate O2 U1 O4 U3 O1 U2 O3 U4, as in
// the single figure eight; here every one is a pair crossing a pair.
const W = 4, D = 0.55 * W; // half spacing of the pair: centre lines 1.1 widths apart
const COUNTS = [8, 14, 10, 8, 6], nU = 9;
const LEN = 800;
const flare = (u) => D + 0.5 * u; // the bight end rounds out a little so the U does not kink
const eye = (u) => (u < 0.25 ? D : D + (11 - D) * ((u - 0.25) / 0.75)); // dressed: the loop opens

// segs: control-point arrays for the centre line, consecutive ones sharing an
// end point. dOf[k]: half spacing of the pair for segment k (number or a
// function of the fraction along that segment). Each segment is densified to
// one point per half unit and the tangent is averaged over 3 units each way,
// so the offset legs stay smooth where the centre line turns a corner.
function doubled(segs, dOf = [D, D, D, D, flare]) {
  const pts = [], half = [], ranges = [];
  segs.forEach((seg, k) => {
    const d = dOf[k] ?? D;
    const start = k ? pts.length - 1 : 0;
    const m = Math.max(2, Math.round(pathLength(seg) / 0.5) + 1);
    resample(seg, m).forEach((p, i) => {
      if (k && i === 0) return;
      pts.push(p);
      half.push(typeof d === 'function' ? d(i / (m - 1)) : d);
    });
    ranges.push([start, pts.length - 1]);
  });
  const n = pts.length, A = [], B = [], K = 4;
  let tx = 0, ty = 1;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[Math.min(n - 1, i + K)], o = pts[Math.max(0, i - K)];
    const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy);
    if (l > 1e-6) { tx = dx / l; ty = dy / l; }
    A.push([p[0] - ty * half[i], p[1] + tx * half[i], p[2]]);
    B.push([p[0] + ty * half[i], p[1] - tx * half[i], p[2]]);
  }
  const segA = ranges.map(([a, b], k) => resample(A.slice(a, b + 1), COUNTS[k]));
  const segB = ranges.map(([a, b], k) => resample(B.slice(a, b + 1), COUNTS[k]));
  const c = pts[n - 1], r = half[n - 1], at = Math.atan2(ty, tx), U = [];
  for (let k = 0; k < nU; k++) { const a = at + Math.PI / 2 - (Math.PI * k) / (nU - 1); U.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2]]); }
  const legB = cat(...segB.map((s) => [...s].reverse()).reverse());
  return padStart(cat(...segA, U, legB), LEN, [0, -1]);
}

// Lay one control path across the trailing segments: fracs[i] of its length
// goes to segment i, the last segment takes the rest. For swing frames.
function lay(path, fracs) {
  const fine = resample(path, 300), out = [];
  let a = 0;
  for (let i = 0; i <= fracs.length; i++) {
    const b = i === fracs.length ? 1 : a + fracs[i];
    out.push(fine.slice(Math.round(a * 299), Math.round(b * 299) + 1));
    a = b;
  }
  return out;
}

// Final (loose) centre line.
const Sc = [P(36, -12, 0), P(36, -2, 0.5), P(36, 6, 1), P(36, 17, 1), P(36.5, 21, 0), P(37, 24, -1), P(38, 31, -1), P(41, 37, -1), P(46, 44, -0.3)];
const LOOPc = [P(46, 44, -0.3), P(53, 51, 0.6), P(64, 55, 1), P(75, 51, 0.8), P(82, 39, 0.3), P(78, 26, -0.3), P(69, 18, -0.8), P(61, 16, -1), P(54, 18, -1), P(49, 22, -0.3), P(45, 25, 0.8), P(41, 28, 1), P(36, 31, 1), P(31, 34, 1)];
const ROUNDc = [P(31, 34, 1), P(23, 38, 0.6), P(16, 34.5, 0), P(13, 26, -0.5), P(16, 16, -1), P(25, 10.5, -1), P(37, 11.5, -1)];
const THRUc = [P(37, 11.5, -1), P(44, 10.5, -0.4), P(50, 12, 0.6), P(54, 16, 1), P(58, 24, 0.9), P(61, 32, 0.3), P(62, 36, -0.5), P(62.3, 41, -1)];
const OUTc = [P(62.3, 41, -1), P(64, 54, -1), P(63, 62, -0.6), P(60, 72, -0.2), P(57, 80, 0)];

// 0: the folded rope hangs straight down
const p0 = doubled([[P(36, -12, 0), P(36, 40, 0)], [P(36, 40, 0), P(36, 54, 0)], [P(36, 54, 0), P(36, 62, 0)], [P(36, 62, 0), P(36, 70, 0)], [P(36, 70, 0), P(36, 78, 0)]]);
// The bight end turns at most about 80 degrees per frame; under linear blending a
// bigger turn folds the U through itself.
// 1pre: bight swung out to the right; 1a: up the right side, in front; 1b: carried over the top, pointing left; 1: laid over the standing part, hanging down-left
const p1pre = doubled([Sc, ...lay([P(46, 44, -0.3), P(55, 49, 0.5), P(64, 51, 1), P(73, 50, 1), P(81, 48, 1)], [0.72, 0.14, 0.08])]);
const p1a = doubled([Sc, ...lay([P(46, 44, -0.3), P(58, 48, 0.5), P(70, 45, 1), P(78, 36, 1), P(82, 27, 1), P(83, 17, 1), P(81, 10, 1)], [0.72, 0.14, 0.08])]);
const p1b = doubled([Sc, ...lay([P(46, 44, -0.3), P(54, 52, 0.6), P(66, 55, 1), P(77, 50, 1), P(83, 38, 1), P(79, 25, 1), P(70, 16, 1), P(60, 14, 1), P(51, 15.5, 1)], [0.84, 0.08, 0.05])]);
const p1 = doubled([Sc, LOOPc, ...lay([P(31, 34, 1), P(24, 37.5, 1), P(17, 39, 0.8), P(10, 39.5, 0.6)], [0.5, 0.28])]);
// 2pre: swung out to the left and dropped behind; 2a: up the left side, still left of the standing part; 2b: pushed behind it, tip just out; 2: out to the right
const p2pre = doubled([Sc, LOOPc, ...lay([P(31, 34, 1), P(23, 38, 0.5), P(15, 36, -0.3), P(9, 30, -0.8)], [0.6, 0.25])]);
const p2a = doubled([Sc, LOOPc, ...lay([P(31, 34, 1), P(23, 38, 0.6), P(16, 34.5, 0), P(13, 26, -0.6), P(15, 16, -1), P(16, 9, -1)], [0.75, 0.15])]);
const p2b = doubled([Sc, LOOPc, ROUNDc, [P(37, 11.5, -1), P(43, 10, -1)], [P(43, 10, -1), P(47, 8.5, -1)]]);
const p2 = doubled([Sc, LOOPc, ROUNDc, ...lay([P(37, 11.5, -1), P(44, 10.5, -0.8), P(50, 8, -0.5), P(55, 6.5, -0.3)], [0.6])]);
// 3a: brought forward, aimed at the top side of the loop; 3: over it and down the middle, tip dipping behind before the bottom side
const p3a = doubled([Sc, LOOPc, ROUNDc, ...lay([P(37, 11.5, -1), P(44, 10.5, -0.4), P(50, 12, 0.7), P(52, 13.5, 1)], [0.85])]);
const p3 = doubled([Sc, LOOPc, ROUNDc, THRUc, [P(62.3, 41, -1), P(63, 46.5, -1)]]);
// 4a: tip just showing below the bottom side; 4: out
const p4a = doubled([Sc, LOOPc, ROUNDc, THRUc, [P(62.3, 41, -1), P(64, 54, -1), P(64.5, 59, -1)]]);
const p4 = doubled([Sc, LOOPc, ROUNDc, THRUc, OUTc]);
// 5: dressed: the knot closes up toward the rope's axis, the loop opens into an eye
const sh = (pts) => pts.map((p) => [48 + (p[0] - 48) * 0.68, 30 + (p[1] - 30) * 0.72, p[2]]);
const S5 = [P(39.8, -12, 0), P(39.8, -2, 0.5), ...sh(Sc.slice(2))];
const OUT5 = [...sh(OUTc.slice(0, 2)), P(57, 54, -0.6), P(56, 62, -0.2), P(55, 70, 0)];
const p5 = doubled([S5, sh(LOOPc), sh(ROUNDc), sh(THRUc), OUT5], [D, D, D, D, eye]);

export default {
  id: 'figure-eight-on-a-bight',
  name: 'Figure Eight on a Bight',
  aka: ['Figure eight loop', 'Flemish loop'],
  category: 'loops',
  abok: [1047],
  difficulty: 2,
  summary: 'A strong fixed loop made by tying a figure eight in a doubled rope. Easy to check by eye, and it can be tied anywhere along the rope.',
  uses: [
    'A loop in the end of a rope to clip into a carabiner at an anchor.',
    'A fixed loop in the middle of a rope: a hanging point on a tarp ridgeline, or a clip-in point for a second person on a rope team.',
    'A hauling loop on a bear bag line or a pack line, to clip a pulley or a carabiner to.',
    'A loop to drop over a stake or a post when the rope end is tied off somewhere else.',
  ],
  pros: ['Keeps more of the rope strength than a bowline or an overhand loop.', 'Easy to inspect: a tidy 8 with two strands side by side all the way through.', 'Stays tied when the rope is slack or shaken. No stopper knot needed.', 'Needs no access to the rope ends.'],
  cons: ['Hard to untie after a heavy load, worse in wet or thin rope.', 'Bulky, and it uses a lot of rope.', 'The loop cannot be tied round a closed object. To tie round a tree or through a ring, use the figure eight follow through.'],
  warnings: ['Dress it before you load it: the two strands must run parallel through the knot with no twist, and all four strands must be pulled tight.', 'Pulling the two legs of the loop in different directions weakens it. For a middle loop loaded in two directions, tie an alpine butterfly.', 'It is a loop, not a bend. To join two ropes, tie a figure eight bend or a double fisherman\'s.'],
  check: 'Look for an 8 with two lobes and four crossings, each crossing made by a doubled strand. The two strands stay side by side through the whole knot and never cross each other. The standing parts leave one end, the loop leaves the other. One lobe and three crossings means you tied an overhand loop.',
  tips: ['Hold the bight as if it were one thick rope and tie an ordinary figure eight with it: over, round behind, down through.', 'Before you tighten, run a finger along both strands and work out any twist so the pairs lie flat.', 'To untie after loading, bend the knot in half across the middle and push the standing parts back into it.'],
  related: ['figure-eight', 'figure-eight-follow-through', 'bowline-on-a-bight', 'alpine-butterfly', 'overhand-loop', 'inline-figure-eight'],
  ropeWidth: W,
  view: { x: 0, y: -4, w: 100, h: 100 },
  strands: [{ id: 'a', color: 'orange', end: 'none' }],
  steps: [
    { title: 'Start', text: 'Fold the rope back on itself to make a long bight. Hold the two standing parts together so they run up and off the top. The folded end at the bottom is the bight. You will move it as if it were one thick rope.', pose: p0,
      labels: [{ text: 'standing parts', at: [44, 8] }, { text: 'bight', at: [44, 76] }] },
    { title: 'Make a loop', text: 'Swing the bight up to the right and round the top. Lay it across the front of the doubled standing part so it hangs down to the left. The bight sits on top at the crossing.', frames: [p1pre, p1a, p1b, p1], dur: [0.8, 0.8, 0.8, 0.9],
      labels: [{ text: 'over', at: [25, 26], anchor: 'center' }] },
    { title: 'Round behind the standing part', text: 'Swing the bight out to the left and up, then push it behind the doubled standing part from left to right. It comes out on the right, above the loop.', frames: [p2pre, p2a, p2b, p2], dur: [0.8, 0.9, 1.0, 0.8],
      labels: [{ text: 'behind', at: [63, 7] }] },
    { title: 'Down through the loop', text: 'Bring the bight forward and lay it over the top side of the loop. Push it down through the middle of the loop.', frames: [p3a, p3], dur: [0.9, 1.4],
      labels: [{ text: 'over', at: [62, 9] }] },
    { title: 'Under the bottom side and out', text: 'Push the bight under the bottom side of the loop and pull it out below. Over, round behind, down through: a figure eight tied in a doubled rope.', frames: [p4a, p4], dur: [1.0, 1.1],
      labels: [{ text: 'under', at: [70, 63] }] },
    { title: 'Snug and dress', text: 'Pull the standing parts and the loop apart. Work the knot so the two strands lie side by side everywhere with no twist. Open the loop to the size you need.', frames: [p5], dur: 1.5 },
  ],
};
