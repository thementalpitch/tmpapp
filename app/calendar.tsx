import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import {
  getDailyScoreAveragesForMonth,
  getHiddenSliderKeys,
  type DailyScoreAverage,
  type ScoreMetric,
} from "../src/api";
import { Page, PageHeader } from "../src/components/AppChrome";
import { colors, radius } from "../src/theme";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const METRICS: { key: ScoreMetric; label: string; subtitle: string }[] = [
  { key: "mood", label: "Mood", subtitle: "Mood by day" },
  { key: "effort", label: "Intensity", subtitle: "Intensity by day" },
  { key: "performance", label: "Performance", subtitle: "How you played, by day" },
];

function chunkWeeks(days: (number | null)[]): (number | null)[][] {
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7);
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }
  return weeks;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function getMoodColor(averageMood: number): string {
  // Dark mood-tinted fills keep white date text readable.

  if (averageMood >= 1 && averageMood <= 5) {
    const t = (averageMood - 1) / 4;
    const r = Math.round(127 + (133 - 127) * t);
    const g = Math.round(29 + (77 - 29) * t);
    const b = Math.round(29 + (14 - 29) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  const t = (averageMood - 5) / 5;
  const r = Math.round(133 + (20 - 133) * t);
  const g = Math.round(77 + (83 - 77) * t);
  const b = Math.round(14 + (45 - 14) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getIntensityColor(averageIntensity: number): string {
  // Slate -> sky: rest to max intensity. Dark fills keep white text readable.
  const t = Math.min(1, Math.max(0, averageIntensity / 10));
  const r = Math.round(30 + (2 - 30) * t);
  const g = Math.round(41 + (132 - 41) * t);
  const b = Math.round(59 + (199 - 59) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getPerformanceColor(averagePerformance: number): string {
  // Red -> amber -> green: rough to your best. Dark fills keep white text readable.
  // (Previously brown -> amber, which topped out at orange -- an 8 looked "average".)
  if (averagePerformance >= 1 && averagePerformance <= 5) {
    const t = (averagePerformance - 1) / 4;
    const r = Math.round(153 + (217 - 153) * t);
    const g = Math.round(27 + (119 - 27) * t);
    const b = Math.round(27 + (6 - 27) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  const t = Math.min(1, Math.max(0, (averagePerformance - 5) / 5));
  const r = Math.round(217 + (22 - 217) * t);
  const g = Math.round(119 + (163 - 119) * t);
  const b = Math.round(6 + (74 - 6) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getScoreColor(metric: ScoreMetric, average: number | null): string {
  if (average === null) return colors.surface;
  if (metric === "effort") return getIntensityColor(average);
  if (metric === "performance") return getPerformanceColor(average);
  return getMoodColor(average);
}

export default function CalendarScreen() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [averages, setAverages] = useState<DailyScoreAverage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hiddenSliders, setHiddenSliders] = useState<Set<string> | null>(null);
  const [metric, setMetric] = useState<ScoreMetric>("mood");

  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const calendarOpacity = useRef(new Animated.Value(0)).current;
  const calendarScale = useRef(new Animated.Value(0.95)).current;
  const dayAnimations = useRef<Animated.Value[]>([]).current;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const visibleMetrics = METRICS.filter(
    (m) => hiddenSliders !== null && !hiddenSliders.has(m.key)
  );
  const activeMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];

  // Reload slider visibility whenever the screen gains focus, so changes
  // made in Settings > Journal questions are reflected immediately.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getHiddenSliderKeys()
        .catch(() => new Set<string>())
        .then((hidden) => {
          if (cancelled) return;
          setHiddenSliders(hidden);
          const visible = METRICS.filter((m) => !hidden.has(m.key));
          setMetric((current) =>
            visible.some((m) => m.key === current)
              ? current
              : visible[0]?.key ?? "mood"
          );
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    const loadAverages = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDailyScoreAveragesForMonth(year, month, metric);
        setAverages(data);

        // Reset animations
        headerOpacity.setValue(0);
        headerTranslateY.setValue(-20);
        calendarOpacity.setValue(0);
        calendarScale.setValue(0.95);

        // Animate header
        Animated.parallel([
          Animated.timing(headerOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(headerTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();

        // Animate calendar grid
        Animated.parallel([
          Animated.timing(calendarOpacity, {
            toValue: 1,
            duration: 500,
            delay: 150,
            useNativeDriver: true,
          }),
          Animated.spring(calendarScale, {
            toValue: 1,
            friction: 7,
            tension: 50,
            delay: 150,
            useNativeDriver: true,
          }),
        ]).start();

        // Initialize day animations
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const totalCells = firstDay + daysInMonth;

        // Ensure we have enough animation values
        while (dayAnimations.length < totalCells) {
          dayAnimations.push(new Animated.Value(0));
        }

        // Reset all animations to 0
        dayAnimations.slice(0, totalCells).forEach((anim) => {
          anim.setValue(0);
        });

        // Stagger day animations
        const dayAnimationsToRun = dayAnimations.slice(0, totalCells);
        if (dayAnimationsToRun.length > 0) {
          Animated.stagger(
            15,
            dayAnimationsToRun.map((anim) =>
              Animated.spring(anim, {
                toValue: 1,
                friction: 6,
                tension: 50,
                useNativeDriver: true,
              })
            )
          ).start();
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load calendar data");
      } finally {
        setLoading(false);
      }
    };

    loadAverages();
  }, [
    year,
    month,
    metric,
    calendarOpacity,
    calendarScale,
    dayAnimations,
    headerOpacity,
    headerTranslateY,
  ]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const getScoreForDate = (date: number): number | null => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    const found = averages.find((avg) => avg.date === dateStr);
    return found?.average ?? null;
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = currentDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  // Create calendar grid
  const calendarDays: (number | null)[] = [];
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const calendarWeeks = chunkWeeks(calendarDays);

  const handleDayPress = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    router.push(`/journal?date=${dateStr}`);
  };

  return (
    <Page>
      <PageHeader title="Calendar" subtitle={activeMetric.subtitle} onBack={() => router.back()} />
      <Animated.View
        style={[
          styles.headerRow,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>{monthName}</Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {visibleMetrics.length > 1 && (
        <View style={styles.tabBar}>
          {visibleMetrics.map((m) => {
            const isActive = metric === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setMetric(m.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {hiddenSliders !== null && visibleMetrics.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>
            All score sliders are hidden. Turn them back on in Settings → Journal
            questions to see your calendar.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <Animated.View
          style={{
            opacity: calendarOpacity,
            transform: [{ scale: calendarScale }],
          }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Day headers */}
            <Animated.View style={styles.dayHeaders}>
              {DAYS_OF_WEEK.map((day) => (
                <Animated.View
                  key={day}
                  style={[
                    styles.dayHeader,
                    {
                      opacity: headerOpacity,
                      transform: [
                        {
                          translateY: headerTranslateY.interpolate({
                            inputRange: [-20, 0],
                            outputRange: [-10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </Animated.View>
              ))}
            </Animated.View>

            {/* Calendar grid — one flex row per week so all 7 columns always fit */}
            <View style={styles.calendarGrid}>
              {calendarWeeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.weekRow}>
                  {week.map((day, dayIndex) => {
                    const index = weekIndex * 7 + dayIndex;
                    const animValue = dayAnimations[index] || new Animated.Value(1);

                    if (day === null) {
                      return (
                        <Animated.View
                          key={`empty-${weekIndex}-${dayIndex}`}
                          style={[
                            styles.dayCellWrapper,
                            {
                              opacity: animValue,
                              transform: [
                                {
                                  scale: animValue.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.5, 1],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          <View style={[styles.dayCell, styles.emptyDayCell]} />
                        </Animated.View>
                      );
                    }

                    const score = getScoreForDate(day);
                    const color = getScoreColor(metric, score);
                    const now = new Date();
                    const isToday =
                      day === now.getDate() &&
                      month === now.getMonth() + 1 &&
                      year === now.getFullYear();

                    return (
                      <Animated.View
                        key={`${weekIndex}-${day}`}
                        style={[
                          styles.dayCellWrapper,
                          {
                            opacity: animValue,
                            transform: [
                              {
                                scale: animValue.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.5, 1],
                                }),
                              },
                            ],
                          },
                        ]}
                        >
                          <TouchableOpacity
                            style={[styles.dayCell, { backgroundColor: color }]}
                            onPress={() => handleDayPress(day)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.dayText,
                                isToday && styles.todayText,
                                score === null && styles.noDataText,
                              ]}
                            >
                              {day}
                            </Text>
                            {score !== null && (
                              <Text style={styles.scoreIndicator}>{score.toFixed(1)}</Text>
                            )}
                          </TouchableOpacity>
                        </Animated.View>
                      );
                    })}
                  </View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButtonText: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    minWidth: 180,
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: colors.accentSolid,
    borderColor: colors.accentSolid,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.white,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 32,
    flexGrow: 0,
  },
  dayHeaders: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 6,
  },
  dayHeader: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
  calendarGrid: {
    width: "100%",
    gap: 6,
  },
  weekRow: {
    flexDirection: "row",
    width: "100%",
    gap: 6,
  },
  dayCellWrapper: {
    flex: 1,
  },
  dayCell: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyDayCell: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  todayText: {
    fontWeight: "700",
    fontSize: 15,
    color: colors.white,
  },
  noDataText: {
    color: colors.faint,
  },
  scoreIndicator: {
    fontSize: 9,
    fontWeight: "500",
    color: colors.white,
    marginTop: 2,
    opacity: 0.9,
  },
});
