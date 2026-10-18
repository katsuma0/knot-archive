import { P, cat, line, resample, pathLength } from './_lib.js';
import { sampleSpline } from '../rope.js';

// Palomar knot. A doubled fishing line (one strand that goes down through the
// hook eye, round the end loop and back up to the tag) tied in an overhand
// round the eye, then the end loop passed over the whole hook.
//
// The doubled line is modelled as a CENTRELINE C made of named pieces with
// fixed point counts. Both strands of the doubled line are offsets of C (half
// gap D either side): the forward strand follows C down from the standing
// part, the return strand follows C back up to the tag end. Where the end loop
// opens up (passing over the hook, the collar at the end) its two halves B1
// and B2 are drawn as their own paths joined by a small U.
//
// Pieces of C, from the standing part toward the end loop:
//   LEG   from off screen above down to the top rim of the eye
//   EYE   through the eye: z +1 over the top rim, -1 under the bottom rim
//   LL    out of the eye, right and up: the right side of the overhand loop
//   X1    across OVER the two legs, heading left
//   RND   round to the left and down, dropping behind
//   X2    back UNDER the two legs, heading right
//   X3    OVER the right side of the overhand loop (LL) and out
// End loop: B1 (forward strand), U, B2 (return strand), then the pieces of C
// again in reverse order for the return strand, the last one cut at the tag.
// B1 is the inner strand at the exit, so it becomes the FRONT of the loop
// where it goes round the hook; B2 is the outer strand and goes round the BACK.

const D = 1.5; // half the gap between the two strands of the doubled line
const LEN = 500;
const N = { LEG: 12, EYE: 6, LL: 12, X1: 5, RND: 8, X2: 5, X3: 7, B: 12, U: 11 };
const ORDER = ['LEG', 'EYE', 'LL', 'X1', 'RND', 'X2', 'X3'];
const N_PAD = 8;

const hook = { type: 'hook', cx: 50, cy: 62, r: 4.2, t: 1.6, len: 27, dir: [0, 1] };

// ---------------------------------------------------------------- helpers

// Offset a dense polyline by d along its normal. Coincident points (a piece
// not laid yet) take the direction of the nearest distinct neighbours.
function offsetPoly(pts, d) {
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    let a = i, b = i;
    while (a > 0 && Math.hypot(pts[a][0] - pts[i][0], pts[a][1] - pts[i][1]) < 1e-6) a--;
    while (b < n - 1 && Math.hypot(pts[b][0] - pts[i][0], pts[b][1] - pts[i][1]) < 1e-6) b++;
    let dx = pts[b][0] - pts[a][0], dy = pts[b][1] - pts[a][1];
    let L = Math.hypot(dx, dy);
    if (L < 1e-6) { dx = 0; dy = 1; L = 1; }
    const nx = dy / L, ny = -dx / L;
    out.push([pts[i][0] + nx * d, pts[i][1] + ny * d, pts[i][2] || 0]);
  }
  return out;
}

// Build both strands of the doubled line from the centreline pieces.
// Returns { fwd, ret, heading }: fwd pieces run along C in ORDER, ret pieces
// are the other offset reversed; heading is the direction of C at its end.
// The centreline control points go through the same centripetal spline the
// renderer uses, so corners between pieces are rounded before offsetting and
// the inner strand never folds over itself.
function doubled(pieces) {
  const ctrl = [];
  const ends = [];
  for (const name of ORDER) {
    for (const p of pieces[name]) ctrl.push(p);
    ends.push(pieces[name][pieces[name].length - 1]);
  }
  const dense = sampleSpline(ctrl).map((s) => [s.x, s.y, s.z]);
  // piece boundaries: the sample nearest each piece's end point, in order
  const ranges = {};
  let from = 0;
  ORDER.forEach((name, i) => {
    const e = ends[i];
    let best = from, bd = Infinity;
    for (let j = from; j < dense.length; j++) {
      const d = Math.hypot(dense[j][0] - e[0], dense[j][1] - e[1]);
      if (d < bd) { bd = d; best = j; }
    }
    ranges[name] = [from, best];
    from = best;
  });
  const left = offsetPoly(dense, -D);
  const right = offsetPoly(dense, D);
  const fwd = {}, ret = {};
  for (const name of ORDER) {
    const [a, b] = ranges[name];
    const sl = left.slice(a, b + 1), sr = right.slice(a, b + 1);
    fwd[name] = resample(sl, N[name]);
    ret[name] = resample(sr.reverse(), N[name]);
  }
  // heading at the end: last two distinct points of the centreline
  const last = dense[dense.length - 1];
  let j = dense.length - 2;
  while (j > 0 && Math.hypot(dense[j][0] - last[0], dense[j][1] - last[1]) < 1e-6) j--;
  let hx = last[0] - dense[j][0], hy = last[1] - dense[j][1];
  const hl = Math.hypot(hx, hy) || 1;
  return { fwd, ret, heading: [hx / hl, hy / hl] };
}

