import { P, cat, line, resample, pathLength } from './_lib.js';
import { sampleSpline } from '../rope.js';

// Palomar knot. One strand models the doubled line: down from the top,
// through the hook eye, round the end loop and back up to the tag. The doubled
// part is a CENTRELINE of named pieces with fixed point counts; both strands
// are offsets of it (D either side): the forward strand follows the pieces
// down, the return strand follows them back up. Where the end loop opens
// (passing over the hook, the collar at the end) its halves B1 and B2 are
// their own paths, joined by a small U.
//   LEG  off screen above, down to the top rim of the eye
//   EYE  through the eye: +1 over the top rim, -1 under the bottom rim
//   LL   out of the eye, right and up: the right side of the overhand loop
//   X1   across OVER the two legs, heading left
//   RND  round to the left and down, dropping behind
//   X2   back UNDER the two legs, heading right
//   X3   OVER the right side of the overhand loop (LL) and out
// B1 is the inner strand at the exit and becomes the FRONT of the end loop
// where it goes round the hook; B2 is the outer strand and goes round the BACK.
const D = 1.5;
const LEN = 500;
const N = { LEG: 12, EYE: 6, LL: 12, X1: 5, RND: 8, X2: 5, X3: 7, B: 12, U: 11 };
const ORDER = ['LEG', 'EYE', 'LL', 'X1', 'RND', 'X2', 'X3'];
const hook = { type: 'hook', cx: 50, cy: 62, r: 4, t: 1.6, len: 28, dir: [0, 1] };

// Offset a dense polyline by d along its normal (coincident points take the
// direction of the nearest distinct neighbours).
function offsetPoly(pts, d) {
  const n = pts.length, same = (i, j) => Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < 1e-6;
  return pts.map((p, i) => {
    let a = i, b = i;
    while (a > 0 && same(a, i)) a--;
    while (b < n - 1 && same(b, i)) b++;
    let dx = pts[b][0] - pts[a][0], dy = pts[b][1] - pts[a][1], L = Math.hypot(dx, dy);
    if (L < 1e-6) { dx = 0; dy = 1; L = 1; }
    return [p[0] + (dy / L) * d, p[1] - (dx / L) * d, p[2] || 0];
  });
}

// Both strands from the centreline pieces. The control points go through the
// renderer's spline first, so corners are rounded before offsetting and the
// inner strand never folds over itself. Returns { fwd, ret, heading }.
function doubled(pieces) {
  const ctrl = [], ends = [];
  for (const name of ORDER) { ctrl.push(...pieces[name]); ends.push(pieces[name][pieces[name].length - 1]); }
  const dense = sampleSpline(ctrl).map((s) => [s.x, s.y, s.z]);
  const left = offsetPoly(dense, -D), right = offsetPoly(dense, D);
  const fwd = {}, ret = {};
  let from = 0;
  ORDER.forEach((name, i) => {
    let best = from, bd = Infinity;
    for (let j = from; j < dense.length; j++) {
      const d = Math.hypot(dense[j][0] - ends[i][0], dense[j][1] - ends[i][1]);
      if (d < bd) { bd = d; best = j; }
    }
    fwd[name] = resample(left.slice(from, best + 1), N[name]);
    ret[name] = resample(right.slice(from, best + 1).reverse(), N[name]);
    from = best;
  });
  const last = dense[dense.length - 1];
  let j = dense.length - 2;
  while (j > 0 && Math.hypot(dense[j][0] - last[0], dense[j][1] - last[1]) < 1e-6) j--;
  const hx = last[0] - dense[j][0], hy = last[1] - dense[j][1], hl = Math.hypot(hx, hy) || 1;
  return { fwd, ret, heading: [hx / hl, hy / hl] };
}

// Half circle from p to q bulging along dir, z blended, n points.
function uTurn(p, q, dir, n) {
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, R = Math.hypot(q[0] - p[0], q[1] - p[1]) / 2;
  if (R < 1e-6) return Array.from({ length: n }, () => [p[0], p[1], p[2] || 0]);
  const ux = (p[0] - mx) / R, uy = (p[1] - my) / R;
  let vx = -uy, vy = ux;
  if (vx * dir[0] + vy * dir[1] < 0) { vx = -vx; vy = -vy; }
  const z0 = p[2] || 0, z1 = q[2] || 0, path = [];
  for (let i = 0; i <= 14; i++) {
    const t = (i / 14) * Math.PI, c = Math.cos(t), s = Math.sin(t);
    path.push([mx + R * (c * ux + s * vx), my + R * (c * uy + s * vy), z0 + (z1 - z0) * (i / 14)]);
  }
  return resample(path, n);
}

