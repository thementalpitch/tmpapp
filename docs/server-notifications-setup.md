# Server-Side Push Notifications Setup

Journal reminders are delivered by a **Supabase Edge Function** triggered every minute via **pg_cron**. The app registers Expo push tokens; the server sends pushes when a user's local reminder time matches and they have not logged today.

All steps below use the **Supabase Dashboard** — no CLI required.

## Timezone model

Reminders use **local wall-clock time**, not UTC:

| Field | Example | Meaning |
|-------|---------|---------|
| `daily_reminder_times` | `{"0":"18:00","1":"20:30"}` | Day number mapped to its local reminder time (24h `HH:MM`) |
| `reminder_times` | `["18:00"]` | Legacy compatibility for older app versions |
| `reminder_days` | `[0,1,2,3,4,5,6]` | Legacy compatibility for older app versions |
| `timezone` | `America/Los_Angeles` | IANA timezone from the device |

The server converts `now()` into that timezone, finds the local day number, and compares the current local time with `daily_reminder_times` for that day. This matches how journal **`entry_date`** works: a calendar date in the user's local context (`todayLocalDateString()`), not a UTC date. Session **`entry_time`** is stored as local 24h time (`HH:MM:00`) from the time picker.

Do **not** convert reminder times to UTC before saving; DST and travel are handled by updating `timezone` on app launch and settings save.

## Architecture

1. App saves `notification_preferences` (per-day times and timezone) and upserts `notification_tokens`.
2. Every minute, pg_cron calls `send-journal-reminders`.
3. The function runs `get_due_journal_reminders()` (SQL, user timezone aware).
4. Due users receive an Expo push; sends are deduped in `notification_send_log`.

---

## Before you start

Find these in the Supabase Dashboard:

| What | Where |
|------|--------|
| **Project ref** | Project Settings → General → Reference ID (e.g. `abcdefghijklmnop`) |
| **SQL Editor** | Left sidebar → SQL |
| **Edge Functions** | Left sidebar → Edge Functions |
| **Edge Function secrets** | Project Settings → Edge Functions → Secrets |

Your Edge Function URL will be:

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-journal-reminders
```

Generate a **cron secret** (any long random string). Save it — you will paste it in two places:

- Edge Function secret `CRON_SECRET`
- `notification_cron_config` table (step 3)

Example (optional, if you have a terminal): `openssl rand -hex 32`

Or use a password manager / random string generator — aim for 32+ characters.

---

## 1. Run database migrations

Open **SQL Editor** → **New query**. For each file below, open it in this repo, copy the full contents, paste into the editor, and click **Run**.

Run in order (skip any you have already applied):

1. `db/014_notification_tokens.sql`
2. `db/015_fix_notification_preferences_upsert.sql`
3. `db/016_server_push_notifications.sql`
4. `db/017_security_and_notification_fixes.sql`
5. `db/021_daily_notification_times.sql`

If `notification_preferences` was never created, also run:

- `db/database-migration-notification-preferences.sql`

Optional but recommended — re-run the hardened account delete function:

- `db/account-deletion-function.sql`

---

## 2. Create the Edge Function (Dashboard)

### 2a. Create the function

1. Go to **Edge Functions** in the left sidebar.
2. Click **Deploy a new function** (or **Create function**).
3. Name it exactly: `send-journal-reminders`
4. Open `supabase/functions/send-journal-reminders/index.ts` in this repo, copy the entire file, and paste it into the dashboard editor.
5. Click **Deploy** (or **Save & deploy**).

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically on hosted Supabase — you do not need to set those.

### 2b. Add the cron secret

1. Go to **Project Settings** → **Edge Functions** → **Secrets** (or use the secrets panel on the function page).
2. Add a new secret:
   - **Name:** `CRON_SECRET`
   - **Value:** your random secret from above
3. Save. Redeploy the function if the dashboard prompts you to pick up new secrets.

---

## 3. Configure pg_cron (one time)

Back in **SQL Editor**, run this block. Replace `YOUR_PROJECT_REF` and `YOUR_RANDOM_SECRET` with your values:

```sql
INSERT INTO public.notification_cron_config (id, edge_function_url, cron_secret)
VALUES (
  1,
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-journal-reminders',
  'YOUR_RANDOM_SECRET'
)
ON CONFLICT (id) DO UPDATE SET
  edge_function_url = EXCLUDED.edge_function_url,
  cron_secret = EXCLUDED.cron_secret,
  updated_at = now();

