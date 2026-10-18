import { P, cat, line, resample, padStart, scale } from './_lib.js';

// Figure eight stopper. Standing part from the left. The rope is a chain of
// five named segments with fixed point counts, built the same way in every
// pose (see docs/AUTHORING.md, section 4):
//
//   S      standing part, off screen to the loop crossing X1          8 points
//          (passes X2 on top, where the end later goes behind it)
//   LOOP   the first loop: up and right, round the top, down the left,
//          back OVER the standing part at X1                          12 points
//   ROUND  down, round to the left, up BEHIND the standing part (X2)    8 points
//   THRU   forward and right, OVER the left side of the loop (X3),
//          across the middle                                            7 points
//   OUT    UNDER the right side of the loop (X4), out to the right       5 points
//
// Along the rope the crossings must alternate: O2 U1 O4 U3 O1 U2 O3 U4.
const nS = 8, nLoop = 12, nRound = 8, nThru = 7, nOut = 5;
const LEN = 360; // total rope length in every frame

// Final segments (loose but complete knot).
const Sc = [P(-8, 60, 0), P(8, 60, 0.4), P(19, 60, 1), P(27, 59, 0), P(34, 56, -1), P(43, 51, -1)];
const LOOPc = [P(43, 51, -1), P(52, 44, 0.2), P(62, 37, 1), P(67, 26, 0.7), P(62, 14, 0.2), P(50, 10, 0), P(39, 14, -0.3), P(33, 26, -1), P(33, 35, -1), P(35, 45, 0.2), P(38, 54, 1), P(40, 58, 1)];
const ROUNDc = [P(40, 58, 1), P(42, 65, 1), P(38, 73, 0.5), P(28, 78, 0), P(19, 72, -1), P(19, 60, -1), P(20, 50, -1), P(21, 44, -0.3)];
const THRUc = [P(21, 44, -0.3), P(23, 38, 0.5), P(32, 33, 1), P(44, 30, 1), P(52, 30, 0.5), P(57, 31, -0.6)];
const OUTc = [P(57, 31, -0.6), P(64, 33, -1), P(72, 36, -0.6), P(81, 40, 0), P(90, 45, 0)];

const S = resample(Sc, nS);
const LOOP = resample(LOOPc, nLoop);
const ROUND = resample(ROUNDc, nRound);
const THRU = resample(THRUc, nThru);
const OUT = resample(OUTc, nOut);

const pose = (...segs) => padStart(cat(...segs), LEN);

// Lay one control path across several segments: fracs[i] of the path's
// length goes to segment i (the last segment takes what is left). Keeps the
// point counts fixed and the spacing even, for frames where the end is
// swinging through the air and no segment is in its final place yet.
function lay(path, counts, fracs) {
  const fine = resample(path, 400);
  const out = [];
  let a = 0;
  for (let i = 0; i < counts.length; i++) {
    const b = i === counts.length - 1 ? 1 : a + fracs[i];
    const i0 = Math.round(a * (fine.length - 1)), i1 = Math.round(b * (fine.length - 1));
    out.push(resample(fine.slice(i0, i1 + 1), counts[i]));
    a = b;
  }
  return out;
}

// 0: straight rope
const p0 = pose(
  resample([P(-8, 60, 0), P(10, 60, 0), P(43, 57, 0)], nS),
  line(P(43, 57, 0), P(64, 56, 0.5), nLoop),
  line(P(64, 56, 0.5), P(76, 55, 0.5), nRound),
  line(P(76, 55, 0.5), P(85, 54, 0.5), nThru),
  line(P(85, 54, 0.5), P(92, 53, 0.5), nOut),
);

// 1pre: end lifted and swung up and over to the right in an open arc, tip pointing left at the top
const p1pre = pose(S, ...lay([P(43, 51, -1), P(55, 46, 0.3), P(66, 36, 1), P(71, 22, 1), P(66, 9, 1), P(54, 4, 1), P(42, 7, 1), P(34, 15, 1)], [nLoop, nRound, nThru, nOut], [0.62, 0.2, 0.11]));
// 1a: end swung up and round, hovering in front, tip just above the standing part
const p1a = pose(S,
  resample([P(43, 51, -1), P(55, 46, 0.5), P(67, 36, 1), P(70, 22, 1), P(60, 9, 1), P(45, 8, 1), P(34, 16, 1), P(29, 29, 1), P(31, 38, 1)], nLoop),
  line(P(31, 38, 1), P(34, 43, 1), nRound),
  line(P(34, 43, 1), P(36, 46, 1), nThru),
  line(P(36, 46, 1), P(37.5, 48.5, 1), nOut),
);
// 1: loop made, end lying across the top of the standing part, hanging down
const p1 = pose(S, LOOP,
  line(P(40, 58, 1), P(43, 66, 1), nRound),
  line(P(43, 66, 1), P(46, 73, 0.9), nThru),
  line(P(46, 73, 0.9), P(48, 80, 0.8), nOut),
);
// 2a: end swung down and left below the standing part, dropped behind (z = -1), still clear of it
const p2a = pose(S, LOOP,
  resample([P(40, 58, 1), P(43, 65, 1), P(40, 73, 0.5), P(32, 80, -0.5), P(22, 80, -1)], nRound),
  line(P(22, 80, -1), P(13, 77, -1), nThru),
  line(P(13, 77, -1), P(7, 72, -1), nOut),
);
// 2b: end pushed up behind the standing part, tip just out above it
const p2b = pose(S, LOOP,
  resample([P(40, 58, 1), P(42, 65, 1), P(38, 73, 0.5), P(28, 78, 0), P(19, 72, -1), P(19, 64, -1)], nRound),
  line(P(19, 64, -1), P(19, 56, -1), nThru),
  line(P(19, 56, -1), P(19, 48, -1), nOut),
);
// 2: pulled up, end pointing up on the left of the loop
const p2 = pose(S, LOOP, ROUND,
  line(P(21, 44, -0.3), P(20, 36, -0.3), nThru),
  line(P(20, 36, -0.3), P(19, 28, -0.3), nOut),
);
// 3a: end brought forward (z = +1) and aimed right at the left side of the loop
const p3a = pose(S, LOOP, ROUND,
  resample([P(21, 44, -0.3), P(22, 40, 0.3), P(25, 37, 1)], nThru),
  line(P(25, 37, 1), P(27, 36, 1), nOut),
);
// 3: over the left side, across the middle of the loop, tip dipping behind before the right side
const p3 = pose(S, LOOP, ROUND, THRU, line(P(57, 31, -0.6), P(59, 32, -1), nOut));
// 4a: tip pushed under the right side, just showing on the far side
const p4a = pose(S, LOOP, ROUND, THRU, resample([P(57, 31, -0.6), P(64, 33, -1), P(70, 35, -1)], nOut));
// 4: under the right side and out
const p4 = pose(S, LOOP, ROUND, THRU, OUT);

