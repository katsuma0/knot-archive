import { P, cat, arc, line, resample, pathLength } from './_lib.js';

// Prusik. Two strands: `a` is the main rope (thick, blue, vertical, static)
// and `b` is the prusik loop (thin orange cord). The loop is closed, so it is
// one strand whose two ends are the two legs running off screen right to the
// carabiner. The U end of the loop is what wraps.
//
// Strand b is a chain of named segments with fixed point counts, mirrored
// about y = 50 (the two halves of a prusik are mirror images):
//   LEG   off screen right to the rope's right edge                      nLeg
//   DIAG  enters behind the rope level with the leg, climbs hidden       nDiag
//         behind the rope to the outer wrap, round the left edge (hairpin)
//   F1    outer wrap across the front + right hairpin down                nPass
//   B2    second wrap behind + left hairpin down                          nPass
//   F2    second wrap across the front, running on into the U            nPass
//   BEND  the U of the loop, bulging right over the legs                 nBend
//   then the mirror of F2 B2 F1 DIAG LEG, reversed.
// While the U is being moved, F1+B2+F2 are one free-form run of 3 * nPass.
//
// Depth: cord in front of the rope z = +1; legs and the hidden climb z = -1
// (everything else passes over them); back passes z = -0.6; rope z = 0.
// Seen from the side a wrap turns a hairpin of radius b at each rope edge.

const RX = 50, RW = 7, CW = 3.5;      // rope axis, rope width, cord width
const RR = RW / 2 + CW / 2;           // 5.25: cord centreline radius round the rope
const XL = RX - RR, XR = RX + RR;     // 44.75 / 55.25: cord centreline at the rope's edges
const X0 = 100;                       // the legs start here, off screen right
const ROPE = resample([P(RX, -10, 0), P(RX, 110, 0)], 5);

const nLeg = 7, nApp = 11, nHair = 7, nDiag = nApp + nHair, nLine = 5, nPass = nLine + nHair, nBend = 15;
const nArm = 3 * nPass;

const mirrorRev = (pts) => pts.map((p) => [p[0], 100 - p[1], p[2] || 0]).reverse();

// Both legs leave to the right, so spare cord waits off screen at both ends.
function padBoth(pts, total) {
  const rest = Math.max(0.02, total - pathLength(pts)) / 2;
  const a = pts[0], z = pts[pts.length - 1];
  return [[a[0] + rest, a[1], a[2] || 0], ...pts, [z[0] + rest, z[1], z[2] || 0]];
}

// ---- segment builders -------------------------------------------------
// hairpins round the rope's edges: exact arc points, never resampled
const ZB = -0.6;                      // back passes: behind the rope, over the hidden climb (-1)
const hairL = (b, yTop, z0, z1) => arc(XL + b, yTop + b, b, 270, 90, nHair, [z0, z1]);
const hairR = (b, yTop, z0, z1) => arc(XR - b, yTop + b, b, -90, 90, nHair, [z0, z1]);

// leg: off screen right, drops behind (z -1) before it reaches the U, enters behind the rope
const legT = (yLeg, xDip) => resample([P(X0, yLeg, 0), P(xDip + 7, yLeg, 0), P(xDip, yLeg, -1), P(XR, yLeg, -1)], nLeg);