SELECT public.configure_notification_cron();
```

You should see a result like `scheduled send-journal-reminders as job …`.

Verify the job exists:

```sql
SELECT * FROM cron.job WHERE jobname = 'send-journal-reminders';
```

---

## 4. Expo / APNs credentials (required for iOS TestFlight & App Store)

Server push goes through **Expo's Push API**, which needs Apple Push Notification credentials on your EAS project.

Without this, tokens register in Supabase but iOS devices will not receive remote pushes.

### Option A — Dashboard

In [expo.dev](https://expo.dev) → your project → **Credentials** → **iOS** → **Push Notifications**, upload your APNs key (.p8) or let EAS manage credentials.

### Option B — EAS CLI (recommended if you already use the terminal)

From your project root:

```bash
npm install -g eas-cli
eas login
```

Run the credentials wizard for iOS:

```bash
eas credentials -p ios
```

Then follow the prompts:

1. Select your build profile (usually **production** for TestFlight / App Store).
2. Choose **Push Notifications: Manage your Apple Push Notifications Key**.
3. Pick one of:
   - **Let EAS create a new key** — requires Apple Developer login in the CLI; EAS stores the key on expo.dev.
   - **Upload an existing .p8 key** — if you already created an APNs key in [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list) (enable **Apple Push Notifications service (APNs)**). You need the `.p8` file, **Key ID**, and your **Team ID** (Apple Developer → Membership).

Verify it was saved:

```bash
eas credentials -p ios
```

You should see a Push Notifications key listed for the profile.

**Notes:**

- Push keys are tied to your **EAS project** (`the-mental-pitch` / project ID in `app.config.ts`), not Supabase.
- You need a **development or production build** on a physical device — Expo Go does not use your APNs key.
- If key creation fails with an Apple API error, update EAS CLI: `npm install -g eas-cli@latest`, then retry.
- Rebuild and reinstall the app after setting up credentials so the binary includes the push entitlement:

```bash
eas build -p ios --profile production
```

---

## 5. Test

### On device

1. On a **physical device** (not Expo Go), sign in and open **Settings**.
2. Enable notifications, set reminder time to **1–2 minutes from now**, save.
3. In Supabase **Table Editor** → `notification_tokens`, confirm a row exists for your user with `enabled = true`.
4. Do **not** create a journal entry today.
5. Wait for the reminder minute; you should receive a push even if the app is closed.

### Manual invoke (Dashboard)

1. Go to **Edge Functions** → `send-journal-reminders`.
2. Open **Invoke** / **Test**.
3. Set method to **POST**.
4. Add header: `Authorization` = `Bearer YOUR_RANDOM_SECRET` (same value as `CRON_SECRET`).
5. Send an empty JSON body `{}`.
6. A successful run returns JSON like `{ "due": 0, "claimed": 0, "sent": 0, "errors": 0 }` when nobody is due, or `"sent": 1` when a push went out.

### Manual invoke (curl, optional)

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-journal-reminders' \
  -H 'Authorization: Bearer YOUR_RANDOM_SECRET' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Check **Edge Functions** → **Logs** if the invoke fails.

---

## Troubleshooting

| Symptom | Check |
|--------|--------|
| No push on device | APNs credentials in EAS; notification permission granted; real device build (not Expo Go) |
| Function 401 | `CRON_SECRET` matches in Edge Function secrets **and** `notification_cron_config.cron_secret` |
| Function 500 on RPC | Migrations `016` + `017` applied; check Edge Function logs for the RPC error message |
| Push sent but no alert | iOS Focus / notification settings; `notification_tokens.enabled = true` |
| Duplicate reminders | Should not happen — `notification_send_log` dedupes per day/slot |
| Cron never runs | `SELECT * FROM cron.job WHERE jobname = 'send-journal-reminders'` returns a row; re-run `SELECT public.configure_notification_cron();` |

---

## Local vs server delivery

The app **registers push tokens** and **does not schedule local repeating notifications** when reminders are enabled. Delivery is server-side only to avoid double notifications.

## Updating the function later

When you change `supabase/functions/send-journal-reminders/index.ts` in the repo:

1. Copy the updated file contents.
2. **Edge Functions** → `send-journal-reminders` → edit → paste → **Deploy**.

No CLI needed unless you prefer it.
