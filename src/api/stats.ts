/**
 * API for statistics and analytics.
 * 
 * Architecture Notes:
 * - Domain: Aggregated analytics from journal entries
 * - Performance: Uses date range queries with proper indexing
 * - Computation: Client-side aggregation for flexibility and portability
 * - Caching: Consider implementing server-side caching for expensive calculations
 */

import { getEntriesByDateRange, getJournalEntries } from "./journalEntries";
import { getWorkoutTypes } from "./workoutTypes";
import type {
  StatsPeriod,
  MoodTrendPoint,
  StreakData,
  WorkoutTypeStats,
  TimePatternStats,
  StatsSummary,
  StatsData,
  JournalEntry,
  ProfileStatsSummary,
} from "./types";
import { addDaysLocal, parseISODateLocal, toISODateLocal, todayLocalDateString } from "../utils/date";

/**
 * Calculate date range for a given period ending today.
 */
function getDateRangeForPeriod(period: StatsPeriod): { startDate: string; endDate: string } {
  const endDate = todayLocalDateString(); // YYYY-MM-DD (local)
  const today = parseISODateLocal(endDate);

  let startDate: Date;
  switch (period) {
    case "week":
      startDate = parseISODateLocal(addDaysLocal(endDate, -6)); // Last 7 days including today
      break;
    case "month":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "year":
      startDate = new Date(today.getFullYear(), 0, 1);
      break;
  }

  return {
    startDate: toISODateLocal(startDate),
    endDate,
  };
}

/**
 * Calculate streak data (consecutive days with entries).
 */