// climb: in behind the rope level with the leg, a rounded corner up and left,
// a short diagonal to x = xk (left half of the rope: it crosses the rope's
// axis at a steep angle and the back pass clear of the axis), straight up
// behind the rope under the left hairpins, a rounded corner into the top-left hairpin, which
// brings the cord round the left edge to the front (z -1 -> +1)
const diagT = (yLeg, b, yF1) => {
  const yTop = yF1 - 2 * b, xi = XL + b, xk = 47.9, rT = xk - xi;
  const app = cat(resample(cat(
    [P(XR, yLeg, -1)],
    arc(53.5, yLeg - 3, 3, 90, 135, 4, -1),                               // (53.5, yLeg) round to heading up-left
    [P(49.6, yLeg - 2.7, -1), P(48.5, yLeg - 4.1, -1), P(xk, yLeg - 5.4, -1), P(xk, yTop + rT, -1)],
  ), nApp - 5), arc(xi, yTop + rT, rT, 0, -90, 5, -1));                 // exact arc: (xk, yTop + rT) round to (xi, yTop), heading left
  return cat(app, hairL(b, yTop, -1, 1));
};
// outer wrap across the front (left to right, descending by tilt), then the right hairpin down
const passF1 = (b, yF1, tilt) => cat(resample([P(XL + b, yF1, 1), P(50, yF1 + tilt / 2, 1), P(XR - b, yF1 + tilt, 1)], nLine), hairR(b, yF1 + tilt, 1, ZB));
// second wrap behind (right to left, rising by tilt), then the left hairpin down
const passB2 = (b, yB2r, tilt) => cat(resample([P(XR - b, yB2r, ZB), P(50, yB2r - tilt / 2, ZB), P(XL + b, yB2r - tilt, ZB)], nLine), hairL(b, yB2r - tilt, ZB, 1));
// second wrap across the front, running on into the top of the U
const passF2 = (b, yF2, top) => resample([P(XL + b, yF2, 1), P(50, yF2, 1), P(XR - b, yF2, 1), top], nPass);
// the U: a semicircle bulging right, from its top (heading right) to its bottom
const bendU = (cx, r, z = 1) => arc(cx, 50, r, -90, 90, nBend, z);

// ---- stage parameters -------------------------------------------------
// loose (while tying): legs 7 apart, pitch 6.4, big U
const L = { yLeg: 46.5, b: 1.6, yF1: 36.7, tilt: 0.5, bx: 59.45, br: 7, xDip: 67 };
// dressed: legs together, pitch 5.6 (1.6 cord widths), U snug round the legs
const D = { yLeg: 48.2, b: 1.4, yF1: 38.9, tilt: 0.5, bx: 56.5, br: 5.5, xDip: 64 };
const levels = (s) => {
  const yB2r = s.yF1 + s.tilt + 2 * s.b;      // second wrap behind, at the right edge
  const yF2 = yB2r - s.tilt + 2 * s.b;        // second wrap in front (the U's arm)
  return { yB2r, yF2, xi: XL + s.b, xr: XR - s.b, top: P(s.bx, 50 - s.br, 1) };
};
const LL = levels(L), DL = levels(D);

const pose = (T, bend) => cat(T, bend, mirrorRev(T));

// ---- poses --------------------------------------------------------------
// 0: loop lying to the right of the rope, U pointing at the rope
const T0 = cat(resample([P(X0, L.yLeg, 0), P(88, L.yLeg, 0)], nLeg), resample([P(88, L.yLeg, 0), P(75, L.yLeg, 0)], nDiag), resample([P(75, L.yLeg, 0), P(61.5, L.yLeg, 0)], nArm));
const p0 = pose(T0, arc(61.5, 50, 3.5, 270, 90, nBend, 0));

// 1: U pushed behind the rope, sticking out on the left
const T1 = cat(legT(L.yLeg, 60), resample([P(XR, L.yLeg, -1), P(XL, L.yLeg, -1)], nDiag), resample([P(XL, L.yLeg, -1), P(40.5, L.yLeg, -0.9)], nArm));
const p1 = pose(T1, arc(40.5, 50, 3.5, 270, 90, nBend, -0.9));

// 2a: U comes round the left edge to the front and starts to open
const T2a = cat(legT(L.yLeg, 60),
  resample([P(XR, L.yLeg, -1), P(50, 45.6, -1), P(XL, 43.8, -0.7)], nDiag),
  resample([P(XL, 43.8, -0.7), P(42.6, 44.6, 0.3), P(40.17, 47.17, 1)], nArm));
const p2a = pose(T2a, arc(43, 50, 4, 225, 135, nBend, 1));

