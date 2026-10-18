// rope.js: a 2.5D rope renderer for Canvas 2D.
//
// A strand is a list of control points [x, y, z]. x and y live in world
// units (the knot's view box, usually 0..100). z only decides what is drawn
// on top of what: bigger z is closer to the viewer.
//
// Why not a real 3D renderer: knot diagrams read best as flat line art with
// a dark outline at every crossing. A depth buffer gives correct occlusion
// but loses the outline, and the outline is what tells the eye which rope
// goes over. So we draw in 2D, find every crossing ourselves, cut the rope
// into pieces between crossings, order the pieces by their constraints and
// paint them back to front. Each piece is outline + body, so an over-piece
// paints its outline across the under-piece exactly like a hand drawing.

const SAMPLE_STEP = 0.55; // world units between spline samples

// ---------------------------------------------------------------- spline

// Centripetal Catmull-Rom. Chosen over uniform CR because it never forms a
// cusp or a tiny loop between unevenly spaced control points, which rope
// authors produce all the time.
export function sampleSpline(ctrl, step = SAMPLE_STEP) {
  // Merge control points that coincide in 2D (segments share end points).
  // Two coincident points with different z would otherwise blow up the z
  // interpolation, because the knot spacing goes to zero.
  const pts = [];
  for (const p of ctrl) {
    const q = pts[pts.length - 1];
    if (q && Math.abs(q.x - p[0]) < 1e-3 && Math.abs(q.y - p[1]) < 1e-3) { q.z = (q.z + (p[2] || 0)) / 2; continue; }
    pts.push({ x: p[0], y: p[1], z: p[2] || 0 });
  }
  if (pts.length === 1) return [{ ...pts[0], s: 0 }];
  if (pts.length === 0) return [];
  const n = pts.length;
  const ext = [
    { x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y, z: pts[0].z },
    ...pts,
    { x: 2 * pts[n - 1].x - pts[n - 2].x, y: 2 * pts[n - 1].y - pts[n - 2].y, z: pts[n - 1].z },
  ];
  const out = [{ x: pts[0].x, y: pts[0].y, z: pts[0].z, s: 0 }];
  const d = (a, b) => Math.max(0.25, Math.hypot(b.x - a.x, b.y - a.y));
  for (let i = 0; i < n - 1; i++) {
    const p0 = ext[i], p1 = ext[i + 1], p2 = ext[i + 2], p3 = ext[i + 3];
    const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (chord < 1e-6) continue;
    const t0 = 0, t1 = t0 + Math.sqrt(d(p0, p1)), t2 = t1 + Math.sqrt(d(p1, p2)), t3 = t2 + Math.sqrt(d(p2, p3));
    const m = Math.max(3, Math.ceil(chord / step));
    for (let k = 1; k <= m; k++) {
      const t = t1 + ((t2 - t1) * k) / m;
      const q = crPoint(p0, p1, p2, p3, t0, t1, t2, t3, t);
      const prev = out[out.length - 1];
      q.s = prev.s + Math.hypot(q.x - prev.x, q.y - prev.y);
      out.push(q);
    }
  }
  return out;
}

function crPoint(p0, p1, p2, p3, t0, t1, t2, t3, t) {
  const L = (a, b, ta, tb) => {
    const w1 = (tb - t) / (tb - ta), w2 = (t - ta) / (tb - ta);
    return { x: w1 * a.x + w2 * b.x, y: w1 * a.y + w2 * b.y, z: w1 * a.z + w2 * b.z };
  };
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
  const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}

// Point on a sampled polyline at arc length s (clamped).
export function pointAt(samples, s) {
  const n = samples.length;
  if (s <= 0) return samples[0];
  if (s >= samples[n - 1].s) return samples[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].s <= s) lo = mid; else hi = mid;
  }
  const a = samples[lo], b = samples[hi];
  const u = (s - a.s) / Math.max(1e-9, b.s - a.s);
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u, s };
}

function indexAt(samples, s) {
  let lo = 0, hi = samples.length - 1;
  if (s <= samples[0].s) return 0;
  if (s >= samples[hi].s) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].s <= s) lo = mid; else hi = mid;
  }
  return lo;
}

