import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { getStats, type StatsPeriod, type StatsData } from "../src/api";
import {
  GroupedList,
  GroupedRow,
  Page,
  PageHeader,
  Section,
  SectionTitle,
  SegmentedControl,
} from "../src/components/AppChrome";
import { MoodHeroRing } from "../src/components/MoodHeroRing";
import { MoodLineChart } from "../src/components/MoodLineChart";
import { colors, font, space, type as typeStyles } from "../src/theme";

export default function StatsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<StatsPeriod>("month");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStats(period);
        setStats(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [period]);

  if (loading) {
    return (
      <Page>
        <PageHeader title="Stats" subtitle="Mood and patterns" onBack={() => router.back()} />
        <View style={styles.centerContent}>
          <ActivityIndicator color={colors.accentSolid} size="large" />
        </View>
      </Page>
    );
  }

  if (error || !stats) {
    return (
      <Page>
        <PageHeader title="Stats" subtitle="Mood and patterns" onBack={() => router.back()} />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error || "Failed to load statistics"}</Text>
        </View>
      </Page>
    );
  }

  const trendLabel =
    stats.summary.moodTrend === "improving"
      ? "Trending up"
      : stats.summary.moodTrend === "declining"
      ? "Trending down"
      : "Holding steady";

  const moodDetail = `${stats.summary.streakData.currentStreak} day streak · ${stats.summary.totalEntries} entries · ${trendLabel}`;

  return (
    <Page>
      <PageHeader title="Stats" subtitle="Mood and patterns" onBack={() => router.back()} />

      <SegmentedControl
        options={[
          { value: "week" as StatsPeriod, label: "Week" },
          { value: "month" as StatsPeriod, label: "Month" },
          { value: "year" as StatsPeriod, label: "Year" },
        ]}
        value={period}
        onChange={setPeriod}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <MoodHeroRing
          label="Average mood"
          score={stats.summary.averageMood}
          detail={moodDetail}
        />

        <Section>
          <SectionTitle>Mood over time</SectionTitle>
          <MoodLineChart data={stats.moodTrends} />
        </Section>

        {stats.workoutTypeDistribution.length > 0 && (
          <Section>
            <SectionTitle>By activity</SectionTitle>
            <GroupedList>
              {stats.workoutTypeDistribution.map((workout, i) => (
                <GroupedRow
                  key={workout.workoutTypeId}
                  label={workout.workoutTypeName}
                  value={
                    workout.averageMood != null
                      ? `${workout.percentage.toFixed(0)}% · ${workout.averageMood.toFixed(1)}/10`
                      : `${workout.percentage.toFixed(0)}% · ${workout.entryCount} entries`
                  }
                  border={i < stats.workoutTypeDistribution.length - 1}
                />
              ))}
            </GroupedList>
          </Section>
        )}

        {stats.timePatterns.some((tp) => tp.entryCount > 0) && (
          <Section>
            <SectionTitle>Time of day</SectionTitle>
            <GroupedList>
              {stats.timePatterns
                .filter((tp) => tp.entryCount > 0)
                .map((pattern, i, arr) => (
                  <GroupedRow
                    key={pattern.timeOfDay}
                    label={pattern.timeOfDay.charAt(0).toUpperCase() + pattern.timeOfDay.slice(1)}
                    value={
                      pattern.averageMood != null
                        ? `${pattern.averageMood.toFixed(1)}/10 · ${pattern.entryCount} entries`
                        : `${pattern.entryCount} entries`
                    }
                    border={i < arr.length - 1}
                  />
                ))}
            </GroupedList>
          </Section>
        )}

        {stats.insights.length > 0 && (
          <Section>
            <SectionTitle>Notes</SectionTitle>
            {stats.insights.map((insight, index) => (
              <Text key={index} style={styles.insight}>
                {insight}
              </Text>
            ))}
          </Section>
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: font, fontSize: 15, color: colors.danger, lineHeight: 22 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: space.xxxl },
  insight: {
    ...typeStyles.body,
    fontSize: 15,
    color: colors.text,
    marginBottom: space.md,
    lineHeight: 23,
  },
});