// 2b: U opened wide across the front of the rope; its right side lies on the rope
const T2b = cat(legT(L.yLeg, 60), diagT(L.yLeg, L.b, L.yF1),
  resample([P(LL.xi, L.yF1, 1), P(50, L.yF1 + 0.25, 1), P(51.4, L.yF1 + 1.2, 1), P(51.7, 42, 1), P(51.3, 45.2, 1), P(50.8, 46.5, 1)], nArm));
const p2b = pose(T2b, resample([P(50.8, 46.5, 1), P(51.3, 48.5, 1), P(51.5, 50, 1), P(51.3, 51.5, 1), P(50.8, 53.5, 1)], nBend));

// 2c: girth hitch. U pulled right over the legs; the cord shoulders down from
// the wrap into the top of the U along two quarter arcs (radius rS)
const rS = 2.9;
const T2c = cat(legT(L.yLeg, L.xDip), diagT(L.yLeg, L.b, L.yF1),
  resample(cat([P(LL.xi, L.yF1, 1), P(50, L.yF1 + L.tilt / 2, 1)],
    arc(LL.xr, L.yF1 + L.tilt + rS, rS, -90, 0, 5, 1), arc(LL.xr + 2 * rS, L.yF1 + L.tilt + rS, rS, 180, 90, 5, 1)), nArm));
const p2c = pose(T2c, bendU(L.bx, L.br));

// 3a: U drawn back to the rope's right edge and dropped behind the rope's plane (still over the legs)
const T3a = cat(legT(L.yLeg, L.xDip), diagT(L.yLeg, L.b, L.yF1),
  resample([P(LL.xi, L.yF1, 1), P(50, L.yF1 + 0.25, 1), P(LL.xr, L.yF1 + 0.6, 1), P(55.2, 38.2, 0.4), P(56.2, 40.5, -0.5), P(56.6, 44, -0.5)], nArm));
const p3a = pose(T3a, resample([P(56.6, 44, -0.5), P(57.1, 47, -0.5), P(57.3, 50, -0.5), P(57.1, 53, -0.5), P(56.6, 56, -0.5)], nBend));

// 3b: U directly behind the rope; the right hairpin has formed
const T3b = cat(legT(L.yLeg, L.xDip), diagT(L.yLeg, L.b, L.yF1), passF1(L.b, L.yF1, L.tilt),
  resample([P(LL.xr, LL.yB2r, ZB), P(52.4, LL.yB2r + 0.3, -0.7), P(50.9, LL.yB2r + 1.6, -0.7), P(50.3, 44.5, -0.7)], 2 * nPass));
const p3b = pose(T3b, line(P(50.3, 44.5, -0.7), P(50.3, 55.5, -0.7), nBend));

// 3c: U out on the left behind the rope; the back pass forms
const T3c = cat(legT(L.yLeg, L.xDip), diagT(L.yLeg, L.b, L.yF1), passF1(L.b, L.yF1, L.tilt),
  resample([P(LL.xr, LL.yB2r, ZB), P(50, LL.yB2r - 0.25, ZB), P(LL.xi, LL.yB2r - 0.5, ZB), P(44.3, 40.0, -0.55), P(41.3, 41.9, -0.45), P(36.96, 46.46, -0.4)], 2 * nPass));
const p3c = pose(T3c, arc(40.5, 50, 5, 225, 135, nBend, -0.4));

// 3d: U comes round the left edge to the front again
const T3d = cat(legT(L.yLeg, L.xDip), diagT(L.yLeg, L.b, L.yF1), passF1(L.b, L.yF1, L.tilt),
  resample([P(LL.xr, LL.yB2r, ZB), P(50, LL.yB2r - 0.25, ZB), P(LL.xi, LL.yB2r - 0.5, ZB), P(44.3, 40.1, -0.2), P(41.3, 42.1, 0.6), P(36.96, 46.46, 1)], 2 * nPass));
