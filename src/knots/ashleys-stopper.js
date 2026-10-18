import { P, arc, cat, line, resample, padStart } from './_lib.js';

// Ashley's stopper (ABOK 526, the oysterman's stopper). A noose closed down
// on its own tail. Standing part leaves left. Six named segments with fixed
// point counts, built the same way in every pose (docs/AUTHORING.md, 4):
//
//   LEGA  standing part, off screen to the turn. UNDER the ring's left
//         side, OVER the ring's right side, UNDER the tail.              14 points
//   TURN  the fold at the right end of the eye                            6 points
//   LEGB  lower strand, back left to the ring. OVER the tail, OVER the
//         ring's end (X).                                                10 points
//   RING  the half hitch round the standing part: up OVER it, round the
//         top, down BEHIND it and UNDER the lower strand.                12 points
//   TAIL  the end hanging from X, swung right below the lower strand       6 points
//   THRU  up through the eye: UNDER the lower strand, OVER the standing
//         part, out the top                                               8 points
//
// Along the rope from the standing end the loose knot reads U O O O U U
// (the noose, no knot on its own) plus U O for the tuck: five crossings.
// The two tuck crossings cancel against the two lower-strand crossings and
// leave an alternating three-crossing core, a trefoil. That is what lets the
// knot dress into three equal lobes. Tucked the other way the core does not
// alternate and the knot dresses lopsided.
const nA = 14, nT = 6, nB = 10, nR = 12, nTail = 6, nThru = 8;
const LEN = 320; // total rope length in every frame

const yA = 42, yB = 58;   // the two strands of the eye (loose)
const xRL = 29, xRR = 53; // where the ring crosses the standing part
const xTk = 66;           // where the tail goes up through the eye
const xT = 78;            // the turn (loose)

const pose = (...segs) => padStart(cat(...segs), LEN);

// ---- loose knot segments
const LEGA = resample([P(-8, yA, 0), P(21, yA, 0), P(xRL, yA, -1), P(41, yA, 0), P(xRR, yA, 1), P(59, yA, 0), P(xTk, yA, -1), P(72, yA, 0), P(xT, yA, 0)], nA);
const TURN = arc(xT, 50, 8, -90, 90, nT, 0);
const LEGB = resample([P(xT, yB, 0), P(72, yB, 0), P(xTk, yB, 1), P(59.5, yB, 0), P(xRR, yB, 1), P(47, yB, 0), P(36, yB, 0)], nB);
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
// 4: standing part pulled: the eye slides shut and closes round the tail.
// The turn is now a loop round THRU: under it at the top, over it at the bottom.
const xC = 67.2;
const p4 = pose(
  resample([P(-8, yA, 0), P(21, yA, 0), P(xRL, yA, -1), P(41, yA, 0), P(xRR, yA, 1), P(59.5, yA, 0), P(xC, yA, -1)], nA),
  arc(xC, 50, 8, -90, 90, nT, [-1, 1]),
  resample([P(xC, yB, 1), P(60, yB, 1), P(xRR, yB, 1), P(47, yB, 0), P(36, yB, 0)], nB),
  RING, TAIL, THRU,
);
// 5: dressed: ring snug on the standing part, eye closed on the tail, the tail's bend pulled up, tail leaving top right
const yA5 = 44, yB5 = 56, rl5 = 40, rr5 = 51, tk5 = 62, xC5 = 62.5;
const p5 = pose(
  resample([P(-8, yA5, 0), P(30, yA5, 0), P(rl5, yA5, -1), P(45.5, yA5, 0), P(rr5, yA5, 1), P(56.5, yA5, 0), P(xC5, yA5, -1)], nA),
  arc(xC5, 50, 6, -90, 90, nT, [-1, 1]),
  resample([P(xC5, yB5, 1), P(56.5, yB5, 1), P(rr5, yB5, 1), P(48.5, yB5, 0.3), P(46, yB5, 0)], nB),
  resample([P(46, yB5, 0), P(42.2, 54.6, 0.4), P(40.3, 50.5, 0.8), P(rl5, yA5, 1), P(rl5, 40, 1), P(42, 35.5, 0.9), P(45.5, 33.5, 0.5), P(49, 35.5, -0.3), P(rr5, 40, -1), P(rr5, yA5, -1), P(rr5, 50, -1), P(rr5, yB5, -1)], nR),
  resample([P(rr5, yB5, -1), P(51.3, 59.5, -1), P(53.2, 62.2, -1), P(56.5, 63.2, -1), P(59.8, 62.2, -1), P(61.7, 59.5, -1), P(tk5, 57, -1)], nTail),
  resample([P(tk5, 57, -1), P(tk5, 52, -0.3), P(tk5, 47, 0.5), P(tk5, yA5, 1), P(tk5, 38, 1), P(64, 32.5, 0.8), P(69, 28, 0.4), P(78, 25, 0.1), P(92, 23, 0)], nThru),
);

export default {
  id: 'ashleys-stopper',
  name: "Ashley's Stopper",
  aka: ["Oysterman's stopper"],
  category: 'stoppers',
  abok: [526],
  difficulty: 2,
  summary: 'A slip knot closed down on its own tail. The bulkiest stopper in a single strand, with a flat three-lobed base that blocks a hole a figure eight pulls through.',
  uses: [
    'Stop a guy line pulling out of a tarp grommet or a tent pole eyelet that is too big for a figure eight.',
    'Stopper on the end of a bear bag line so it cannot run back through the branch fork or the pulley.',
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
    'Tuck the end the right way: up through the eye from behind, under the lower strand and out over the standing part. Tucked the other way the knot is lopsided and does not seat flat.',
    'Close the eye on the tail by pulling the standing part before you tighten anything else. Until the eye grips the tail, a pull on the tail just drags it back out.',
    'Leave a tail of at least four rope widths. Only the closed eye grips it.',
  ],
  check: 'Look at the knot from the standing part side: three equal lobes of rope round the standing part, like a clover leaf, with the standing part coming out of the centre. The tail leaves the top of the knot. If one side is a flat diagonal and the lobes are unequal, the end went through the eye the wrong way. Untie it and tuck again.',
  tips: [
    'Think of it as a slip knot that eats its own tail: make the noose, feed the end through the eye, then pull the standing part so the eye closes on it.',
    'Work it snug in stages: close the eye on the tail first, then pull tail and standing part apart, then push the lobes together.',
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
    { title: 'Close the eye', text: 'Pull the standing part to the left. The eye slides shut and closes round the end. Only now is the end held.', frames: [p4], dur: 1.4,
      labels: [{ text: 'eye closes', at: [80, 51], anchor: 'left', size: 3.4 }] },
    { title: 'Dress and tighten', text: 'Pull the tail and the standing part apart, then push the three lobes together with your thumbs. The ring, the closed eye and the tail bend become the three lobes. The tail leaves the top.', frames: [p5], dur: 1.4 },
  ],
};
