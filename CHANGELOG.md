# Changelog — The Mental Pitch

## Performance slider + customizable sliders (in development)
- New third journal slider: "How well did you play?" (1–10), saved with each entry alongside mood and session effort.
- Calendar now has Mood / Effort / Performance tabs, each showing that score's daily averages for the month.
- Settings → Journal questions → new Sliders section: athletes can toggle each slider on or off. Hidden sliders disappear from new/edit journals and the calendar, but already-saved scores are kept.
- DB: `journal_entries.performance_score` (1–10); new `user_hidden_sliders` table for the toggles.

## Build 29 (in development)
- New final logo across the app: replaced `assets/images/mental_pitch_logo.png` (drives the Expo app icon, Android adaptive icon, and the in-app logo on the home, auth, tutorial, and loading screens) and the legacy `assets/images/app_logo.png` with the approved final logo.
- App icon refined: final 5-ring logo on a navy `#203040` background at 1024x1024; Android adaptive icon background updated to match. The store icon updates when this build goes live (Apple takes it from the binary).
- Removed AI Insights and AI Tips: the AI insight button and popup are gone from the journal list, the insight cards are gone from the entry screen, and the app no longer requests insight generation when entries are saved. Removed the now-unused `JournalAiInsight` component, `journalAiInsights` API module, and `JournalAiInsight` type. (The `journal_ai_insights` DB table and `generate-journal-insight` edge function remain but are dormant — nothing calls them.)
- Additional build 29 changes TBD — Ben is selecting from the proposed additions.