const p3d = pose(T3d, arc(40.5, 50, 5, 225, 135, nBend, 1));

// 3e: U across the front of the rope, its right side lying on the rope
const T3e = cat(legT(L.yLeg, L.xDip), diagT(L.yLeg, L.b, L.yF1), passF1(L.b, L.yF1, L.tilt), passB2(L.b, LL.yB2r, L.tilt),
  resample([P(LL.xi, LL.yF2, 1), P(49.5, LL.yF2 + 0.1, 1), P(51.3, LL.yF2 + 0.9, 1), P(51.7, 46.5, 1)], nPass));
const p3e = pose(T3e, resample([P(51.7, 46.5, 1), P(52.3, 48.5, 1), P(52.5, 50, 1), P(52.3, 51.5, 1), P(51.7, 53.5, 1)], nBend));

// 3f: two wraps each side, U over the legs
const T3f = cat(legT(L.yLeg, L.xDip), diagT(L.yLeg, L.b, L.yF1), passF1(L.b, L.yF1, L.tilt), passB2(L.b, LL.yB2r, L.tilt), passF2(L.b, LL.yF2, LL.top));
const p3f = pose(T3f, bendU(L.bx, L.br));

// 4: dressed. Legs together, wraps settled, U snug
const T4body = cat(diagT(D.yLeg, D.b, D.yF1), passF1(D.b, D.yF1, D.tilt), passB2(D.b, DL.yB2r, D.tilt), passF2(D.b, DL.yF2, DL.top));
const p4 = pose(cat(legT(D.yLeg, D.xDip), T4body), bendU(D.bx, D.br));

// 5: loaded. Knot slid down the rope a little, legs pulled down to the right, U drawn out
const DY = 3;
const shift = (pts) => pts.map((p) => [p[0], p[1] + DY, p[2] || 0]);
const leg5 = (y0) => resample([P(X0, y0 + 7, 0), P(72, y0 + 2.2, -0.2), P(64, y0 + 0.6, -1), P(57.5, y0 + 0.05, -1), P(XR, y0, -1)], nLeg);
const p5 = cat(leg5(D.yLeg + DY), shift(T4body), shift(bendU(D.bx + 0.6, D.br)), shift(mirrorRev(T4body)), [...leg5(100 - D.yLeg + DY)].reverse());

// fix the total cord length, then pack each pose as {a, b}
const raw = [p0, p1, p2a, p2b, p2c, p3a, p3b, p3c, p3d, p3e, p3f, p4, p5];
const LEN = Math.max(...raw.map(pathLength)) + 4;
const [q0, q1, q2a, q2b, q2c, q3a, q3b, q3c, q3d, q3e, q3f, q4, q5] = raw.map((b) => ({ a: ROPE, b: padBoth(b, LEN) }));

const lbl = (text, at, anchor, size = 2.6) => ({ text, at, anchor, size });

