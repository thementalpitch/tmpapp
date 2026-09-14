/**
 * API for notification_preferences table.
 * 
 * Architecture Notes:
 * - Domain: User notification settings
 * - RLS: Users can only access their own preferences
 * - Operations: Read/upsert preferences, create default on first access
 * - Defaults: Disabled, 6 PM daily, all days
 * - reminder_times: local wall-clock HH:MM; timezone: IANA string — not stored as UTC
 */

import { getSupabaseClient } from "../services/supabaseClient";
import type {
  NotificationPreferences,
  NotificationPreferencesInsert,
  NotificationPreferencesUpdate,
  NotificationToken,
  NotificationTokenUpsert,
} from "./types";
import { getDeviceTimezone, normalizeReminderTimeLocal } from "../utils/timezone";
import { handleSupabaseError } from "./errors";

export const DEFAULT_DAILY_REMINDER_TIMES: Record<string, string> = {
  "0": "18:00",
  "1": "18:00",
  "2": "18:00",
  "3": "18:00",
  "4": "18:00",
  "5": "18:00",
  "6": "18:00",
};

/** Convert legacy day/time arrays into the per-day schedule used by the UI. */
export function resolveDailyReminderTimes(
  preferences: Pick<
    NotificationPreferences,
    "daily_reminder_times" | "reminder_days" | "reminder_times"
  >
): Record<string, string> {
  if (preferences.daily_reminder_times != null) {
    return Object.fromEntries(
      Object.entries(preferences.daily_reminder_times).map(([day, time]) => [
        day,
        normalizeReminderTimeLocal(time),
      ])
    );
  }

  const fallbackTime = normalizeReminderTimeLocal(
    preferences.reminder_times?.[0] || "18:00"
  );
  return Object.fromEntries(
    (preferences.reminder_days?.length
      ? preferences.reminder_days
      : [0, 1, 2, 3, 4, 5, 6]
    ).map((day) => [String(day), fallbackTime])
  );
}

/**
 * Get the current user's notification preferences.
 * Creates default preferences if they don't exist.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    const defaultPrefs: NotificationPreferencesInsert = {
      user_id: user.id,
      enabled: false,
      reminder_times: ["18:00"],
      reminder_days: [0, 1, 2, 3, 4, 5, 6],
      daily_reminder_times: DEFAULT_DAILY_REMINDER_TIMES,
      timezone: getDeviceTimezone(),
      streak_reminders: true,
      mood_insights: true,
    };

    const { error: upsertError } = await supabase
      .from("notification_preferences")
      .upsert(defaultPrefs, { onConflict: "user_id", ignoreDuplicates: true });

    if (upsertError) {
      throw handleSupabaseError(upsertError);
    }

    const { data: created, error: refetchError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (refetchError) {
      throw handleSupabaseError(refetchError);
    }

    return created;
  }

  return data;
}

/** Keep stored timezone aligned with the device when it changes (travel, DST). */
export async function syncNotificationTimezone(): Promise<NotificationPreferences> {
  const prefs = await getNotificationPreferences();
  const tz = getDeviceTimezone();
  if (prefs.timezone === tz) {
    return prefs;
  }
  return updateNotificationPreferences({ timezone: tz });
}

/**
 * Upsert notification preferences.
 * Reminder times are stored as local HH:MM; timezone is always refreshed on save.
 */
export async function updateNotificationPreferences(
  updates: NotificationPreferencesUpdate
): Promise<NotificationPreferences> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const normalizedUpdates: NotificationPreferencesUpdate = {
    ...updates,
    timezone: updates.timezone ?? getDeviceTimezone(),
  };

  if (updates.reminder_times?.length) {
    normalizedUpdates.reminder_times = updates.reminder_times.map(normalizeReminderTimeLocal);
  }

  if (updates.daily_reminder_times) {
    normalizedUpdates.daily_reminder_times = Object.fromEntries(
      Object.entries(updates.daily_reminder_times).map(([day, time]) => [
        day,
        normalizeReminderTimeLocal(time),
      ])
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        ...normalizedUpdates,
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  return data;
}

export async function upsertNotificationToken(
  input: NotificationTokenUpsert
): Promise<NotificationToken> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase.rpc("register_expo_push_token", {
    p_expo_push_token: input.expo_push_token,
    p_device_id: input.device_id ?? null,
    p_platform: input.platform ?? null,
    p_app_version: input.app_version ?? null,
  });

  if (!error) {
    return data as NotificationToken;
  }

  const rpcMissing =
    error.message?.includes("function") || error.message?.includes("does not exist");
  if (!rpcMissing) {
    throw handleSupabaseError(error);
  }

  const now = new Date().toISOString();
  const { data: fallback, error: upsertError } = await supabase
    .from("notification_tokens")
    .upsert(
      {
        user_id: user.id,
        ...input,
        enabled: input.enabled ?? true,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: "expo_push_token" }
    )
    .select()
    .single();

  if (upsertError) {
    throw handleSupabaseError(upsertError);
  }

  return fallback;
}

/** Disable push tokens for the signed-in user (call before sign-out). */
export async function deactivateUserNotificationTokens(): Promise<void> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("notification_tokens")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    console.warn("Could not deactivate notification tokens:", error.message);
  }
}
