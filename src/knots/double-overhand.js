import { P, cat, line, arc, resample, padStart, extend } from './_lib.js';

// Double overhand. A loop with the working end passed up through it twice,
// so the end spirals two full turns round the bottom edge of the loop. Pulled
// tight, the loop closes down behind the two turns and they form a barrel.
//
// Layout: the standing part comes in from the left along y = Y. The loop lies
// to the right and above it: its bottom edge is the standing part carried on
// (the start of LOOP), its far end curls up and the top edge comes back left
// and drops down to cross OVER the standing part at the neck (NX, Y). The end
// then coils round the bottom edge: up behind it at X1, down over the front
// at X2, up behind at X3, down over at X4. Five crossings in a row between the
// same two strands, alternating: the (2,5) torus knot, which is exactly what
// a double overhand is. Along the rope the lint must read
//   U1 O2 U3 O4 U5 O1 U2 O3 U4 O5.
//
// Segments, fixed point counts:
//   S      standing part, off screen to the junction                     6
//   LOOP   bottom edge, curl, top edge, drop over the neck               30
//   W1     first coil: U-turn under, up behind, cap, down over          16
//   W2     second coil: same shape, one pitch to the right              16
//   TAIL   the end hanging out to the right                              6
//
// Consecutive opposite crossings on one strand need ~2.4 rope widths between
// them (the painter's depth footprints), so the pitch of the coils is 11 world
// units and the barrel is drawn snug rather than crushed tight. The coil legs
// lean 7 degrees like a helix seen from the side; the caps are arcs tangent
// to both legs.

const W = 4;
const Y = 58;                       // standing part and bottom edge of the loop
const NX = 23;                      // neck: the end crosses over the standing part here
const PITCH = 11;
const X1 = NX + PITCH, X2 = X1 + PITCH, X3 = X2 + PITCH, X4 = X3 + PITCH;   // 34 45 56 67
const PX = X4 + 6;                  // 73: bottom edge ends, curl begins
const TOPC = Y - 12, BOTC = Y + 7;  // centres of the top caps and bottom caps
const A = (7 * Math.PI) / 180, sA = Math.sin(A), cA = Math.cos(A);
const nS = 6, nL = 30, nW = 16, nT = 6;
const LEN = 400;

const JX = NX - 5;                  // where S hands over to LOOP
const S = line(P(-8, Y), P(JX, Y), nS, 0);

// --- coil geometry -----------------------------------------------------------
// A point on the up-leg through (x, Y): t units above the bottom edge (t < 0 below).
const up = (x, t, z) => P(x + t * sA, Y - t * cA, z);
// A point on the down-leg through (x, Y): t units below the bottom edge (t < 0 above).
const dn = (x, t, z) => P(x + t * sA, Y + t * cA, z);
// Top cap joining the up-leg at xa to the down-leg at xb, tangent to both.
const topCap = (xa, xb) => {
  const xm = (xa + xb) / 2, h = Y - TOPC;
  return { r: (xm - xa) * cA - h * sA, t: (xm - xa) * sA + h * cA, xm };
};
// Bottom cap joining the down-leg at xa to the up-leg at xb.
const botCap = (xa, xb) => {
  const xm = (xa + xb) / 2, h = BOTC - Y;
  return { r: (xm - xa) * cA - h * sA, t: (xm - xa) * sA + h * cA, xm };
};
const tTop = topCap(X1, X2).t, tBot = botCap(X2, X3).t;   // same for every coil
const capTop = (xa, xb) => { const c = topCap(xa, xb); return arc(c.xm, TOPC, c.r, 187, 353, 7, [-1, 1]); };
const capBot = (xa, xb) => { const c = botCap(xa, xb); return arc(c.xm, BOTC, c.r, 173, 7, 7, [1, -1]); };
const upLeg = (x) => line(up(x, -tBot), up(x, tTop), 4, -1);     // behind the bottom edge
const dnLeg = (x) => line(dn(x, -tTop), dn(x, tBot), 4, 1);      // in front of it

// First U-turn: from the neck drop (in front) round under to the first up-leg (behind).
const legFoot = up(X1, -tBot);          // where the first up-leg starts, below the bottom edge
const DROP_END = legFoot[1];             // the neck drop ends level with it, so the U-turn joins both tangentially
const U0 = arc((NX + legFoot[0]) / 2, DROP_END, (legFoot[0] - NX) / 2, 180, 0, 7, [1, -1]);

