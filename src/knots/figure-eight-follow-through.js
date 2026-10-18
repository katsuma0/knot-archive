import { P, cat, resample, padStart, pathLength, partial, extend, arc, bunch } from './_lib.js';

// Figure eight follow through. Standing part comes down from off screen top,
// the ring (harness tie-in) sits at the bottom. A loose figure eight is tied
// in the single rope, the end goes behind the top rim of the ring and back
// out, then traces the eight alongside the first strand and leaves beside
// the standing part. The eight is described once as a CENTRE LINE of five
// segments (Sc LOOPc ROUNDc THRUc OUTc, same crossings as figure-eight-on-a-
// bight: O2 U1 O4 U3 O1 U2 O3 U4). The first rope is that line offset D to
// one side (A), the traced strand is the offset to the other side (B) run
// backwards, so the pair sits 1.1 rope widths apart with the same z all the
// way through. Strand segments, fixed counts: A chain 8+14+10+8+6, then
// DOWN (behind the rim) 4, U (in the hole) 7, UP (in front of the rim) 4,
// FOLLOW (the traced path plus the tail) 44.
const W = 4, D = 0.55 * W;
const COUNTS = [8, 14, 10, 8, 6];
const nDown = 4, nU = 7, nUp = 4, nF = 44;
const LEN = 720;
const ring = { type: 'ring', cx: 59, cy: 95, r: 7, t: 2.2 };
const FULL = { x: -2, y: -6, w: 104, h: 110 }, ZOOM = { x: 4, y: 12, w: 92, h: 92 };

// Offset a chain of centre-line segments by D to one side (+1 left of the
// direction of travel, -1 right). Tangents are averaged over 2 units each way
// so the offset stays smooth at corners. Returns the fine polyline and the
// index range of each segment.
function offset(segs, side) {
  const pts = [], ranges = [];
  segs.forEach((seg, k) => {
    const start = k ? pts.length - 1 : 0;
    const m = Math.max(2, Math.round(pathLength(seg) / 0.5) + 1);
    resample(seg, m).forEach((p, i) => { if (!(k && i === 0)) pts.push(p); });
    ranges.push([start, pts.length - 1]);
  });
  const n = pts.length, out = [], K = 4;
  let tx = 0, ty = 1;
  for (let i = 0; i < n; i++) {
    const q = pts[Math.min(n - 1, i + K)], o = pts[Math.max(0, i - K)];
    const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy);
    if (l > 1e-6) { tx = dx / l; ty = dy / l; }
    out.push([pts[i][0] - side * ty * D, pts[i][1] + side * tx * D, pts[i][2]]);
  }
  return { pts: out, ranges };
}
const sideA = (segs) => { const { pts, ranges } = offset(segs, 1); return ranges.map(([a, b], k) => resample(pts.slice(a, b + 1), COUNTS[k])); };
// Lay one swing path across the trailing centre segments: fracs[i] of its length to segment i, the last takes the rest.
function lay(path, fracs) {
  const fine = resample(path, 300), out = [];
  let a = 0;
  for (let i = 0; i <= fracs.length; i++) { const b = i === fracs.length ? 1 : a + fracs[i]; out.push(fine.slice(Math.round(a * 299), Math.round(b * 299) + 1)); a = b; }
  return out;
}
// Ring and follow segments before they are used: a straight run of len units on from the end of the eight.
function slack(A, len, toward = null) {
  const d = extend(A[A.length - 1], len * 0.2, nDown, toward), u = extend(d, len * 0.2, nU), up = extend(u, len * 0.2, nUp);
  return [d, u, up, extend(up, len * 0.4, nF)];
}
const pose = (A, tail) => padStart(cat(...A, ...tail), LEN, [0, -1]);

// Final loose centre line.
const Sc = [P(38, -12, 0), P(38, 10, 0.5), P(38, 21, 1), P(38, 32, 1), P(38.5, 36, 0), P(39, 39, -1), P(40, 46, -1), P(43, 52, -1), P(48, 59, -0.3)];
const LOOPc = [P(48, 59, -0.3), P(55, 66, 0.6), P(66, 70, 1), P(77, 66, 0.8), P(84, 54, 0.3), P(80, 41, -0.3), P(71, 33, -0.8), P(63, 31, -1), P(56, 33, -1), P(51, 37, -0.3), P(47, 40, 0.8), P(43, 43, 1), P(38, 46, 1), P(33, 49, 1)];
const ROUNDc = [P(33, 49, 1), P(25, 53, 0.6), P(18, 49.5, 0), P(15, 41, -0.5), P(18, 31, -1), P(27, 25.5, -1), P(39, 26.5, -1)];
const THRUc = [P(39, 26.5, -1), P(46, 25.5, -0.4), P(52, 27, 0.6), P(56, 31, 1), P(60, 39, 0.9), P(63, 47, 0.3), P(64, 51, -0.5), P(64.3, 56, -1)];
const OUTc = [P(64.3, 56, -1), P(66, 64, -1), P(65, 72, -0.6), P(62, 78, -0.2), P(59, 81, 0), P(59, 85, 0)];
const chain = [Sc, LOOPc, ROUNDc, THRUc, OUTc];

