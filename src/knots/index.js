// index.js: every knot in the archive. Order within a category is the order on the home page.
// stoppers
import overhand from './overhand.js';
// loops
import bowline from './bowline.js';
// hitches
import cloveHitch from './clove-hitch.js';

export const KNOTS = [
  // stoppers
  overhand,
  // loops
  bowline,
  // hitches
  cloveHitch,
];
export const KNOT_BY_ID = Object.fromEntries(KNOTS.map((k) => [k.id, k]));
