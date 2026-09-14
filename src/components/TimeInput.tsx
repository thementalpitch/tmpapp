import React from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { FormSection } from "./AppChrome";
import { colors, font, input, radius, space, type as typeStyles } from "../theme";

interface TimeInputProps {
  timeString: string;
  amPm: "AM" | "PM";
  onTimeChange: (time: string) => void;
  onAmPmChange: (amPm: "AM" | "PM") => void;
}

export function TimeInput({ timeString, amPm, onTimeChange, onAmPmChange }: TimeInputProps) {
  const handleHourChange = (text: string) => {
    const parts = timeString.split(":");
    onTimeChange(`${text.replace(/[^0-9]/g, "").slice(0, 2)}:${parts[1] || ""}`);
  };

  const handleMinuteChange = (text: string) => {
    const parts = timeString.split(":");
    onTimeChange(`${parts[0] || ""}:${text.replace(/[^0-9]/g, "").slice(0, 2)}`);
  };

  return (
    <FormSection title="Time" hint="When did this session happen?">
      <View style={styles.row}>
        <View style={styles.timeGroup}>
          <TextInput
            style={styles.timeField}
            placeholder="12"
            placeholderTextColor={colors.faint}
            value={timeString.split(":")[0] || ""}
            onChangeText={handleHourChange}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.sep}>:</Text>
          <TextInput
            style={styles.timeField}
            placeholder="00"
            placeholderTextColor={colors.faint}
            value={timeString.split(":")[1] || ""}
            onChangeText={handleMinuteChange}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={styles.amPm}>
          {(["AM", "PM"] as const).map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.amPmBtn, amPm === value && styles.amPmBtnActive]}
              onPress={() => onAmPmChange(value)}
              activeOpacity={0.72}
            >
              <Text style={[styles.amPmText, amPm === value && styles.amPmTextActive]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </FormSection>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", gap: space.md },
  timeGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...input,
    paddingVertical: space.md,
    gap: space.xs,
  },
  timeField: {
    fontFamily: font,
    fontSize: 28,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    minWidth: 44,
    paddingVertical: 0,
    letterSpacing: -0.5,
  },
  sep: { fontFamily: font, fontSize: 24, fontWeight: "500", color: colors.faint },
  amPm: {
    flexDirection: "row",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
    backgroundColor: colors.surfaceRaised,
  },
  amPmBtn: {
    paddingHorizontal: space.lg,
    justifyContent: "center",
    minWidth: 52,
    minHeight: 48,
  },
  amPmBtnActive: { backgroundColor: colors.accentSolid },
  amPmText: { fontFamily: font, fontSize: 15, fontWeight: "600", color: colors.muted, textAlign: "center" },
  amPmTextActive: { color: colors.onPrimary },
});