// Through the ring: A goes down behind the top rim, turns inside the hole, B comes up in front of the rim.
const DOWN = resample([P(56.8, 85, 0), P(56.8, 86.5, -1), P(56.8, 91, -1), P(56.8, 95, -1)], nDown);
const U = arc(59, 95, 2.2, 180, 0, nU, [-1, 1]);
const UP = resample([P(61.2, 95, 1), P(61.2, 91, 1), P(61.2, 86.5, 1), P(61.2, 85, 0)], nUp);

// The traced path: side B of the eight run backwards, from the ring up to the top, then the tail beside the standing part.
const tail = (x) => [P(x + 2.6, 10, 0.4), P(x + 4, 3, 0.1), P(x + 6.5, -1, 0)];
function followPath(ch, x) {
  const b = offset(ch, -1).pts.reverse();
  return cat(b.slice(0, b.findIndex((p) => p[1] < 16)), tail(x));
}
const near = (path, pt) => { const f = resample(path, 400); let bi = 0, bd = 1e9; f.forEach((p, i) => { const d = Math.hypot(p[0] - pt[0], p[1] - pt[1]); if (d < bd) { bd = d; bi = i; } }); return bi / 399; };
// Laid up to the point of the path nearest pt, the next `rest` units straight toward `toward`.
const laidTo = (path, pt, toward, rest) => partial(path, near(path, pt), nF, toward, rest);

