// data.js: categories in display order.
export const CATEGORIES = [
  { id: 'stoppers', name: 'Stoppers', blurb: 'Knots that stop a rope end running through something.' },
  { id: 'loops', name: 'Loops', blurb: 'Fixed loops that do not slip under load.' },
  { id: 'hitches', name: 'Hitches', blurb: 'Tie a rope to a post, a tree, a ring or a pole.' },
  { id: 'bends', name: 'Bends', blurb: 'Join two ropes together.' },
  { id: 'binding', name: 'Binding', blurb: 'Cinch a bundle or a bag closed.' },
  { id: 'friction', name: 'Friction', blurb: 'Grip a rope so a cord holds, slides or brakes.' },
  { id: 'lashings', name: 'Lashings', blurb: 'Hold poles together for shelters and frames.' },
  { id: 'fishing', name: 'Fishing', blurb: 'Line to hook, line to line, line to reel.' },
  { id: 'rope-care', name: 'Rope care', blurb: 'Coil, store and finish rope so it is ready next time.' },
];
export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export const DIFFICULTY = ['', 'Easy', 'Simple', 'Moderate', 'Fiddly', 'Hard'];
