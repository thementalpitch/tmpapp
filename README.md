# The MentalPitch

## Local setup & environment

### 1. Required tools

- Node.js (current LTS)
- `pnpm` (package manager)
- Expo CLI (used via `pnpm` scripts)

### 2. Environment variables

The app expects the Supabase project details to be provided via Expo public env vars:

- `EXPO_PUBLIC_SUPABASE_URL` – your Supabase project URL (e.g. `https://xxxx.supabase.co`)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` – your Supabase **anon** public key

You can set these in one of the following ways:

- `.env` file at the project root (used by Expo CLI), for example:

  ```env
  EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```

- or as environment variables in your shell / CI.

These values are surfaced to the app via `app.config.ts` (`extra.supabaseUrl` / `extra.supabaseAnonKey`) and then read by `config/config.ts`.

---

## Running the app locally

1. Install dependencies:
   - `pnpm install`
2. Ensure env vars are set (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
3. Start the Expo dev server:
   - `pnpm start`
4. Open on device or simulator using the QR code / platform shortcut.
5. You should see the temporary loading screen, then the welcome screen.

---

# Mental Pitch - Journal Entry Types & Questions

This document outlines all journal/workout entry types available in the Mental Pitch application, along with their default questions and data structures.

---

## Table of Contents
1. [Training](#1-training)
2. [Rehab](#2-rehab)
3. [Lift](#3-lift)
4. [Game](#4-game)
5. [Food](#5-food)
6. [Imagery](#6-imagery)

---

## 1. Training

**Type identifier:** `Training`  
**Settings page:** `TrainingQuestions.tsx`  
**Journal page:** `TrainingJournal.tsx`  
**LocalStorage key:** `trainingQuestions`

Training journals have two phases. Questions 1-3 are completed before training, then the remaining questions are completed afterward.

### Pre-training Questions

| ID | Question | Enabled by Default |
|----|----------|-------------------|
| 1 | What aspect of my game do I want to focus on today? | ✅ Yes |
| 2 | What could potentially distract me from staying focused? | ✅ Yes |
| 3 | How will I refocus after getting distracted? | ✅ Yes |

### Post-training Questions

| ID | Question | Enabled by Default |
|----|----------|-------------------|
| 1 | Did I feel focused during practice today? | ✅ Yes |
| 2 | What were distracting external factors for me during training? | ✅ Yes |
| 3 | What weakness in my game do I want to work on? | ✅ Yes |
| 4 | Write down what I did well today, and my "play of the day": | ✅ Yes |
| 5 | What'd I do when I first woke up this morning to set a positive tone for my day? | ✅ Yes |
| 6 | Did I do the treatment, activation, and stretching I normally do? | ✅ Yes |



---

## 2. Rehab

**Type identifier:** `Rehab`  
**Settings page:** `RehabQuestions.tsx`  
**Journal page:** `RehabJournal.tsx`  
**LocalStorage key:** `rehabQuestions`

### Default Questions

| ID | Question | Enabled by Default |
|----|----------|-------------------|
| 1 | How do I feel about my rehab performance today? | ✅ Yes |
| 2 | How motivated was I before rehab today? | ✅ Yes |
| 3 | After rehab, do I feel better or worse about my recovery process? | ✅ Yes |



---

## 3. Lift

**Type identifier:** `Lift`  
**Settings page:** `LiftQuestions.tsx`  
**Journal page:** `LiftJournal.tsx`  
**LocalStorage key:** `liftQuestions`

### Default Questions

| ID | Question | Enabled by Default |
|----|----------|-------------------|
| 1 | How motivated was I before lift today? | ✅ Yes |
| 2 | After my lift, how does my body feel? | ✅ Yes |
| 3 | Am I happy I lifted? | ✅ Yes |
| 4 | Have I stretched for 20 minutes today? | ✅ Yes |




---

## 4. Game

**Type identifier:** `Game`  
**Settings page:** `GameQuestions.tsx`  
**Journal page:** `GameJournal.tsx`  
**LocalStorage key:** `gameQuestions`

Game journals have **two phases**: Pregame and Postgame. Each phase has its own set of questions.

### Pregame Questions

| ID | Question | Enabled by Default |
|----|----------|-------------------|
| 1 | Who is your opponent? | ✅ Yes |
| 2 | What are three things I can control today that will help me perform my best? | ✅ Yes |
| 3 | What external factors could distract me from playing my best? | ✅ Yes |
| 4 | How will I respond to mistakes in a way that keeps me focused? | ✅ Yes |

### Postgame Questions

| ID | Question | Enabled by Default |
|----|----------|-------------------|
| 1 | Was I fully engaged in the game? YES or NO | ✅ Yes |
| 2 | Right now, how do I feel I played? | ✅ Yes |
| 3 | What are three things I did well? | ✅ Yes |
| 4 | What's one thing I want to work on based on today's game? | ✅ Yes |
| 5 | Do I think how I played will affect the rest of my day? | ✅ Yes |
| 6 | How did I feel playing against the player I was matched up against? | ✅ Yes |
| 7 | How did I feel in my team's system against the other team's system? | ✅ Yes |
| 8 | How do I feel about my playing time today? If I don't feel great about it, how can I work with my coaches to change it, without disrespecting their decision? | ✅ Yes |



---

## 5. Food

**Type identifier:** `Food`  
**Settings page:** None (no customizable questions)  
**Journal page:** `FoodJournal.tsx`  
**LocalStorage key:** N/A

The Food journal doesn't have customizable questions. Instead, it tracks meals throughout the day.

### Meal Types
- Breakfast
- Lunch
- Snack
- Dinner

### Data Fields

| Field | Description | Required |
|-------|-------------|----------|
| mealType | One of: Breakfast, Lunch, Snack, Dinner | ✅ Yes |
| timeOfDay | Time when the meal was consumed | ✅ Yes |
| foodItems | List/description of food consumed | ✅ Yes |
| feelingNotes | How you feel about what you ate (Dinner only) | ❌ No |



---

## 6. Imagery

**Type identifier:** `Imagery`  
**Settings page:** `ImagerySettings.tsx`  
**Journal page:** `ImageryJournal.tsx`  
**LocalStorage key:** `imageryPrompts`

The Imagery journal uses visualization prompts rather than questions. Users select which prompts to focus on during their mental imagery session.

### Default Prompts

| ID | Prompt | Enabled by Default |
|----|--------|-------------------|
| pass | Visualize a successful pass that's common in your position. | ✅ Yes |
| goal | Envision Scoring a Goal: Picture yourself receiving the ball, beating a defender, and scoring. | ✅ Yes |
| defense | Mentally Practice Defensive Positioning: Visualize positioning yourself to intercept an opponent's pass. | ✅ Yes |
| pressure | Simulate Handling Pressure: Visualize maintaining composure when facing a high-pressure situation. | ✅ Yes |
| communication | Imagine Effective Communication: Picture yourself directing teammates during a set piece. | ✅ Yes |
| tackle | Recreate a Successful Tackle: Mentally rehearse timing and executing a clean tackle. | ✅ Yes |
| body | Visualize Positive Body Language: Imagine displaying confident body language. | ✅ Yes |
| adversity | Envision Overcoming Adversity: Picture yourself recovering from a mistake. | ✅ Yes |
| game | Simulate Game Scenarios: Mentally rehearse various game situations. | ✅ Yes |
| best | Relive your best moment: Close your eyes and think about your most fun game. | ✅ Yes |



---

## Summary Table

| Type | Questions/Prompts | 
| Training | 9 default questions (3 pre-training, 6 post-training) |
| Rehab | 3 default questions |
| Lift | 4 default questions | 
| Game | 12 default questions (4 pregame, 8 postgame) |
| Food | 4 data fields | 
| Imagery | 10 default prompts | 

---

## Database schema (added tables)

Below is a high-level summary of the tables (and types) added by the SQL migrations in the `db` folder.

### 1. Core extensions

- **`001_extensions.sql`**
  - Enables `pgcrypto` extension:
    - `create extension if not exists "pgcrypto";` (used for `gen_random_uuid()` primary keys).

### 2. Core configuration tables

- **`002_core_config_tables.sql`**
  - **`public.workout_types`**
    - `id uuid primary key default gen_random_uuid()`
    - `owner_id uuid references auth.users (id) on delete cascade default auth.uid()` — `null` = system default type.
    - `name text not null`
    - `description text`
    - `sort_order integer not null default 100`
    - `is_system_default boolean not null default false`
    - `created_at timestamptz not null default now()`
  - **`public.journal_questions`**
    - `id uuid primary key default gen_random_uuid()`
    - `owner_id uuid references auth.users (id) on delete cascade default auth.uid()` — `null` = system default question.
    - `workout_type_id uuid references public.workout_types (id) on delete cascade`
    - `prompt text not null`
    - `help_text text`
    - `is_required boolean not null default false`
    - `sort_order integer not null default 100`
    - `is_system_default boolean not null default false`
    - `retired_at timestamptz` — hides retired prompts while preserving historical answers.
    - `created_at timestamptz not null default now()`

### 3. Journal entry tables

- **`003_journal_entry_tables.sql`**
  - **`public.journal_entries`**
    - `id uuid primary key default gen_random_uuid()`
    - `user_id uuid not null references auth.users (id) on delete cascade default auth.uid()`
    - `workout_type_id uuid references public.workout_types (id)`
    - `entry_date date not null default current_date`
    - `entry_time time with time zone` — optional time-of-day within the date.
    - `title text`
    - `notes text`
    - `mood_score integer check (mood_score between 1 and 10)`
    - `rpe_score integer check (rpe_score between 0 and 10)` — optional session effort; not used for calendar mood.
    - `created_at timestamptz not null default now()`
    - `updated_at timestamptz not null default now()`
  - **`public.journal_entry_answers`**
    - `id uuid primary key default gen_random_uuid()`
    - `entry_id uuid not null references public.journal_entries (id) on delete cascade`
    - `question_id uuid not null references public.journal_questions (id)`
    - `answer_text text`
    - `created_at timestamptz not null default now()`

### 4. Default seeds & V1 workout/questions

- **`005_seed_defaults.sql`**
  - Inserts default `workout_types` rows: `Game`, `Practice`, `Lift`, `Visualization`.
  - Inserts generic and workout-specific `journal_questions` (game/practice/lift/visualization + generic).
- **`007_add_v1_entry_and_questions.sql`**
  - Inserts V1 `workout_types`: `Training`, `Rehab`, `Lift`, `Game`, `Food`, `Imagery` (as system defaults).
  - Inserts all of the V1 `journal_questions` that match the sections above (Training, Rehab, Lift, Game pre/post, Imagery prompts).
- **`013_add_training_pre_training_questions.sql`**
  - Adds and phase-labels the three pre-training questions.
- **`020_update_game_and_training_journals.sql`**
  - Updates the opponent and postgame copy, and retires superseded postgame questions without deleting historical answers.

### 5. Food-specific tables

- **`008_food_meals.sql`**
  - **Enum type `meal_type_enum`**
    - Values: `'Breakfast'`, `'Lunch'`, `'Snack'`, `'Dinner'`.
  - **`public.food_meals`**
    - `id uuid primary key default gen_random_uuid()`
    - `entry_id uuid not null references public.journal_entries (id) on delete cascade` — parent `Food` journal entry.
    - `meal_type meal_type_enum not null`
    - `time_of_day time with time zone not null`
    - `food_items text not null`
    - `feeling_notes text` — optional.
    - `created_at timestamptz not null default now()`

### 6. Profiles table

- **`006_profiles.sql`**
  - **`public.profiles`**
    - `id uuid primary key references auth.users (id) on delete cascade`
    - `created_at timestamptz not null default now()`
    - `updated_at timestamptz not null default now()`
    - `first_name text`
    - `last_name text`
    - `preferred_sport text`
    - `preferred_position text`

### 7. Row-level security policies

- **`004_rls_policies.sql`**
  - Enables and configures RLS on:
    - `public.workout_types`
    - `public.journal_questions`
    - `public.journal_entries`
    - `public.journal_entry_answers`
  - Policies ensure each user can only read/write their own data and non-system records, while system defaults remain read-only.