// The U joining the two strands at the end of the loop, from p to q, bulging
// along `dir`. A short chord gets a flared, rounder end (a folded line opens
// up a little at the fold); a long chord is a plain half circle.
function uTurn(p, q, dir, n) {
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
  const chord = Math.hypot(q[0] - p[0], q[1] - p[1]);
  if (chord < 1e-6) return Array.from({ length: n }, () => [p[0], p[1], p[2] || 0]);
  const ux = (p[0] - mx) / (chord / 2), uy = (p[1] - my) / (chord / 2);
  // v: perpendicular to the chord, along dir
  let vx = -uy, vy = ux;
  if (vx * dir[0] + vy * dir[1] < 0) { vx = -vx; vy = -vy; }
  const z0 = p[2] || 0, z1 = q[2] || 0;
  const flare = 0;
  const fwd = 0;
  const R = chord / 2 + flare;
  const cx = mx + vx * fwd, cy = my + vy * fwd;
  const path = [p];
  // ease out from p to the start of the arc (lateral flare follows a smoothstep)
  const k = 6;
  for (let i = 1; i < k; i++) {
    const t = i / k, s = t * t * (3 - 2 * t);
    path.push([p[0] + vx * fwd * t + ux * flare * s, p[1] + vy * fwd * t + uy * flare * s, z0]);
  }
  const m = 14;
  for (let i = 0; i <= m; i++) {
    const t = (i / m) * Math.PI;
    path.push([cx + R * (Math.cos(t) * ux + Math.sin(t) * vx), cy + R * (Math.cos(t) * uy + Math.sin(t) * vy), z0 + (z1 - z0) * (i / m)]);
  }
  for (let i = k - 1; i >= 1; i--) {
    const t = i / k, s = t * t * (3 - 2 * t);
    path.push([q[0] + vx * fwd * t - ux * flare * s, q[1] + vy * fwd * t - uy * flare * s, z1]);
  }
  path.push(q);
  return resample(path, n);
}

// Keep the total length steady: spare line waits above the frame, laid as
// several evenly spaced points so the spline samples it evenly.
function padUp(pts, total, nPad) {
  const rest = Math.max(0.5, total - pathLength(pts));
  const p = pts[0];
  const pad = [];
  for (let k = nPad; k >= 1; k--) pad.push([p[0], p[1] - (rest * k) / nPad, p[2] || 0]);
  return [...pad, ...pts];
}

// Assemble one pose. `pieces`: the centreline pieces. `ring`: null (the end
// loop is a short closed bight, `ext` long) or { b1, b2 } control points for
// the two halves of the opened loop (b1 after the exit, b2 before the return).
function pose(pieces, ring = null, ext = 0, tagY = 14) {
  const { fwd, ret, heading: [hx, hy] } = doubled(pieces);
  const q1 = fwd.X3[fwd.X3.length - 1];
  const q2 = ret.X3[0];
  let b1, b2;
  if (ring) {
    b1 = resample([q1, ...ring.b1], N.B);
    b2 = resample([...ring.b2, q2], N.B);
  } else {
    // a straight stub: most of the points wait at the exit, two carry the stub
    const e1 = [q1[0] + hx * ext, q1[1] + hy * ext, q1[2]];
    const e2 = [q2[0] + hx * ext, q2[1] + hy * ext, q2[2]];
    b1 = cat(line(q1, q1, N.B - 1), [e1]);
    b2 = cat([e2], line(q2, q2, N.B - 1));
  }
  const p = b1[b1.length - 1], q = b2[0], pp = b1[b1.length - 2];
  let dir = [p[0] - pp[0], p[1] - pp[1]];
  if (Math.hypot(dir[0], dir[1]) < 1e-6) dir = [hx, hy];
  const u = uTurn(p, q, dir, N.U);
  // the return LEG piece, cut at the tag end
  const tagFull = ret.LEG;
  const tag = resample(tagFull.filter((pt) => pt[1] >= tagY).concat([[tagFull[tagFull.length - 1][0], tagY, 0]]), N.LEG);
  const pts = cat(
    fwd.LEG, fwd.EYE, fwd.LL, fwd.X1, fwd.RND, fwd.X2, fwd.X3,
    b1, u, b2,
    ret.X3, ret.X2, ret.RND, ret.X1, ret.LL, ret.EYE, tag,
  );
  // Snap near-coincident neighbours together so the spline merges them
  // instead of making a cusp out of a 0.1 unit step.
  for (let i = 1; i < pts.length; i++) {
    if (Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) < 0.2) { pts[i][0] = pts[i - 1][0]; pts[i][1] = pts[i - 1][1]; }
  }
  return padUp(pts, LEN, N_PAD);
}

