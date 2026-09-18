/**
 * TypeScript types for all database tables.
 * These types mirror the PostgreSQL schema defined in the db/ migrations.
 * 
 * Architecture Note: Centralized type definitions ensure consistency
 * across all API modules and enable compile-time type checking.
 */

export type UUID = string;

// ============================================================================
// Workout Types
// ============================================================================

export interface WorkoutType {
  id: UUID;
  owner_id: UUID | null; // null = system default
  name: string;
  description: string | null;
  sort_order: number;
  is_system_default: boolean;
  created_at: string; // ISO 8601 timestamptz
}

export interface WorkoutTypeInsert {
  owner_id?: UUID | null;
  name: string;
  description?: string | null;
  sort_order?: number;
  is_system_default?: boolean;
}

export interface WorkoutTypeUpdate {
  name?: string;
  description?: string | null;
  sort_order?: number;
}

// ============================================================================
// Journal Questions
// ============================================================================

export interface JournalQuestion {
  id: UUID;
  owner_id: UUID | null; // null = system default
  workout_type_id: UUID | null; // null = generic question
  prompt: string;
  help_text: string | null;
  is_required: boolean;
  sort_order: number;
  is_system_default: boolean;
  retired_at: string | null;
  created_at: string;
}

export interface JournalQuestionInsert {
  owner_id?: UUID | null;
  workout_type_id?: UUID | null;
  prompt: string;
  help_text?: string | null;
  is_required?: boolean;
  sort_order?: number;
  is_system_default?: boolean;
}

export interface JournalQuestionUpdate {
  prompt?: string;
  help_text?: string | null;
  is_required?: boolean;
  sort_order?: number;
}

// Per-user question visibility (user_hidden_questions table).
// Hiding preserves the question and its answers; it just stops appearing
// in that user's journals until re-enabled.
export interface UserHiddenQuestion {
  user_id: UUID;
  question_id: UUID;
  hidden_at: string;
}

// ============================================================================
// Journal Entries
// ============================================================================

export interface JournalEntry {
  id: UUID;
  user_id: UUID;
  workout_type_id: UUID | null;
  entry_date: string; // ISO 8601 date (YYYY-MM-DD)
  entry_time: string | null; // ISO 8601 time with timezone
  title: string | null;
  notes: string | null;
  mood_score: number | null; // 1-10
  rpe_score: number | null; // 0-10
  created_at: string;
  updated_at: string;
}

export interface JournalEntryInsert {
  user_id?: UUID; // defaults to auth.uid()
  workout_type_id?: UUID | null;
  entry_date?: string; // defaults to current_date
  entry_time?: string | null;
  title?: string | null;
  notes?: string | null;
  mood_score?: number | null; // 1-10
  rpe_score?: number | null; // 0-10
}

export interface JournalEntryUpdate {
  workout_type_id?: UUID | null;
  entry_date?: string;
  entry_time?: string | null;
  title?: string | null;
  notes?: string | null;
  mood_score?: number | null; // 1-10
  rpe_score?: number | null; // 0-10
}

// ============================================================================
// Journal Entry Answers
// ============================================================================

export interface JournalEntryAnswer {
  id: UUID;
  entry_id: UUID;
  question_id: UUID;
  answer_text: string | null;
  created_at: string;
}

export interface JournalEntryAnswerInsert {
  entry_id: UUID;
  question_id: UUID;
  answer_text?: string | null;
}

export interface JournalEntryAnswerUpdate {
  answer_text?: string | null;
}

// ============================================================================
// Food Meals
// ============================================================================

export type MealType = "Breakfast" | "Lunch" | "Snack" | "Dinner";

export interface FoodMeal {
  id: UUID;
  entry_id: UUID;
  meal_type: MealType;
  time_of_day: string | null; // ISO 8601 time with timezone (nullable)
  food_items: string;
  feeling_notes: string | null;
  created_at: string;
}

export interface FoodMealInsert {
  entry_id: UUID;
  meal_type: MealType;
  time_of_day?: string | null; // Optional - no longer required for food entries
  food_items: string;
  feeling_notes?: string | null;
}

export interface FoodMealUpdate {
  meal_type?: MealType;
  time_of_day?: string;
  food_items?: string;
  feeling_notes?: string | null;
}

// ============================================================================
// Profiles
// ============================================================================

