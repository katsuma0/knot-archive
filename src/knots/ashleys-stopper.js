import { P, cat, line, resample, padStart } from './_lib.js';

// Ashley's stopper (ABOK 526, the oysterman's stopper). A noose closed down
// on its own tail. Standing part leaves left. The rope is a chain of six
// named segments with fixed point counts, built the same way in every pose
// (docs/AUTHORING.md, section 4):
//
//   LEGA  standing part, off screen to the turn. Static. Passes UNDER the
//         ring's left side, OVER the ring's right side, UNDER the tail.    14 points
//   TURN  the fold at the right end of the eye                              6 points
//   LEGB  lower strand, back left under the eye to the ring. OVER the tail
//         and OVER the ring's end (X).                                     10 points
//   RING  the half hitch round the standing part: up OVER the standing
//         part, round the top, down BEHIND it and UNDER the lower strand.  12 points
//   TAIL  the end hanging from X, swung right and down below the lower strand 6 points
//   THRU  up through the eye: UNDER the lower strand, OVER the standing part 8 points
//
// Loose knot, along the rope from the standing end: U O O O U U (the slip
// knot, which closes to nothing on its own) then U O for the tuck. Five
// crossings. With this tuck the closed curve is a trefoil, which is what lets
// the knot dress into three equal lobes; the opposite tuck is a figure eight.
const nA = 14, nT = 6, nB = 10, nR = 12, nTail = 6, nThru = 8;
const LEN = 320; // total rope length in every frame

const yA = 42, yB = 58;   // the two strands of the eye (loose)
const xRL = 29, xRR = 53; // where the ring crosses the standing part
const xTk = 66;           // where the tail goes up through the eye
const xT = 78;            // the turn (loose)

// Standing part with its depth profile. Only the right end changes (the eye
// shortens when the standing part is pulled), so the crossings keep their z.
const legA = (xEnd, y = yA, rl = xRL, rr = xRR, tk = xTk) => resample(
  [P(-8, y, 0), P(rl - 8, y, 0), P(rl, y, -1), P((rl + rr) / 2, y, 0), P(rr, y, 1), P(rr + 6, y, 0), P(tk, y, -1), P(tk + 6, y, 0), P(xEnd, y, 0)].filter((p, i, a) => i === 0 || p[0] > a[i - 1][0] || i === a.length - 1),
  nA);
const turn = (x, y0 = yA, y1 = yB) => {
  const cy = (y0 + y1) / 2, r = (y1 - y0) / 2;
  const out = [];
  for (let i = 0; i < nT; i++) { const a = -Math.PI / 2 + (Math.PI * i) / (nT - 1); out.push(P(x + r * Math.cos(a), cy + r * Math.sin(a), 0)); }
  return out;
};
// Lower strand from the turn back to the ring. Over the tail at tk, over the ring's end at rr.
const legB = (xStart, y = yB, rr = xRR, tk = xTk, xEnd = 36) => resample(
  [P(xStart, y, 0), P(tk + 6, y, 0), P(tk, y, 1), P((tk + rr) / 2, y, 0), P(rr, y, 1), P(rr - 6, y, 0), P(xEnd, y, 0)].filter((p, i, a) => i === 0 || p[0] < a[i - 1][0]),
  nB);

const pose = (...segs) => padStart(cat(...segs), LEN);

// ---- loose knot segments
const LEGA = legA(xT);
const TURN = turn(xT);
const LEGB = legB(xT);
// Ring: up over the standing part on the left, over the top, down behind it on the right, under the lower strand at X (53,58).
const RING = resample([P(36, yB, 0), P(30.5, 52, 0.5), P(xRL, 46, 1), P(xRL, yA, 1), P(30, 36, 1), P(34, 30.5, 0.8), P(41, 28.5, 0.4), P(48, 30.5, -0.3), P(52, 36, -1), P(xRR, yA, -1), P(xRR, 50, -1), P(xRR, yB, -1)], nR);
// Tail: from X down, round to the right, tip just below the lower strand, still behind.
const TAIL = resample([P(xRR, yB, -1), P(54.5, 65, -1), P(58.5, 70, -1), P(63.5, 69, -1), P(66.5, 66, -1), P(67, 64, -1)], nTail);
// Through the eye: under the lower strand, over the standing part, out the top.
const THRU = resample([P(67, 64, -1), P(67, yB, -1), P(66.5, 50, 0), P(xTk, yA, 1), P(xTk, 34, 1), P(65, 26, 0.7), P(63, 16, 0.3)], nThru);