const W1 = resample(cat(U0, upLeg(X1), capTop(X1, X2), dnLeg(X2)), nW);
const W2 = resample(cat(capBot(X2, X3), upLeg(X3), capTop(X3, X4), dnLeg(X4)), nW);
// Coils in progress. The segments not laid yet are added by the pose with extend().
const w1_under = resample(cat(U0, [up(X1, -tBot + 2.5, -1)]), nW);               // tucked under the bottom edge, pointing up
const w1_up = resample(cat(U0, upLeg(X1)), nW);                                   // up through the loop
const w1_cap = resample(cat(U0, upLeg(X1), capTop(X1, X2)), nW);                  // over the top, pointing down
const w2_under = resample(cat(capBot(X2, X3), [up(X3, -tBot + 2.5, -1)]), nW);
const w2_up = resample(cat(capBot(X2, X3), upLeg(X3)), nW);
const w2_cap = resample(cat(capBot(X2, X3), upLeg(X3), capTop(X3, X4)), nW);

// --- the loop -----------------------------------------------------------------
const bottomEdge = [P(JX, Y, 0), P(45, Y, 0), P(PX, Y, 0)];
// Open: a big egg. Curl of radius 15, top edge arched, round shoulder, straight drop.
const curlOpen = arc(PX, Y - 15, 15, 90, -90, 11, 0);
const topOpen = [P(69, Y - 30.1, 0), P(63, Y - 30.7, 0), P(56, Y - 31.2, 0), P(48, Y - 31.4, 0), P(41, Y - 31.2, 0)];
const shoulderOpen = arc(35, Y - 19, 12, 270, 180, 7, 0);
const dropOpen = [P(NX, Y - 19, 0), P(NX, Y - 12, 0.5), P(NX, Y - 7, 1), P(NX, Y, 1), P(NX, DROP_END, 1)];
const LOOP = resample(cat(bottomEdge, curlOpen, topOpen, shoulderOpen, dropOpen), nL);
// Being swung: laid up to the middle of the top edge.
const LOOP_swing = resample(cat(bottomEdge, curlOpen, [P(69, Y - 30.1, 0), P(63, Y - 30.7, 0), P(56, Y - 31.2, 0), P(52, Y - 31.3, 0)]), nL);
// Hovering: everything laid but the drop stops just above the standing part.
const LOOP_hover = resample(cat(bottomEdge, curlOpen, topOpen, shoulderOpen, [P(NX, Y - 19, 0), P(NX, Y - 14, 0.5), P(NX, Y - 10, 1)]), nL);
// Half closed: curl shrunk, top edge dropped to just above the coils, already behind.
const LOOP_mid = resample(cat(
  bottomEdge,
  arc(PX, Y - 9, 9, 90, -90, 9, [0, -0.6]),
  [P(62, Y - 20, -1.2), P(42, Y - 21, -1.5), P(31, Y - 21, -1.2)],
  arc(29, Y - 15, 6, 270, 180, 5, [-0.8, 0.4]),
  [P(NX, Y - 15, 0.6), P(NX, Y - 8, 1), P(NX, Y, 1), P(NX, DROP_END, 1)],
), nL);
// Closed: small eye on the right, top edge runs BEHIND the coil legs.
const LOOP_tight = resample(cat(
  bottomEdge,
  arc(PX, Y - 5, 5, 90, -90, 7, [0, -1]),
  [P(70, Y - 10, -2), P(X4, Y - 10, -2), P(X1 + 1, Y - 10, -2), P(29.5, Y - 10, -1.6)],
  arc(29, Y - 4, 6, 270, 180, 5, [-1.2, 0.6]),
  [P(NX, Y - 4, 1), P(NX, Y, 1), P(NX, DROP_END, 1)],
), nL);

// --- the tail -------------------------------------------------------------------
const tailStart = dn(X4, tBot, 1);
const TAIL = resample([tailStart, P(71, 69.5, 0.6), P(78, 72.5, 0.2), P(87, 73.5, 0)], nT);
const TAIL_tight = resample([tailStart, P(72, 68.5, 0.5), P(80, 69.5, 0), P(91, 69.5, 0)], nT);

const pose = (...segs) => padStart(cat(...segs), LEN);

// 0: straight rope
const p0 = pose(S, line(P(JX, Y), P(58, Y), nL, 0), line(P(58, Y), P(72, Y), nW, 0), line(P(72, Y), P(84, Y), nW, 0), line(P(84, Y), P(94, Y), nT, 0));
// 1: swing the end up and back over to the left, bring it down, lay it across the standing part
const p1a = pose(S, LOOP_swing, extend(LOOP_swing, 16, nW + nW + nT));
const p1b = pose(S, LOOP_hover, extend(LOOP_hover, 4, nW + nW + nT));
const p1 = pose(S, LOOP, extend(LOOP, 18, nW + nW + nT));
// 2: first pass, up through the loop from behind
const p2a = pose(S, LOOP, w1_under, extend(w1_under, 1, nW + nT));
const p2b = pose(S, LOOP, w1_up, extend(w1_up, 5, nW + nT));
// 3: down over the front
const p3a = pose(S, LOOP, w1_cap, extend(w1_cap, 6, nW + nT));
const p3b = pose(S, LOOP, W1, extend(W1, 5, nW + nT));
// 4: second pass, up through again
const p4a = pose(S, LOOP, W1, w2_under, extend(w2_under, 1, nT));
const p4b = pose(S, LOOP, W1, w2_up, extend(w2_up, 5, nT));
// 5: down over the front again, tail out to the right
const p5a = pose(S, LOOP, W1, w2_cap, extend(w2_cap, 6, nT));
const p5 = pose(S, LOOP, W1, W2, TAIL);
// 6: pull tight: the loop shrinks, then its top edge settles behind the coils
const p6a = pose(S, LOOP_mid, W1, W2, TAIL);
const p6 = pose(S, LOOP_tight, W1, W2, TAIL_tight);

