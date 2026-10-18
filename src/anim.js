// anim.js: turns a knot definition into a timeline and gives back the pose
// (control points for every strand) at any time t.
//
// A knot's steps carry one or more frames each. Playing a step tweens the
// rope from the previous frame to each of its frames in turn, then holds.
// The hold is where the caption is read, so it is long by default.

export const DEFAULTS = { dur: 1.6, hold: 1.4, firstHold: 1.0 };

export function easeInOut(u) {
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

// Accept a pose as an array (single strand "a") or an object keyed by strand.
export function normalisePose(pose, strandIds) {
  if (Array.isArray(pose)) {
    if (strandIds.length !== 1) throw new Error('array pose used with several strands');
    return { [strandIds[0]]: pose };
  }
  const out = {};
  for (const id of strandIds) {
    if (!pose[id]) throw new Error(`pose missing strand "${id}"`);
    out[id] = pose[id];
  }
  return out;
}

function stepFrames(step) {
  if (step.frames) return step.frames;
  if (step.pose) return [step.pose];
  return [];
}

// Build the timeline. Returns {segments, total, steps:[{t0,t1,index}]}.
// A segment is {kind:'tween'|'hold', t0, t1, step, frame, from, to, viewFrom, viewTo}.
export function buildTimeline(knot) {
  const ids = knot.strands.map((s) => s.id);
  const segments = [];
  const stepsOut = [];
  let t = 0;
  let pose = null;
  let view = knot.view || { x: 0, y: 0, w: 100, h: 100 };
  const counts = {};
  knot.steps.forEach((step, si) => {
    const frames = stepFrames(step).map((f) => normalisePose(f, ids));
    frames.forEach((f, fi) => {
      for (const id of ids) {
        if (counts[id] == null) counts[id] = f[id].length;
        else if (counts[id] !== f[id].length) throw new Error(`step ${si} frame ${fi}: strand "${id}" has ${f[id].length} points but earlier frames have ${counts[id]}`);
      }
    });
    const stepView = step.view || view;
    const t0 = t;
    if (si === 0) {
      if (!frames.length) throw new Error('step 0 needs a pose');
      pose = frames[frames.length - 1];
      view = stepView;
      const hold = step.hold ?? DEFAULTS.firstHold;
      segments.push({ kind: 'hold', t0: t, t1: t + hold, step: si, frame: 0, from: pose, to: pose, viewFrom: view, viewTo: view });
      t += hold;
    } else {
      const durs = Array.isArray(step.dur) ? step.dur : frames.map(() => step.dur ?? DEFAULTS.dur);
      frames.forEach((f, fi) => {
        const dur = durs[fi] ?? DEFAULTS.dur;
        const viewTo = fi === frames.length - 1 ? stepView : view;
        segments.push({ kind: 'tween', t0: t, t1: t + dur, step: si, frame: fi, from: pose, to: f, viewFrom: view, viewTo });
        t += dur;
        pose = f;
        view = viewTo;
      });
      if (!frames.length && stepView !== view) view = stepView;
      const hold = step.hold ?? DEFAULTS.hold;
      segments.push({ kind: 'hold', t0: t, t1: t + hold, step: si, frame: frames.length, from: pose, to: pose, viewFrom: view, viewTo: view });
      t += hold;
    }
    stepsOut.push({ index: si, t0, t1: t, tweenEnd: t - (step.hold ?? (si === 0 ? DEFAULTS.firstHold : DEFAULTS.hold)) });
  });
  return { segments, total: t, steps: stepsOut, strandIds: ids };
}

export function lerpPose(a, b, u) {
  const out = {};
  for (const id of Object.keys(a)) {
    const pa = a[id], pb = b[id];
    if (pa.length !== pb.length) throw new Error(`strand "${id}" changes point count (${pa.length} -> ${pb.length})`);
    out[id] = pa.map((p, i) => [p[0] + (pb[i][0] - p[0]) * u, p[1] + (pb[i][1] - p[1]) * u, (p[2] || 0) + ((pb[i][2] || 0) - (p[2] || 0)) * u]);
  }
  return out;
}

function lerpView(a, b, u) {
  if (a === b) return a;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, w: a.w + (b.w - a.w) * u, h: a.h + (b.h - a.h) * u };
}

export function segmentAt(timeline, t) {
  const segs = timeline.segments;
  if (t <= 0) return segs[0];
  if (t >= timeline.total) return segs[segs.length - 1];
  let lo = 0, hi = segs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (segs[mid].t1 <= t) lo = mid + 1; else hi = mid;
  }
  return segs[lo];
}

// Pose and view at time t, plus which step/frame is active and how far along.
export function poseAt(timeline, t) {
  const seg = segmentAt(timeline, t);
  if (seg.kind === 'hold') return { pose: seg.to, view: seg.viewTo, step: seg.step, frame: seg.frame, progress: 1, tween: false, seg };
  const raw = Math.min(1, Math.max(0, (t - seg.t0) / (seg.t1 - seg.t0)));
  const u = easeInOut(raw);
  return { pose: lerpPose(seg.from, seg.to, u), view: lerpView(seg.viewFrom, seg.viewTo, u), step: seg.step, frame: seg.frame, progress: raw, tween: true, seg };
}

// Where the working end of each strand starts and finishes in this tween.
export function tipTravel(seg, ids) {
  const out = {};
  for (const id of ids) {
    const a = seg.from[id], b = seg.to[id];
    out[id] = { from: a[a.length - 1], to: b[b.length - 1] };
  }
  return out;
}