export default {
  id: 'prusik',
  name: 'Prusik',
  aka: ['Prusik hitch', 'Prusik loop'],
  category: 'friction',
  abok: [1763],
  difficulty: 2,
  summary: 'A loop of thin cord wrapped round a thicker rope. It grips when you load it and slides when you let go.',
  uses: [
    'Climb a fixed rope: one prusik clipped to your belay loop, one to a foot loop, slide them up in turn.',
    'Back up a rappel: a prusik on the rope below the device, clipped to your leg loop, grabs the rope if you let go.',
    'Adjust a tarp ridgeline: a prusik loop on the ridgeline slides along to tension the tarp and stays where you leave it.',
    'Hauling and rescue: a prusik on the haul line works as a rope grab or a progress capture in a pulley system.',
  ],
  pros: ['Grips in both directions along the rope.', 'Needs only a loop of cord, no hardware.', 'Slides freely when unweighted and unties easily after loading.'],
  cons: ['Hard to shift once it has locked under weight; take the weight off first.', 'Can glaze or melt if it slips along the rope under load.', 'Needs cord clearly thinner than the rope, about 60 to 80 percent of its diameter.'],
  warnings: [
    'The cord must be thinner than the rope. A 6 mm cord on a 9 to 11 mm rope grips well; cord the same size as the rope will not.',
    'Never let a loaded prusik run along the rope. Friction heat melts nylon cord in seconds.',
    'Test it before you trust it: load it gently, then hard. If it creeps, add a third wrap.',
  ],
  check: 'Two or three neat wraps on each side, lying flat and parallel on the rope. The two legs come out of the middle, through the U of the loop, and the cord is visibly thinner than the rope. If the wraps cross each other or the legs come out at one end, redress it.',
  tips: [
    'Make the loop from about 1.5 m of 5 to 7 mm accessory cord joined with a double fisherman\'s knot.',
    'Two wraps on a dry fat rope, three on a thin, wet or icy rope. Add a wrap rather than trust a slipping prusik.',
    'Move the knot along the rope by pushing the wraps with the heel of your hand. Pulling the legs only makes it grip.',
  ],
  related: ['klemheist', 'autoblock', 'bachmann', 'girth-hitch', 'double-fishermans', 'munter-hitch'],
  ropeWidth: 2.5,
  view: { x: 24, y: 24, w: 52, h: 52 },
  strands: [
    { id: 'a', color: 'blue', end: 'none', width: RW },
    { id: 'b', color: 'orange', end: 'none', width: CW },
  ],
  steps: [
    { title: 'Start', text: 'The thick blue rope is the main rope. The thin orange cord is a prusik loop, a closed loop of cord. Hold its U end toward the rope and let the two legs run off to the right, to the carabiner.', pose: q0,
      labels: [lbl('main rope', [55, 29]), lbl('prusik loop', [59, 40.5]), lbl('to the carabiner', [75, 60], 'right', 2.4)] },
    { title: 'Lay the U behind the rope', text: 'Hold the two legs together. Push the U end of the loop behind the main rope from the right so it sticks out on the left.', frames: [q1], dur: 1.5,
      arrows: [{ from: [60, 42], to: [40, 42], bend: 0.25 }], labels: [lbl('behind the rope', [25, 61])] },
    { title: 'Round the front, legs through the U', text: 'Bring the U round the left side of the rope to the front. Pull it to the right, over the two legs, so the legs pass through the U. This is a girth hitch round the rope.', frames: [q2a, q2b, q2c], dur: [0.9, 1.1, 1.2],
      arrows: [{ from: [36, 44], to: [63, 41], bend: -0.45 }], labels: [lbl('girth hitch', [61, 36]), lbl('through the U', [58.5, 63.5])] },
    { title: 'Second wrap', text: 'Take the U round the rope again: behind the rope from the right, out on the left, round the front, then right over the legs a second time. Each side now has two wraps.', frames: [q3a, q3b, q3c, q3d, q3e, q3f], dur: [0.8, 0.6, 0.7, 0.7, 0.9, 1.0],
      arrows: [{ from: [62, 70], to: [34, 70], bend: -0.3 }], labels: [lbl('two wraps', [55.5, 29]), lbl('each side', [55.5, 32.2])] },
    { title: 'Dress it', text: 'Pull the legs gently. The wraps settle side by side, flat on the rope, and the two legs leave from the middle under the U. For thin, wet or icy cord make a third wrap the same way before you dress it.', frames: [q4], dur: 1.5,
      arrows: [{ from: [67, 44], to: [75, 44] }, { from: [67, 56], to: [75, 56] }], labels: [lbl('side by side', [25, 33]), lbl('from the middle', [75, 64.5], 'right')] },
    { title: 'Load it', text: 'Weight the legs. The knot slides a little, then the wraps bite and lock on the rope. Take the weight off and it slides freely again.', frames: [q5], dur: 1.3,
      arrows: [{ from: [67, 64], to: [75, 67] }], labels: [lbl('wraps bite', [25, 36])] },
  ],
};