export interface Profile {
  id: UUID; // 1:1 with auth.users.id
  created_at: string;
  updated_at: string;
  first_name: string | null;
  last_name: string | null;
  preferred_sport: string | null;
  preferred_position: string | null;
}

export interface ProfileInsert {
  id: UUID; // must match auth.users.id
  first_name?: string | null;
  last_name?: string | null;
  preferred_sport?: string | null;
  preferred_position?: string | null;
}

export interface ProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  preferred_sport?: string | null;
  preferred_position?: string | null;
}

// ============================================================================
// Extended Types (with joins)
// ============================================================================

/**
 * Journal entry with related workout type name (for display).
 * Architecture Note: Denormalized for common read patterns to avoid N+1 queries.
 */
export interface JournalEntryWithWorkoutType extends JournalEntry {
  workout_type_name: string | null;
}

/**
 * Journal entry with all answers and their questions.
 * Architecture Note: Used for full entry detail views.
 */
export interface JournalEntryWithAnswers extends JournalEntry {
  answers: (JournalEntryAnswer & { question: JournalQuestion })[];
}

/**
 * Journal question with workout type name.
 * Architecture Note: Useful for question lists with context.
 */
export interface JournalQuestionWithWorkoutType extends JournalQuestion {
  workout_type_name: string | null;
}

/**
 * Aggregated average mood for a single calendar day.
 */
export interface DailyMoodAverage {
  date: string; // ISO 8601 date (YYYY-MM-DD)
  average_mood: number | null;
}

// ============================================================================
// Statistics Types
// ============================================================================

export type StatsPeriod = "week" | "month" | "year";

export interface MoodTrendPoint {
  date: string; // ISO 8601 date (YYYY-MM-DD)
  averageMood: number | null;
  entryCount: number;
}

export interface StreakData {
  currentStreak: number; // Consecutive days with at least one entry
  longestStreak: number;
  totalDaysWithEntries: number;
}

export interface WorkoutTypeStats {
  workoutTypeId: string;
  workoutTypeName: string;
  entryCount: number;
  averageMood: number | null;
  percentage: number; // Percentage of total entries
}

export interface TimePatternStats {
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  averageMood: number | null;
  entryCount: number;
}

export interface StatsSummary {
  period: StatsPeriod;
  totalEntries: number;
  averageMood: number | null;
  moodTrend: "improving" | "declining" | "stable";
  mostActiveWorkoutType: string | null;
  streakData: StreakData;
}

export interface StatsData {
  summary: StatsSummary;
  moodTrends: MoodTrendPoint[];
  workoutTypeDistribution: WorkoutTypeStats[];
  timePatterns: TimePatternStats[];
  insights: string[];
}

// ============================================================================
// Notification Preferences
// ============================================================================

export interface NotificationPreferences {
  id: string;
  user_id: string;
  enabled: boolean;
  reminder_times: string[]; // Local wall-clock "HH:MM" (24h), not UTC — use with timezone
  reminder_days: number[]; // Array of day numbers: 0=Sunday, 1=Monday, ..., 6=Saturday
  daily_reminder_times: Record<string, string>; // Day number to local wall-clock "HH:MM"
  timezone: string; // IANA timezone, e.g. America/Los_Angeles
  streak_reminders: boolean;
  mood_insights: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferencesInsert {
  user_id?: string; // defaults to auth.uid()
  enabled?: boolean;
  reminder_times?: string[];
  reminder_days?: number[];
  daily_reminder_times?: Record<string, string>;
  timezone?: string;
  streak_reminders?: boolean;
  mood_insights?: boolean;
}

export interface NotificationPreferencesUpdate {
  enabled?: boolean;
  reminder_times?: string[];
  reminder_days?: number[];
  daily_reminder_times?: Record<string, string>;
  timezone?: string;
  streak_reminders?: boolean;
  mood_insights?: boolean;
}

export interface NotificationToken {
  id: string;
  user_id: string;
  expo_push_token: string;
  device_id: string | null;
  platform: string | null;
  app_version: string | null;
  enabled: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationTokenUpsert {
  expo_push_token: string;
  device_id?: string | null;
  platform?: string | null;
  app_version?: string | null;
  enabled?: boolean;
}

// ============================================================================
// Profile Stats Summary
// ============================================================================

export interface ProfileStatsSummary {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  averageMood: number | null;
  mostActiveWorkoutType: string | null;
}