// Sub-polyline between arc lengths s0 and s1 with exact end points.
export function subPath(samples, s0, s1) {
  const a = pointAt(samples, s0), b = pointAt(samples, s1);
  const i0 = indexAt(samples, s0), i1 = indexAt(samples, s1);
  const out = [a];
  for (let i = i0 + 1; i <= i1; i++) if (samples[i].s > s0 && samples[i].s < s1) out.push(samples[i]);
  out.push(b);
  return out;
}

// ------------------------------------------------------------- analysis

function segIntersect(a, b, c, d) {
  const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12) return null;
  const u = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
  const v = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
  const la = Math.hypot(rx, ry), lb = Math.hypot(sx, sy);
  const cosT = Math.abs(rx * sx + ry * sy) / Math.max(1e-9, la * lb);
  return { u, v, angle: Math.acos(Math.min(1, cosT)) };
}

function segDist(a, b, c, d) {
  // Minimum distance between two 2D segments (approximate: endpoints to
  // segments, good enough for short samples).
  const pd = (p, q, r) => {
    const vx = r.x - q.x, vy = r.y - q.y, l2 = vx * vx + vy * vy || 1e-12;
    let t = ((p.x - q.x) * vx + (p.y - q.y) * vy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (q.x + vx * t), p.y - (q.y + vy * t));
  };
  return Math.min(pd(a, c, d), pd(b, c, d), pd(c, a, b), pd(d, a, b));
}

