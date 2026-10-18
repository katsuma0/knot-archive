# Knot Archive

Outdoor knots, each animated from a model of the rope so every crossing is exact. Built for a phone in the backcountry: it installs as an app and works with no signal.

Open `index.html` from any static host (GitHub Pages works as is). There is no build step. Playback runs on a 2D canvas; the rope is a spline with a depth value at every point, the renderer finds every crossing, cuts the rope into pieces and paints them back to front with an outline at each crossing.

## Run it locally

```
npx serve .          # or any static server
```

Opening the file directly also works, but the offline cache only registers over http(s).

## Add or fix a knot

Read `docs/AUTHORING.md`. Each knot is one file in `src/knots/`. Render and lint it with

```
node tools/render.mjs src/knots/bowline.js --out renders/bowline
node tools/check.mjs
```

`tools/render.mjs` writes a contact sheet of every step and the frames between, so you can see the animation without a browser. After changing any file under `src/`, `icons/` or the root, run `node tools/build-sw.mjs` so the service worker's asset list and version update.

## Layout

```
index.html, styles.css      shell
src/app.js                  router, home grid, knot page
src/player.js               the animated viewer and its controls
src/anim.js                 timeline: steps, frames, easing
src/scene.js                paints one frame: view fit, overlays, themes
src/rope.js                 the rope renderer: spline, crossings, depth order, props
src/knots/_lib.js           helpers for writing poses
src/knots/*.js              one file per knot
src/knots/index.js          the list
tools/                      render, lint, screenshots, icons, service worker manifest
sw.js, sw-assets.js         offline cache
```
