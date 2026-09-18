# Changelog — The Mental Pitch

## Build 29 (in development)
- New final logo across the app: replaced `assets/images/mental_pitch_logo.png` (drives the Expo app icon, Android adaptive icon, and the in-app logo on the home, auth, tutorial, and loading screens) and the legacy `assets/images/app_logo.png` with the approved final logo.
- App icon refined: final 5-ring logo on a navy `#203040` background at 1024x1024; Android adaptive icon background updated to match. The store icon updates when this build goes live (Apple takes it from the binary).
- Removed AI Insights and AI Tips: the AI insight button and popup are gone from the journal list, the insight cards are gone from the entry screen, and the app no longer requests insight generation when entries are saved. Removed the now-unused `JournalAiInsight` component, `journalAiInsights` API module, and `JournalAiInsight` type. (The `journal_ai_insights` DB table and `generate-journal-insight` edge function remain but are dormant — nothing calls them.)
- Additional build 29 changes TBD — Ben is selecting from the proposed additions.