// Analyse a set of sampled curves. Each curve: {samples, kind:'rope'|'prop',
// id, z (props), width}. Returns pieces and a paint order.
export function analyse(curves, opts) {
  const w = opts.width, ow = opts.outline;
  const cell = Math.max(2 * w, 3);
  const grid = new Map();
  const key = (cx, cy) => cx * 73856093 ^ cy * 19349663;
  const segs = [];
  curves.forEach((c, ci) => {
    const S = c.samples;
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[i], b = S[i + 1];
      const id = segs.length;
      segs.push({ ci, i, a, b });
      const x0 = Math.floor(Math.min(a.x, b.x) / cell), x1 = Math.floor(Math.max(a.x, b.x) / cell);
      const y0 = Math.floor(Math.min(a.y, b.y) / cell), y1 = Math.floor(Math.max(a.y, b.y) / cell);
      for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
        const k = key(cx, cy);
        let list = grid.get(k);
        if (!list) grid.set(k, (list = []));
        list.push(id);
      }
    }
  });

  const crossings = [];
  const contacts = new Map(); // "ci,i|cj,j" piece-level later; here per curve pair with max |dz|
  const seen = new Set();
  const minSelfGap = 1.2 * w;
  for (const list of grid.values()) {
    for (let p = 0; p < list.length; p++) for (let q = p + 1; q < list.length; q++) {
      const A = segs[list[p]], B = segs[list[q]];
      if (A.ci === B.ci) {
        if (Math.abs(A.i - B.i) <= 1) continue;
        if (Math.abs(A.a.s - B.a.s) < minSelfGap) continue;
      }
      const ca = curves[A.ci], cb = curves[B.ci];
      if (ca.kind === 'prop' && cb.kind === 'prop') continue;
      const sk = list[p] < list[q] ? list[p] * 1e6 + list[q] : list[q] * 1e6 + list[p];
      if (seen.has(sk)) continue;
      seen.add(sk);
      const hit = segIntersect(A.a, A.b, B.a, B.b);
      if (hit) {
        const sa = A.a.s + (A.b.s - A.a.s) * hit.u, sb = B.a.s + (B.b.s - B.a.s) * hit.v;
        const za = ca.kind === 'prop' ? ca.z : A.a.z + (A.b.z - A.a.z) * hit.u;
        const zb = cb.kind === 'prop' ? cb.z : B.a.z + (B.b.z - B.a.z) * hit.v;
        const x = A.a.x + (A.b.x - A.a.x) * hit.u, y = A.a.y + (A.b.y - A.a.y) * hit.u;
        const sin = Math.max(0.2, Math.sin(hit.angle));
        // A rope grazing a prop's silhouette runs almost parallel to it, so
        // the footprint would balloon; there the rope is beside the prop and
        // the paint order hardly shows, so cap it tighter.
        const isProp = ca.kind === 'prop' || cb.kind === 'prop';
        const f = Math.min(isProp ? 1.2 * w : 3 * w, (w / 2) / sin) + w / 2 + ow;
        crossings.push({ a: { ci: A.ci, s: sa, z: za }, b: { ci: B.ci, s: sb, z: zb }, x, y, angle: hit.angle, f });
      } else if (ca.kind === 'rope' && cb.kind === 'rope') {
        const dist = segDist(A.a, A.b, B.a, B.b);
        if (dist < w * 0.95) {
          const za = (A.a.z + A.b.z) / 2, zb = (B.a.z + B.b.z) / 2;
          // store contact for proximity ordering later (resolved per piece)
          crossings.push({ contact: true, a: { ci: A.ci, s: (A.a.s + A.b.s) / 2, z: za }, b: { ci: B.ci, s: (B.a.s + B.b.s) / 2, z: zb }, dist });
        }
      }
    }
  }

  // Events per rope curve, from real crossings only.
  const events = curves.map(() => []);
  const real = crossings.filter((c) => !c.contact);
  real.forEach((c, idx) => {
    const over = c.a.z > c.b.z ? 'a' : 'b';
    for (const side of ['a', 'b']) {
      const e = c[side];
      if (curves[e.ci].kind !== 'rope') continue;
      events[e.ci].push({ s: e.s, over: side === over, idx, lo: e.s - c.f, hi: e.s + c.f });
    }
  });

  // Cut each rope curve between consecutive events of opposite relation.
  const pieces = [];
  const conflicts = [];
  const pieceIndex = curves.map(() => []);
  curves.forEach((c, ci) => {
    if (c.kind !== 'rope') return;
    const S = c.samples, total = S[S.length - 1].s;
    const ev = events[ci].sort((p, q) => p.s - q.s);
    const cuts = [];
    for (let k = 0; k < ev.length - 1; k++) {
      const e1 = ev[k], e2 = ev[k + 1];
      if (e1.over === e2.over) continue;
      if (e1.hi < e2.lo) cuts.push((e1.hi + e2.lo) / 2);
      else {
        cuts.push((e1.s + e2.s) / 2);
        // A rope grazing a prop's edge crosses the silhouette twice within a
        // rope width; that is expected, not a conflict.
        const c1 = real[e1.idx], c2 = real[e2.idx];
        const other = (c) => (c.a.ci === ci && c.a.s === e1.s) || (c.a.ci === ci && c.a.s === e2.s) ? c.b.ci : c.a.ci;
        // Report it only when the footprints overlap by more than a rope
        // width: a smaller overlap is resolved by the weak edges below.
        const graze = curves[other(c1)].kind === 'prop' || curves[other(c2)].kind === 'prop';
        const overlap = e1.hi - e2.lo;
        if (!graze && overlap > w) conflicts.push({ ci, s: (e1.s + e2.s) / 2, x: c1.x, y: c1.y });
      }
    }
    let prev = 0;
    for (const cut of [...cuts, total]) {
      if (cut - prev < 1e-6) continue;
      const sub = subPath(S, prev, cut);
      let zsum = 0;
      for (const p of sub) zsum += p.z;
      const piece = { id: pieces.length, ci, s0: prev, s1: cut, zavg: zsum / sub.length, path: sub, startCut: prev > 0, endCut: cut < total, kind: 'piece' };
      pieces.push(piece);
      pieceIndex[ci].push(piece);
      prev = cut;
    }
  });
  const propNodes = [];
  curves.forEach((c, ci) => {
    if (c.kind === 'prop') { const n = { id: pieces.length + propNodes.length, ci, zavg: c.z, kind: 'prop' }; propNodes.push(n); pieceIndex[ci].push(n); }
  });
  const nodes = [...pieces, ...propNodes];
  const N = nodes.length;
  const adj = nodes.map(() => new Set());
  const addEdge = (u, v) => { if (u !== v) adj[u].add(v); };
  const piecesIn = (ci, lo, hi) => {
    const list = pieceIndex[ci];
    if (curves[ci].kind === 'prop') return list;
    return list.filter((p) => p.s1 >= lo && p.s0 <= hi);
  };
  const reach = (from, to) => {
    const stack = [from], vis = new Set([from]);
    while (stack.length) {
      const u = stack.pop();
      if (u === to) return true;
      for (const v of adj[u]) if (!vis.has(v)) { vis.add(v); stack.push(v); }
    }
    return false;
  };
  // Strong edges: the crossing point itself lies inside both pieces. Weak
  // edges: a piece only touches the crossing's footprint (its cap would poke
  // out). Weak edges are added after all strong ones and only when they do
  // not contradict them; this is what lets a rope graze a post's edge, where
  // the silhouette crossings "over" then "under" sit a rope width apart.
  const weak = [];
  const holds = (p, s) => p.kind === 'prop' || (p.s0 <= s && p.s1 >= s);
  for (const c of real) {
    const [under, over] = c.a.z > c.b.z ? [c.b, c.a] : [c.a, c.b];
    const U = piecesIn(under.ci, under.s - c.f, under.s + c.f);
    const O = piecesIn(over.ci, over.s - c.f, over.s + c.f);
    for (const u of U) for (const o of O) {
      if (holds(u, under.s) && holds(o, over.s)) addEdge(u.id, o.id);
      else weak.push([u.id, o.id]);
    }
  }
  for (const [u, o] of weak) if (!reach(o, u)) addEdge(u, o);
  // Proximity contacts: weaker still, added only if acyclic.
  const contactPairs = new Map();
  for (const c of crossings) {
    if (!c.contact) continue;
    const pa = pieceIndex[c.a.ci].find((p) => p.s0 <= c.a.s && p.s1 >= c.a.s);
    const pb = pieceIndex[c.b.ci].find((p) => p.s0 <= c.b.s && p.s1 >= c.b.s);
    if (!pa || !pb || pa === pb) continue;
    const dz = c.a.z - c.b.z;
    if (Math.abs(dz) < 0.15) continue;
    const [lo, hi] = dz < 0 ? [pa.id, pb.id] : [pb.id, pa.id];
    const k = lo * 1e5 + hi;
    const cur = contactPairs.get(k);
    if (!cur || Math.abs(dz) > cur.dz) contactPairs.set(k, { lo, hi, dz: Math.abs(dz) });
  }
  [...contactPairs.values()].sort((p, q) => q.dz - p.dz).forEach(({ lo, hi }) => { if (!reach(hi, lo)) addEdge(lo, hi); });

  // Kahn's algorithm, always taking the available node with the lowest z.
  const indeg = new Array(N).fill(0);
  adj.forEach((set) => set.forEach((v) => indeg[v]++));
  const order = [];
  const done = new Array(N).fill(false);
  let cycles = 0;
  while (order.length < N) {
    let best = -1;
    for (let i = 0; i < N; i++) if (!done[i] && indeg[i] === 0 && (best < 0 || nodes[i].zavg < nodes[best].zavg)) best = i;
    if (best < 0) {
      // cycle: break it at the lowest-z remaining node
      cycles++;
      for (let i = 0; i < N; i++) if (!done[i] && (best < 0 || nodes[i].zavg < nodes[best].zavg)) best = i;
    }
    done[best] = true;
    order.push(nodes[best]);
    for (const v of adj[best]) indeg[v]--;
  }
  return { pieces, nodes, order, crossings: real, contacts: crossings.filter((c) => c.contact), conflicts, cycles };
}

