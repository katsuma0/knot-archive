// player.js: the animated knot viewer. Owns the canvas, the clock and the
// controls for one knot. Step mode (default) pauses at the end of each step so
// you can copy the move with real cord before going on.

import { buildTimeline, poseAt } from './anim.js';
import { paintFrame } from './scene.js';

const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z" fill="currentColor"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zm13 0v14L9 12z" fill="currentColor"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM5 5v14l10-7z" fill="currentColor"/></svg>',
  replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.3 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M5 3v6h6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  mirror: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M4 7l5 5-5 5zM20 7l-5 5 5 5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  stepmode: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h5M4 6h5M4 18h5M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

export class Player {
  constructor(root, knot, opts = {}) {
    this.root = root;
    this.knot = knot;
    this.timeline = buildTimeline(knot);
    this.t = 0;
    this.playing = false;
    this.speed = +(localStorage.getItem('knots.speed') || 1);
    this.stepMode = localStorage.getItem('knots.stepmode') !== 'off';
    this.mirror = localStorage.getItem('knots.mirror') === 'on';
    this.theme = opts.theme || 'light';
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.lastStep = -1;
    this.pauseAt = null;
    this.build();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas);
    this.onKey = (e) => this.key(e);
    window.addEventListener('keydown', this.onKey);
    this.raf = requestAnimationFrame((ts) => this.tick(ts));
    this.seekStep(0, false);
  }

  build() {
    const k = this.knot;
    this.root.innerHTML = `
      <div class="player">
        <div>
          <div class="stage paused">
            <canvas aria-label="Animation of tying the ${k.name}" role="img"></canvas>
            <div class="step-pill" aria-hidden="true"></div>
            <div class="tap-hint" aria-hidden="true">${ICONS.play}<span>Play</span></div>
          </div>
          <div class="scrub">
            <input type="range" min="0" max="1000" value="0" aria-label="Scrub through the animation">
            <span class="time">0.0s</span>
          </div>
          <div class="steps-bar" role="group" aria-label="Steps"></div>
          <div class="controls">
            <button class="ctl" data-act="prev" aria-label="Previous step">${ICONS.prev}<span>Back</span></button>
            <button class="ctl primary" data-act="play" aria-label="Play">${ICONS.play}<span>Play</span></button>
            <button class="ctl" data-act="replay" aria-label="Replay this step">${ICONS.replay}<span>Again</span></button>
            <button class="ctl" data-act="next" aria-label="Next step">${ICONS.next}<span>Next</span></button>
          </div>
          <div class="options">
            <div class="speed" role="group" aria-label="Speed">
              ${[0.5, 0.75, 1, 1.5].map((s) => `<button data-speed="${s}" aria-pressed="${s === this.speed}">${s}×</button>`).join('')}
            </div>
            <button class="ctl" data-act="stepmode" aria-pressed="${this.stepMode}" title="Pause after every step">${ICONS.stepmode}<span>Pause each step</span></button>
            <button class="ctl" data-act="mirror" aria-pressed="${this.mirror}" title="Flip for the other hand">${ICONS.mirror}<span>Mirror</span></button>
          </div>
          <p class="hint"><kbd>space</kbd> play · <kbd>←</kbd> <kbd>→</kbd> steps · <kbd>r</kbd> again · <kbd>m</kbd> mirror</p>
        </div>
        <div>
          <div class="caption" aria-live="polite"><h2></h2><p></p></div>
          <ol class="step-list">
            ${k.steps.map((s, i) => `<li><button data-step="${i}"><span class="n">${i + 1}</span><div><b>${esc(s.title)}</b><span>${esc(s.text)}</span></div></button></li>`).join('')}
          </ol>
        </div>
      </div>`;
    this.canvas = this.root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.stage = this.root.querySelector('.stage');
    this.pill = this.root.querySelector('.step-pill');
    this.range = this.root.querySelector('input[type=range]');
    this.timeEl = this.root.querySelector('.time');
    this.captionH = this.root.querySelector('.caption h2');
    this.captionP = this.root.querySelector('.caption p');
    this.playBtn = this.root.querySelector('[data-act=play]');
    this.bar = this.root.querySelector('.steps-bar');
    this.bar.innerHTML = k.steps.map((s, i) => `<button data-step="${i}" aria-label="Step ${i + 1}: ${esc(s.title)}" title="${esc(s.title)}"></button>`).join('');

    this.root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.step != null) this.seekStep(+b.dataset.step, true);
      else if (b.dataset.speed) this.setSpeed(+b.dataset.speed);
      else if (b.dataset.act === 'play') this.toggle();
      else if (b.dataset.act === 'prev') this.prev();
      else if (b.dataset.act === 'next') this.next();
      else if (b.dataset.act === 'replay') this.replay();
      else if (b.dataset.act === 'stepmode') this.setStepMode(!this.stepMode);
      else if (b.dataset.act === 'mirror') this.setMirror(!this.mirror);
    });
    this.canvas.addEventListener('click', () => this.toggle());
    // swipe left/right on the stage for next/previous step (phones)
    let sx = null, sy = null;
    this.stage.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    this.stage.addEventListener('touchend', (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      sx = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > 2 * Math.abs(dy)) { e.preventDefault(); if (dx < 0) this.next(); else this.prev(); }
    });
    this.hint = this.root.querySelector('.tap-hint span');
    this.range.addEventListener('input', () => { this.pause(); this.t = (+this.range.value / 1000) * this.timeline.total; this.pauseAt = null; this.dirty = true; });
  }

  resize() {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || 300;
    if (this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(w * dpr);
    }
    this.dpr = dpr;
    this.cw = w;
    this.dirty = true;
  }

  setTheme(theme) { this.theme = theme; this.dirty = true; }
  setSpeed(s) {
    this.speed = s;
    localStorage.setItem('knots.speed', String(s));
    this.root.querySelectorAll('[data-speed]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.speed === s)));
  }
  setStepMode(on) {
    this.stepMode = on;
    localStorage.setItem('knots.stepmode', on ? 'on' : 'off');
    this.root.querySelector('[data-act=stepmode]').setAttribute('aria-pressed', String(on));
  }
  setMirror(on) {
    this.mirror = on;
    localStorage.setItem('knots.mirror', on ? 'on' : 'off');
    this.root.querySelector('[data-act=mirror]').setAttribute('aria-pressed', String(on));
    this.dirty = true;
  }

  stepAt(t) {
    const steps = this.timeline.steps;
    for (let i = steps.length - 1; i >= 0; i--) if (t >= steps[i].t0) return i;
    return 0;
  }

  // Jump to the start of a step's motion (the rest pose of the previous step), then play it.
  seekStep(i, play) {
    const steps = this.timeline.steps;
    i = Math.max(0, Math.min(steps.length - 1, i));
    this.t = steps[i].t0;
    this.pauseAt = this.stepMode ? steps[i].tweenEnd : null;
    this.dirty = true;
    if (play && i > 0) this.play(); else this.pause();
    this.lastStep = -1;
  }
  prev() {
    const cur = this.stepAt(this.t);
    const st = this.timeline.steps[cur];
    // if we are already at the start of this step, go to the previous one
    const target = this.t - st.t0 < 0.05 ? cur - 1 : cur;
    this.seekStep(Math.max(0, target), target > 0);
  }
  next() { this.seekStep(this.stepAt(this.t) + 1, true); }
  replay() { this.seekStep(this.stepAt(this.t), true); }

  toggle() {
    if (this.playing) return this.pause();
    if (this.t >= this.timeline.total - 1e-3) this.t = 0;
    const cur = this.stepAt(this.t);
    const st = this.timeline.steps[cur];
    // In step mode, pressing play at a finished step moves to the next one.
    if (this.stepMode && this.t >= st.tweenEnd - 1e-3) return this.seekStep(cur + 1, true);
    this.pauseAt = this.stepMode ? st.tweenEnd : null;
    this.play();
  }
  play() {
    this.playing = true;
    this.stage.classList.remove('paused');
    this.playBtn.innerHTML = `${ICONS.pause}<span>Pause</span>`;
    this.playBtn.setAttribute('aria-label', 'Pause');
    this.last = null;
  }
  pause() {
    this.playing = false;
    this.stage.classList.add('paused');
    const cur = this.stepAt(this.t);
    const st = this.timeline.steps[cur];
    const atEnd = this.t >= this.timeline.total - 1e-3;
    const stepDone = this.stepMode && this.t >= st.tweenEnd - 1e-3 && cur < this.timeline.steps.length - 1;
    if (this.hint) this.hint.textContent = atEnd ? 'Replay' : stepDone ? 'Next step' : 'Play';
    this.playBtn.innerHTML = `${ICONS.play}<span>Play</span>`;
    this.playBtn.setAttribute('aria-label', 'Play');
  }

  key(e) {
    if (e.target.matches('input, textarea')) return;
    if (e.key === ' ') { e.preventDefault(); this.toggle(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
    else if (e.key === 'r') this.replay();
    else if (e.key === 'm') this.setMirror(!this.mirror);
  }

  tick(ts) {
    this.raf = requestAnimationFrame((t2) => this.tick(t2));
    if (this.playing) {
      if (this.last == null) this.last = ts;
      const dt = Math.min(0.1, (ts - this.last) / 1000) * this.speed * (this.reduced ? 2 : 1);
      this.last = ts;
      this.t += dt;
      if (this.pauseAt != null && this.t >= this.pauseAt) { this.t = this.pauseAt; this.pause(); }
      if (this.t >= this.timeline.total) { this.t = this.timeline.total; this.pause(); }
      this.dirty = true;
    }
    if (!this.dirty) return;
    this.dirty = false;
    this.draw();
  }

  draw() {
    const state = poseAt(this.timeline, this.t);
    paintFrame(this.ctx, this.knot, state, { theme: this.theme, mirror: this.mirror, cw: this.cw, ch: this.cw, dpr: this.dpr });
    this.range.value = String(Math.round((this.t / this.timeline.total) * 1000));
    this.timeEl.textContent = `${this.t.toFixed(1)}s / ${this.timeline.total.toFixed(0)}s`;
    if (state.step !== this.lastStep) {
      this.lastStep = state.step;
      const s = this.knot.steps[state.step];
      this.captionH.textContent = `${state.step + 1}. ${s.title}`;
      this.captionP.textContent = s.text;
      this.pill.textContent = `Step ${state.step + 1} of ${this.knot.steps.length}`;
      this.root.querySelectorAll('.step-list button').forEach((b) => b.classList.toggle('now', +b.dataset.step === state.step));
      this.bar.querySelectorAll('button').forEach((b) => {
        const i = +b.dataset.step;
        b.classList.toggle('now', i === state.step);
        b.classList.toggle('done', i < state.step);
      });
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.ro.disconnect();
  }
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Static thumbnail of the finished knot for the home grid.
export function paintThumb(canvas, knot, theme) {
  const tl = buildTimeline(knot);
  const last = tl.steps[tl.steps.length - 1];
  const state = poseAt(tl, last.tweenEnd + 0.01);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 220;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(w * dpr);
  const ctx = canvas.getContext('2d');
  paintFrame(ctx, knot, { ...state, step: -1 }, { theme, cw: w, ch: w, dpr, showArrows: false, tipTrail: false });
}
