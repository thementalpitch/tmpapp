import { getSupabaseClient } from "../services/supabaseClient";
import type { JournalAiInsight } from "./types";
import { handleSupabaseError } from "./errors";

export async function requestJournalAiInsight(entryId: string): Promise<JournalAiInsight> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("request_journal_ai_insight", {
    p_entry_id: entryId,
  });

  if (error) throw handleSupabaseError(error);
  return data as JournalAiInsight;
}

export async function getJournalAiInsight(entryId: string): Promise<JournalAiInsight | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("journal_ai_insights")
    .select("*")
    .eq("entry_id", entryId)
    .maybeSingle();

  if (error) throw handleSupabaseError(error);
  return data as JournalAiInsight | null;
}

export async function getJournalAiInsightsByEntryIds(
  entryIds: string[]
): Promise<Record<string, JournalAiInsight>> {
  if (entryIds.length === 0) return {};

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("journal_ai_insights")
    .select("*")
    .in("entry_id", entryIds);

  if (error) throw handleSupabaseError(error);

  return Object.fromEntries(
    ((data ?? []) as JournalAiInsight[]).map((insight) => [insight.entry_id, insight])
  );
}
