import { P, cat, line, resample, padStart, wrapPost, partial, extend } from './_lib.js';

// Round turn and two half hitches, tied with the end round a vertical post.
// The rope comes from the left, goes round the post one and a half times
// (two passes behind the post: the round turn), comes out on the left below
// the standing part, and the end is then hitched twice round the standing
// part: over it, down behind it, and out below under its own strand. Both
// half hitches go the same way; the second sits to the left of the first.
//
// Post at x = 60, radius 11; the rope centre line wraps at R = 13.
// Segments (fixed point counts), every frame built from the same chain:
//   SP   standing part, off screen on the left to the post's left edge
//   F1   across the front, left edge to right edge             (turn 1, front)
//   B1   round the back, right edge to left edge, dropping      (turn 1, back)
//   F2   across the front again, lower                          (turn 2, front)
//   B2   round the back again, out at the left edge             (turn 2, back)
//   H1   first half hitch: left from the post, up over the standing part,
//        over the top, down behind the standing part, out below under its
//        own strand
//   I2   the strand between the hitches (the tail of hitch 1, then the
//        approach to hitch 2)
//   H2   second half hitch, same shape, further left
//   T    the tail
const CX = 60;
const post = { type: 'post', x: CX, y1: -12, y2: 112, r: 11 };
const R = 13;
const LEN = 360;
const nS = 6, nW = 8, nH1 = 20, nI2 = 8, nH2 = 18, nT = 5;
const SPY = 42; // height of the standing part

const SP = resample([P(-8, SPY, 0), P(20, SPY, 0), P(CX - R, SPY, 0)], nS);
// helix pieces, half a turn each (13 points per turn gives 8 points per half)
const front = (y0, y1) => wrapPost(CX, R, y0, y1, 180, 0.5, 13, -1); // left edge -> front (z 1) -> right edge
const back = (y0, y1) => wrapPost(CX, R, y0, y1, 0, 0.5, 13, -1);    // right edge -> behind (z -1) -> left edge
// loose turns while tying: 3 per half turn, 6 per turn (1.5 rope widths)
const F1 = front(42, 45), B1 = back(45, 48), F2 = front(48, 51), B2 = back(51, 54);

// ---- first half hitch, loose, as tied. Over the standing part at x 30, down behind it at x 40.
// The strand from the post runs up-left about a rope width and a half below the standing
// part, so the loop sits centred on the standing part and the end tucks behind that strand
// right under it.
const I1 = [P(47, 54, 0), P(44, 52.5, 0.3), P(40, 49.5, 0.6), P(36, 47.5, 0.85), P(32, 45, 1), P(30, 42, 1)];
const H1a0 = [P(47, 54, 0), P(44, 52.5, 0.3), P(40, 49.5, 0.6), P(36, 47.5, 0.85), P(33, 46, 1)];              // end lifted in front, still below the standing part
const H1a = [...I1, P(28.5, 37, 0.95), P(28, 31, 1), P(28, 25, 1)];                                            // up over the standing part, pointing up
const H1b = [...I1, P(28.5, 37, 0.9), P(29.5, 32, 0.5), P(34, 30, -0.1), P(38, 31, -0.5), P(41.5, 33.5, -0.85)]; // over the top, heading down on the right
const H1c = [...I1, P(28.5, 37, 0.9), P(29.5, 32, 0.5), P(34, 30, -0.1), P(38.5, 32.5, -0.6), P(40, 37, -1), P(40, 42, -1), P(40, 46, -1)]; // down behind the standing part
const H1f = [...H1c, P(40, 49.5, -1), P(40.3, 53, -0.7), P(39.5, 56.5, -0.4)];                                // out below, under its own strand
const H1 = (pts) => resample(pts, nH1);