// ------------------------------------------------------------- painting

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
export function shade(hex, amt) {
  // amt > 0 lightens toward white, amt < 0 darkens toward black
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function tracePath(ctx, path) {
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
}

// Paint the body of a rope along `path` (a sub-polyline). Draws base colour,
// lay texture, highlight and shadow, and the working-end band when the path
// reaches the strand's end. Cut ends use butt caps (pieces overlap a little
// at every cut, so the join is invisible); real rope ends get a round disc.
function paintBody(ctx, path, strand, style, sEnd, ends) {
  const w = strand.width;
  const first = path[0], last = path[path.length - 1];
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  tracePath(ctx, path);
  ctx.strokeStyle = strand.color;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.fillStyle = strand.color;
  if (ends.start) disc(ctx, first, w / 2);
  if (ends.end) disc(ctx, last, w / 2);
  if (strand.flat) {
    // webbing: flat tape, two faint edge lines instead of a cylinder
    ctx.save();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(0,0,0,0.13)';
    ctx.lineWidth = w * 0.8;
    ctx.stroke();
    ctx.strokeStyle = strand.color;
    ctx.lineWidth = w * 0.64;
    ctx.stroke();
    ctx.restore();
  }
  if (style.texture && !strand.flat) {
    // Lay of the rope: faint bands across the body, continuous across pieces
    // because the dash offset follows arc length.
    ctx.save();
    ctx.setLineDash([w * 0.3, w * 0.7]);
    ctx.lineDashOffset = -first.s;
    ctx.strokeStyle = style.textureColor || 'rgba(0,0,0,0.085)';
    ctx.lineWidth = w * 0.86;
    ctx.stroke();
    ctx.restore();
  }
  // highlight (upper left) and shade (lower right): a cheap cylinder.
  if (!strand.flat) {
    ctx.save();
    ctx.translate(-w * 0.11, -w * 0.13);
    tracePath(ctx, path);
    ctx.strokeStyle = style.highlight || 'rgba(255,255,255,0.42)';
    ctx.lineWidth = w * 0.3;
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    if (ends.start) disc(ctx, first, w * 0.15);
    if (ends.end) disc(ctx, last, w * 0.15);
    ctx.restore();
    ctx.save();
    ctx.translate(w * 0.1, w * 0.13);
    tracePath(ctx, path);
    ctx.strokeStyle = style.shade || 'rgba(0,0,0,0.22)';
    ctx.lineWidth = w * 0.26;
    ctx.stroke();
    ctx.restore();
  }
  // working end band
  const tipLen = strand.tipLen;
  const s1 = last.s, s0 = first.s;
  if (tipLen > 0 && s1 > sEnd - tipLen - 1e-6) {
    const from = Math.max(s0, sEnd - tipLen);
    if (s1 - from > 1e-6) {
      const sub = subPath(strand.samples, from, s1);
      tracePath(ctx, sub);
      ctx.lineCap = s1 >= sEnd - 1e-6 ? 'round' : 'butt';
      ctx.strokeStyle = strand.tipColor;
      ctx.lineWidth = w;
      ctx.stroke();
      if (s1 >= sEnd - 1e-6) {
        ctx.lineCap = 'butt';
        ctx.lineWidth = w;
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        const back = Math.max(from, s1 - w * 0.9);
        const cutsub = subPath(strand.samples, back, s1 - w * 0.55);
        if (cutsub.length > 1) { tracePath(ctx, cutsub); ctx.stroke(); }
      }
    }
  }
}

function disc(ctx, p, r) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

const CUT_OVERLAP = 0.35; // world units each piece runs past a cut

// Paint one scene. `scene` = {strands:[{ctrl, color, width, tipLen, tipColor, id}], props:[], width, outline}
// Returns the analysis (used by lint and tests).
export function paintScene(ctx, scene, style = {}) {
  const w = scene.width, ow = scene.outline ?? w * 0.17;
  const strands = scene.strands.map((st) => ({
    ...st,
    width: st.width || w,
    samples: sampleSpline(st.ctrl),
    tipLen: st.tipLen ?? (st.end === 'working' ? w * 2.2 : 0),
    tipColor: st.tipColor || style.tipColor || '#f3f0e6',
  }));
  const curves = strands.map((st, i) => ({ samples: st.samples, kind: 'rope', id: st.id, strandIndex: i }));
  const props = scene.props || [];
  for (const prop of props) {
    for (const outline of propOutlines(prop)) curves.push({ samples: outline, kind: 'prop', z: prop.z || 0, prop });
  }
  const res = analyse(curves, { width: w, outline: ow });
  const outlineColor = style.outline || '#1e1812';

  // ground shadow under all rope: gives lift off the page
  if (style.dropShadow !== false) {
    ctx.save();
    ctx.translate(w * 0.12, w * 0.22);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = style.dropShadowColor || 'rgba(0,0,0,0.13)';
    for (const p of res.pieces) {
      const st = strands[curves[p.ci].strandIndex];
      ctx.lineWidth = st.width + 2 * ow;
      tracePath(ctx, p.path);
      ctx.stroke();
    }
    ctx.restore();
  }

  const painted = new Set();
  const drawnProps = new Set();
  for (const node of res.order) {
    if (node.kind === 'prop') {
      const prop = curves[node.ci].prop;
      if (drawnProps.has(prop)) continue;
      drawnProps.add(prop);
      paintProp(ctx, prop, style);
      continue;
    }
    const piece = node;
    const st = strands[curves[piece.ci].strandIndex];
    const sEnd = st.samples[st.samples.length - 1].s;
    const ends = { start: !piece.startCut, end: !piece.endCut };
    // Run a little past each cut, but only toward a neighbour that is already
    // painted: the overlap then covers its translucent layers once instead of
    // doubling them.
    const sib = res.pieces.filter((p) => p.ci === piece.ci);
    const prevDone = piece.startCut && sib.some((p) => painted.has(p.id) && Math.abs(p.s1 - piece.s0) < 1e-6);
    const nextDone = piece.endCut && sib.some((p) => painted.has(p.id) && Math.abs(p.s0 - piece.s1) < 1e-6);
    const path = subPath(st.samples, prevDone ? piece.s0 - CUT_OVERLAP : piece.s0, nextDone ? piece.s1 + CUT_OVERLAP : piece.s1);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    tracePath(ctx, path);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = st.width + 2 * ow;
    ctx.stroke();
    ctx.fillStyle = outlineColor;
    if (ends.start) disc(ctx, path[0], st.width / 2 + ow);
    if (ends.end) disc(ctx, path[path.length - 1], st.width / 2 + ow);
    paintBody(ctx, path, st, style, sEnd, ends);
    painted.add(piece.id);
  }
  return res;
}

// ---------------------------------------------------------------- props

function circlePath(cx, cy, r, n = 48) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), z: 0, s: (i / n) * 2 * Math.PI * r });
  }
  return out;
}

