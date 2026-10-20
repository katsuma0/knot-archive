import { P, cat, resample, padStart, pathLength } from './_lib.js';

// Overhand loop. ONE strand models the doubled rope: both strands come in from
// off screen left (leg A), run through the knot to the bight end, turn through
// a half circle (U) and run back along the same path 1.1 rope widths to the
// side (leg B). The poses describe only the CENTRE LINE of the doubled rope as
// named segments with fixed point counts; doubled() offsets it to both sides.
//   S      standing part, off screen left, UNDER the left side (X1)        8 points
//   LOOP   bottom side (X2, over), up the right side (X3, under), round the
//          top, down the left side and OVER the standing part (X1)        16 points
//   ROUND  round below the loop, heading up                               8 points
//   THRU   UNDER the bottom side (X2), up through the middle               8 points
//   OUT    OVER the right side (X3), out to the right                      6 points
// Along the centre line the crossings read U1 O2 U3 O1 U2 O3, an overhand
// knot; here every one is a pair crossing a pair.
const W = 4, D = 0.55 * W; // half spacing of the pair: centre lines 1.1 widths apart
const COUNTS = [8, 16, 8, 8, 6], nU = 9;
const LEN = 800;
const eye = (u) => (u < 0.15 ? D : D + (8 - D) * Math.sin((Math.PI / 2) * ((u - 0.15) / 0.85))); // dressed: the loop opens

// segs: control-point arrays for the centre line, consecutive ones sharing an
// end point. dOf[k]: half spacing for segment k (number or function of the
// fraction along it). Offsets use a tangent averaged over a few units.
function doubled(segs, dOf = []) {
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
  // the bight end rounds out over its last 6 units so the U does not kink
  for (let i = n - 1, s = 0; i >= 0 && s < 6; i--) {
    if (i < n - 1) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    const u = Math.max(0, 1 - s / 6);
    half[i] += 0.5 * u * u * (3 - 2 * u);
  }
  let tx = 1, ty = 0;
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
  for (let k = 1; k < nU - 1; k++) { const a = at + Math.PI / 2 - (Math.PI * k) / (nU - 1); U.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2]]); }
  const legB = cat(...segB.map((s) => [...s].reverse()).reverse());
  return padStart(cat(...segA, U, legB), LEN);
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
const Sc = [P(-12, 62, 0), P(6, 62, 0), P(18, 62, 0), P(25, 62, -1), P(32, 62, -1), P(39, 62, -1), P(45, 62, 0)];
const LOOPc = [P(45, 62, 0), P(50, 62, 1), P(57, 62, 1), P(64, 61, 1), P(71, 57, 0.3), P(76, 50, -0.8), P(78, 42, -1), P(77, 34, -0.8), P(72, 25, 0), P(62, 19, 0), P(50, 18, 0), P(40, 22, 0), P(33, 31, 0.3), P(30, 42, 0.8), P(31, 52, 1), P(32, 62, 1), P(33, 70, 0.6)];
const ROUNDc = [P(33, 70, 0.6), P(35, 78, 0.2), P(41, 84, -0.3), P(49, 85, -0.7), P(55, 81, -1), P(57, 75, -1)];
const THRUc = [P(57, 75, -1), P(57, 68, -1), P(57, 62, -1), P(58, 55, -0.6), P(61, 50, 0.3), P(64, 48, 0.9), P(67, 47, 1)];
const OUTc = [P(67, 47, 1), P(72, 45, 1), P(78, 42.5, 1), P(84, 40, 1), P(90, 37.5, 0.5)];

// 0: the folded rope lies straight, bight to the right
const p0 = doubled([Sc, [P(45, 62, 0), P(60, 62, 0)], [P(60, 62, 0), P(68, 62, 0)], [P(68, 62, 0), P(76, 62, 0)], [P(76, 62, 0), P(84, 62, 0)]]);
// 1pre: bight lifted up to the right; 1a: up the right side; 1b: over the top, pointing left; 1: down over the standing part
const p1pre = doubled([Sc, ...lay([P(45, 62, 0), P(57, 61, 0.6), P(67, 57, 1), P(76, 51, 1), P(83, 45, 1)], [0.72, 0.14, 0.08])]);
const p1a = doubled([Sc, ...lay([P(45, 62, 0), P(57, 62, 1), P(67, 60, 1), P(75, 54, 1), P(80, 45, 1), P(81, 34, 1), P(79, 24, 1)], [0.72, 0.14, 0.08])]);
const p1b = doubled([Sc, ...lay([P(45, 62, 0), P(57, 62, 1), P(68, 59, 1), P(76, 51, 1), P(79, 40, 1), P(75, 28, 1), P(66, 20, 1), P(55, 17, 1), P(45, 18, 1)], [0.84, 0.08, 0.05])]);
const p1c = doubled([Sc, ...lay([P(45, 62, 0), P(57, 62, 1), P(64, 61, 1), P(71, 57, 1), P(76, 50, 1), P(78, 42, 1), P(77, 34, 1), P(72, 25, 1), P(62, 19, 1), P(50, 18, 1), P(40, 22, 1), P(33, 31, 1), P(30, 42, 1), P(30, 48, 1)], [0.9, 0.05, 0.03])]);
const p1 = doubled([Sc, LOOPc, ...lay([P(33, 70, 0.6), P(33, 76, 0.5), P(33, 83, 0.5)], [0.5, 0.28])]);
// 2pre: swung round to the right below the loop, dropping behind; 2a: pointing up under the bottom side;
// 2b: pushed under it, tip just inside the loop; 2: up through the middle, tip lifted in front
const p2pre = doubled([Sc, LOOPc, ...lay([P(33, 70, 0.6), P(34, 77, 0.3), P(38, 83, -0.2), P(45, 87, -0.7)], [0.6, 0.25])]);
const p2pre2 = doubled([Sc, LOOPc, ...lay([P(33, 70, 0.6), P(35, 78, 0.2), P(41, 84, -0.3), P(49, 85, -0.8), P(54, 84, -1)], [0.75, 0.15])]);
const p2a = doubled([Sc, LOOPc, ROUNDc, ...lay([P(57, 75, -1), P(57, 74, -1)], [0.5])]);
const p2b = doubled([Sc, LOOPc, ROUNDc, ...lay([P(57, 75, -1), P(57, 62, -1), P(58, 55, -0.7), P(59, 50, -0.5)], [0.8])]);
const p2 = doubled([Sc, LOOPc, ROUNDc, THRUc, [P(67, 47, 1), P(69, 46.2, 1)]]);
// 3: over the right side and out
const p3 = doubled([Sc, LOOPc, ROUNDc, THRUc, OUTc]);
// 4: dressed: the knot closes up, the loop opens out to the right
const sh = (pts) => pts.map((p) => [44 + (p[0] - 54) * 0.54, 54 + (p[1] - 52) * 0.54, p[2]]);
const S4 = [P(-12, 59, 0), P(6, 59, 0), P(20, 59, 0), ...sh(Sc.slice(3))];
const OUT4 = [...sh(OUTc.slice(0, 3)), P(66, 48, 0.6), P(76, 48, 0.2), P(84, 48, 0)];
const p4 = doubled([S4, sh(LOOPc), sh(ROUNDc), sh(THRUc), OUT4], [D, D, D, D, eye]);

