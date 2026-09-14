import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { JournalAiInsight } from "../api";
import { card, colors, font, radius, space, type as typeStyles } from "../theme";

function hasInsightContent(insight: JournalAiInsight): boolean {
  return Boolean(insight.experience || insight.tips.length > 0);
}

function statusCopy(insight: JournalAiInsight): string | null {
  if (hasInsightContent(insight)) return null;
  if (insight.status === "pending" || insight.status === "processing") {
    return "Your insight is being prepared.";
  }
  if (insight.status === "error") {
    return "This insight could not be generated yet.";
  }
  return null;
}

export function AiInsightButton({
  insight,
  onPress,
}: {
  insight: JournalAiInsight;
  onPress: (insight: JournalAiInsight) => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Open AI insight"
      style={styles.starButton}
      activeOpacity={0.76}
      onPress={(event: GestureResponderEvent) => {
        event.stopPropagation();
        onPress(insight);
      }}
    >
      <MaterialCommunityIcons name="star-four-points" size={18} color={colors.accent} />
    </TouchableOpacity>
  );
}

export function AiInsightModal({
  insight,
  visible,
  onClose,
}: {
  insight: JournalAiInsight | null;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {insight ? (
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.starBadge}>
                  <MaterialCommunityIcons name="star-four-points" size={18} color={colors.accent} />
                </View>
                <View style={styles.modalTitleCopy}>
                  <Text style={styles.modalTitle}>Performance insights</Text>
                  <Text style={styles.modalSubtitle}>Experience and next actions</Text>
                </View>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close AI insight"
                style={styles.closeButton}
                activeOpacity={0.72}
                onPress={onClose}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <AiInsightCards insight={insight} compact />
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

export function AiInsightCards({
  insight,
  compact = false,
}: {
  insight: JournalAiInsight | null;
  compact?: boolean;
}) {
  if (!insight) return null;

  const message = statusCopy(insight);

  return (
    <View style={[styles.cardsWrap, compact && styles.cardsWrapCompact]}>
      {message ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>AI insight</Text>
          <Text style={styles.stateText}>{message}</Text>
        </View>
      ) : null}

      {insight.experience ? (
        <View style={styles.insightCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="star-four-points-outline" size={16} color={colors.accent} />
            <Text style={styles.sectionTitle}>Pro athlete experience</Text>
          </View>
          <Text style={styles.bodyText}>{insight.experience}</Text>
        </View>
      ) : null}

      {insight.tips.length > 0 ? (
        <View style={styles.insightCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle-outline" size={17} color={colors.accent} />
            <Text style={styles.sectionTitle}>Tips</Text>
          </View>
          <View style={styles.tipList}>
            {insight.tips.map((tip, index) => (
              <View key={`${index}-${tip}`} style={styles.tipRow}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.bodyText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  starButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.28)",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: space.xl,
    backgroundColor: colors.overlay,
  },
  modalPanel: {
    maxHeight: "78%",
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    padding: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  modalTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md },
  starBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.22)",
  },
  modalTitleCopy: { flex: 1 },
  modalTitle: { ...typeStyles.cardTitle, fontSize: 17 },
  modalSubtitle: { ...typeStyles.caption, marginTop: 1 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalScroll: { padding: space.lg, paddingBottom: space.xxl },
  cardsWrap: { gap: space.md, marginBottom: space.xxl },
  cardsWrapCompact: { marginBottom: 0 },
  insightCard: {
    ...card,
    gap: space.md,
    backgroundColor: colors.surfaceRaised,
  },
  stateCard: {
    ...card,
    gap: space.xs,
    backgroundColor: colors.surfaceRaised,
  },
  stateTitle: {
    fontFamily: font,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    color: colors.text,
  },
  stateText: {
    fontFamily: font,
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  sectionTitle: {
    fontFamily: font,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.text,
  },
  bodyText: {
    flex: 1,
    fontFamily: font,
    fontSize: 15,
    lineHeight: 23,
    color: colors.muted,
  },
  tipList: { gap: space.md },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.22)",
    marginTop: 1,
  },
  tipNumberText: {
    fontFamily: font,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.accent,
  },
});
