# Authoring a knot

Every knot in this archive is one file in `src/knots/`, exporting a plain
object: the text (uses, warnings, how to check it) and the animation (a list
of steps, each a list of rope poses). The renderer draws the rope from a
model, so the crossings are exact and every frame is a real state of a real
rope. Your job is to describe that rope, pose by pose, and to look at the
pictures until they are right.

Read this whole file once. Then read the three reference knots in this order:

1. `src/knots/overhand.js`: the simplest knot, the segment recipe.
2. `src/knots/bowline.js`: a loop with pass-throughs, depth changes between frames, zoomable.
3. `src/knots/clove-hitch.js`: a prop (post) and wraps round it, with in-progress wrap frames.

## 1. The loop you will run

```
node tools/render.mjs src/knots/<id>.js --out renders/<id>
```

It prints the lint report and writes:

- `renders/<id>/sheet.png`: every step's rest pose plus two frames inside every tween. Read it with the Read tool. This is your main check.
- `renders/<id>/step-N.png`: each rest pose at 800 px, for a close look.
- `renders/<id>/lint.json`: the same report as JSON, with the crossing list and the over/under sequence per strand.

Add `--verbose` to print every crossing with its position and which strand is on top, and the sequence of O (over) / U (under) along each strand from the standing end. Use the sequence to confirm the topology: an overhand knot reads `O1 O2 U3 U1 U2 O3` style alternation (every crossing visited twice, once O once U, and along the rope the letters alternate). A figure eight has four crossings. If the sequence does not alternate where it should, the picture may look fine and still be the wrong knot.

