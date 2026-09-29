/**
 * API for user_hidden_sliders table.
 *
 * Architecture Notes:
 * - Domain: per-user visibility of the three journal score sliders
 *   (mood, effort, performance). Mirrors user_hidden_questions.
 * - RLS: users can only read/write their own rows.
 * - Hiding a slider removes it from the journal entry form (new + edit)
 *   and removes its tab from the calendar. Scores already saved are
 *   preserved and reappear if the slider is re-enabled.
 */

import { getSupabaseClient } from "../services/supabaseClient";
import { handleSupabaseError } from "./errors";

export type SliderKey = "mood" | "effort" | "performance";

export const SLIDER_KEYS: SliderKey[] = ["mood", "effort", "performance"];

export const SLIDER_LABELS: Record<SliderKey, string> = {
  mood: "Mood",
  effort: "Session effort",
  performance: "How well did you play",
};

/**
 * Get the current user's hidden slider keys.
 * Used to filter sliders out of journals and calendar tabs.
 */
export async function getHiddenSliderKeys(): Promise<Set<string>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("user_hidden_sliders")
    .select("slider_key");

  if (error) {
    throw handleSupabaseError(error);
  }

  return new Set((data || []).map((row) => row.slider_key as string));
}

/**
 * Hide a slider for the current user. Any scores already saved to that
 * slider are preserved; it just stops appearing in journals and the calendar.
 * RLS scopes the row to the current user.
 */
export async function hideSlider(sliderKey: SliderKey): Promise<void> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be signed in to customize sliders.");
  }

  const { error } = await supabase.from("user_hidden_sliders").upsert(
    { user_id: user.id, slider_key: sliderKey },
    { onConflict: "user_id,slider_key" }
  );

  if (error) {
    throw handleSupabaseError(error);
  }
}

/**
 * Re-enable a hidden slider for the current user.
 */
export async function unhideSlider(sliderKey: SliderKey): Promise<void> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("user_hidden_sliders")
    .delete()
    .eq("user_id", user.id)
    .eq("slider_key", sliderKey);

  if (error) {
    throw handleSupabaseError(error);
  }
}