// 0: rope hangs straight down past the ring's left side
const A0 = sideA([[P(38, -12, 0), P(38, 24, 0)], [P(38, 24, 0), P(38, 44, 0)], [P(38, 44, 0), P(38, 54, 0)], [P(38, 54, 0), P(38, 62, 0)], [P(38, 62, 0), P(38, 68, 0)]]);
const p0 = pose(A0, slack(A0, 14));
const swing = (path, fracs, len, toward) => { const A = sideA([Sc, ...lay(path, fracs)]); return pose(A, slack(A, len, toward)); };
// 1: swing the end right, up, over the top, lay it over the standing part pointing down-left
const p1pre = swing([P(48, 59, -0.3), P(57, 64, 0.5), P(66, 66, 1), P(75, 65, 1), P(83, 63, 1)], [0.72, 0.14, 0.08], 12);
const p1a = swing([P(48, 59, -0.3), P(60, 63, 0.5), P(72, 60, 1), P(80, 51, 1), P(84, 42, 1), P(85, 32, 1), P(83, 25, 1)], [0.72, 0.14, 0.08], 12);
const p1b = swing([P(48, 59, -0.3), P(56, 67, 0.6), P(68, 70, 1), P(79, 65, 1), P(85, 53, 1), P(81, 40, 1), P(72, 31, 1), P(62, 29, 1), P(53, 30.5, 1)], [0.84, 0.08, 0.05], 12);
const A1 = sideA([Sc, LOOPc, ...lay([P(33, 49, 1), P(26, 52.5, 1), P(19, 54, 0.8), P(14, 54.5, 0.6)], [0.5, 0.28])]);
const p1 = pose(A1, slack(A1, 12));
// 2: out to the left and dropped behind, up the left side, behind the standing part, out to the right
const A2pre = sideA([Sc, LOOPc, ...lay([P(33, 49, 1), P(25, 53, 0.5), P(17, 51, -0.3), P(11, 45, -0.8)], [0.6, 0.25])]);
const p2pre = pose(A2pre, slack(A2pre, 12));
const A2a = sideA([Sc, LOOPc, ...lay([P(33, 49, 1), P(25, 53, 0.6), P(18, 49.5, 0), P(15, 41, -0.6), P(17, 31, -1), P(18, 24, -1)], [0.75, 0.15])]);
const p2a = pose(A2a, slack(A2a, 12));
const A2b = sideA([Sc, LOOPc, ROUNDc, [P(39, 26.5, -1), P(45, 25, -1)], [P(45, 25, -1), P(49, 23.5, -1)]]);
const p2b = pose(A2b, slack(A2b, 12));
const A2 = sideA([Sc, LOOPc, ROUNDc, ...lay([P(39, 26.5, -1), P(46, 25.5, -0.8), P(52, 23, -0.5), P(57, 21.5, -0.3)], [0.6])]);
const p2 = pose(A2, slack(A2, 12));
// 3: forward and over the top side, down through, under the bottom side, out below
const A3a = sideA([Sc, LOOPc, ROUNDc, ...lay([P(39, 26.5, -1), P(46, 25.5, -0.4), P(52, 27, 0.7), P(54, 28.5, 1)], [0.85])]);
const p3a = pose(A3a, slack(A3a, 12));
const A3 = sideA([Sc, LOOPc, ROUNDc, THRUc, [P(64.3, 56, -1), P(65, 61.5, -1)]]);
const p3 = pose(A3, slack(A3, 12));
const A4a = sideA([Sc, LOOPc, ROUNDc, THRUc, [P(64.3, 56, -1), P(66, 69, -1), P(66.5, 74, -1)]]);
const p4a = pose(A4a, slack(A4a, 12, [68, 95]));
const A4 = sideA([Sc, LOOPc, ROUNDc, THRUc, [P(64.3, 56, -1), P(66, 64, -1), P(67, 70, -0.6), P(69, 76, -0.3)]]);
const p4 = pose(A4, slack(A4, 12, [73, 88]));
// 4: through the ring. a: down behind the rim to the bottom of the hole; b: out in front, pointing up at the knot
const A5 = sideA(chain);
const Uh = partial(U, 0.5, nU, null, 0), tipU = Uh[nU - 1];
const p5a = pose(A5, [DOWN, Uh, bunch(tipU, nUp), bunch(tipU, nF)]);
const p5b = pose(A5, [DOWN, U, UP, extend(UP, 9, nF, [63, 76])]);
// 5 and 6: trace. Each cut sits just past a crossing, the free end aimed into open space.
const FP = followPath(chain, 38);
const F = (pt, toward, rest) => pose(A5, [DOWN, U, UP, laidTo(FP, pt, toward, rest)]);
const p6a = F([66.2, 50.5], [74, 40], 12);   // under the bottom side of the loop
const p6b = F([50.9, 28.9], [38, 14], 12);   // over the top side
const p6c = F([27.2, 23.3], [10, 30], 12);   // behind the standing part
const p7a = F([48.3, 41.8], [58, 52], 12);   // round the left lobe, over the standing part
const p7b = F([62.5, 33.1], [76, 37], 10);   // under the top side, aimed on round the lobe
const p7c = F([60.7, 65.9], [46, 60], 8);    // round the right lobe, over the bottom side
const p7d = F([40.7, 35], [40.5, 18], 14);   // under the loop beside the standing part
const p7 = pose(A5, [DOWN, U, UP, resample(FP, nF)]);
// 7: dressed. The eight closes toward the rope's axis; the ring and the loop legs stay put.
const sh = (pts) => pts.map((p) => [50 + (p[0] - 50) * 0.68, 45 + (p[1] - 45) * 0.72, p[2]]);
const chain8 = [[P(41.8, -12, 0), P(41.8, 2, 0.5), ...sh(Sc.slice(2))], sh(LOOPc), sh(ROUNDc), sh(THRUc), [...sh(OUTc.slice(0, 2)), P(61, 66, -0.6), P(60, 74, -0.2), P(59, 80, 0), P(59, 85, 0)]];
const p8 = pose(sideA(chain8), [DOWN, U, UP, resample(followPath(chain8, 41.8), nF)]);