Iterate until: 0 errors, 0 warnings you cannot justify, the sheet shows the right knot at every rest pose, and every tween reads as a hand moving the rope. Then register the knot in `src/knots/index.js` (import it, add it to `KNOTS` in its category's block) and run the render once more. The lint tolerates one kind of warning: a "bends tighter than the rope width" note exactly at a junction between two segments is harmless if the step PNG shows no kink.

## 2. The file

```js
import { P, cat, line, resample, padStart } from './_lib.js';

export default {
  id: 'figure-eight',          // file name, kebab-case, used in URLs
  name: 'Figure Eight',
  aka: ['Flemish knot'],
  category: 'stoppers',        // stoppers loops hitches bends binding friction lashings fishing rope-care
  abok: [520],                 // Ashley Book of Knots numbers, if known
  difficulty: 1,               // 1 easy ... 5 hard
  summary: 'One sentence. What it is and what it is for.',
  uses: ['Concrete outdoor uses. Name the object: tarp grommet, bear bag, canoe, tent stake.'],
  pros: ['...'], cons: ['...'],
  warnings: ['When it fails and what to do instead.'],
  check: 'How to look at the finished knot and know it is right.',
  tips: ['Optional. Memory aids, dressing tips.'],
  related: ['overhand', 'figure-eight-on-a-bight'],   // ids of other knots
  ropeWidth: 4,                // world units; 4 or 5 for rope, 2.5 for cord and fishing line
  view: { x: 0, y: 0, w: 100, h: 100 },   // optional zoom box, default the whole 100 x 100 world
  props: [{ type: 'post', x: 50, y1: -12, y2: 112, r: 11 }],   // optional objects: post, bar, ring, carabiner, hook
  strands: [{ id: 'a', color: 'orange', end: 'working' }],
  steps: [
    { title: 'Start', text: '...', pose: p0, labels: [{ text: 'standing part', at: [8, 69] }] },
    { title: 'Make a loop', text: '...', frames: [p1a, p1], dur: [1.3, 1.3] },
    ...
  ],
};
```

Fields of a step:

- `title`, `text`: what the reader does in this step. Imperative, concrete, one or two sentences. Say over or under explicitly. Say left or right. Say which part moves.
- `pose` (step 0 only) or `frames`: one or more poses the rope passes through during this step. The rope tweens from the previous step's last frame to each frame in turn, then holds. The last frame is the rest pose of the step.
- `dur`: seconds per frame tween (number or array), default 1.6. `hold`: seconds to rest, default 1.4.
- `labels`: `[{ text, at: [x, y], anchor: 'left'|'center'|'right', size }]`, shown at rest. Keep labels off the rope.
- `arrows`: `[{ from: [x, y], to: [x, y], bend: 0.3 }]`, optional hand-drawn hints. Usually the automatic tip trail is enough.
- `trailBend`: curve the automatic arrow that follows the working end (positive bends one way, negative the other). `trail: false` turns it off for a step.
- `view`: a zoom box for this step; the camera glides between steps.
- `props`: override the knot's props for this step (static only).

Strands: `{ id, color, end, width, flat, tipColor }`. `color` is a name from `ROPE_COLORS` in `src/scene.js` (orange, red, blue, green, yellow, purple, teal, navy, olive, sand, white, grey, black) or a hex string. `end: 'working'` paints a pale band on the last point so the reader can track the end; use `end: 'none'` for a strand with no free end in view (a bight, the main rope a prusik grips). `width` overrides `ropeWidth` for that strand (a thin cord round a thick rope). `flat: true` draws webbing.

Single strand: a pose is an array of points. Several strands: a pose is `{ a: [...], b: [...] }`. The first strand listed is drawn first when depths tie, so put the static one first.

## 3. Coordinates and depth

- World is 100 wide by 100 tall, y grows downward, like the screen. The knot should fill about 60 to 70 percent of the view. Leave room for labels.
- A point is `[x, y, z]`. `z` only decides what is painted on top at a crossing: bigger z is nearer the viewer. Use +1 for the strand on top, -1 for the strand underneath, 0 for flat rope that crosses nothing. z is interpolated along the rope between control points, so give the points on both sides of a crossing a clear value.
- The standing part should leave the frame (start the strand off screen, e.g. x = -8 or y = -12).
- The rope width is `ropeWidth`. Two crossings of opposite sense (an over then an under) on the same strand need about 1.7 rope widths between them along the rope (the lint reports a "crossing conflict" when they are closer); two of the same sense can be as close as you like. Two ropes lying side by side need at least 1.1 rope widths between centre lines, or clearly different z. Crossings should be near 90 degrees; under 35 degrees reads badly and the lint flags it.
- Never let the rope pass through a prop. A rope going behind a post has z = -1 there; the renderer hides it.

## 4. The segment recipe (do this, always)

The rope is a chain of named segments, each with a FIXED number of points. Build every pose from the same segments in the same order. A segment that has not been tied yet is laid as a straight run (with `line` or `extend`); once it is in place, reuse the same array so it never moves. This gives smooth, honest motion: only the part the hand is moving moves.

```js
const nS = 6, nLoop = 10, nTuck = 6, nOut = 6;   // point counts, fixed
const LEN = 260;                                 // total rope length, fixed
const S    = resample([P(-8, 60, 0), P(18, 60, 0), P(32, 57, -1), P(42, 51, -1)], nS);
const LOOP = resample([P(42, 51, -1), P(55, 41, 1), ..., P(39, 52, 1)], nLoop);
const TUCK = resample([...], nTuck);
const OUT  = resample([...], nOut);
const pose = (...segs) => padStart(cat(...segs), LEN);

const p0 = pose(S0straight, line(P(42, 58, 0), P(60, 57, 0.5), nLoop), line(..., nTuck), line(..., nOut));
const p1 = pose(S, LOOP, line(P(39, 52, 1), P(53, 62, 1), nTuck), line(P(53, 62, 1), P(68, 70, 0.6), nOut));
const p2 = pose(S, LOOP, TUCK, line(P(50, 34, -0.4), P(44, 32, -0.4), nOut));
const p3 = pose(S, LOOP, TUCK, OUT);
```

Rules that follow from it:

- `resample(path, n)` turns any list of control points into exactly n evenly spaced points. Use the same n for a segment in every pose.
- Consecutive segments share their end point (the last point of one is the first point of the next). The spline merges them.
- `padStart(pts, LEN)` adds one point off screen so the whole rope has the same length in every pose; the spare rope waits off screen and slides in as the knot uses it. Pick LEN a bit longer than your longest pose. Use `padStart(pts, LEN, [0, -1])` when the standing part leaves upward.
- A wrap generated with `wrapPost` or `wrapBar` already has a fixed count (`nPerTurn * turns + 1`), so use it as is rather than resampling it (resampling cuts the corners at the post's edges).

## 5. Depth changes between frames (the rule that prevents pass-throughs)

Between two frames every point moves in a straight line and its z blends linearly. So a point that has to cross another strand must ALREADY have the right z before it crosses. If the end has to go behind the standing part, add a frame where the end has dropped behind (z = -1) while it is still clear of the standing part, and only then a frame where it has crossed. Same for coming up through a loop: a frame tucked under the bottom edge with the tip already z = +1 inside the loop, then a frame with the end through. The lint reports "rope passes through itself" with the time and place when you get this wrong; add the in-between frame and run again.

Keep every frame tween short and single-purpose: lift, move, drop. Three frames of 0.7 s read better than one frame of 2 s. Never let a long free tail reverse direction by 180 degrees in one tween: under linear blending it folds through itself. Move it a quarter turn per frame.

`line(a, b, n)` keeps the z of its end points when you omit the z argument. Labels are about 1.6 world units per character at the default size, so a long label needs `size` or a second label. Keep the file compact: a knot rarely needs more than 250 lines, and never paste a whole lint JSON into your reasoning; read `--verbose` output instead.

## 6. Props and wraps

Props: `{ type: 'post', x, y1, y2, r, color }` vertical pole; `{ type: 'bar', x1, y1, x2, y2, r }` pole at any angle; `{ type: 'ring', cx, cy, r, t }` ring (t = thickness); `{ type: 'carabiner', cx, cy, w, h, t }`; `{ type: 'hook', cx, cy, r, t, len, dir }` fishing hook with its eye at (cx, cy). The eye of a ring, carabiner or hook is a hole: rope through it goes from z = +1 (over the near rim) to z = -1 (under the far rim) inside the hole.

Wrapping a post: the rope centre line sits at radius `R = post.r + ropeWidth / 2`.

```js
// angle 0 = right edge of the post, 90 = front (toward you), 180 = left edge, 270 = behind.
// dir = -1 means the angle decreases: from the front the rope goes RIGHT first (natural for a rope arriving from the left).
const turn = (y0, y1) => wrapPost(50, R, y0, y1, 90, 1, 13, -1);   // one full turn, 14 points, climbing from y0 to y1
```

`wrapBar(cy, r, x0, x1, a0, turns, nPerTurn, dir)` is the same for a horizontal bar (angle 0 = bottom edge, 90 = front, 180 = top, 270 = behind). For a tilted bar, build the wrap with `wrapBar` and `rotate` it.

In-progress wraps: `partial(turn, 0.3, n, toward)` lays the first 30 percent of the turn and lets the rest of its length hang toward a point (`partial(turn, 0.3, n, toward, 0)` stops at the cut instead). Then `extend(partialPts, len, nRest, toward)` lays the segments not tied yet as a straight run. See `clove-hitch.js` for the three-frame pattern per turn (going behind at one edge, behind the post with the end hanging out the far side, back in front).

Several turns, like a prusik or a uni knot: generate each turn with the same `wrapPost` call at different heights and keep each as its own segment. Pitch (vertical distance per turn) at least 1.2 rope widths.

## 7. Helpers in `_lib.js`

| helper | what it gives |
|---|---|
| `P(x, y, z)` | a point |
| `line(a, b, n, z)` | n points from a to b; z a number or `[z0, z1]` |
| `arc(cx, cy, r, a0, a1, n, z)` | n points on an arc; degrees, 0 right, 90 down |
| `wrapPost`, `wrapBar` | helix round a prop |
| `cat(...lists)` | join lists (keeps repeated points on purpose) |
| `resample(pts, n)` | exactly n evenly spaced points along pts |
| `partial(pts, f, n, toward)` | first fraction f laid, rest straight, n points |
| `extend(pts, len, n, toward)` | n points carrying straight on from the end of pts |
| `bunch(p, n)` | n copies of a point (a segment waiting at the tip) |
| `padStart(pts, LEN, dir)` / `padEnd` | fix the total length by extending off screen |
| `translate`, `scale`, `mirrorX`, `flipZ`, `reverse`, `setZ`, `blend` | transforms |
| `pathLength(pts)` | length of a polyline |
| `thread(finalPath, n, fractions, tail)` | several poses that lay the final path progressively (good for follow-through knots) |

## 8. What good looks like

- The start pose shows the rope and any prop clearly, with "standing part" and "working end" labelled once.
- One move per step. Five to eight steps for most knots; lashings and fishing knots may need ten.
- Every rest pose is a state you could photograph: no rope floating through another, no rope cut off by the frame except the standing part leaving.
- The final step is the dressed knot: pulled snug, same topology as the step before, ends pointing the way they really do.
- Captions use the words a person tying it needs: over, under, behind, through, left, right, up, down, standing part, working end, loop, bight, turn, round turn, tail.
- The `check` text names the feature that distinguishes the right knot from the common wrong one (bowline vs cowboy bowline, square knot vs granny).
- Text is plain, declarative, first person where natural, no em dashes, no marketing words. Sentences short. Name the actual object (stake, tarp grommet, bear bag line, canoe thwart).

## 9. Checking your work: a checklist before you finish

1. Lint: 0 errors, 0 warnings except a justified junction kink.
2. `--verbose` sequence matches the knot's known structure (count the crossings; alternate where the knot alternates).
3. Sheet: every rest pose right; every in-between frame plausible as a hand movement; the working end band visible at every rest pose.
4. The dressed pose looks like the knot in a reference photo you remember.
5. The knot sits in the middle 60 to 70 percent of the frame; labels do not touch the rope.
6. Registered in `src/knots/index.js`, in its category's block. Run `node tools/check.mjs` (lints every registered knot) once at the end.
