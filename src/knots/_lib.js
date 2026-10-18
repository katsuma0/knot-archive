// _lib.js: helpers for authoring knot poses.
//
// A pose is a list of control points [x, y, z]. x,y are world units in the
// knot's view box (default 0..100, y grows downward like the screen). z only
// orders crossings: use +1 for "in front", -1 for "behind", 0 for flat.
// Every frame of a strand must have the same number of points, so build
// every frame from the same recipe and let resample() fix the count.

export const P = (x, y, z = 0) => [x, y, z];

export const deg = (d) => (d * Math.PI) / 180;

// n points from a to b inclusive. z: number or [z0, z1] (linear). When z is
// not given, the z of a and b are used (blended), so line(P(x,y,1), P(x,y,1), n)
// stays at z = 1.
export function line(a, b, n, z) {
  const out = [];
  if (z == null) z = [a[2] || 0, b[2] || 0];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1);
    const zz = Array.isArray(z) ? z[0] + (z[1] - z[0]) * u : z;
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, zz]);
  }
  return out;
}

// n points on an arc, angles in degrees. 0 = right, 90 = down (screen),
// 180 = left, 270 = up. Going from a0 to a1 in the given direction.
// z: number, [z0, z1], or a function of the angle in degrees.
export function arc(cx, cy, r, a0, a1, n, z = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1);
    const a = a0 + (a1 - a0) * u;
    const zz = typeof z === 'function' ? z(a) : Array.isArray(z) ? z[0] + (z[1] - z[0]) * u : z;
    out.push([cx + r * Math.cos(deg(a)), cy + r * Math.sin(deg(a)), zz]);
  }
  return out;
}

// Wrap around a vertical post at x = cx. r is the rope centreline radius
// (post radius + half the rope width). Angle 0 = right edge of the post,
// 90 = in front of the post (toward the viewer), 180 = left edge,
// 270 = behind. y runs from y0 to y1 over the whole wrap.
// turns may be fractional; n points per full turn.
export function wrapPost(cx, r, y0, y1, a0, turns, nPerTurn = 10, dir = 1) {
  const n = Math.max(2, Math.round(Math.abs(turns) * nPerTurn) + 1);
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const a = a0 + dir * 360 * turns * u;
    out.push([cx + r * Math.cos(deg(a)), y0 + (y1 - y0) * u, Math.sin(deg(a))]);
  }
  return out;
}

// Same for a horizontal bar at y = cy. Angle 0 = bottom edge, 90 = in front,
// 180 = top edge, 270 = behind. x runs from x0 to x1.
export function wrapBar(cy, r, x0, x1, a0, turns, nPerTurn = 10, dir = 1) {
  const n = Math.max(2, Math.round(Math.abs(turns) * nPerTurn) + 1);
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const a = a0 + dir * 360 * turns * u;
    out.push([x0 + (x1 - x0) * u, cy + r * Math.cos(deg(a)), Math.sin(deg(a))]);
  }
  return out;
}

// Join point lists. Repeated points are kept on purpose: the point count must
// not depend on whether two segments happen to share an end point, and the
// spline treats a repeated point as a zero-length segment.
export function cat(...lists) {
  const out = [];
  for (const l of lists) for (const p of l) out.push([p[0], p[1], p[2] || 0]);
  return out;
}

export function pathLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

// Evenly spaced n points along the polyline through pts (by chord length),
// interpolating z. Use the same n for every frame of a strand.
export function resample(pts, n) {
  if (pts.length < 2) return Array.from({ length: n }, () => [...pts[0]]);
  const L = pathLength(pts);
  const out = [];
  let seg = 0, acc = 0;
  const segLen = (i) => Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  for (let k = 0; k < n; k++) {
    const target = (L * k) / (n - 1);
    while (seg < pts.length - 2 && acc + segLen(seg) < target) { acc += segLen(seg); seg++; }
    const sl = segLen(seg) || 1e-9;
    const u = Math.min(1, Math.max(0, (target - acc) / sl));
    const a = pts[seg], b = pts[seg + 1];
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * u]);
  }
  return out;
}

export const translate = (pts, dx, dy, dz = 0) => pts.map((p) => [p[0] + dx, p[1] + dy, (p[2] || 0) + dz]);
export const scale = (pts, sx, sy = sx, cx = 0, cy = 0) => pts.map((p) => [cx + (p[0] - cx) * sx, cy + (p[1] - cy) * sy, p[2] || 0]);
export const mirrorX = (pts, cx = 50) => pts.map((p) => [2 * cx - p[0], p[1], p[2] || 0]);
export const flipZ = (pts) => pts.map((p) => [p[0], p[1], -(p[2] || 0)]);
export const reverse = (pts) => [...pts].reverse();
export const setZ = (pts, z) => pts.map((p) => [p[0], p[1], z]);

