/**
 * One shared color scale for every 1-10 / 0-10 score in the app
 * (calendar Mood / Intensity / Performance tabs, mood rings, ...).
 *
 * Five stops: dark red -> dark orange -> light orange -> faded green
 * -> bright green. Hues are tuned to stay vivid on the dark UI while
 * keeping the white date/score text on calendar cells readable.
 */

type Rgb = { r: number; g: number; b: number };

const STOPS: Rgb[] = [
  { r: 153, g: 27, b: 27 }, // dark red
  { r: 196, g: 106, b: 24 }, // dark orange
  { r: 238, g: 150, b: 60 }, // light orange
  { r: 126, g: 166, b: 108 }, // faded green
  { r: 30, g: 174, b: 84 }, // bright green
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Map a score within [min, max] onto the shared 5-stop scale. */
export function scoreColor(score: number, min: number, max: number): string {
  const s = Math.min(max, Math.max(min, score));
  const t = max === min ? 0 : (s - min) / (max - min);
  const seg = t * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(seg));
  const f = seg - i;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const r = Math.round(lerp(a.r, b.r, f));
  const g = Math.round(lerp(a.g, b.g, f));
  const bl = Math.round(lerp(a.b, b.b, f));
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Mood scores run 1-10. */
export function moodScoreColor(score: number): string {
  return scoreColor(score, 1, 10);
}

/** Intensity (RPE) scores run 0-10. */
export function intensityScoreColor(score: number): string {
  return scoreColor(score, 0, 10);
}

/** Performance scores run 1-10. */
export function performanceScoreColor(score: number): string {
  return scoreColor(score, 1, 10);
}