// ---- second half hitch, loose. Over the standing part at x 13.5, down behind it at x 23.5.
const I2curve = resample([P(39.5, 56.5, -0.4), P(37, 59.5, -0.1), P(32.5, 59.5, 0.25), P(28, 56, 0.5), P(23.5, 51.5, 0.7), P(19.5, 48, 0.85), P(16, 45, 1)], nI2);
const I2curve0 = resample([P(39.5, 56.5, -0.4), P(37, 60, -0.1), P(32, 60.5, 0.2), P(27, 58, 0.5), P(22, 53.5, 0.8), P(18.5, 49, 1)], nI2);
const H2a = [P(16, 45, 1), P(13.5, 42, 1), P(12, 37, 0.95), P(11.5, 31, 1), P(11.5, 25, 1)];
const H2b = [P(16, 45, 1), P(13.5, 42, 1), P(12, 37, 0.9), P(13, 32, 0.5), P(17.5, 30, -0.1), P(21.5, 31, -0.5), P(25, 33.5, -0.85)];
const H2c = [P(16, 45, 1), P(13.5, 42, 1), P(12, 37, 0.9), P(13, 32, 0.5), P(17.5, 30, -0.1), P(22, 32.5, -0.6), P(23.5, 37, -1), P(23.5, 42, -1), P(23.5, 46, -1)];
const H2f = [...H2c, P(23.5, 51.5, -1), P(23.8, 55, -0.7), P(23.5, 58, -0.4)];
const H2 = (pts) => resample(pts, nH2);

const pose = (...segs) => padStart(cat(...segs), LEN);
// lay the segments not tied yet as straight runs (len 0 = waiting at the tip)
const chain = (from, specs, toward) => {
  const out = [];
  let prev = from;
  for (const [n, len] of specs) { const seg = extend(prev, len, n, toward); out.push(seg); prev = seg; }
  return out;
};

// 0: rope lies across the front of the post, end off to the right
const p0 = pose(SP, F1, ...chain(F1, [[nW, 4], [nW, 3], [nW, 2], [nH1, 1.5], [nI2, 0.6], [nH2, 0.6], [nT, 0.3]], [110, 47]));

// 1: first turn: round the back, out on the left below the standing part, then across the front again
const b1a = partial(B1, 0.5, nW, [22, 112]);
const p1a = pose(SP, F1, b1a, ...chain(b1a, [[nW, 6], [nW, 6], [nH1, 5], [nI2, 3], [nH2, 2], [nT, 1]], [22, 112]));
const p1b = pose(SP, F1, B1, ...chain(B1, [[nW, 8], [nW, 8], [nH1, 6], [nI2, 3], [nH2, 2], [nT, 1]], [20, 100]));
const f2a = partial(F2, 0.5, nW, [96, 66]);
const p1c = pose(SP, F1, B1, f2a, ...chain(f2a, [[nW, 4], [nH1, 3], [nI2, 2], [nH2, 1], [nT, 0.5]], [96, 66]));
const p1 = pose(SP, F1, B1, F2, ...chain(F2, [[nW, 4], [nH1, 3], [nI2, 2], [nH2, 1], [nT, 0.5]], [100, 62]));

// 2: second pass behind, out on the left, pointing away from the post
const b2a = partial(B2, 0.5, nW, [22, 112]);
const p2a = pose(SP, F1, B1, F2, b2a, ...chain(b2a, [[nH1, 8], [nI2, 4], [nH2, 3], [nT, 1]], [22, 112]));
const p2 = pose(SP, F1, B1, F2, B2, ...chain(B2, [[nH1, 14], [nI2, 8], [nH2, 5], [nT, 2]], [0, 62]));