function capsulePath(x1, y1, x2, y2, r, n = 14) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const pts = [];
  const base = Math.atan2(ny, nx);
  for (let i = 0; i <= n; i++) { const a = base + (i / n) * Math.PI; pts.push([x1 + r * Math.cos(a), y1 + r * Math.sin(a)]); }
  for (let i = 0; i <= n; i++) { const a = base + Math.PI + (i / n) * Math.PI; pts.push([x2 + r * Math.cos(a), y2 + r * Math.sin(a)]); }
  pts.push(pts[0]);
  let s = 0;
  return pts.map((p, i) => { if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); return { x: p[0], y: p[1], z: 0, s }; });
}

export function propOutlines(prop) {
  switch (prop.type) {
    case 'post': return [capsulePath(prop.x, prop.y1, prop.x, prop.y2, prop.r)];
    case 'bar': return [capsulePath(prop.x1, prop.y1, prop.x2, prop.y2, prop.r)];
    case 'ring': return [circlePath(prop.cx, prop.cy, prop.r + prop.t / 2), circlePath(prop.cx, prop.cy, prop.r - prop.t / 2)];
    case 'carabiner': return carabinerOutlines(prop);
    case 'hook': return [circlePath(prop.cx, prop.cy, prop.r + prop.t / 2), circlePath(prop.cx, prop.cy, Math.max(0.3, prop.r - prop.t / 2))];
    default: return [];
  }
}