// A piece that has not been laid yet: all its points at one spot.
const at = (p) => [p, p];
const rest = (p, names) => Object.fromEntries(names.map((n) => [n, at(p)]));

// ---------------------------------------------------------------- centreline pieces

const TOP = P(50, -14, 0);
const EYE_TOP = P(50, 55.5, 1);
const EYE_BOT = P(50, 68.5, -1);
const EYE = [EYE_TOP, P(50, 62, 0), EYE_BOT];
// Out of the bottom of the eye and round to the right: a quarter circle so the
// inner strand does not kink. r is the centreline radius.
const exitArc = (r) => [EYE_BOT, P(50 + r * (1 - Math.cos(Math.PI / 8)), 68.5 + r * Math.sin(Math.PI / 8), -1), P(50 + r * (1 - Math.cos(Math.PI / 4)), 68.5 + r * Math.sin(Math.PI / 4), -1), P(50 + r * (1 - Math.cos(3 * Math.PI / 8)), 68.5 + r * Math.sin(3 * Math.PI / 8), -1), P(50 + r, 68.5 + r, -1)];

const AFTER_LEG = ['EYE', 'LL', 'X1', 'RND', 'X2', 'X3'];
const AFTER_EYE = ['LL', 'X1', 'RND', 'X2', 'X3'];
const AFTER_LL = ['X1', 'RND', 'X2', 'X3'];

// step 0: doubled line hanging above the hook, fold at y 46
const p0 = pose({ LEG: [TOP, P(50, 20, 0), P(50, 46, 0)], ...rest(P(50, 46, 0), AFTER_LEG) }, null, 0);

// step 1: through the eye
const LEG1 = [TOP, P(50, 20, 0), P(50, 44, 0), EYE_TOP];
// 1a: fold lowered onto the top rim, in front
const p1a = pose({ LEG: LEG1, ...rest(EYE_TOP, AFTER_LEG) }, null, 0);
// 1b: through, fold just below the bottom rim
const p1b = pose({ LEG: LEG1, EYE, ...rest(EYE_BOT, AFTER_EYE) }, null, 1.5);
// 1c: a long loop pulled through, hanging to the lower right of the eye
const p1c = pose({ LEG: LEG1, EYE, LL: [...exitArc(3.5), P(56.5, 72.6, -0.6), P(59.5, 71.5, -0.3)], ...rest(P(59.5, 71.5, -0.3), AFTER_LL) }, null, 4);

// step 2: the loose overhand. Legs: behind at X1 (y 38), in front at X2 (y 50).
const LEG2 = [TOP, P(50, 20, 0), P(50, 30, 0), P(50, 35.5, -1), P(50, 41, -1), P(50, 46, 1), P(50, 51.5, 1), EYE_TOP];
const LL2 = [...exitArc(3.5), P(57, 71.5, -0.8), P(60.5, 68.5, -0.8), P(62.8, 62, -1), P(63.2, 54, -1), P(62, 46, 0), P(59.5, 40.5, 0.8), P(56, 38.5, 1)];
const X1_2 = [P(56, 38.5, 1), P(50, 38, 1), P(44, 38.4, 1)];
const RND2 = [P(44, 38.4, 1), P(38.5, 41.5, 0.6), P(36, 47, -0.3), P(38, 52, -1), P(43, 50.8, -1)];
const X2_2 = [P(43, 50.8, -1), P(50, 50.2, -1), P(54.5, 50.5, -1)];
const X3_2 = [P(54.5, 50.5, -1), P(57, 51.2, 0.2), P(59.5, 52.1, 0.8), P(63, 53.3, 1), P(68.5, 54.5, 1)];
const c2 = { LEG: LEG2, EYE, LL: LL2, X1: X1_2, RND: RND2, X2: X2_2, X3: X3_2 };

