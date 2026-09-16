/**
 * API for journal_questions table.
 * 
 * Architecture Notes:
 * - Domain: Configuration data (question templates)
 * - RLS: Users can read system defaults + their own custom questions
 * - Relationships: Many-to-one with workout_types (optional)
 * - Operations: Read-heavy, write for customization
 */

import { getSupabaseClient } from "../services/supabaseClient";
import type {
  JournalQuestion,
  JournalQuestionInsert,
  JournalQuestionUpdate,
  JournalQuestionWithWorkoutType,
} from "./types";
import { handleSupabaseError, NotFoundError } from "./errors";

/**
 * Get all journal questions available to the current user.
 * Includes system defaults + user's custom questions.
 * 
 * Architecture Note: Single query with RLS filtering.
 */
export async function getJournalQuestions(): Promise<JournalQuestion[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_questions")
    .select("*")
    .is("retired_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw handleSupabaseError(error);
  }

  return data || [];
}

/**
 * Get questions for a specific workout type.
 * 
 * Architecture Note: Indexed query (workout_type_id, sort_order) for performance.
 */
export async function getQuestionsByWorkoutType(
  workoutTypeId: string
): Promise<JournalQuestion[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_questions")
    .select("*")
    .eq("workout_type_id", workoutTypeId)
    .is("retired_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    throw handleSupabaseError(error);
  }

  return data || [];
}

/**
 * Get the current user's hidden question IDs.
 * Used to filter questions the user chose to hide in settings.
 */
export async function getHiddenQuestionIds(): Promise<string[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("user_hidden_questions")
    .select("question_id");

  if (error) {
    throw handleSupabaseError(error);
  }

  return (data || []).map((row) => row.question_id as string);
}

/**
 * Hide a question for the current user. The question (and any answers
 * already written to it) is preserved; it just stops appearing in journals.
 * RLS scopes the row to the current user.
 */
export async function hideQuestion(questionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be signed in to customize questions.");
  }

  const { error } = await supabase.from("user_hidden_questions").upsert(
    { user_id: user.id, question_id: questionId },
    { onConflict: "user_id,question_id" }
  );

  if (error) {
    throw handleSupabaseError(error);
  }
}

/**
 * Re-enable a hidden question for the current user.
 */
export async function unhideQuestion(questionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("user_hidden_questions")
    .delete()
    .eq("user_id", user.id)
    .eq("question_id", questionId);

  if (error) {
    throw handleSupabaseError(error);
  }
}

/**
 * Get questions for a workout type, excluding ones the current user hid.
 * This is what journal screens render.
 */
export async function getVisibleQuestionsByWorkoutType(
  workoutTypeId: string
): Promise<JournalQuestion[]> {
  const [questions, hiddenIds] = await Promise.all([
    getQuestionsByWorkoutType(workoutTypeId),
    getHiddenQuestionIds().catch(() => [] as string[]),
  ]);

  if (hiddenIds.length === 0) {
    return questions;
  }

  const hidden = new Set(hiddenIds);
  return questions.filter((question) => !hidden.has(question.id));
}

/**
 * Get questions with workout type names (for display).
 * 
 * Architecture Note: Join query to avoid N+1 when displaying question lists.
 */
export async function getQuestionsWithWorkoutTypes(): Promise<
  JournalQuestionWithWorkoutType[]
> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_questions")
    .select(
      `
      *,
      workout_types:workout_type_id (
        name
      )
    `
    )
    .is("retired_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    throw handleSupabaseError(error);
  }

  return (
    data?.map((q) => ({
      ...q,
      workout_type_name:
        q.workout_types && Array.isArray(q.workout_types)
          ? q.workout_types[0]?.name ?? null
          : null,
    })) || []
  );
}

/**
 * Get system default questions for a workout type.
 * 
 * Architecture Note: Used for initial question setup and defaults.
 */
export async function getSystemQuestionsByWorkoutType(
  workoutTypeId: string
): Promise<JournalQuestion[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_questions")
    .select("*")
    .eq("workout_type_id", workoutTypeId)
    .is("owner_id", null)
    .eq("is_system_default", true)
    .is("retired_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    throw handleSupabaseError(error);
  }

  return data || [];
}

/**
 * Get generic questions (not tied to a specific workout type).
 * 
 * Architecture Note: workout_type_id = null indicates generic questions.
 */
export async function getGenericQuestions(): Promise<JournalQuestion[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_questions")
    .select("*")
    .is("workout_type_id", null)
    .is("retired_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    throw handleSupabaseError(error);
  }

  return data || [];
}

/**
 * Get a single question by ID.
 */
export async function getQuestionById(
  id: string
): Promise<JournalQuestion> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_questions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new NotFoundError("JournalQuestion", id);
  }

  return data;
}

/**
 * Create a custom question for the current user.
 * 
 * Architecture Note: RLS ensures owner_id = auth.uid() and is_system_default = false.
 */
export async function createQuestion(
  input: JournalQuestionInsert
): Promise<JournalQuestion> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_questions")
    .insert({
      ...input,
      is_system_default: false,
    })
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new Error("Failed to create question");
  }

  return data;
}

/**
 * Update a user's custom question.
 */
export async function updateQuestion(
  id: string,
  input: JournalQuestionUpdate
): Promise<JournalQuestion> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("journal_questions")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new NotFoundError("JournalQuestion", id);
  }

  return data;
}

/**
 * Delete a user's custom question.
 * 
 * Architecture Note: Cascade delete will remove associated answers (if any).
 */
export async function deleteQuestion(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("journal_questions")
    .delete()
    .eq("id", id);

  if (error) {
    throw handleSupabaseError(error);
  }
}

/**
 * Bulk create questions (useful for importing/customization).
 * 
 * Architecture Note: Transaction-like behavior via single insert array.
 */
export async function createQuestions(
  inputs: JournalQuestionInsert[]
): Promise<JournalQuestion[]> {
  const supabase = getSupabaseClient();

  const questionsToInsert = inputs.map((input) => ({
    ...input,
    is_system_default: false,
  }));

  const { data, error } = await supabase
    .from("journal_questions")
    .insert(questionsToInsert)
    .select();

  if (error) {
    throw handleSupabaseError(error);
  }

  return data || [];
}