// Spare line waits above the frame, as several evenly spaced points.
function padUp(pts, total, nPad = 8) {
  const rest = Math.max(0.5, total - pathLength(pts)), p = pts[0], pad = [];
  for (let k = nPad; k >= 1; k--) pad.push([p[0], p[1] - (rest * k) / nPad, p[2] || 0]);
  return [...pad, ...pts];
}

// One pose. ring: null (end loop is a closed bight, `ext` long) or { b1, b2 }
// control points for the two halves of the opened loop. tagY cuts the tag.
function pose(pieces, ring = null, ext = 0, tagY = 14) {
  const { fwd, ret, heading: [hx, hy] } = doubled(pieces);
  const q1 = fwd.X3[fwd.X3.length - 1], q2 = ret.X3[0];
  let b1, b2;
  if (ring) { b1 = resample([q1, ...ring.b1], N.B); b2 = resample([...ring.b2, q2], N.B); }
  else {
    b1 = cat(line(q1, q1, N.B - 1), [[q1[0] + hx * ext, q1[1] + hy * ext, q1[2]]]);
    b2 = cat([[q2[0] + hx * ext, q2[1] + hy * ext, q2[2]]], line(q2, q2, N.B - 1));
  }
  const p = b1[b1.length - 1], q = b2[0], pp = b1[b1.length - 2];
  let dir = [p[0] - pp[0], p[1] - pp[1]];
  if (Math.hypot(dir[0], dir[1]) < 1e-6) dir = [hx, hy];
  const tf = ret.LEG;
  const tag = resample(tf.filter((pt) => pt[1] >= tagY).concat([[tf[tf.length - 1][0], tagY, 0]]), N.LEG);
  const pts = cat(fwd.LEG, fwd.EYE, fwd.LL, fwd.X1, fwd.RND, fwd.X2, fwd.X3, b1, uTurn(p, q, dir, N.U), b2,
    ret.X3, ret.X2, ret.RND, ret.X1, ret.LL, ret.EYE, tag);
  // snap near-coincident neighbours so the spline merges them instead of making a cusp
  for (let i = 1; i < pts.length; i++) {
    if (Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) < 0.2) { pts[i][0] = pts[i - 1][0]; pts[i][1] = pts[i - 1][1]; }
  }
  return padUp(pts, LEN);
}

const at = (p) => [p, p]; // a piece not laid yet: all its points at one spot
const rest = (p, names) => Object.fromEntries(names.map((n) => [n, at(p)]));

// ---------------------------------------------------------------- centreline pieces
const TOP = P(50, -14, 0);
const EYE_TOP = P(50, 55.5, 1), EYE_BOT = P(50, 68.5, -1);
const EYE = [EYE_TOP, P(50, 62, 0), EYE_BOT];
// out of the bottom of the eye and round to the right: a quarter circle of radius r
const exitArc = (r) => [EYE_BOT, ...[1, 2, 3, 4].map((k) => P(50 + r * (1 - Math.cos((k * Math.PI) / 8)), 68.5 + r * Math.sin((k * Math.PI) / 8), -1))];
const AFTER_LEG = ['EYE', 'LL', 'X1', 'RND', 'X2', 'X3'];
const AFTER_EYE = AFTER_LEG.slice(1), AFTER_LL = AFTER_LEG.slice(2);

// 0: doubled line hanging above the hook, fold at y 46
const p0 = pose({ LEG: [TOP, P(50, 20, 0), P(50, 46, 0)], ...rest(P(50, 46, 0), AFTER_LEG) }, null, 0);
// 1: through the eye. a: fold on the top rim; b: through, just below the bottom rim; c: long loop pulled out to the lower right
const LEG1 = [TOP, P(50, 20, 0), P(50, 44, 0), EYE_TOP];
const p1a = pose({ LEG: LEG1, ...rest(EYE_TOP, AFTER_LEG) }, null, 0);
const p1b = pose({ LEG: LEG1, EYE, ...rest(EYE_BOT, AFTER_EYE) }, null, 1.5);
const p1c = pose({ LEG: LEG1, EYE, LL: [...exitArc(3.5), P(56.5, 72.6, -0.6), P(59.5, 71.5, -0.3)], ...rest(P(59.5, 71.5, -0.3), AFTER_LL) }, null, 4);

