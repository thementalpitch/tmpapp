type Rgb = { r: number; g: number; b: number };

const STOPS: { score: number; color: Rgb }[] = [
  { score: 1, color: { r: 248, g: 113, b: 113 } }, // red
  { score: 4, color: { r: 251, g: 191, b: 36 } }, // amber
  { score: 6.5, color: { r: 56, g: 189, b: 248 } }, // sky
  { score: 10, color: { r: 52, g: 211, b: 153 } }, // emerald
];

function hex(rgb: Rgb): string {
  const c = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${c(rgb.r)}${c(rgb.g)}${c(rgb.b)}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

/** Smooth ring / accent color for a 1–10 mood score. */
export function moodColorForScore(score: number): string {
  const s = Math.max(1, Math.min(10, score));

  for (let i = 0; i < STOPS.length - 1; i++) {
    const left = STOPS[i];
    const right = STOPS[i + 1];
    if (s <= right.score) {
      const span = right.score - left.score;
      const t = span === 0 ? 0 : (s - left.score) / span;
      return hex(lerpRgb(left.color, right.color, t));
    }
  }

  return hex(STOPS[STOPS.length - 1].color);
}
