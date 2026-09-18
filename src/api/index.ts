/**
 * Central export point for all API modules.
 * 
 * Architecture Note: Barrel export pattern enables clean imports:
 *   import { getJournalEntries, createEntry } from '@/api'
 * 
 * This keeps the API surface discoverable and maintains clear boundaries.
 */

// Types
export * from "./types";

// Errors
export * from "./errors";

// Domain APIs
export * from "./workoutTypes";
export * from "./journalQuestions";
export * from "./journalEntries";
export * from "./journalAnswers";
export * from "./foodMeals";
export * from "./profiles";
export * from "./stats";
export * from "./notificationPreferences";
export * from "./account";
