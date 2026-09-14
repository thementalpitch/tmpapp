import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MoodRing } from "./MoodRing";
import { colors, font, space, type as typeStyles } from "../theme";

export function MoodHeroRing({
  label,
  score,
  detail,
}: {
  label: string;
  score: number | null;
  detail?: string;
}) {
  return (
    <View style={styles.wrap}>
      <MoodRing score={score} size="lg" />
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {detail ? (
          <Text
            style={styles.detail}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xl,
    marginBottom: space.xl,
    paddingBottom: space.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  copy: { flex: 1, gap: space.sm, minWidth: 0 },
  label: {
    ...typeStyles.cardTitle,
    fontSize: 18,
  },
  detail: {
    fontFamily: font,
    fontSize: 14,
    lineHeight: 18,
    color: colors.faint,
  },
});
