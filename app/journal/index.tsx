import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Text } from "react-native";
import { useRouter, useLocalSearchParams, type Href } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../src/contexts/AuthContext";
import { formatDateLocal, parseISODateLocal, todayLocalDateString } from "../../src/utils/date";
import {
  getEntriesByDate,
  type JournalEntry,
} from "../../src/api";
import { AppButton, BottomNav, EmptyState, Page, PageHeader } from "../../src/components/AppChrome";
import { MoodRing } from "../../src/components/MoodRing";
import { card, colors, font, radius, space, type as typeStyles } from "../../src/theme";
import { isPhasedJournalName } from "../../src/utils/journalPhases";

function formatDateHeading(date: Date): string {
  return formatDateLocal(date, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(timeString: string | null): string {
  if (!timeString) return "Time not set";
  const match = timeString.match(/(\d{2}):(\d{2})/);
  if (!match) return "Time not set";
  const hour24 = Number(match[1]);
  if (Number.isNaN(hour24)) return "Time not set";
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}:${match[2]} ${hour24 < 12 ? "AM" : "PM"}`;
}

export default function JournalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const targetDateStr = typeof date === "string" ? date : todayLocalDateString();
  const targetDate = parseISODateLocal(targetDateStr);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const nextEntries = await getEntriesByDate(targetDateStr);
      setEntries(nextEntries);
    } catch (err: any) {
      setError(err?.message || "Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, [user, targetDateStr]);

  useFocusEffect(useCallback(() => { loadEntries(); }, [loadEntries]));

  const renderItem = ({ item }: { item: JournalEntry }) => {
    const needsFinish = isPhasedJournalName(item.title) && item.mood_score == null;
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/journal/${item.id}`)} activeOpacity={0.72}>
        <View style={styles.cardTop}>
          <View style={styles.cardMain}>
            <View style={styles.titleRow}>
              <Text style={[typeStyles.cardTitle, styles.titleText]} numberOfLines={2}>
                {item.title || "Untitled session"}
              </Text>
              {needsFinish && (
                <View style={styles.finishPill}>
                  <Text style={styles.finishPillText}>Finish</Text>
                </View>
              )}
            </View>
            <Text style={typeStyles.caption}>{formatTime(item.entry_time)}</Text>
            {item.notes ? (
              <Text style={styles.notes} numberOfLines={2}>
                {item.notes}
              </Text>
            ) : null}
          </View>
          {item.mood_score != null && <MoodRing score={item.mood_score} size="sm" />}
        </View>
      </TouchableOpacity>
    );
  };

  const newPath = (`/journal/new${date ? `?date=${date}` : ""}`) as Href;

  return (
    <Page>
      <PageHeader title="Your Journal" subtitle={formatDateHeading(targetDate)} onBack={() => router.back()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentSolid} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : entries.length === 0 ? (
        <EmptyState
          title={date ? "No entries for this date" : "No entries today"}
          body="Log how you felt, trained, or played."
          action={<AppButton label="New entry" icon="add" onPress={() => router.push(newPath)} />}
        />
      ) : (
        <FlatList
          style={styles.list}
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <BottomNav
        onHome={() => router.push("/")}
        onAdd={() => router.push(newPath)}
        onCalendar={() => router.push("/calendar")}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: font, fontSize: 14, color: colors.danger },
  list: { flex: 1 },
  listContent: { paddingBottom: space.sm, gap: space.sm },
  card: {
    ...card,
    marginBottom: space.sm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  cardMain: { flex: 1, gap: space.xs },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    flexWrap: "wrap",
  },
  titleText: { flex: 1 },
  notes: {
    fontFamily: font,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginTop: space.xs,
  },
  finishPill: {
    backgroundColor: colors.accentSolid,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  finishPillText: { fontFamily: font, fontSize: 12, fontWeight: "600", color: colors.onPrimary },
});
