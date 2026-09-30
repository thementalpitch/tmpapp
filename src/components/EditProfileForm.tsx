import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import type { Profile, ProfileUpdate } from "../api/types";
import { AppButton, FormSection } from "./AppChrome";
import { colors, font, input, radius, space, type as typeStyles } from "../theme";
import { SPORTS, POSITIONS } from "../utils/sports";

interface EditProfileFormProps {
  profile: Profile | null;
  onSave: (updates: ProfileUpdate) => Promise<void>;
  onCancel: () => void;
}

export function EditProfileForm({ profile, onSave, onCancel }: EditProfileFormProps) {
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [selectedSport, setSelectedSport] = useState(profile?.preferred_sport || "");
  const [selectedPosition, setSelectedPosition] = useState(profile?.preferred_position || "");
  const [saving, setSaving] = useState(false);
  const availablePositions = selectedSport ? POSITIONS[selectedSport] || [] : [];

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        preferred_sport: selectedSport || null,
        preferred_position: selectedPosition || null,
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <FormSection title="Name">
        <Text style={styles.fieldLabel}>First name</Text>
        <TextInput
          style={styles.fieldInput}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          placeholderTextColor={colors.faint}
        />
        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Last name</Text>
        <TextInput
          style={styles.fieldInput}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
          placeholderTextColor={colors.faint}
        />
      </FormSection>

      <FormSection title="Sport">
        <View style={styles.options}>
          {SPORTS.map((sport) => (
            <TouchableOpacity
              key={sport}
              style={[styles.chip, selectedSport === sport && styles.chipActive]}
              onPress={() => {
                setSelectedSport(sport);
                setSelectedPosition("");
              }}
              activeOpacity={0.72}
            >
              <Text style={[styles.chipText, selectedSport === sport && styles.chipTextActive]}>
                {sport}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </FormSection>

      {selectedSport && availablePositions.length > 0 && (
        <FormSection title="Position">
          <View style={styles.options}>
            {availablePositions.map((position) => (
              <TouchableOpacity
                key={position}
                style={[styles.chip, selectedPosition === position && styles.chipActive]}
                onPress={() => setSelectedPosition(position)}
                activeOpacity={0.72}
              >
                <Text style={[styles.chipText, selectedPosition === position && styles.chipTextActive]}>
                  {position}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormSection>
      )}

      <View style={styles.actions}>
        <AppButton label="Cancel" onPress={onCancel} variant="secondary" disabled={saving} />
        <AppButton label={saving ? "Saving..." : "Save changes"} onPress={handleSave} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { paddingBottom: space.xxl },
  fieldLabel: { ...typeStyles.label, marginBottom: space.sm },
  fieldLabelSpaced: { marginTop: space.lg },
  fieldInput: { ...input, fontFamily: font },
  options: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
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
  actions: { gap: space.sm, marginTop: space.sm },
});