// 2a: loop swung up the right side, hovering right of the legs
const p2a = pose({ LEG: LEG1, EYE, LL: LL2, ...rest(P(56, 38.5, 1), AFTER_LL) }, null, 0);
// 2b: laid across OVER the legs, heading left
const p2b = pose({ ...c2, RND: at(P(44, 38.4, 1)), X2: at(P(44, 38.4, 1)), X3: at(P(44, 38.4, 1)) }, null, 1.5);
// 2c: round to the left and down, dropped behind, left of the legs
const p2c = pose({ ...c2, X2: at(P(43, 50.8, -1)), X3: at(P(43, 50.8, -1)) }, null, 0.5);
// 2d: under the legs, pointing right inside the loop
const p2d = pose({ ...c2, X3: at(P(54.5, 50.5, -1)) }, null, 0.5);
// 2e: lifted in front, still left of the loop's right side
const p2e = pose({ ...c2, X3: [P(54.5, 50.5, -1), P(55.5, 50.8, 1)] }, null, 0);
// 2f: out over the right side of the loop
const p2f = pose(c2, null, 6);

// step 3: pass the end loop over the hook. B1 (inner) is the front of the
// loop, B2 (outer) the back.
// 3a: open the loop wide, hanging down the right of the hook
const p3a = pose(c2, {
  b1: [P(70.5, 57.5, 1), P(71, 62, 1), P(69, 70, 1), P(66, 80, 1), P(63.5, 91, 1)],
  b2: [P(72.5, 95, -1), P(77, 84, -1), P(78, 70, -1), P(75.5, 59, -1), P(72, 53.8, -1)],
});
// 3b: swing the end of the loop under the bottom of the hook, to the left.
// The front of the loop lies across the shank; the back passes below the bend.
const p3b = pose(c2, {
  b1: [P(70.5, 57.5, 1), P(71, 63, 1), P(67, 74, 1), P(59, 81, 1), P(50, 85, 1), P(43.5, 91, 1), P(40, 97, 1)],
  b2: [P(45, 102.5, -1), P(56, 101.5, -1), P(67, 95, -1), P(74.5, 83, -1), P(77, 70, -1), P(75.5, 59, -1), P(72, 53.8, -1)],
});
// 3c: slide the loop up the shank toward the eye: front strand in front, back strand behind
const p3c = pose(c2, {
  b1: [P(70.5, 57.5, 1), P(71.5, 63, 1), P(70.5, 72, 1), P(66, 78, 1), P(58, 78.5, 1), P(50, 78.5, 1), P(44, 78.5, 1)],
  b2: [P(44, 82, -1), P(50, 82, -1), P(60, 82, -1), P(69, 81, -1), P(74, 74, -1), P(75.5, 64, -1), P(74, 56.5, -1), P(71.5, 53.8, -1)],
});

// step 4: dressed. Overhand pulled down onto the eye, loop snug round the shank below it.
const LEG4 = [TOP, P(50, 20, 0), P(50, 33, 0), P(50, 39.5, -1), P(50, 45, -1), P(50, 49, 1), EYE_TOP];
const LL4 = [...exitArc(3.2), P(56, 70.6, -1), P(58.6, 66.5, -0.8), P(60, 61, -1), P(60, 55, -1), P(59.5, 49, -0.3), P(57, 44.5, 0.7), P(54, 42.6, 1)];
const X1_4 = [P(54, 42.6, 1), P(50, 42.5, 1), P(45.5, 42.8, 1)];
const RND4 = [P(45.5, 42.8, 1), P(41.5, 45.5, 0.5), P(40.5, 50, -0.5), P(43.5, 52.2, -1)];
const X2_4 = [P(43.5, 52.2, -1), P(50, 52, -1), P(53.5, 52.4, -1)];
const X3_4 = [P(53.5, 52.4, -1), P(55.5, 53.2, 0.2), P(57.5, 55, 0.8), P(59.8, 57.6, 1), P(63, 60.5, 1)];
const c4 = { LEG: LEG4, EYE, LL: LL4, X1: X1_4, RND: RND4, X2: X2_4, X3: X3_4 };
const ring4 = {
  b1: [P(63, 65, 1), P(62.8, 69.5, 1), P(59.5, 74.5, 1), P(50, 75, 1), P(44.5, 75, 1)],
  b2: [P(44.5, 78.5, -1), P(50, 78.5, -1), P(58, 78.5, -1), P(64, 77.5, -1), P(67, 72, -1), P(67.5, 66, -1), P(66.5, 62, -1)],
};
const p4 = pose(c4, ring4);
// step 5: tag trimmed
const p5 = pose(c4, ring4, 0, 33);