// 3: first half hitch
const p3a0 = pose(SP, F1, B1, F2, B2, H1(H1a0), ...chain(H1(H1a0), [[nI2, 0], [nH2, 0], [nT, 0]], [30, 30]));
const p3a = pose(SP, F1, B1, F2, B2, H1(H1a), ...chain(H1(H1a), [[nI2, 0], [nH2, 0], [nT, 0]], [28, 10]));
const p3b = pose(SP, F1, B1, F2, B2, H1(H1b), ...chain(H1(H1b), [[nI2, 0], [nH2, 0], [nT, 0]], [44, 36]));
const p3c = pose(SP, F1, B1, F2, B2, H1(H1c), ...chain(H1(H1c), [[nI2, 0], [nH2, 0], [nT, 0]], [40, 60]));
const I2hang = line(P(39.5, 56.5, -0.4), P(42, 70, 0), nI2);
const p3 = pose(SP, F1, B1, F2, B2, H1(H1f), I2hang, ...chain(I2hang, [[nH2, 0], [nT, 0]], [44, 90]));

// 4: second half hitch, to the left of the first
const p4a0 = pose(SP, F1, B1, F2, B2, H1(H1f), I2curve0, ...chain(I2curve0, [[nH2, 0], [nT, 0]], [15, 30]));
const p4a = pose(SP, F1, B1, F2, B2, H1(H1f), I2curve, H2(H2a), ...chain(H2(H2a), [[nT, 0]], [11.5, 10]));
const p4b = pose(SP, F1, B1, F2, B2, H1(H1f), I2curve, H2(H2b), ...chain(H2(H2b), [[nT, 0]], [28, 36]));
const p4c = pose(SP, F1, B1, F2, B2, H1(H1f), I2curve, H2(H2c), ...chain(H2(H2c), [[nT, 0]], [23.5, 60]));
const Thang = line(P(23.5, 58, -0.4), P(26, 71, 0), nT);
const p4 = pose(SP, F1, B1, F2, B2, H1(H1f), I2curve, H2(H2f), Thang);

// 5: snug. Turns pulled together (2.5 per half turn), hitches small and slid up toward the post.
// Hitch 1 over at x 35, behind at 43; hitch 2 over at 20.5, behind at 28.5. Loops hug the standing part.
const p5 = pose(
  SP,
  front(42, 44.5), back(44.5, 47), front(47, 49.5), back(49.5, 52),
  H1([P(47, 52, 0), P(45.5, 50.5, 0.3), P(43, 48, 0.6), P(41, 47, 0.7), P(39, 46.5, 0.8), P(37, 46, 0.9), P(35.5, 44.5, 0.95), P(35, 42.5, 1), P(35, 41, 1), P(35.7, 39.5, 0.9), P(37.2, 38.4, 0.6), P(39, 38, 0), P(41, 38.5, -0.6), P(42.5, 40, -0.9), P(43, 42, -1), P(43, 45.5, -1), P(43, 48, -1), P(43, 51, -0.8)]),
  resample([P(43, 51, -0.8), P(41, 53, -0.4), P(37.5, 53, 0), P(33, 51.5, 0.3), P(28.5, 48.5, 0.6), P(26.5, 47.8, 0.7), P(24.5, 47, 0.8), P(22.5, 46.5, 0.85), P(21, 45, 0.92), P(20.5, 43, 1)], nI2),
  H2([P(20.5, 43, 1), P(20.5, 41, 1), P(21.2, 39.5, 0.9), P(22.7, 38.4, 0.6), P(24.5, 38, 0), P(26.5, 38.5, -0.6), P(28, 40, -0.9), P(28.5, 42, -1), P(28.5, 45.5, -1), P(28.5, 48.5, -1), P(29, 52, -0.7)]),
  resample([P(29, 52, -0.7), P(28.5, 55.5, -0.4), P(26.5, 59.5, -0.2), P(22.5, 62.5, 0), P(17.5, 64, 0)], nT),
);

