# How Notifications Work

## Overview

Journal reminders use **server-side push notifications** (Supabase Edge Function + pg_cron + Expo Push API). The app registers your device token and reminder preferences; the server sends pushes at your chosen times if you have not logged today.

See [server-notifications-setup.md](./server-notifications-setup.md) for deployment steps.

Legacy note: local OS scheduling was replaced to avoid duplicate reminders and to support "skip if already logged today" logic on the server.

## Architecture

1. **App** saves `notification_preferences` (a local time for each enabled day, plus timezone) and upserts `notification_tokens`.
2. **pg_cron** invokes `send-journal-reminders` every minute.
3. **Edge Function** queries due users, sends Expo pushes, logs sends in `notification_send_log`.

## When the app syncs registration

- **App launch** (`app/_layout.tsx`) — refreshes timezone, registers token if reminders enabled
- **Settings save** (`app/settings.tsx`) — saves prefs + registers token

## Settings Page Customization

The settings page (`app/settings.tsx`) is **fully customizable**:

### ✅ Available Customizations

1. **Enable/Disable Toggle**
   - Master switch to turn all notifications on/off

2. **Weekly Schedule**
   - Toggle individual days on or off
   - Choose a separate local reminder time for every enabled day
   - Use the custom time picker with AM/PM

3. **Streak Reminders**
   - Toggle for streak-related notifications (future feature)

4. **Mood Insights**
   - Toggle for mood insight notifications (future feature)

### Settings UI Features

- **Time Picker Component**: Custom modal with hour/minute selection
- **Weekly Schedule**: A day-by-day list with independent times
- **Save Button**: Persists preferences and reschedules notifications
- **Real-time Updates**: Changes reflected immediately in UI

## Testing Notifications

### On Physical Device

1. Set a reminder time 1-2 minutes in the future
2. Save preferences
3. Close the app completely
4. Wait for the scheduled time
5. Notification should appear even with app closed

### Debugging

Check scheduled notifications:
```typescript
const scheduled = await Notifications.getAllScheduledNotificationsAsync();
console.log("Scheduled notifications:", scheduled);
```

## Future Enhancements

1. **Streak alerts** — special notifications when streak is at risk
2. **Weekly summaries** — "Your week in review" notifications
3. **Mood insight pushes** — when `mood_insights` preference is enabled