export default {
  id: 'double-overhand',
  name: 'Double Overhand',
  aka: ['Barrel knot', 'Double overhand stopper'],
  category: 'stoppers',
  abok: [516],
  difficulty: 2,
  summary: 'An overhand with one more pass. A bigger, rounder stopper that stays put in slick rope and backs up other knots.',
  uses: [
    'Stopper in each end of a rappel rope so the device cannot run off the end.',
    'Backup knot on the tail of a bowline or a figure eight follow through, tied snug against the main knot.',
    'Each half of a double fisherman\'s bend is a double overhand tied round the other rope.',
    'Stop a cord end pulling through a tarp grommet, a stuff sack channel or a bear bag pulley.',
  ],
  pros: [
    'Bulkier and more secure than a single overhand. It does not roll or shake out easily.',
    'Quick to tie in gloves or in the dark: loop, two passes, pull.',
    'Forms a neat barrel that sits square on the rope.',
  ],
  cons: [
    'Jams tight after a hard load and is harder to untie than a figure eight.',
    'Uses more rope than an overhand. Leave a tail of at least ten rope widths.',
  ],
  warnings: [
    'As a rappel stopper, tie one in each rope end and check both before you weight the rope.',
    'A loose double overhand can shake out in stiff rope. Set it hard by pulling both ends apart.',
  ],
  check: 'From the front you see two turns lying side by side, parallel and tight. From the back one strand runs across both turns. The standing part comes out of one end of the barrel and the tail out of the other. If you see only one turn you tied a plain overhand.',
  tips: [
    'Hold the loop open with one hand while you push the end through twice. The second pass goes in beside the first, not across it.',
    'Before you pull it tight, slide the two turns together so they lie flat. A turn that rides over the other makes a lumpy knot.',
    'Pull the tail and the standing part in opposite directions to set it.',
  ],
  related: ['overhand', 'figure-eight', 'double-fishermans', 'ashleys-stopper', 'bowline'],
  ropeWidth: W,
  strands: [{ id: 'a', color: 'orange', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Lay the rope out. The long side on the left is the standing part. The short side you will move is the working end, marked with the pale band.', pose: p0,
      labels: [{ text: 'standing part', at: [2, 67] }, { text: 'working end', at: [93, 50], anchor: 'right' }] },
    { title: 'Make a loop', text: 'Swing the working end up, back over to the left and down, then lay it across the top of the standing part. The end crosses over and hangs below.', frames: [p1a, p1b, p1], dur: [1.1, 0.9, 0.9], trailBend: -0.3,
      labels: [{ text: 'end crosses over', at: [29, 71] }] },
    { title: 'Up through the loop', text: 'Take the end right along the underside of the loop, then push it up through the loop from behind, just right of the crossing.', frames: [p2a, p2b], dur: [0.9, 1.0], trailBend: 0.2,
      labels: [{ text: 'up from behind', at: [39, 72] }] },
    { title: 'Down over the front', text: 'Bring the end down over the front of the bottom edge of the loop. That is one turn round the bottom of the loop.', frames: [p3a, p3b], dur: [0.9, 1.0], trailBend: 0.3,
      labels: [{ text: 'down over the front', at: [52.5, 73] }] },
    { title: 'Up through again', text: 'Push the end up through the loop from behind a second time, right next to the first turn.', frames: [p4a, p4b], dur: [0.9, 1.0], trailBend: 0.2,
      labels: [{ text: 'up from behind', at: [60, 72] }] },
    { title: 'Down over again', text: 'Bring it down over the front again and let the tail hang out to the right. Two turns now lie side by side inside the loop.', frames: [p5a, p5], dur: [0.9, 1.0], trailBend: 0.3,
      labels: [{ text: 'two turns side by side', at: [50, 36], anchor: 'center' }] },
    { title: 'Pull tight', text: 'Pull the standing part and the tail apart. The loop shrinks, its top edge settles behind the two turns, and they lock into a barrel.', frames: [p6a, p6], dur: [1.0, 1.1],
      labels: [{ text: 'standing part', at: [0.5, 67], size: 3 }, { text: 'tail', at: [93, 63], anchor: 'right' }] },
  ],
};