// 2: the loose overhand. Legs: behind at X1 (y 38), in front at X2 (y 50).
const LEG2 = [TOP, P(50, 20, 0), P(50, 30, 0), P(50, 35.5, -1), P(50, 41, -1), P(50, 46, 1), P(50, 51.5, 1), EYE_TOP];
const LL2 = [...exitArc(3.5), P(57, 71.5, -0.8), P(60.5, 68.5, -0.8), P(62.8, 62, -1), P(63.2, 54, -1), P(62, 46, 0), P(59.5, 40.5, 0.8), P(56, 38.5, 1)];
const X1_2 = [P(56, 38.5, 1), P(50, 38, 1), P(44, 38.4, 1)];
const RND2 = [P(44, 38.4, 1), P(38.5, 41.5, 0.6), P(36, 47, -0.3), P(38, 52, -1), P(43, 50.8, -1)];
const X2_2 = [P(43, 50.8, -1), P(50, 50.2, -1), P(54.5, 50.5, -1)];
const X3_2 = [P(54.5, 50.5, -1), P(57, 51.2, 0.2), P(59.5, 52.1, 0.8), P(63, 53.3, 1), P(68.5, 54.5, 1)];
const c2 = { LEG: LEG2, EYE, LL: LL2, X1: X1_2, RND: RND2, X2: X2_2, X3: X3_2 };
const p2a = pose({ LEG: LEG1, EYE, LL: LL2, ...rest(P(56, 38.5, 1), AFTER_LL) }, null, 0);        // loop swung up the right side
const p2b = pose({ ...c2, ...rest(P(44, 38.4, 1), ['RND', 'X2', 'X3']) }, null, 1.5);              // laid OVER the legs, heading left
const p2c = pose({ ...c2, RND: RND2.slice(0, 3), ...rest(P(36, 47, -0.3), ['X2', 'X3']) }, null, 0.5); // round to the left, heading down, dropping behind
const p2d = pose({ ...c2, ...rest(P(43, 50.8, -1), ['X2', 'X3']) }, null, 0.5);                    // behind, left of the legs, pointing right
const p2e = pose({ ...c2, X3: at(P(54.5, 50.5, -1)) }, null, 0.5);                                 // under the legs, inside the loop
const p2f = pose({ ...c2, X3: [P(54.5, 50.5, -1), P(55.5, 50.8, 1)] }, null, 0);                   // lifted in front, left of LL
const p2g = pose(c2, null, 6);                                                                      // out over the right side

// 3: the end loop over the hook. B1 (inner) is the front, B2 (outer) the back.
const p3a = pose(c2, { // opened wide, hanging down the right of the hook
  b1: [P(70.5, 57.5, 1), P(71, 62, 1), P(69, 70, 1), P(66, 80, 1), P(63.5, 91, 1)],
  b2: [P(72.5, 95, -1), P(77, 84, -1), P(78, 70, -1), P(75.5, 59, -1), P(72, 53.8, -1)],
});
const p3b = pose(c2, { // swung under the bend and point: front across the hook, back below it
  b1: [P(70.5, 57.5, 1), P(71, 63, 1), P(67, 74, 1), P(59, 81, 1), P(50, 85, 1), P(43.5, 91, 1), P(40, 97, 1)],
  b2: [P(45, 102.5, -1), P(56, 101.5, -1), P(67, 95, -1), P(74.5, 83, -1), P(77, 70, -1), P(75.5, 59, -1), P(72, 53.8, -1)],
});
const p3c = pose(c2, { // slid up the shank toward the eye
  b1: [P(70.5, 57.5, 1), P(71.5, 63, 1), P(70.5, 72, 1), P(66, 78, 1), P(58, 78.5, 1), P(50, 78.5, 1), P(44, 78.5, 1)],
  b2: [P(44, 82, -1), P(50, 82, -1), P(60, 82, -1), P(69, 81, -1), P(74, 74, -1), P(75.5, 64, -1), P(74, 56.5, -1), P(71.5, 53.8, -1)],
});

// 4: dressed. Overhand pulled down onto the eye, loop snug round the shank below it.
const LEG4 = [TOP, P(50, 20, 0), P(50, 33, 0), P(50, 39.5, -1), P(50, 45, -1), P(50, 49, 1), EYE_TOP];
const LL4 = [...exitArc(3.2), P(56, 70.6, -1), P(58.6, 66.5, -0.8), P(60, 61, -1), P(60, 55, -1), P(59.5, 49, -0.3), P(57, 44.5, 0.7), P(54, 42.6, 1)];
const c4 = { LEG: LEG4, EYE, LL: LL4,
  X1: [P(54, 42.6, 1), P(50, 42.5, 1), P(45.5, 42.8, 1)],
  RND: [P(45.5, 42.8, 1), P(41.5, 45.5, 0.5), P(40.5, 50, -0.5), P(43.5, 52.2, -1)],
  X2: [P(43.5, 52.2, -1), P(50, 52, -1), P(53.5, 52.4, -1)],
  X3: [P(53.5, 52.4, -1), P(55.5, 53.2, 0.2), P(57.5, 55, 0.8), P(59.8, 57.6, 1), P(63, 60.5, 1)] };
const ring4 = {
  b1: [P(63, 65, 1), P(62.5, 69.5, 1), P(59, 74.5, 1), P(52, 75, 1), P(47, 75, 1)],
  b2: [P(47, 78.5, -1), P(52, 78.5, -1), P(58, 78.5, -1), P(63.5, 77.5, -1), P(66.5, 72, -1), P(67, 66, -1), P(66.5, 62, -1)],
};
const p4 = pose(c4, ring4);
const p5 = pose(c4, ring4, 0, 33); // tag trimmed

