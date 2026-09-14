import React from "react";
import { StyleSheet, TextInput } from "react-native";
import { FormSection } from "./AppChrome";
import { colors, font, input, space } from "../theme";

export function OtherNotes({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <FormSection title="Other notes" hint="Anything else worth remembering.">
      <TextInput
        style={styles.field}
        multiline
        scrollEnabled={false}
        placeholder="Optional"
        placeholderTextColor={colors.faint}
        value={value}
        onChangeText={onChangeText}
        textAlignVertical="top"
      />
    </FormSection>
  );
}

const styles = StyleSheet.create({
  field: {
    ...input,
    minHeight: 108,
    fontFamily: font,
    lineHeight: 24,
    paddingTop: space.md,
  },
});