const VIEW = { x: -4, y: 0, w: 106, h: 106 };
const VIEW_CLOSE = { x: 14, y: 28, w: 72, h: 72 };

export default {
  id: 'palomar',
  name: 'Palomar Knot',
  category: 'fishing',
  difficulty: 1,
  summary: 'The strongest easy knot for tying line to a hook, swivel or lure. Tied with a doubled line, so it is quick even with cold hands.',
  uses: [
    'Tie a hook, swivel or lure to the end of your line, mono or braid.',
    'Braided line: most knots slip in braid, the Palomar holds.',
    'Attach a dropper swivel or a jig head when you need it done fast at the water.',
    'The first fishing knot to learn: one knot covers most of what a backcountry angler ties.',
  ],
  pros: ['Keeps close to the full line strength.', 'Few moves, easy to check by eye.', 'Works in heavy braid where clinch knots slip.'],
  cons: ['The whole hook or lure has to pass through the loop: awkward with a big lure or a fly with a long dropper.', 'Uses more line than a clinch knot.', 'The loop must be opened wide enough to clear the hook point.'],
  warnings: ['The loop must go over the whole hook, bend and point included, not just the eye. If it only goes round the eye the knot is a loose overhand and will pull out.', 'Wet the line before pulling it tight. Dry mono burns and weakens as the coils bed down.'],
  check: 'Two lines leave the eye side by side, the small overhand sits right on top of the eye, and the end loop lies snug round the hook just below the eye. Pull the standing line and the tag together: both should take the load evenly.',
  tips: ['Double about a hand span of line. The loop has to be big enough to pass over the hook with room to spare.', 'Pull the tag and the standing line together to seat it, then pull the standing line alone against the hook.', 'Trim the tag to about 3 mm. It cannot slip once the knot is seated.'],
  related: ['improved-clinch', 'uni-knot', 'overhand', 'surgeons-loop', 'double-overhand'],
  ropeWidth: 2.2,
  view: VIEW,
  props: [hook],
  strands: [{ id: 'a', color: 'teal', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Double the line: fold it back on itself so the tag end runs up beside the standing line. The fold is the loop you will work with. Hold the hook below it, eye up.', pose: p0,
      labels: [{ text: 'standing line', at: [45, 22], anchor: 'right' }, { text: 'tag end', at: [55, 15] }, { text: 'the loop', at: [55, 48] }] },
    { title: 'Loop through the eye', text: 'Push the loop down through the eye of the hook, from the front. Pull it well through so a long loop hangs below the eye, out to the right.', frames: [p1a, p1b, p1c], dur: [1.0, 1.0, 1.1], trail: false,
      labels: [{ text: 'through the eye', at: [58, 60] }], arrows: [{ from: [43, 48], to: [43, 66] }] },
    { title: 'Loose overhand knot', text: 'Treat the doubled line as one rope. Swing the loop up the right side, lay it OVER the two lines above the eye, round to the left, back UNDER the two lines, then out OVER the right side of the loop. The hook hangs in the middle of this loose overhand.', frames: [p2a, p2b, p2c, p2d, p2e, p2f], dur: [1.1, 0.9, 0.9, 0.9, 0.6, 0.9], trail: false,
      labels: [{ text: 'over', at: [31, 37], anchor: 'right' }, { text: 'under', at: [31, 50], anchor: 'right' }, { text: 'over', at: [67, 47] }] },
    { title: 'Loop over the hook', text: 'Open the end loop wide. Pass it down round the bend and point of the hook, then slide it up the shank toward the eye. The front of the loop lies across the hook, the back of it goes behind.', frames: [p3a, p3b, p3c], dur: [1.1, 1.4, 1.3], trail: false,
      labels: [{ text: 'whole hook through the loop', at: [50, 100.5], anchor: 'center' }] },
    { title: 'Pull tight', text: 'Wet the line. Hold the hook and pull the standing line and the tag end together. The overhand closes down onto the eye and the loop beds down round the shank just below it.', frames: [p4], dur: 1.6, trail: false,
      labels: [{ text: 'pull both lines', at: [59, 24] }], arrows: [{ from: [43, 32], to: [43, 18] }, { from: [57, 32], to: [57, 18] }] },
    { title: 'Trim', text: 'Trim the tag end to about 3 mm. Check that both lines leave the eye side by side and the knot sits snug against the eye.', frames: [p5], dur: 1.2, trail: false, view: VIEW_CLOSE,
      labels: [{ text: 'trim', at: [55, 33] }] },
  ],
};
