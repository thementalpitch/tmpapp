import { moodScoreColor } from "./scoreColors";

/**
 * Smooth ring / accent color for a 1-10 mood score.
 * Uses the app-wide shared 5-stop scale (dark red -> bright green).
 */
export function moodColorForScore(score: number): string {
  return moodScoreColor(score);
}
