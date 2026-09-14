/**
 * API for journal_entries table.
 * 
 * Architecture Notes:
 * - Domain: Core data (user journal entries)
 * - RLS: Users can only access their own entries
 * - Relationships: Many-to-one with workout_types, one-to-many with answers
 * - Operations: CRUD-heavy, read patterns include date ranges and workout types
 * - Indexes: (user_id, entry_date desc), (workout_type_id, entry_date desc)
 */

import { getSupabaseClient } from "../services/supabaseClient";
import type {
  JournalEntry,
  JournalEntryInsert,
  JournalEntryUpdate,
  JournalEntryWithWorkoutType,
  JournalEntryWithAnswers,
  DailyMoodAverage,
} from "./types";
import { handleSupabaseError, NotFoundError, ValidationError } from "./errors";
import { toISODateLocal } from "../utils/date";

function validateRating(value: number | null | undefined, field: string, minimum: number) {
  if (value != null && (!Number.isInteger(value) || value < minimum || value > 10)) {
    throw new ValidationError(`${field} must be between ${minimum} and 10`, field);
  }
}

/**
 * Get all journal entries for the current user.
 * 
 * Architecture Note: RLS automatically filters to user's entries.
 */
export async function getJournalEntries(): Promise<JournalEntry[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("entry_time", { ascending: false });

  if (error) {
    throw handleSupabaseError(error);
  }

  return data || [];
}

/**
 * Get journal entries with workout type names (for list views).
 * 
 * Architecture Note: Join query to avoid N+1 when displaying entry lists.
 */
export async function getEntriesWithWorkoutTypes(): Promise<
  JournalEntryWithWorkoutType[]
> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .select(
      `
      *,
      workout_types:workout_type_id (
        name
      )
    `
    )
    .order("entry_date", { ascending: false })
    .order("entry_time", { ascending: false });

  if (error) {
    throw handleSupabaseError(error);
  }

  return (
    data?.map((entry) => ({
      ...entry,
      workout_type_name:
        entry.workout_types && Array.isArray(entry.workout_types)
          ? entry.workout_types[0]?.name ?? null
          : null,
    })) || []
  );
}

/**
 * Get entries for a specific date range.
 * 
 * Architecture Note: Indexed query (user_id, entry_date) for performance.
 */
export async function getEntriesByDateRange(
  startDate: string, // ISO 8601 date (YYYY-MM-DD)
  endDate: string
): Promise<JournalEntry[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .gte("entry_date", startDate)
    .lte("entry_date", endDate)
    .order("entry_date", { ascending: false })
    .order("entry_time", { ascending: false });

  if (error) {
    throw handleSupabaseError(error);
  }

  return data || [];
}

/**
 * Get entries for a specific workout type.
 * 
 * Architecture Note: Indexed query (workout_type_id, entry_date desc).
 */
export async function getEntriesByWorkoutType(
  workoutTypeId: string
): Promise<JournalEntry[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("workout_type_id", workoutTypeId)
    .order("entry_date", { ascending: false })
    .order("entry_time", { ascending: false });

  if (error) {
    throw handleSupabaseError(error);
  }

  return data || [];
}

/**
 * Get entries for a specific date.
 * 
 * Architecture Note: Useful for daily journal views.
 */
export async function getEntriesByDate(
  date: string // ISO 8601 date (YYYY-MM-DD)
): Promise<JournalEntry[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("entry_date", date)
    .order("entry_time", { ascending: false });

  if (error) {
    throw handleSupabaseError(error);
  }

  return data || [];
}

/**
 * Get the average mood score for a single day.
 *
 * Architecture Note:
 * - Implemented in application code to keep SQL simple and portable.
 * - Returns null when there are no mood scores for the day.
 */
export async function getAverageMoodForDay(
  date: string
): Promise<number | null> {
  const entries = await getEntriesByDate(date);
  const scores = entries
    .map((e) => e.mood_score)
    .filter((score): score is number => score !== null);

  if (scores.length === 0) {
    return null;
  }

  const sum = scores.reduce((acc, value) => acc + value, 0);
  return sum / scores.length;
}

