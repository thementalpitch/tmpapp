import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Entry = {
  id: string;
  user_id: string;
  title: string | null;
  notes: string | null;
  mood_score: number | null;
  entry_date: string;
  workout_types?: { name: string | null } | { name: string | null }[] | null;
};

type AthleteProfile = {
  preferred_sport: string | null;
  preferred_position: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function unauthorized() {
  return json({ error: "Unauthorized" }, 401);
}

function workoutName(entry: Entry): string {
  const joined = entry.workout_types;
  if (Array.isArray(joined)) return joined[0]?.name ?? entry.title ?? "Journal";
  return joined?.name ?? entry.title ?? "Journal";
}

function parseInsight(text: string) {
  const parsed = JSON.parse(text);
  return {
    experience: String(parsed.experience ?? "").trim(),
    tips: Array.isArray(parsed.tips)
      ? parsed.tips.map((tip) => String(tip).trim()).filter(Boolean).slice(0, 4)
      : [],
  };
}

const insightSchema = {
  type: "object",
  properties: {
    experience: { type: "string" },
    tips: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["experience", "tips"],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const webhookSecret = Deno.env.get("AI_INSIGHT_WEBHOOK_SECRET");
  if (!webhookSecret || req.headers.get("Authorization") !== `Bearer ${webhookSecret}`) {
    return unauthorized();
  }

  const { entry_id: entryId } = await req.json().catch(() => ({}));
  if (!entryId) return json({ error: "Missing entry_id" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cerebrasKey = Deno.env.get("CEREBRAS_API_KEY");
  if (!supabaseUrl || !serviceRoleKey || !cerebrasKey) {
    return json({ error: "Missing Edge Function secrets" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await supabase
    .from("journal_ai_insights")
    .update({ status: "processing", error: null })
    .eq("entry_id", entryId);

  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .select("id,user_id,title,notes,mood_score,entry_date,workout_types:workout_type_id(name)")
    .eq("id", entryId)
    .single<Entry>();

  if (entryError || !entry) {
    await supabase.from("journal_ai_insights").update({
      status: "error",
      error: entryError?.message ?? "Journal entry not found",
    }).eq("entry_id", entryId);
    return json({ error: "Journal entry not found" }, 404);
  }

  const [{ data: profile }, { data: answers }, { data: meals }] = await Promise.all([
    supabase
      .from("profiles")
      .select("preferred_sport,preferred_position")
      .eq("id", entry.user_id)
      .maybeSingle<AthleteProfile>(),
    supabase
      .from("journal_entry_answers")
      .select("answer_text,journal_questions:question_id(prompt,help_text,sort_order)")
      .eq("entry_id", entryId),
    supabase
      .from("food_meals")
      .select("meal_type,food_items,feeling_notes")
      .eq("entry_id", entryId),
  ]);

  const model = Deno.env.get("CEREBRAS_MODEL") ?? "gpt-oss-120b";
  const prompt = {
    athlete: {
      sport: profile?.preferred_sport ?? null,
      position: profile?.preferred_position ?? null,
    },
    entry: {
      type: workoutName(entry),
      date: entry.entry_date,
      mood_score: entry.mood_score,
      notes: entry.notes,
    },
    answers: answers ?? [],
    meals: meals ?? [],
    output_rules: [
      "Return only JSON matching the schema.",
      "experience is one paragraph of 3-4 sentences about a real professional athlete who had a similar experience to the entry content.",
      "When athlete.sport is provided, choose an athlete from that sport. When athlete.position is also provided, prefer an athlete who played that position or a closely related role.",
      "Connect the journal entry to a broadly documented event or period in that athlete's career and explain how they responded or persevered.",
      "If sport or position is missing, use the available context without guessing the user's profile.",
      "tips is exactly 3 strings. Each tip is 3-4 sentences, written as practical next actions for the next training, game, lift, rehab, food, or imagery session.",
      "Do not include markdown, citations, or conversation text.",
      "Do not invent events, quotes, statistics, injuries, or timelines. If uncertain about a specific detail, keep the example general and factual.",
      "Avoid medical, nutrition-prescription, diagnosis, and guaranteed-performance claims.",
    ],
  };

  try {
    const aiResponse = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cerebrasKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "journal_ai_insight",
            strict: true,
            schema: insightSchema,
          },
        },
        messages: [
          {
            role: "system",
            content:
              "You are a practical mental performance coach for athletes. Write in a calm, direct tone. Output only schema-valid JSON with no surrounding text.",
          },
          { role: "user", content: JSON.stringify(prompt) },
        ],
      }),
    });

    const aiJson = await aiResponse.json();
    if (!aiResponse.ok) throw new Error(aiJson?.error?.message ?? "Cerebras request failed");

    const content = aiJson?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Cerebras returned no content");

    const insight = parseInsight(content);
    if (!insight.experience || insight.tips.length === 0) {
      throw new Error("Cerebras returned incomplete insight JSON");
    }

    await supabase.from("journal_ai_insights").update({
      status: "complete",
      experience: insight.experience,
      tips: insight.tips,
      model,
      generated_at: new Date().toISOString(),
      error: null,
    }).eq("entry_id", entryId);

    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Insight generation failed";
    await supabase.from("journal_ai_insights").update({
      status: "error",
      error: message,
    }).eq("entry_id", entryId);
    return json({ error: message }, 500);
  }
});
