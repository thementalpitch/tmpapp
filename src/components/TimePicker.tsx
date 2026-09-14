import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native";
import { AppButton } from "./AppChrome";
import { card, colors, font, radius, type as typeStyles } from "../theme";

interface TimePickerProps {
  time: string;
  onTimeChange: (time: string) => void;
  compact?: boolean;
}

export function TimePicker({ time, onTimeChange, compact = false }: TimePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState(() => Number(time.split(":")[0]) || 0);
  const [selectedMinute, setSelectedMinute] = useState(() => Number(time.split(":")[1]) || 0);

  useEffect(() => {
    const [hourPart, minutePart] = time.split(":");
    setSelectedHour(Number(hourPart) || 0);
    setSelectedMinute(Number(minutePart) || 0);
  }, [time]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const handleConfirm = () => {
    onTimeChange(
      `${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`
    );
    setModalVisible(false);
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, compact && styles.triggerCompact]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={`Change reminder time, currently ${formatTime(selectedHour, selectedMinute)}`}
      >
        <Text style={[styles.triggerText, compact && styles.triggerTextCompact]}>
          {formatTime(selectedHour, selectedMinute)}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={typeStyles.sectionTitle}>Reminder time</Text>
            <View style={styles.pickers}>
              <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[styles.item, selectedHour === hour && styles.itemSelected]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text style={[styles.itemText, selectedHour === hour && styles.itemTextSelected]}>
                      {formatTime(hour, 0).split(":")[0]} {formatTime(hour, 0).split(" ")[1]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
                {minutes.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[styles.item, selectedMinute === minute && styles.itemSelected]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text style={[styles.itemText, selectedMinute === minute && styles.itemTextSelected]}>
                      {String(minute).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.actions}>
              <AppButton label="Cancel" onPress={() => setModalVisible(false)} variant="secondary" />
              <AppButton label="Confirm" onPress={handleConfirm} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    ...card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    minWidth: 120,
    alignItems: "center",
  },
  triggerText: { ...typeStyles.cardTitle },
  triggerCompact: { minWidth: 88, paddingHorizontal: 9, paddingVertical: 9 },
  triggerTextCompact: { fontSize: 14 },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    ...card,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 32,
    maxHeight: "70%",
  },
  pickers: { flexDirection: "row", height: 200, marginBottom: 16, gap: 8 },
  column: { flex: 1 },
  item: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center",
    borderRadius: radius.sm,
    marginVertical: 2,
  },
  itemSelected: { backgroundColor: colors.accentSolid },
  itemText: { fontFamily: font, fontSize: 15, color: colors.muted },
  itemTextSelected: { color: colors.onPrimary, fontWeight: "600" },
  actions: { gap: 10 },
});
