import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { FormSection } from "./AppChrome";
import { colors, font, radius, space, type as typeStyles } from "../theme";

interface MoodScoreInputProps {
  moodScore: string;
  onMoodChange: (score: string) => void;
  isFoodType?: boolean;
}

interface ScoreSliderProps {
  title: string;
  hint: string;
  value: number | null;
  minimumValue: number;
  lowLabel: string;
  highLabel: string;
  onChange: (score: number) => void;
}

function ScoreSlider({
  title,
  hint,
  value,
  minimumValue,
  lowLabel,
  highLabel,
  onChange,
}: ScoreSliderProps) {
  return (
    <FormSection title={title} hint={hint}>
      <View style={styles.panel}>
        <View style={styles.scoreRow}>
          <Text style={[styles.score, value === null && styles.unset]}>{value ?? "Not set"}</Text>
          {value !== null && <Text style={styles.outOf}>/ 10</Text>}
        </View>
        <Slider
          style={styles.slider}
          minimumValue={minimumValue}
          maximumValue={10}
          step={1}
          value={value ?? minimumValue}
          onValueChange={(score) => onChange(Math.round(score))}
          onSlidingComplete={(score) => onChange(Math.round(score))}
          minimumTrackTintColor={colors.accentSolid}
          maximumTrackTintColor={colors.borderSubtle}
          thumbTintColor={colors.accentSolid}
          accessibilityLabel={title}
          accessibilityValue={{
            min: minimumValue,
            max: 10,
            now: value ?? minimumValue,
            text: value === null ? "Not set" : `${value} out of 10`,
          }}
        />
        <View style={styles.trackLabels}>
          <Text style={styles.trackLabel}>{lowLabel}</Text>
          <Text style={styles.trackLabel}>{highLabel}</Text>
        </View>
      </View>
    </FormSection>
  );
}

export function MoodScoreInput({ moodScore, onMoodChange, isFoodType = false }: MoodScoreInputProps) {
  const score = Number(moodScore);
  return (
    <ScoreSlider
      title={isFoodType ? "Mood after eating" : "Mood"}
      hint="1 is low, 10 is high."
      value={moodScore && !isNaN(score) ? score : 5}
      minimumValue={1}
      lowLabel="Low"
      highLabel="High"
      onChange={(value) => onMoodChange(String(value))}
    />
  );
}

export function RpeInput({
  rpeScore,
  onRpeChange,
}: {
  rpeScore: number | null;
  onRpeChange: (score: number) => void;
}) {
  return (
    <ScoreSlider
      title="Session effort (RPE)"
      hint="How hard did this session feel?"
      value={rpeScore}
      minimumValue={0}
      lowLabel="Rest"
      highLabel="Max effort"
      onChange={onRpeChange}
    />
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
    gap: space.sm,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.xs,
  },
  score: {
    fontFamily: font,
    fontSize: 40,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 44,
  },
  unset: { fontSize: 18, letterSpacing: 0 },
  outOf: { fontFamily: font, fontSize: 16, color: colors.faint, fontWeight: "500" },
  slider: { width: "100%", height: 36 },
  trackLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  trackLabel: { ...typeStyles.caption, fontSize: 13 },
});