function carabinerShape(prop) {
  // A rounded D: straight spine on one side, big arc on the other.
  const { cx, cy, w = 14, h = 24 } = prop;
  const r = w * 0.42;
  return { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2, r };
}

function carabinerOutlines(prop) {
  const { x0, y0, x1, y1, r } = carabinerShape(prop);
  const t = prop.t || 2.6;
  const rr = (x0, y0, x1, y1, r) => {
    const pts = [];
    const corners = [[x1 - r, y0 + r, -Math.PI / 2, 0], [x1 - r, y1 - r, 0, Math.PI / 2], [x0 + r, y1 - r, Math.PI / 2, Math.PI], [x0 + r, y0 + r, Math.PI, 1.5 * Math.PI]];
    for (const [cx, cy, a0, a1] of corners) for (let i = 0; i <= 8; i++) { const a = a0 + ((a1 - a0) * i) / 8; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    pts.push(pts[0]);
    let s = 0;
    return pts.map((p, i) => { if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); return { x: p[0], y: p[1], z: 0, s }; });
  };
  return [rr(x0, y0, x1, y1, r), rr(x0 + t, y0 + t, x1 - t, y1 - t, Math.max(0.5, r - t))];
}

function paintCapsule(ctx, x1, y1, x2, y2, r, style, prop) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / L, ny = dx / L;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const base = prop.color || style.propColor || '#8d6b4a';
  const g = ctx.createLinearGradient(mx - nx * r, my - ny * r, mx + nx * r, my + ny * r);
  g.addColorStop(0, shade(base, -0.25));
  g.addColorStop(0.35, shade(base, 0.18));
  g.addColorStop(0.6, base);
  g.addColorStop(1, shade(base, -0.45));
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = style.outline || '#1e1812';
  ctx.lineWidth = 2 * r + (style.propOutline ?? 0.7);
  ctx.stroke();
  ctx.strokeStyle = g;
  ctx.lineWidth = 2 * r;
  ctx.stroke();
  if (prop.grain !== false) {
    // wood grain: a few faint lines along the axis
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.35;
    for (const f of [-0.55, -0.15, 0.3, 0.7]) {
      ctx.beginPath();
      ctx.moveTo(x1 + nx * r * f + (dx / L) * r * 0.6, y1 + ny * r * f + (dy / L) * r * 0.6);
      ctx.lineTo(x2 + nx * r * f - (dx / L) * r * 0.6, y2 + ny * r * f - (dy / L) * r * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (prop.label) paintLabel(ctx, prop.label, prop.labelAt || [mx, my], style, { anchor: 'center', plain: true });
}

export function paintProp(ctx, prop, style) {
  switch (prop.type) {
    case 'post': return paintCapsule(ctx, prop.x, prop.y1, prop.x, prop.y2, prop.r, style, prop);
    case 'bar': return paintCapsule(ctx, prop.x1, prop.y1, prop.x2, prop.y2, prop.r, style, prop);
    case 'ring': {
      const base = prop.color || '#9aa3ad';
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(prop.cx, prop.cy, prop.r, 0, Math.PI * 2);
      ctx.strokeStyle = style.outline || '#1e1812';
      ctx.lineWidth = prop.t + (style.propOutline ?? 0.7);
      ctx.stroke();
      const g = ctx.createLinearGradient(prop.cx - prop.r, prop.cy - prop.r, prop.cx + prop.r, prop.cy + prop.r);
      g.addColorStop(0, shade(base, 0.35));
      g.addColorStop(0.5, base);
      g.addColorStop(1, shade(base, -0.4));
      ctx.strokeStyle = g;
      ctx.lineWidth = prop.t;
      ctx.stroke();
      return;
    }
    case 'carabiner': {
      const { x0, y0, x1, y1, r } = carabinerShape(prop);
      const t = prop.t || 2.6;
      const base = prop.color || '#8a93a6';
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(x0 + t / 2 + r, y0 + t / 2);
        ctx.arcTo(x1 - t / 2, y0 + t / 2, x1 - t / 2, y1 - t / 2, r);
        ctx.arcTo(x1 - t / 2, y1 - t / 2, x0 + t / 2, y1 - t / 2, r);
        ctx.arcTo(x0 + t / 2, y1 - t / 2, x0 + t / 2, y0 + t / 2, r);
        ctx.arcTo(x0 + t / 2, y0 + t / 2, x1 - t / 2, y0 + t / 2, r);
        ctx.closePath();
      };
      ctx.lineJoin = 'round';
      path();
      ctx.strokeStyle = style.outline || '#1e1812';
      ctx.lineWidth = t + (style.propOutline ?? 0.7);
      ctx.stroke();
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, shade(base, 0.4));
      g.addColorStop(0.5, base);
      g.addColorStop(1, shade(base, -0.35));
      path();
      ctx.strokeStyle = g;
      ctx.lineWidth = t;
      ctx.stroke();
      // gate: a thin seam on the straight side
      ctx.beginPath();
      const gy0 = y0 + r + 2, gy1 = y1 - r - 2;
      ctx.moveTo(x0 + t / 2, gy0); ctx.lineTo(x0 + t / 2, gy1);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, gy0); ctx.lineTo(x0 + t, gy0); ctx.moveTo(x0, gy1); ctx.lineTo(x0 + t, gy1); ctx.stroke();
      return;
    }
    case 'hook': {
      // Fishing hook: eye at (cx, cy), shank running down-right by `len`, then the bend and point curling back.
      const { cx, cy, r, t, len = 40 } = prop;
      const base = prop.color || '#6f7780';
      const d = prop.dir || [0.25, 1];
      const dl = Math.hypot(d[0], d[1]) || 1, ux = d[0] / dl, uy = d[1] / dl, nx = -uy, ny = ux;
      const sx = cx + ux * (r + t / 2), sy = cy + uy * (r + t / 2);
      const ex = sx + ux * len, ey = sy + uy * len;
      const bendR = len * 0.28;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(sx, sy); ctx.lineTo(ex - ux * bendR, ey - uy * bendR);
        // bend: half circle to the side opposite the eye's wrap direction
        const bcx = ex - ux * bendR + nx * bendR, bcy = ey - uy * bendR + ny * bendR;
        const a0 = Math.atan2(-ny, -nx), a1 = a0 + Math.PI;
        ctx.arc(bcx, bcy, bendR, a0, a1, false);
        ctx.lineTo(bcx + nx * bendR - ux * bendR * 1.3, bcy + ny * bendR - uy * bendR * 1.3);
      };
      path(); ctx.strokeStyle = style.outline || '#1e1812'; ctx.lineWidth = t + (style.propOutline ?? 0.7); ctx.stroke();
      path(); ctx.strokeStyle = base; ctx.lineWidth = t; ctx.stroke();
      // barb
      ctx.beginPath();
      const bcx = ex - ux * bendR + nx * bendR, bcy = ey - uy * bendR + ny * bendR;
      const px = bcx + nx * bendR - ux * bendR * 1.3, py = bcy + ny * bendR - uy * bendR * 1.3;
      ctx.moveTo(px + ux * bendR * 0.5, py + uy * bendR * 0.5); ctx.lineTo(px + ux * bendR * 0.5 + nx * t * 1.2, py + uy * bendR * 0.5 + ny * t * 1.2);
      ctx.strokeStyle = base; ctx.lineWidth = t * 0.7; ctx.stroke();
      // eye
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = style.outline || '#1e1812'; ctx.lineWidth = t + (style.propOutline ?? 0.7); ctx.stroke();
      ctx.strokeStyle = base; ctx.lineWidth = t; ctx.stroke();
      return;
    }
    case 'ground': {
      ctx.fillStyle = prop.color || 'rgba(0,0,0,0.08)';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      return;
    }
  }
}