export default {
  id: 'palomar',
  name: 'Palomar Knot',
  category: 'fishing',
  difficulty: 1,
  summary: 'A strong, simple knot for tying line to a hook, swivel or lure. Tied with the line doubled, so it is quick even with cold wet hands.',
  uses: [
    'Tie a hook, swivel or lure to the end of mono, fluorocarbon or braided line.',
    'Braided line: clinch knots slip in braid, the Palomar holds.',
    'Tie on a dropper swivel or a jig head fast at the water, in poor light.',
    'The first fishing knot to learn. It covers most of what a backcountry angler needs to tie.',
  ],
  pros: ['Keeps close to the full breaking strength of the line.', 'Few moves and easy to check by eye.', 'Holds in heavy braid where clinch knots slip.'],
  cons: ['The whole hook or lure has to pass through the loop. Awkward with a big lure or a fly with a dropper already on.', 'Uses more line than a clinch knot.', 'Not a line to line knot.'],
  warnings: ['The loop must go over the whole hook, bend and point included, not just the eye. If the end loop never went over the hook, you have only a loose overhand with the hook hanging in it, and it pulls out under load.', 'Wet the line before pulling it tight. Dry mono heats and weakens as the knot beds down.', 'Keep the loop clear of the hook point as you pass it over. A nick in the line is where it will break.'],
  check: 'Two lines leave the eye side by side, the small overhand sits right on the eye, and the end loop lies snug round the shank just below the eye. Pull the standing line and the tag together: both take the load evenly. If the end loop never went over the hook, cut it off and retie.',
  tips: ['Double about a hand span of line. The loop has to be big enough to pass over the hook with room to spare.', 'Pull the tag and the standing line together to seat the knot, then pull the standing line alone against the hook.', 'Trim the tag to about 3 mm. It cannot slip once the knot is seated.'],
  related: ['improved-clinch', 'uni-knot', 'overhand', 'surgeons-loop', 'double-overhand'],
  ropeWidth: 2.2,
  view: { x: -4, y: 0, w: 106, h: 106 },
  props: [hook],
  strands: [{ id: 'a', color: 'teal', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Double the line: fold it back on itself so the tag end runs up beside the standing line. The fold is the loop you will work with. Hold the hook below it, eye up.', pose: p0,
      labels: [{ text: 'standing line', at: [45, 22], anchor: 'right' }, { text: 'tag end', at: [55, 15] }, { text: 'the loop', at: [55, 48] }] },
    { title: 'Loop through the eye', text: 'Push the loop down through the eye of the hook, from the front. Pull it well through so a long loop hangs below the eye, out to the right.', frames: [p1a, p1b, p1c], dur: [1.0, 1.0, 1.1], trail: false,
      labels: [{ text: 'through the eye', at: [58, 60] }], arrows: [{ from: [43, 48], to: [43, 66] }] },
    { title: 'Loose overhand knot', text: 'Treat the doubled line as one rope. Swing the loop up the right side, lay it OVER the two lines above the eye, round to the left, back UNDER the two lines, then out OVER the right side of the loop. The hook hangs from the middle of this loose overhand.', frames: [p2a, p2b, p2c, p2d, p2e, p2f, p2g], dur: [1.1, 0.9, 0.8, 0.8, 0.9, 0.6, 0.9], trail: false,
      labels: [{ text: 'over', at: [31, 37], anchor: 'right' }, { text: 'under', at: [31, 50], anchor: 'right' }, { text: 'over', at: [67, 47] }] },
    { title: 'Loop over the hook', text: 'Open the end loop wide. Pass it down round the bend and point of the hook, then slide it up the shank toward the eye. The front of the loop lies across the hook, the back of it goes behind.', frames: [p3a, p3b, p3c], dur: [1.1, 1.4, 1.3], trail: false,
      labels: [{ text: 'whole hook through the loop', at: [50, 100.5], anchor: 'center' }] },
    { title: 'Pull tight', text: 'Wet the line. Hold the hook and pull the standing line and the tag end together. The overhand closes down onto the eye and the loop beds down round the shank just below it.', frames: [p4], dur: 1.6, trail: false,
      labels: [{ text: 'pull both lines', at: [59, 24] }], arrows: [{ from: [43, 32], to: [43, 18] }, { from: [57, 32], to: [57, 18] }] },
    { title: 'Trim', text: 'Trim the tag end to about 3 mm. Check that both lines leave the eye side by side and the knot sits snug against the eye.', frames: [p5], dur: 1.2, trail: false, view: { x: 14, y: 28, w: 72, h: 72 },
      labels: [{ text: 'trim', at: [55, 33] }] },
  ],
};