/**
 * Get average mood scores for each day in a given month.
 *
 * Architecture Notes:
 * - Returns one record per calendar day that has at least one mood score.
 * - Useful for plotting mood over time in charts.
 */
export async function getDailyMoodAveragesForMonth(
  year: number,
  month: number // 1-12 (calendar month)
): Promise<DailyMoodAverage[]> {
  // Compute ISO date range for the month
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month

  const startDate = toISODateLocal(start);
  const endDate = toISODateLocal(end);

  const entries = await getEntriesByDateRange(startDate, endDate);

  const byDate: Record<string, number[]> = {};
  for (const entry of entries) {
    if (entry.mood_score == null) continue;
    if (!byDate[entry.entry_date]) {
      byDate[entry.entry_date] = [];
    }
    byDate[entry.entry_date].push(entry.mood_score);
  }

  const dates = Object.keys(byDate).sort();

  const result: DailyMoodAverage[] = dates.map((dateKey) => {
    const scores = byDate[dateKey];
    if (!scores || scores.length === 0) {
      return { date: dateKey, average_mood: null };
    }
    const sum = scores.reduce((acc, value) => acc + value, 0);
    return { date: dateKey, average_mood: sum / scores.length };
  });

  return result;
}

/**
 * Get a single entry by ID.
 */
export async function getEntryById(id: string): Promise<JournalEntry> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new NotFoundError("JournalEntry", id);
  }

  return data;
}

/**
 * Get entry with all answers and questions (full detail view).
 * 
 * Architecture Note: Complex join query for entry detail pages.
 * Fetches entry + all answers + their questions in one query.
 */
export async function getEntryWithAnswers(
  id: string
): Promise<JournalEntryWithAnswers> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .select(
      `
      *,
      journal_entry_answers (
        id,
        question_id,
        answer_text,
        created_at,
        journal_questions (
          id,
          prompt,
          help_text,
          sort_order
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new NotFoundError("JournalEntry", id);
  }

  // Transform nested structure to match our type
  const answers = (data.journal_entry_answers || []).map((answer: any) => ({
    id: answer.id,
    entry_id: id,
    question_id: answer.question_id,
    answer_text: answer.answer_text,
    created_at: answer.created_at,
    question:
      answer.journal_questions && Array.isArray(answer.journal_questions)
        ? answer.journal_questions[0]
        : null,
  }));

  return {
    ...data,
    answers,
  } as JournalEntryWithAnswers;
}

/**
 * Create a new journal entry.
 * 
 * Architecture Note:
 * - user_id defaults to auth.uid() via RLS
 * - entry_date defaults to current_date
 * - Returns created entry for immediate use
 */
export async function createEntry(
  input: JournalEntryInsert
): Promise<JournalEntry> {
  const supabase = getSupabaseClient();

  validateRating(input.mood_score, "mood_score", 1);
  validateRating(input.rpe_score, "rpe_score", 0);

  const { data, error } = await supabase
    .from("journal_entries")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new Error("Failed to create journal entry");
  }

  return data;
}

/**
 * Update an existing journal entry.
 * 
 * Architecture Note: RLS ensures user can only update their own entries.
 */
export async function updateEntry(
  id: string,
  input: JournalEntryUpdate
): Promise<JournalEntry> {
  const supabase = getSupabaseClient();

  validateRating(input.mood_score, "mood_score", 1);
  validateRating(input.rpe_score, "rpe_score", 0);

  const { data, error } = await supabase
    .from("journal_entries")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new NotFoundError("JournalEntry", id);
  }

  return data;
}

/**
 * Delete a journal entry.
 * 
 * Architecture Note:
 * - RLS ensures user can only delete their own entries
 * - Cascade delete removes associated answers and food_meals
 */
export async function deleteEntry(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id);

  if (error) {
    throw handleSupabaseError(error);
  }
}

/**
 * Get recent entries (last N entries).
 * 
 * Architecture Note: Pagination-friendly query for home feeds.
 */
export async function getRecentEntries(
  limit: number = 10
): Promise<JournalEntry[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("entry_time", { ascending: false })
    .limit(limit);

  if (error) {
    throw handleSupabaseError(error);
  }

  return data || [];
}
