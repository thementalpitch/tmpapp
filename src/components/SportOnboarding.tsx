import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppButton, TextButton } from "./AppChrome";
import { upsertProfile } from "../api/profiles";
import { SPORTS } from "../utils/sports";
import { colors, font, radius, space, type as typeStyles } from "../theme";

/** Set when the user skips the sport picker so it doesn't show again. */
export const SPORT_PICKER_DISMISSED_KEY = "mentalPitch.sportPickerDismissed.v1";

export function SportOnboarding({ onComplete }: { onComplete: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!selected || saving) return;
    try {
      setSaving(true);
      await upsertProfile({ preferred_sport: selected });
      onComplete();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Couldn't save your sport. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(SPORT_PICKER_DISMISSED_KEY, "1").catch(() => {});
    onComplete();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What sport do you play?</Text>
        <Text style={styles.subtitle}>
          We'll use it to personalize your profile. You can change it anytime in Profile.
        </Text>
        <View style={styles.options}>
          {SPORTS.map((sport) => (
            <TouchableOpacity
              key={sport}
              style={[styles.chip, selected === sport && styles.chipActive]}
              onPress={() => setSelected(sport)}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === sport }}
            >
              <Text style={[styles.chipText, selected === sport && styles.chipTextActive]}>
                {sport}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <AppButton
          label={saving ? "Saving..." : "Continue"}
          onPress={handleContinue}
          disabled={!selected || saving}
        />
        <TextButton label="Skip for now" onPress={handleSkip} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.md },
  title: { ...typeStyles.pageTitle, marginBottom: space.sm, textAlign: "center" },
  subtitle: {
    fontFamily: font,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "center",
    marginBottom: space.lg,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center" },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 40,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentSolid,
  },
  chipText: {
    fontFamily: font,
    fontSize: 14,
    fontWeight: "500",
    color: colors.muted,
  },
  chipTextActive: {
    color: colors.accentStrong,
    fontWeight: "600",
  },
  actions: { padding: space.lg, paddingTop: space.sm, gap: space.sm, alignItems: "center" },
});
