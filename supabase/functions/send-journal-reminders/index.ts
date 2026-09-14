import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

type DueReminder = {
  user_id: string;
  expo_push_token: string;
  reminder_time: string;
  local_date: string;
};

type ExpoTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function isDeadToken(ticket: ExpoTicket): boolean {
  const detail = ticket.details?.error ?? "";
  const msg = ticket.message ?? "";
  return (
    detail === "DeviceNotRegistered" ||
    detail === "InvalidCredentials" ||
    msg.includes("DeviceNotRegistered") ||
    msg.includes("not registered")
  );
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: due, error: dueError } = await supabase.rpc("get_due_journal_reminders");
  if (dueError) {
    console.error("get_due_journal_reminders failed:", dueError.message);
    return new Response(JSON.stringify({ error: dueError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const candidates = (due ?? []) as DueReminder[];
  const claimed: DueReminder[] = [];

  for (const row of candidates) {
    const { data: ok, error: claimError } = await supabase.rpc("try_claim_reminder_send", {
      p_user_id: row.user_id,
      p_reminder_time: row.reminder_time,
      p_local_date: row.local_date,
    });
    if (claimError) {
      console.error("try_claim_reminder_send failed:", claimError.message, row.user_id);
      continue;
    }
    if (ok) {
      claimed.push(row);
    }
  }

  if (claimed.length === 0) {
    return new Response(
      JSON.stringify({ due: candidates.length, claimed: 0, sent: 0, errors: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  let sent = 0;
  let errors = 0;
  let disabledTokens = 0;

  for (let i = 0; i < claimed.length; i += BATCH_SIZE) {
    const batch = claimed.slice(i, i + BATCH_SIZE);
    const messages = batch.map((row) => ({
      to: row.expo_push_token,
      title: "Time to journal",
      body: "Log your session and mood when you have a minute.",
      sound: "default",
      data: { type: "journal_reminder" },
    }));

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!pushResponse.ok) {
      const body = await pushResponse.text();
      console.error("Expo push HTTP error:", pushResponse.status, body);
      errors += batch.length;
      continue;
    }

    const pushResult = (await pushResponse.json()) as { data?: ExpoTicket[] };
    const tickets = pushResult.data ?? [];

    if (tickets.length !== batch.length) {
      console.warn(
        "Expo ticket count mismatch:",
        tickets.length,
        "expected",
        batch.length
      );
    }

    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const ticket = tickets[j];

      if (!ticket) {
        errors += 1;
        console.warn("Missing Expo ticket for token", row.expo_push_token);
        continue;
      }

      if (ticket.status !== "ok") {
        errors += 1;
        console.warn("Expo push ticket error:", ticket.message, ticket.details, row.expo_push_token);
        if (isDeadToken(ticket)) {
          const { error: disableError } = await supabase.rpc("disable_notification_token", {
            p_expo_push_token: row.expo_push_token,
          });
          if (!disableError) {
            disabledTokens += 1;
          }
        }
        continue;
      }

      sent += 1;
    }
  }

  return new Response(
    JSON.stringify({
      due: candidates.length,
      claimed: claimed.length,
      sent,
      errors,
      disabledTokens,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});
