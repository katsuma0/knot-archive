// scene.js: paints a knot pose onto a canvas with view fitting, overlays
// (labels, arrows, tip trail) and theme colours. Shared by the app, the
// thumbnail renderer and the offline render tools.

import { paintScene, paintLabel, paintArrow, paintPulse } from './rope.js';
import { tipTravel } from './anim.js';

export const THEMES = {
  light: {
    bg: '#f5f0e6', outline: '#241c15', labelColor: '#2b2520', labelHalo: 'rgba(245,240,230,0.92)', accent: '#c93d25',
    tipColor: '#f6f3ea', highlight: 'rgba(255,255,255,0.42)', shade: 'rgba(0,0,0,0.22)', dropShadowColor: 'rgba(40,25,10,0.14)',
    propColor: '#8d6b4a', textureColor: 'rgba(0,0,0,0.085)',
  },
  dark: {
    bg: '#161a1d', outline: '#07090b', labelColor: '#eef0ea', labelHalo: 'rgba(22,26,29,0.9)', accent: '#ff7a59',
    tipColor: '#f6f3ea', highlight: 'rgba(255,255,255,0.34)', shade: 'rgba(0,0,0,0.3)', dropShadowColor: 'rgba(0,0,0,0.35)',
    propColor: '#7d5f43', textureColor: 'rgba(0,0,0,0.14)',
  },
};

export const ROPE_COLORS = {
  orange: '#e4722f', red: '#c7402a', blue: '#2f6fb3', green: '#4f8f3a', yellow: '#d9a92c', purple: '#7a4fa0',
  teal: '#2a8f8a', navy: '#2d3f6b', olive: '#7c7f36', sand: '#c9a978', white: '#e8e2d2', grey: '#8a8f94', black: '#3a3a3a',
};

export function resolveColor(c) {
  return ROPE_COLORS[c] || c || ROPE_COLORS.orange;
}

// Fit a view box into a canvas. Returns {scale, ox, oy} in CSS pixels.
export function fitView(view, cw, ch) {
  const scale = Math.min(cw / view.w, ch / view.h);
  return { scale, ox: (cw - view.w * scale) / 2 - view.x * scale, oy: (ch - view.h * scale) / 2 - view.y * scale };
}

// Paint a frame. `state` comes from poseAt(); `knot` gives strands, props, width.
// opts: {theme, mirror, showArrows, tipTrail, dpr, cw, ch}
export function paintFrame(ctx, knot, state, opts = {}) {
  const theme = THEMES[opts.theme || 'light'];
  const { cw, ch } = opts;
  const dpr = opts.dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (opts.clear !== false) {
    ctx.fillStyle = opts.bg || theme.bg;
    ctx.fillRect(0, 0, cw, ch);
  }
  const view = state.view || knot.view || { x: 0, y: 0, w: 100, h: 100 };
  const { scale, ox, oy } = fitView(view, cw, ch);
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  if (opts.mirror) {
    ctx.translate(view.x * 2 + view.w, 0);
    ctx.scale(-1, 1);
  }
  const width = knot.ropeWidth || 4;
  const strands = knot.strands.map((st) => ({
    id: st.id, ctrl: state.pose[st.id], color: resolveColor(st.color), width: st.width || width,
    end: st.end || 'working', tipLen: st.tipLen, tipColor: st.tipColor && resolveColor(st.tipColor), flat: !!st.flat,
  }));
  const step = knot.steps[state.step];
  const props = (step && step.props) || knot.props || [];
  const style = { ...theme, texture: knot.texture !== false, propOutline: width * 0.17 };
  const analysis = paintScene(ctx, { strands, props, width, outline: width * 0.17 }, style);

  // overlays
  const mirrorPt = (p) => p;
  if (step && step.labels && (!state.tween || opts.labelsDuringTween)) {
    for (const l of step.labels) {
      const at = l.at || [l.x, l.y];
      if (opts.mirror) {
        ctx.save(); ctx.translate(at[0], at[1]); ctx.scale(-1, 1);
        paintLabel(ctx, l.text, [0, 0], style, { anchor: l.anchor ? flipAnchor(l.anchor) : 'left', size: l.size });
        ctx.restore();
      } else paintLabel(ctx, l.text, at, style, { anchor: l.anchor, size: l.size });
    }
  }
  if (step && step.arrows && opts.showArrows !== false) {
    const alpha = state.tween ? 1 - state.progress * 0.6 : 0.85;
    for (const a of step.arrows) paintArrow(ctx, a.from, a.to, style, { bend: a.bend, alpha });
  }
  // Tip trail: during a tween, a dashed arrow from where the working end
  // started to where it is heading, so the eye knows the move before it ends.
  if (state.tween && opts.tipTrail !== false && step && step.trail !== false) {
    const travel = tipTravel(state.seg, knot.strands.map((s) => s.id));
    for (const st of knot.strands) {
      if ((st.end || 'working') !== 'working' || st.trail === false) continue;
      const tr = travel[st.id];
      const d = Math.hypot(tr.to[0] - tr.from[0], tr.to[1] - tr.from[1]);
      if (d < width * 1.5) continue;
      const cur = state.pose[st.id][state.pose[st.id].length - 1];
      const fade = 1 - Math.pow(state.progress, 3);
      paintArrow(ctx, [tr.from[0], tr.from[1]], [tr.to[0], tr.to[1]], style, { alpha: 0.55 * fade, width: 0.7, head: 2.2, bend: step.trailBend ?? 0 });
      paintPulse(ctx, [cur[0], cur[1]], width * (0.9 + 0.5 * Math.sin(state.progress * Math.PI)), style, 0.45 * fade);
    }
  }
  return analysis;
}

function flipAnchor(a) {
  return a === 'left' ? 'right' : a === 'right' ? 'left' : a;
}