// 0: straight rope, the end off to the right
const p0 = pose(
  resample([P(-8, yA, 0), P(30, yA, 0), P(xT, yA, 0)], nA),
  line(P(xT, yA, 0), P(82, yA, 0), nT),
  line(P(82, yA, 0), P(86, yA, 0), nB),
  line(P(86, yA, 0), P(89.5, yA, 0), nR),
  line(P(89.5, yA, 0), P(91.5, yA, 0), nTail),
  line(P(91.5, yA, 0), P(94, yA, 0), nThru),
);
// 1a: end lifted and swung down, hanging below the turn
const p1a = pose(LEGA,
  resample([P(xT, yA, 0), P(83, 43.5, 0), P(86, 48, 0), P(86.5, 53, 0)], nT),
  resample([P(86.5, 53, 0), P(85, 62, 0), P(80, 72, 0), P(74, 79, 0)], nB),
  line(P(74, 79, 0), P(71, 82.5, 0), nR),
  line(P(71, 82.5, 0), P(69.5, 84.5, 0), nTail),
  line(P(69.5, 84.5, 0), P(68, 86.5, 0), nThru),
);
// 1: folded back: the lower strand runs left below the standing part, the end pointing left
const p1 = pose(LEGA, TURN, LEGB,
  line(P(36, yB, 0), P(26, yB, 0), nR),
  line(P(26, yB, 0), P(22, yB, 0), nTail),
  line(P(22, yB, 0), P(17, yB, 0), nThru),
);
// 2a: end lifted up and OVER the standing part, pointing up
const p2a = pose(LEGA, TURN, LEGB,
  resample([P(36, yB, 0), P(30.5, 52, 0.5), P(xRL, 46, 1), P(xRL, yA, 1), P(29.5, 34, 1), P(31, 26, 1), P(33.5, 20, 1)], nR),
  line(P(33.5, 20, 1), P(34.5, 17, 1), nTail),
  line(P(34.5, 17, 1), P(35.5, 14, 1), nThru),
);
// 2b: carried over the top to the right and dropped behind, hovering above the standing part
const p2b = pose(LEGA, TURN, LEGB,
  resample([P(36, yB, 0), P(30.5, 52, 0.5), P(xRL, 46, 1), P(xRL, yA, 1), P(30, 36, 1), P(34, 30.5, 0.8), P(41, 28.5, 0.4), P(47, 29.5, -0.4), P(50, 31, -1)], nR),
  line(P(50, 31, -1), P(51.5, 33.5, -1), nTail),
  line(P(51.5, 33.5, -1), P(53, 36, -1), nThru),
);
// 2: down behind the standing part and under the lower strand; the end hangs below. This is the noose.
const p2 = pose(LEGA, TURN, LEGB, RING,
  resample([P(xRR, yB, -1), P(54, 64, -0.8), P(55, 69, -0.5)], nTail),
  resample([P(55, 69, -0.5), P(56.5, 75, -0.3), P(58, 80, -0.2)], nThru),
);
// 3a: end swung right below the lower strand, tip pointing up at the eye, still behind
const p3a = pose(LEGA, TURN, LEGB, RING, TAIL,
  line(P(67, 64, -1), P(67, 61.5, -1), nThru),
);
// 3: up through the eye: under the lower strand, over the standing part
const p3 = pose(LEGA, TURN, LEGB, RING, TAIL, THRU);
// 4: standing part pulled: the eye shortens until the turn closes on the tail
const xT4 = 73;
const p4 = pose(legA(xT4), turn(xT4), legB(xT4), RING, TAIL, THRU);
// 5: dressed: everything snug, the tail bent to the right
const yA5 = 43, yB5 = 56, rl5 = 38, rr5 = 50, tk5 = 62, xT5 = 68;
const p5 = pose(
  legA(xT5, yA5, rl5, rr5, tk5),
  turn(xT5, yA5, yB5),
  legB(xT5, yB5, rr5, tk5, 42),
  resample([P(42, yB5, 0), P(38.5, 51, 0.5), P(rl5, 47, 1), P(rl5, yA5, 1), P(38.5, 37, 1), P(41, 32.5, 0.8), P(45.5, 31, 0.4), P(49, 33, -0.3), P(rr5, 38, -1), P(rr5, yA5, -1), P(rr5, 50, -1), P(rr5, yB5, -1)], nR),
  resample([P(rr5, yB5, -1), P(51, 62, -1), P(54.5, 66.5, -1), P(59, 66, -1), P(61.5, 62, -1), P(62, 60, -1)], nTail),
  resample([P(62, 60, -1), P(tk5, yB5, -1), P(tk5, 50, 0), P(tk5, yA5, 1), P(63, 37, 1), P(67.5, 31, 0.6), P(78, 27, 0.2), P(90, 25, 0)], nThru),
);