// 5: snugged down: same topology, pressed toward the line between the
// standing part and the tail so the two lobes lie side by side.
const sx = 0.7, sy = 0.5, cx = 43, cy = 46;
const sh = (ctrl) => scale(ctrl, sx, sy, cx, cy);
const S5 = resample([P(-8, 53, 0), P(6, 53, 0), ...sh(Sc).slice(1)], nS);
const p5 = pose(
  S5,
  resample(sh(LOOPc), nLoop),
  resample(sh(ROUNDc), nRound),
  resample(sh(THRUc), nThru),
  resample([...sh(OUTc), P(84, 47, 0), P(92, 48, 0)], nOut),
);

export default {
  id: 'figure-eight',
  name: 'Figure Eight',
  aka: ['Flemish knot', 'Savoy knot'],
  category: 'stoppers',
  abok: [520],
  difficulty: 1,
  summary: 'The standard stopper knot. Bulkier than an overhand, and it still unties easily after it has been loaded.',
  uses: [
    'Stopper in the end of a rappel rope so the end cannot run through the belay device.',
    'Stop a guy line or a tarp ridgeline pulling out of a grommet, a line tensioner or a tie-out.',
    'Stop a bear bag line or a throw line sliding back through a carabiner or a pulley.',
    'Keep a drawcord from pulling out of a stuff sack channel or a cord lock.',
    'Building block: the figure eight on a bight, the figure eight follow through and the figure eight bend all start with this knot.',
  ],
  pros: ['Bigger and rounder than an overhand, so it stops in a bigger hole.', 'Does not jam. After a hard pull you can still pick it apart.', 'Easy to check by eye: an 8 lying on its side.'],
  cons: ['Uses more rope than an overhand.', 'Can shake loose in stiff or slick rope if it is left slack with a short tail.'],
  warnings: ['Under repeated jerks it can roll off the end of the rope if the tail is short. Leave a tail of at least ten rope widths and snug it hard, or tie a double overhand instead.', 'This is a stopper, not a loop. To tie in to a harness or round a tree, tie the figure eight follow through.'],
  check: 'Look for an 8 lying on its side: two lobes, four crossings, and the rope goes over, under, over, under all the way round. The standing part and the tail leave from opposite ends. One lobe and three crossings means you tied an overhand.',
  tips: ['Say it as you tie: over, round behind, back through. The extra half turn round the standing part is the only difference from an overhand.', 'Dress it before you load it: pull the standing part and the tail apart and press the two lobes flat so they lie side by side.', 'To untie after loading, push the tail back into the knot and the lobes open up.'],
  related: ['overhand', 'double-overhand', 'figure-eight-on-a-bight', 'figure-eight-follow-through', 'figure-eight-bend', 'ashleys-stopper'],
  ropeWidth: 4,
  strands: [{ id: 'a', color: 'orange', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Lay the rope out. The long side on the left is the standing part. The short side you will move is the working end, marked with the pale band.', pose: p0,
      labels: [{ text: 'standing part', at: [8, 69] }, { text: 'working end', at: [86, 47], anchor: 'right' }] },
    { title: 'Make a loop', text: 'Swing the working end up, round to the left and back down. Lay it across the top of the standing part so it hangs below. The end sits on top at the crossing.', frames: [p1pre, p1a, p1], dur: [1.1, 1.0, 1.0],
      labels: [{ text: 'end on top', at: [46, 61] }] },
    { title: 'Round behind the standing part', text: 'Swing the end to the left, below the standing part, then push it up behind the standing part. It comes out above, on the left of the loop.', frames: [p2a, p2b, p2], dur: [1.0, 1.1, 0.9],
      labels: [{ text: 'behind', at: [4, 49] }] },
    { title: 'Over the left side of the loop', text: 'Bring the end forward and lay it over the left side of the loop, pointing right across the middle.', frames: [p3a, p3], dur: [0.9, 1.4],
      labels: [{ text: 'over', at: [21, 30], anchor: 'center' }] },
    { title: 'Under the right side and out', text: 'Push the end under the right side of the loop and pull it out to the right. Over, under, over, under all the way round: that is the figure eight.', frames: [p4a, p4], dur: [1.0, 1.1],
      labels: [{ text: 'under', at: [78, 25], anchor: 'center' }] },
    { title: 'Snug it down', text: 'Pull the standing part and the tail apart. The two lobes close up side by side into an 8. Leave a tail at least ten rope widths long.', frames: [p5], dur: 1.4 },
  ],
};