export default {
  id: 'round-turn-two-half-hitches',
  name: 'Round Turn and Two Half Hitches',
  category: 'hitches',
  abok: [1720],
  difficulty: 1,
  summary: 'A round turn on the post takes the load at once; two half hitches on the standing part lock it off. The hitch to use when the rope is already pulling.',
  uses: [
    'Tie a canoe or packraft painter to a post, a root or a thwart on shore.',
    'Fix a hammock ridgeline or a tarp ridgeline to a tree trunk.',
    'Tie off the bear bag line to a trunk once the bag is up and the line is loaded.',
    'Secure a guy line to a tree or a stout branch when the wind is already pulling on the tarp.',
    'Tie a food bag, a bucket or a pack to a rail or a branch so it can be let down under control.',
  ],
  pros: [
    'The round turn holds the load while you tie the hitches, so you can tie it with the rope already pulling.',
    'Does not jam. It unties easily after a heavy or jerking load.',
    'Works on posts, rails, rings and trunks of any size.',
  ],
  cons: [
    'Uses more rope than a clove hitch.',
    'The half hitches can work loose if the line goes slack and shakes about. Leave a long tail or add a third hitch.',
  ],
  warnings: [
    'Both half hitches must go the same way. Tied opposite ways they make a cow hitch round the standing part, which can slip.',
    'Keep the tail at least ten rope widths long.',
    'On a smooth metal rail under a steady heavy pull, take one more turn round the rail before the hitches.',
  ],
  check: 'Two turns lie side by side on the post with no crossing between them. On the standing part, both hitches look the same: the end goes over the standing part, down behind it, and comes out below, under its own strand. If the second hitch points the other way you have tied a cow hitch instead.',
  tips: [
    'Say it as you tie: round, round, over and under, over and under.',
    'Pull each half hitch down against the one before it, then slide both up to the post.',
    'To release under load, undo the hitches first. The round turn still holds the load while you ease it out hand over hand.',
  ],
  related: ['two-half-hitches', 'clove-hitch', 'anchor-hitch', 'buntline-hitch', 'tensionless-hitch', 'taut-line-hitch'],
  ropeWidth: 4,
  view: { x: 4, y: 8, w: 84, h: 84 },
  props: [post],
  strands: [{ id: 'a', color: 'green', end: 'working' }],
  steps: [
    { title: 'Start', text: 'Bring the rope to the post from the left and lay it across the front. The long side is the standing part; it goes to the load. The short side with the pale band is the working end.', pose: p0,
      labels: [{ text: 'standing part', at: [8, 36] }, { text: 'end', at: [86, 55], anchor: 'right' }] },
    { title: 'Round the post', text: 'Take the working end round the back of the post and bring it out on the left, below the standing part. Carry it across the front again and out to the right.', frames: [p1a, p1b, p1c, p1], dur: [0.8, 0.8, 0.8, 0.7] },
    { title: 'Round again: the round turn', text: 'Take the end round the back a second time, a little lower, so the two turns lie side by side. Bring it out on the left, below the standing part, pointing away from the post. The round turn now holds the load.', frames: [p2a, p2], dur: [0.9, 0.9],
      labels: [{ text: 'round', at: [87, 55], anchor: 'right' }, { text: 'turn', at: [87, 60], anchor: 'right' }] },
    { title: 'First half hitch', text: 'Lift the end in front of the standing part and take it up and over. Bring it down behind the standing part and out below, passing under the strand that comes from the post. Pull it down.', frames: [p3a0, p3a, p3b, p3c, p3], dur: [0.7, 0.8, 0.8, 0.8, 0.9],
      labels: [{ text: 'over', at: [26, 48], anchor: 'right' }, { text: 'under', at: [36.5, 58.5], anchor: 'right' }] },
    { title: 'Second half hitch', text: 'Do the same again to the left of the first hitch: up and over the standing part, down behind it, out below and under the strand you just made. Both hitches go the same way.', frames: [p4a0, p4a, p4b, p4c, p4], dur: [0.7, 0.8, 0.8, 0.8, 0.9],
      labels: [{ text: 'same way', at: [5, 66] }] },
    { title: 'Snug it down', text: 'Pull the standing part and the working end. Slide the two half hitches up against each other and toward the post. The turns close up side by side.', frames: [p5], dur: 1.4 },
  ],
};
