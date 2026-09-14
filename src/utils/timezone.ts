/**
 * Device IANA timezone for server-side reminder scheduling.
 *
 * Reminder times are stored as local wall-clock "HH:MM" (24h), not converted to UTC.
 * The server interprets them with this timezone (see get_due_journal_reminders).
 * Same idea as journal entry_date: calendar date in the user's local context.
 */
export function getDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && tz.length > 0 ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

/** Normalize reminder time picker value to 24h HH:MM (local wall clock). */
export function normalizeReminderTimeLocal(time: string): string {
  const [h, m] = time.split(":");
  const hour = Math.min(23, Math.max(0, Number(h) || 0));
  const minute = Math.min(59, Math.max(0, Number(m) || 0));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