// -------------------------------------------------------------- overlays

export function paintLabel(ctx, text, at, style, opts = {}) {
  const size = opts.size || 3.4;
  ctx.save();
  ctx.font = `${opts.weight || 600} ${size}px ${style.font || 'system-ui, sans-serif'}`;
  ctx.textAlign = opts.anchor || 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (!opts.plain) {
    ctx.lineWidth = size * 0.35;
    ctx.strokeStyle = style.labelHalo || 'rgba(255,255,255,0.9)';
    ctx.strokeText(text, at[0], at[1]);
  }
  ctx.fillStyle = opts.color || style.labelColor || '#2b2520';
  ctx.fillText(text, at[0], at[1]);
  ctx.restore();
}

export function paintArrow(ctx, from, to, style, opts = {}) {
  const color = opts.color || style.accent || '#d6452c';
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const L = Math.hypot(dx, dy);
  if (L < 0.5) return;
  const bend = opts.bend ?? 0;
  const mx = (from[0] + to[0]) / 2 - dy * bend, my = (from[1] + to[1]) / 2 + dx * bend;
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = opts.width || 0.9;
  ctx.lineCap = 'round';
  if (opts.dash !== false) ctx.setLineDash([1.6, 1.4]);
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.quadraticCurveTo(mx, my, to[0], to[1]);
  ctx.stroke();
  ctx.setLineDash([]);
  // head, aligned with the curve's end tangent
  const tx = to[0] - mx, ty = to[1] - my;
  const a = Math.atan2(ty, tx);
  const hs = opts.head || 2.6;
  ctx.beginPath();
  ctx.moveTo(to[0], to[1]);
  ctx.lineTo(to[0] - hs * Math.cos(a - 0.45), to[1] - hs * Math.sin(a - 0.45));
  ctx.lineTo(to[0] - hs * Math.cos(a + 0.45), to[1] - hs * Math.sin(a + 0.45));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function paintPulse(ctx, at, r, style, alpha = 0.5) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = style.accent || '#d6452c';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(at[0], at[1], r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
