import React from "react";
import type { ProfileStatsSummary } from "../api/types";
import { Section, SectionTitle, GroupedList, GroupedRow } from "./AppChrome";

interface QuickStatsProps {
  stats: ProfileStatsSummary;
}

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <Section>
      <SectionTitle>Activity</SectionTitle>
      <GroupedList>
        <GroupedRow label="Total entries" value={String(stats.totalEntries)} />
        <GroupedRow label="Current streak" value={`${stats.currentStreak} days`} />
        <GroupedRow label="Longest streak" value={`${stats.longestStreak} days`} />
        <GroupedRow
          label="Average mood"
          value={stats.averageMood != null ? `${stats.averageMood.toFixed(1)} / 10` : "—"}
          border={!!stats.mostActiveWorkoutType}
        />
        {stats.mostActiveWorkoutType ? (
          <GroupedRow label="Most active" value={stats.mostActiveWorkoutType} border={false} />
        ) : null}
      </GroupedList>
    </Section>
  );
}