export default {
  id: 'ashleys-stopper',
  name: "Ashley's Stopper",
  aka: ["Oysterman's stopper"],
  category: 'stoppers',
  abok: [526],
  difficulty: 2,
  summary: 'A slip knot closed down on its own tail. The bulkiest stopper you can tie in a single strand, with a flat three-lobed base that blocks a hole a figure eight pulls through.',
  uses: [
    'Stop a guy line pulling out of a tarp grommet or a tent pole eyelet that is too big for a figure eight.',
    'Stopper on the end of a bear bag hauling line so it cannot run back through the branch fork or the pulley.',
    'A fat knob on a drawstring, a pack cord or a bucket bail that cold hands can find and grip.',
    'Stopper in the end of a canoe painter or a tie-down before it runs through a cleat or a fairlead.',
  ],
  pros: [
    'Bulkier than a figure eight in the same rope, and it sits flat on the rim of the hole with the standing part in the centre.',
    'Symmetrical, so it does not tilt or roll on the rim.',
    'Holds its shape in stiff, slick cord that shakes a figure eight loose.',
  ],
  cons: [
    'More steps than an overhand or a figure eight, and the direction of the last tuck matters.',
    'Jams hard after a heavy load. Push the lobes together from both sides before you pick at the tail.',
  ],
  warnings: [
    'Tuck the end the right way: up through the eye from behind, under the lower strand and out over the standing part. Tucked the other way the knot is a lopsided figure eight and does not seat flat.',
    'Tighten in order: snug the half hitch first, then pull the tail, then the standing part. If you pull the standing part first the eye closes before the hitch is set and you get a loose tangle.',
    'Leave a tail of at least four rope widths. Only the closed eye grips it.',
  ],
  check: 'Look at the knot from the standing part side: three equal lobes of rope round the standing part, like a trefoil, with the standing part coming out of the centre. The tail leaves the top of the knot. If one side is a flat diagonal and the lobes are unequal, the end went through the eye the wrong way. Untie it and tuck again.',
  tips: [
    'Think of it as a slip knot that eats its own tail: make the noose, feed the end through the eye, then pull the standing part so the eye closes on it.',
    'Work it snug in stages, half hitch first, tail second, standing part last. The three lobes line up as it tightens.',
    'To untie, push the lobes toward each other with your thumbs to open the eye, then back the tail out.',
  ],
  related: ['overhand', 'figure-eight', 'double-overhand', 'slip-knot'],
  ropeWidth: 4.5,
  strands: [{ id: 'a', color: 'orange', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Lay the rope out. The long side running off to the left is the standing part. The short side you will move is the working end, marked with the pale band.', pose: p0,
      labels: [{ text: 'standing part', at: [8, 51] }, { text: 'working end', at: [92, 35], anchor: 'right' }] },
    { title: 'Fold the end back', text: 'Fold the working end back so it runs left, below the standing part and parallel to it. The slot between the two strands is the eye of the noose.', frames: [p1a, p1], dur: [1.1, 1.3],
      labels: [{ text: 'eye', at: [62, 51.5], anchor: 'center', size: 3.2 }] },
    { title: 'Hitch round the standing part', text: 'Take the end up and OVER the standing part, round the top, then down BEHIND the standing part and UNDER the lower strand, so it hangs below. This half hitch makes the noose.', frames: [p2a, p2b, p2], dur: [1.1, 1.1, 1.2],
      labels: [{ text: 'over', at: [22, 36], anchor: 'right' }, { text: 'behind', at: [58, 33], anchor: 'left' }, { text: 'under', at: [46, 67], anchor: 'right' }] },
    { title: 'Tuck through the eye', text: 'Swing the end round to the right and push it up through the eye from behind: UNDER the lower strand, then out OVER the standing part.', frames: [p3a, p3], dur: [1.0, 1.4], trailBend: -0.25,
      labels: [{ text: 'under', at: [71.5, 66], anchor: 'left' }, { text: 'over', at: [72, 36], anchor: 'left' }] },
    { title: 'Close the eye', text: 'Pull the standing part to the left. The eye shortens until the turn closes down on the end and grips it.', frames: [p4], dur: 1.3 },
    { title: 'Dress and tighten', text: 'Snug the half hitch, then pull the tail, then the standing part. The knot gathers into three lobes round the standing part and the tail leaves the top.', frames: [p5], dur: 1.4 },
  ],
};