export default {
  id: 'figure-eight-follow-through',
  name: 'Figure Eight Follow Through',
  aka: ['Rewoven figure eight', 'Traced figure eight', 'Figure eight retrace'],
  category: 'loops',
  difficulty: 3,
  summary: 'The climber\'s tie-in. A figure eight tied in the rope, then the end goes through the ring and traces the eight back. Strong, easy to check, and it ties round a closed object.',
  uses: [
    'Tie a climbing rope into both tie-in points of a harness.',
    'Tie a rope to a fixed ring, a bolt hanger or an eye you cannot drop a loop over.',
    'Tie a tarp ridgeline or a bear bag line round a tree trunk when the end has to go round the trunk.',
    'Make a loop in a rope end that will be loaded hard and must be checked at a glance.',
  ],
  pros: ['Strong: keeps most of the rope strength.', 'Easy to inspect: a tidy 8 with two strands side by side all the way through.', 'Stays tied when slack, shaken or loaded from odd directions.', 'Ties round a closed ring or a trunk, where a figure eight on a bight cannot go.'],
  cons: ['Slower to tie than a bowline.', 'Hard to untie after a heavy load or a fall.', 'Uses about an arm span of rope.'],
  warnings: ['Check it before every climb: five parallel pairs, no strand crossing its partner, a tail at least ten rope widths long, and the loop through both tie-in points.', 'If one strand crosses the other anywhere, the knot is mis-traced. It is weaker and lumpy. Retie it.', 'Tie the first eight about an arm\'s length from the end. Too close and there is no tail to trace with; too far and the tail is in the way.'],
  check: 'Count five places where two strands run side by side: the two legs at the top, the two crossings of each lobe, and the two legs going to the ring. At every crossing the pair goes over or under together. The tail runs out next to the standing part and is at least ten rope widths long.',
  tips: ['Trace from where the tail leaves the knot. Start the end next to the tail and keep it on the same side of the tail all the way through.', 'Pull each of the four strands in turn to dress the pairs flat, then set the knot with a hard pull between the standing part and the loop.', 'To untie after a fall, bend the knot back and forth across the middle, then push the standing part and the loop back into it.'],
  related: ['figure-eight', 'figure-eight-on-a-bight', 'bowline', 'yosemite-bowline', 'double-overhand', 'figure-eight-bend', 'tensionless-hitch'],
  ropeWidth: W,
  view: FULL,
  props: [ring],
  strands: [{ id: 'a', color: 'orange', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Hang the rope from the top. The long side going up is the standing part. The ring below stands for the harness tie-in points. The working end, with the pale band, hangs about an arm\'s length below where the knot will sit.', pose: p0,
      labels: [{ text: 'standing part', at: [40, 4] }, { text: 'working end', at: [40, 78] }, { text: 'ring', at: [69, 97] }] },
    { title: 'Make a loop', text: 'Swing the working end up to the right and round over the top. Lay it across the front of the standing part so it points down to the left.', frames: [p1pre, p1a, p1b, p1], dur: [0.8, 0.8, 0.8, 0.9],
      labels: [{ text: 'over', at: [24, 44], anchor: 'right' }] },
    { title: 'Round behind the standing part', text: 'Swing the end out to the left and up, then push it behind the standing part from left to right. It comes out on the right, above the loop.', frames: [p2pre, p2a, p2b, p2], dur: [0.8, 0.9, 1.0, 0.8],
      labels: [{ text: 'behind', at: [44, 16] }] },
    { title: 'Down through the loop', text: 'Bring the end forward and lay it over the top side of the loop. Push it down through the middle and under the bottom side, then pull it out below. This is a loose figure eight, tied an arm\'s length from the end.', frames: [p3a, p3, p4a, p4], dur: [0.9, 1.2, 1.0, 1.0],
      labels: [{ text: 'over', at: [63, 24] }, { text: 'under', at: [74, 77] }] },
    { title: 'Through the ring', text: 'Pass the end down behind the top rim of the ring, into the ring, and bring it out toward you. Point it back up at the knot, next to the strand that comes out of the knot.', frames: [p5a, p5b], dur: [1.1, 1.1],
      labels: [{ text: 'behind the rim', at: [47, 90], anchor: 'right' }] },
    { title: 'Trace the eight, first half', text: 'Follow the strand that leaves the knot, entering right beside it: under the bottom side of the loop, up and over the top side, then behind the standing part. Stay next to the first strand, over where it is over and under where it is under.', frames: [p6a, p6b, p6c], dur: [1.1, 1.1, 1.1], view: ZOOM,
      labels: [{ text: 'under', at: [74, 77] }, { text: 'over', at: [63, 24] }] },
    { title: 'Trace the eight, second half', text: 'Keep following: round the left lobe and over the standing part, under the top side, round the right lobe and over the bottom side, then up under the loop beside the standing part. The end comes out at the top next to the standing part.', frames: [p7a, p7b, p7c, p7d, p7], dur: [1.0, 1.0, 1.0, 0.9, 1.0], view: FULL,
      labels: [{ text: 'tail beside the standing part', at: [47, 6] }] },
    { title: 'Dress and set', text: 'Pull each of the four strands in turn so the two ropes lie side by side everywhere with no crossing between them. Then pull the standing part against the loop to set the knot. Leave a tail at least ten rope widths long.', frames: [p8], dur: 1.5, view: FULL },
  ],
};
