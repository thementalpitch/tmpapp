import React, { useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { colors, font, radius, space, type as typeStyles } from "../theme";
import { formatDateLocal } from "../utils/date";

type MoodPoint = { date: string; averageMood: number | null };

const PLOT_H = 120;
const PAD = { top: 8, left: 4, right: 4, bottom: 0 };

function formatLabel(dateStr: string): string {
  return formatDateLocal(dateStr, { month: "short", day: "numeric" });
}

function labelIndexes(count: number): Set<number> {
  if (count <= 7) return new Set(Array.from({ length: count }, (_, i) => i));
  const slots = 5;
  return new Set(Array.from({ length: slots }, (_, i) => Math.round((i * (count - 1)) / (slots - 1))));
}

function moodY(mood: number, plotH: number): number {
  return PAD.top + plotH * (1 - (mood - 1) / 9);
}

export function MoodLineChart({ data }: { data: MoodPoint[] }) {
  const { width: screenW } = useWindowDimensions();
  const [chartW, setChartW] = useState(screenW - 72);
  const points = data.filter((d): d is { date: string; averageMood: number } => d.averageMood != null);

  if (points.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.placeholder}>No mood scores in this period yet.</Text>
      </View>
    );
  }

  if (points.length === 1) {
    return (
      <View style={styles.single}>
        <Text style={styles.hint}>Log mood on one more day to see a trend line.</Text>
      </View>
    );
  }

  const plotW = Math.max(chartW - PAD.left - PAD.right, 1);
  const coords = points.map((p, i) => ({
    ...p,
    x: PAD.left + (i / (points.length - 1)) * plotW,
    y: moodY(p.averageMood, PLOT_H),
  }));

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const labels = labelIndexes(points.length);
  const svgH = PAD.top + PLOT_H + 8;

  return (
    <View style={styles.wrap} onLayout={(e) => setChartW(e.nativeEvent.layout.width)}>
      <View style={styles.yLabels}>
        <Text style={styles.axis}>10</Text>
        <Text style={styles.axis}>5</Text>
        <Text style={styles.axis}>1</Text>
      </View>
      <View style={styles.plotCol}>
        <Svg width={chartW} height={svgH}>
          {[1, 5, 10].map((tick) => {
            const y = moodY(tick, PLOT_H);
            return (
              <Line
                key={tick}
                x1={PAD.left}
                y1={y}
                x2={chartW - PAD.right}
                y2={y}
                stroke={colors.borderSubtle}
                strokeWidth={1}
              />
            );
          })}
          <Path
            d={path}
            stroke={colors.accentSolid}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {coords.map((c) => (
            <Circle
              key={c.date}
              cx={c.x}
              cy={c.y}
              r={4}
              fill={colors.bg}
              stroke={colors.accentSolid}
              strokeWidth={2}
            />
          ))}
        </Svg>
        <View style={styles.xRow}>
          {coords.map((c, i) => (
            <View key={c.date} style={styles.xCell}>
              {labels.has(i) ? <Text style={styles.axis}>{formatLabel(c.date)}</Text> : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    paddingVertical: space.md,
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: space.md,
  },
  empty: {
    paddingVertical: space.xxxl,
    paddingHorizontal: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  placeholder: { ...typeStyles.body, textAlign: "center", fontSize: 15 },
  single: {
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
  },
  hint: { ...typeStyles.body, textAlign: "center", fontSize: 15, color: colors.muted },
  yLabels: {
    width: 20,
    height: PLOT_H + PAD.top,
    justifyContent: "space-between",
    paddingTop: PAD.top - 2,
  },
  axis: { fontFamily: font, fontSize: 11, color: colors.faint, fontWeight: "500" },
  plotCol: { flex: 1 },
  xRow: { flexDirection: "row", marginTop: space.sm },
  xCell: { flex: 1, alignItems: "center" },
});