// Linear blend of two poses with the same point count.
export function blend(a, b, u) {
  return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * u, p[1] + (b[i][1] - p[1]) * u, (p[2] || 0) + ((b[i][2] || 0) - (p[2] || 0)) * u]);
}

// Progressive threading. Given the final path (control points with z) and a
// list of fractions, returns one pose per fraction: the first f of the path is
// laid as in the final knot, the rest of the rope runs straight on from that
// point. tail: optional [x, y] the free end should point toward, or a
// function (fraction) => [x, y]. Point count n is the same for every pose.
export function thread(finalPath, n, fractions, tail = null) {
  const fine = resample(finalPath, 400);
  const L = pathLength(finalPath);
  return fractions.map((f) => {
    const k = Math.max(2, Math.min(fine.length, Math.round(f * fine.length)));
    const laid = fine.slice(0, k);
    const last = laid[laid.length - 1], prev = laid[Math.max(0, laid.length - 4)];
    const rest = L * (1 - f);
    let dir;
    const tgt = typeof tail === 'function' ? tail(f) : tail;
    if (tgt) dir = [tgt[0] - last[0], tgt[1] - last[1]];
    else dir = [last[0] - prev[0], last[1] - prev[1]];
    const dl = Math.hypot(dir[0], dir[1]) || 1;
    const tip = [last[0] + (dir[0] / dl) * rest, last[1] + (dir[1] / dl) * rest, last[2]];
    const path = rest > 0.5 ? cat(laid, [tip]) : laid;
    return resample(path, n);
  });
}

// Straight rope of n points from a to b (handy for step 0).
export const straight = (a, b, n, z = 0) => line(a, b, n, z);

// Extend the standing end backward (off screen) so the whole path has length
// total. dir is the direction the standing part leaves in, default left.
// Use this on every pose so the rope never appears to stretch: extra rope
// waits off screen and slides in as the knot uses it.
export function padStart(pts, total, dir = [-1, 0]) {
  const L = pathLength(pts);
  const rest = Math.max(0.01, total - L); // always add the point so counts match across frames
  const d = Math.hypot(dir[0], dir[1]) || 1;
  const p = pts[0];
  return [[p[0] + (dir[0] / d) * rest, p[1] + (dir[1] / d) * rest, p[2] || 0], ...pts];
}

// Same for the working end: extend the tip forward so the length matches.
export function padEnd(pts, total, dir = null) {
  const L = pathLength(pts);
  const rest = Math.max(0.01, total - L);
  const p = pts[pts.length - 1], q = pts[pts.length - 2] || p;
  const dd = dir || [p[0] - q[0], p[1] - q[1]];
  const d = Math.hypot(dd[0], dd[1]) || 1;
  return [...pts, [p[0] + (dd[0] / d) * rest, p[1] + (dd[1] / d) * rest, p[2] || 0]];
}

// The first `fraction` of a path, laid as given, with the rest of its length
// carried straight on from the cut point (along the tangent, or toward
// `toward` = [x, y] if given). Always n points. Use it to show the end
// travelling along a wrap or a tuck over several frames:
//   partial(turn, 0.33, 14), partial(turn, 0.66, 14), resample(turn, 14)
// restLen: how much rope to lay straight on (default: the rest of the path's
// length, so the segment keeps its length); pass 0 to stop at the cut.
export function partial(pts, fraction, n, toward = null, restLen = null) {
  const fine = resample(pts, 200);
  const L = pathLength(pts);
  const k = Math.max(2, Math.min(fine.length, Math.round(fraction * fine.length)));
  const laid = fine.slice(0, k);
  const last = laid[laid.length - 1], prev = laid[Math.max(0, laid.length - 4)];
  const rest = restLen == null ? L * (1 - fraction) : restLen;
  const dir = toward ? [toward[0] - last[0], toward[1] - last[1]] : [last[0] - prev[0], last[1] - prev[1]];
  const dl = Math.hypot(dir[0], dir[1]) || 1;
  const tip = [last[0] + (dir[0] / dl) * rest, last[1] + (dir[1] / dl) * rest, last[2]];
  return resample(rest > 0.3 ? cat(laid, [tip]) : laid, n);
}

// n copies of one point (a segment that has not been laid yet, bunched at
// the tip). Pair with padStart so total rope length stays steady.
export const bunch = (p, n) => Array.from({ length: n }, () => [p[0], p[1], p[2] || 0]);

// n points continuing straight on from the end of pts for `len` units, along
// its final direction (or toward a point). The first point repeats the last
// point of pts. Use it to lay segments that are not tied yet.
export function extend(pts, len, n, toward = null) {
  const p = pts[pts.length - 1], q = pts[pts.length - 2] || p;
  const d = toward ? [toward[0] - p[0], toward[1] - p[1]] : [p[0] - q[0], p[1] - q[1]];
  const dl = Math.hypot(d[0], d[1]) || 1;
  return line(p, [p[0] + (d[0] / dl) * len, p[1] + (d[1] / dl) * len, p[2] || 0], n, p[2] || 0);
}