function calculateStreak(entries: JournalEntry[]): StreakData {
  if (entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalDaysWithEntries: 0 };
  }

  // Get unique dates with entries, sorted descending
  const datesWithEntries = new Set(
    entries.map((e) => e.entry_date).sort().reverse()
  );
  const sortedDates = Array.from(datesWithEntries).sort().reverse();

  // Calculate current streak (from today backwards)
  let currentStreak = 0;
  const today = todayLocalDateString();
  let checkDate = parseISODateLocal(today);

  while (true) {
    const dateStr = toISODateLocal(checkDate);
    if (datesWithEntries.has(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const currentDate = parseISODateLocal(dateStr);
    if (prevDate === null) {
      tempStreak = 1;
    } else {
      const daysDiff = Math.floor(
        (prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    prevDate = currentDate;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    currentStreak,
    longestStreak,
    totalDaysWithEntries: datesWithEntries.size,
  };
}

/**
 * Calculate mood trend direction.
 */
function calculateMoodTrend(moodTrends: MoodTrendPoint[]): "improving" | "declining" | "stable" {
  if (moodTrends.length < 2) return "stable";

  const validTrends = moodTrends.filter((t) => t.averageMood !== null);
  if (validTrends.length < 2) return "stable";

  // Compare first half vs second half
  const mid = Math.floor(validTrends.length / 2);
  const firstHalf = validTrends.slice(0, mid);
  const secondHalf = validTrends.slice(mid);

  const firstAvg =
    firstHalf.reduce((sum, t) => sum + (t.averageMood ?? 0), 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, t) => sum + (t.averageMood ?? 0), 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;
  if (Math.abs(diff) < 0.3) return "stable";
  return diff > 0 ? "improving" : "declining";
}

/**
 * Parse time of day from entry_time.
 */
function getTimeOfDay(entryTime: string | null): "morning" | "afternoon" | "evening" | "night" {
  if (!entryTime) return "afternoon";

  const match = entryTime.match(/(\d{2}):(\d{2})/);
  if (!match) return "afternoon";

  const hour = Number(match[1]);
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/**
 * Generate insights based on stats data.
 */
function generateInsights(
  summary: StatsSummary,
  workoutStats: WorkoutTypeStats[],
  timePatterns: TimePatternStats[]
): string[] {
  const insights: string[] = [];

  // Streak insights
  if (summary.streakData.currentStreak > 0) {
    if (summary.streakData.currentStreak >= 7) {
      insights.push(`You are on a ${summary.streakData.currentStreak}-day streak.`);
    } else {
      insights.push(`Keep it up! You've logged entries for ${summary.streakData.currentStreak} day${summary.streakData.currentStreak > 1 ? "s" : ""} in a row.`);
    }
  }

  // Mood trend insights
  if (summary.moodTrend === "improving") {
    insights.push("Your mood has been improving over this period.");
  } else if (summary.moodTrend === "declining") {
    insights.push("Consider trying different activities to support your mood.");
  }

  // Workout type insights
  if (workoutStats.length > 0) {
    const topWorkout = workoutStats[0];
    if (topWorkout.averageMood && topWorkout.averageMood >= 7) {
      insights.push(
        `${topWorkout.workoutTypeName} sessions have your strongest mood average (${topWorkout.averageMood.toFixed(1)}/10).`
      );
    }
  }

  // Time pattern insights
  if (timePatterns.length > 0) {
    const bestTime = timePatterns.reduce((best, current) => {
      if (!current.averageMood) return best;
      if (!best.averageMood) return current;
      return current.averageMood > best.averageMood ? current : best;
    });

    if (bestTime.averageMood && bestTime.averageMood >= 7) {
      const timeLabel = bestTime.timeOfDay.charAt(0).toUpperCase() + bestTime.timeOfDay.slice(1);
      insights.push(`Your best mood scores come during ${timeLabel} sessions.`);
    }
  }

  // Average mood insights
  if (summary.averageMood !== null) {
    if (summary.averageMood >= 8) {
      insights.push("You're maintaining excellent mood scores.");
    } else if (summary.averageMood >= 6) {
      insights.push("You're doing well. Keep tracking to see patterns.");
    }
  }

  return insights.length > 0 ? insights : ["Start logging entries to see your insights!"];
}

/**
 * Get comprehensive stats for a given period.
 */
export async function getStats(period: StatsPeriod): Promise<StatsData> {
  const { startDate, endDate } = getDateRangeForPeriod(period);
  const entries = await getEntriesByDateRange(startDate, endDate);
  const allEntries = await getJournalEntries(); // For streak calculation (needs all-time data)
  const workoutTypes = await getWorkoutTypes();

  // Create workout type lookup
  const workoutTypeMap = new Map(workoutTypes.map((wt) => [wt.id, wt.name]));

  // Calculate mood trends (daily averages)
  const moodByDate: Record<string, number[]> = {};
  for (const entry of entries) {
    if (entry.mood_score !== null) {
      if (!moodByDate[entry.entry_date]) {
        moodByDate[entry.entry_date] = [];
      }
      moodByDate[entry.entry_date].push(entry.mood_score);
    }
  }

  const moodTrends: MoodTrendPoint[] = Object.keys(moodByDate)
    .sort()
    .map((date) => {
      const scores = moodByDate[date];
      const avg = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
      return {
        date,
        averageMood: avg,
        entryCount: entries.filter((e) => e.entry_date === date).length,
      };
    });

  // Calculate workout type distribution
  const workoutTypeCounts: Record<string, { count: number; moodSum: number; moodCount: number }> =
    {};
  for (const entry of entries) {
    if (entry.workout_type_id) {
      if (!workoutTypeCounts[entry.workout_type_id]) {
        workoutTypeCounts[entry.workout_type_id] = { count: 0, moodSum: 0, moodCount: 0 };
      }
      workoutTypeCounts[entry.workout_type_id].count++;
      if (entry.mood_score !== null) {
        workoutTypeCounts[entry.workout_type_id].moodSum += entry.mood_score;
        workoutTypeCounts[entry.workout_type_id].moodCount++;
      }
    }
  }

  const workoutTypeDistribution: WorkoutTypeStats[] = Object.entries(workoutTypeCounts)
    .map(([id, data]) => ({
      workoutTypeId: id,
      workoutTypeName: workoutTypeMap.get(id) || "Unknown",
      entryCount: data.count,
      averageMood: data.moodCount > 0 ? data.moodSum / data.moodCount : null,
      percentage: entries.length > 0 ? (data.count / entries.length) * 100 : 0,
    }))
    .sort((a, b) => b.entryCount - a.entryCount);

  // Calculate time patterns
  const timePatterns: Record<string, { moodSum: number; moodCount: number; entryCount: number }> =
    {
      morning: { moodSum: 0, moodCount: 0, entryCount: 0 },
      afternoon: { moodSum: 0, moodCount: 0, entryCount: 0 },
      evening: { moodSum: 0, moodCount: 0, entryCount: 0 },
      night: { moodSum: 0, moodCount: 0, entryCount: 0 },
    };

  for (const entry of entries) {
    const timeOfDay = getTimeOfDay(entry.entry_time);
    timePatterns[timeOfDay].entryCount++;
    if (entry.mood_score !== null) {
      timePatterns[timeOfDay].moodSum += entry.mood_score;
      timePatterns[timeOfDay].moodCount++;
    }
  }

  const timePatternStats: TimePatternStats[] = Object.entries(timePatterns).map(
    ([timeOfDay, data]) => ({
      timeOfDay: timeOfDay as "morning" | "afternoon" | "evening" | "night",
      averageMood: data.moodCount > 0 ? data.moodSum / data.moodCount : null,
      entryCount: data.entryCount,
    })
  );

  // Calculate overall average mood
  const moodScores = entries
    .map((e) => e.mood_score)
    .filter((score): score is number => score !== null);
  const averageMood = moodScores.length > 0 ? moodScores.reduce((sum, s) => sum + s, 0) / moodScores.length : null;

  // Calculate streak
  const streakData = calculateStreak(allEntries);

  // Determine most active workout type
  const mostActiveWorkoutType =
    workoutTypeDistribution.length > 0 ? workoutTypeDistribution[0].workoutTypeName : null;

  // Calculate mood trend
  const moodTrend = calculateMoodTrend(moodTrends);

  const summary: StatsSummary = {
    period,
    totalEntries: entries.length,
    averageMood,
    moodTrend,
    mostActiveWorkoutType,
    streakData,
  };

  // Generate insights
  const insights = generateInsights(summary, workoutTypeDistribution, timePatternStats);

  return {
    summary,
    moodTrends,
    workoutTypeDistribution,
    timePatterns: timePatternStats,
    insights,
  };
}

export async function getProfileStatsSummary(): Promise<ProfileStatsSummary> {
  const allEntries = await getJournalEntries();
  const workoutTypes = await getWorkoutTypes();
  const workoutTypeMap = new Map(workoutTypes.map((wt) => [wt.id, wt.name]));

  // Calculate streak
  const streakData = calculateStreak(allEntries);

  // Calculate average mood
  const moodScores = allEntries
    .map((e) => e.mood_score)
    .filter((score): score is number => score !== null);
  const averageMood = moodScores.length > 0
    ? moodScores.reduce((sum, s) => sum + s, 0) / moodScores.length
    : null;

  // Find most active workout type
  const workoutTypeCounts: Record<string, number> = {};
  for (const entry of allEntries) {
    if (entry.workout_type_id) {
      workoutTypeCounts[entry.workout_type_id] =
        (workoutTypeCounts[entry.workout_type_id] || 0) + 1;
    }
  }

  const mostActiveWorkoutTypeId =
    Object.entries(workoutTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const mostActiveWorkoutType = mostActiveWorkoutTypeId
    ? workoutTypeMap.get(mostActiveWorkoutTypeId) || null
    : null;

  return {
    totalEntries: allEntries.length,
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    averageMood,
    mostActiveWorkoutType,
  };
}