export default {
  id: 'overhand-loop',
  name: 'Overhand Loop',
  aka: ['Overhand knot on a bight', 'Loop knot'],
  category: 'loops',
  abok: [1009],
  difficulty: 1,
  summary: 'An overhand knot tied in a doubled rope. The quickest fixed loop there is, for light loads and loops you do not need to untie.',
  uses: [
    'A loop in the end of a guy line to drop over a tent stake or hook onto a tarp tie-out.',
    'A hanging loop in thin cord: a headlamp lanyard, a water bottle, a food bag on a ridgeline.',
    'A loop in a line you plan to cut off later, such as a temporary hang loop for a pack.',
    'A clip-in loop in the middle of a clothesline or a gear line at camp.',
  ],
  pros: ['Fast to tie, even in the dark or with cold hands.', 'Easy to remember: it is the overhand knot, tied with two strands.', 'Does not shake loose when the line goes slack, unlike a bowline.', 'Needs no access to the rope end, so it can go anywhere along the line.'],
  cons: ['Jams hard after a load. In thin or wet cord you may have to cut it out.', 'Weakens the rope more than a figure eight on a bight.', 'The loop size is hard to change once the knot is tight.'],
  warnings: [
    'Do not use it to tie in for climbing or to build an anchor. Use a figure eight on a bight or a figure eight follow through.',
    'Pulling the two legs of the loop apart can roll and deform the knot. For a middle loop loaded in several directions, tie an alpine butterfly.',
    'Near the end of a rope, leave a tail of at least a hand width beyond the knot.',
  ],
  check: 'An overhand knot with every strand doubled: three crossings, and the two strands stay side by side through all of them with no twist. The standing strands leave one side, the loop leaves the other. Two lobes and four crossings means you tied a figure eight on a bight.',
  tips: ['Treat the folded end as one rope and tie an ordinary overhand knot with it.', 'Set the loop size before you tighten, then pull each of the four strands in turn.', 'To free a jammed one, bend the knot back and forth and push the loop back into it.'],
  related: ['overhand', 'figure-eight-on-a-bight', 'surgeons-loop', 'alpine-butterfly', 'bowline', 'slip-knot'],
  ropeWidth: W,
  view: { x: -4, y: -2, w: 108, h: 108 },
  strands: [{ id: 'a', color: 'orange', end: 'none' }],
  steps: [
    { title: 'Start', text: 'Fold the rope back on itself to make a long bight. Hold the two strands together so they run off to the left. The folded end on the right is the bight. Move it as if it were one thick rope.', pose: p0,
      labels: [{ text: 'standing parts', at: [4, 53] }, { text: 'bight', at: [86, 54], anchor: 'right' }] },
    { title: 'Make a loop', text: 'Swing the bight up and round to the left. Lay it across the front of the doubled standing part so it hangs down. The bight is on top at the crossing.', frames: [p1pre, p1a, p1b, p1c, p1], dur: [0.7, 0.7, 0.7, 0.7, 0.8],
      labels: [{ text: 'over', at: [20, 74], anchor: 'center' }] },
    { title: 'Under the bottom of the loop', text: 'Bring the bight round to the right below the loop. Push it under the bottom side of the loop and up through the middle.', frames: [p2pre, p2pre2, p2a, p2b, p2], dur: [0.7, 0.7, 0.7, 1.0, 0.9],
      labels: [{ text: 'under', at: [68, 76] }] },
    { title: 'Over and out', text: 'Take the bight over the right side of the loop and pull it out to the right. You now have an overhand knot in a doubled rope.', frames: [p3], dur: 1.2,
      labels: [{ text: 'over', at: [91, 51], anchor: 'center' }] },
    { title: 'Snug and dress', text: 'Pull the standing parts to the left and the loop to the right. Work the two strands so they lie side by side with no twist, then pull each one tight. Size the loop as you go.', frames: [p4], dur: 1.5,
      labels: [{ text: 'standing parts', at: [2, 70] }, { text: 'loop', at: [80, 62], anchor: 'center' }] },
  ],
};
