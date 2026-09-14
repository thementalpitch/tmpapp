import React from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View, type TextStyle, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { button, card, colors, font, layout, list, radius, space, type as typeStyles } from "../theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function Page({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[layout.page, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.cardPad, card, style]}>{children}</View>;
}

export function Section({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.section, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={typeStyles.sectionTitle}>{children}</Text>;
}

export function HelperText({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[styles.helper, style]}>{children}</Text>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action}
    </View>
  );
}

export function GroupedList({ children }: { children: React.ReactNode }) {
  return <View style={list.group}>{children}</View>;
}

export function GroupedRow({
  label,
  value,
  border = true,
}: {
  label: string;
  value: string;
  border?: boolean;
}) {
  return (
    <View style={[styles.groupedRow, border && styles.groupedRowBorder]}>
      <Text style={styles.groupedLabel}>{label}</Text>
      <Text style={styles.groupedValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function MetricHero({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
}) {
  return (
    <View style={styles.metricHero}>
      <Text style={styles.metricHeroLabel}>{label}</Text>
      <View style={styles.metricHeroValueRow}>
        <Text style={typeStyles.statValue}>{value}</Text>
        {unit ? <Text style={styles.metricHeroUnit}>{unit}</Text> : null}
      </View>
      {detail ? <Text style={typeStyles.caption}>{detail}</Text> : null}
    </View>
  );
}

export function ListGroup({ children }: { children: React.ReactNode }) {
  return <View style={list.group}>{children}</View>;
}

export function ListRow({
  icon,
  label,
  onPress,
  border = true,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  border?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.listRow, border && styles.listRowBorder]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <Ionicons name={icon} size={20} color={colors.muted} />
      <Text style={styles.listLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.faint} />
    </TouchableOpacity>
  );
}

export function PressableCard({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.pressableRow} onPress={onPress} activeOpacity={0.72}>
      <View style={styles.pressableCopy}>
        <Text style={typeStyles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={typeStyles.caption}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </TouchableOpacity>
  );
}

export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.72} style={styles.textButton}>
      <Text style={styles.textButtonLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function BackButton({ onPress, label = "Back" }: { onPress: () => void; label?: string }) {
  return (
    <TouchableOpacity style={styles.backButton} onPress={onPress} activeOpacity={0.72}>
      <Ionicons name="chevron-back" size={20} color={colors.muted} />
      <Text style={styles.backText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {onBack && <BackButton onPress={onBack} />}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  primary = false,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  primary?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      style={[styles.iconButton, primary && styles.iconButtonPrimary, style]}
      onPress={onPress}
      activeOpacity={primary ? 0.88 : 0.72}
    >
      <Ionicons
        name={icon}
        size={primary ? 26 : 22}
        color={primary ? colors.onPrimary : colors.muted}
      />
    </TouchableOpacity>
  );
}

export function BottomNav({
  onHome,
  onAdd,
  onCalendar,
}: {
  onHome?: () => void;
  onAdd?: () => void;
  onCalendar?: () => void;
}) {
  return (
    <View style={styles.bottomNav}>
      {onHome && <IconButton icon="home-outline" onPress={onHome} />}
      {onAdd && <IconButton icon="add" onPress={onAdd} primary />}
      {onCalendar && <IconButton icon="calendar-outline" onPress={onCalendar} />}
    </View>
  );
}

export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
  style,
  flex,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "dangerOutline";
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
  flex?: boolean;
}) {
  const shell = {
    primary: button.primary,
    secondary: button.secondary,
    danger: button.danger,
    dangerOutline: button.dangerOutline,
  }[variant];
  const textStyle = {
    primary: button.primaryText,
    secondary: button.secondaryText,
    danger: button.dangerText,
    dangerOutline: button.dangerOutlineText,
  }[variant];
  const iconColor =
    variant === "primary"
      ? colors.onPrimary
      : variant === "danger"
      ? colors.white
      : variant === "dangerOutline"
      ? colors.danger
      : colors.text;

  const touchable = (
    <Pressable
      style={({ pressed }) => [
        button.base,
        shell,
        flex && styles.buttonFlexInner,
        disabled && styles.disabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {icon && <Ionicons name={icon} size={18} color={iconColor} />}
      <Text style={[textStyle, flex && styles.buttonFlexText]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );

  if (flex) {
    return <View style={styles.buttonFlexSlot}>{touchable}</View>;
  }

  return touchable;
}

export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.buttonRow}>{children}</View>;
}

/** Open form section — no card wrapper; spacing and typography carry hierarchy. */
export function FormSection({
  title,
  hint,
  children,
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.formSection}>
      {title ? <Text style={styles.formTitle}>{title}</Text> : null}
      {hint ? <Text style={styles.formHint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.segment, selected && styles.segmentSelected]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.72}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: space.xxl },
  cardPad: { padding: space.lg },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: space.lg,
    gap: space.lg,
  },
  headerText: { flex: 1 },
  title: { ...typeStyles.pageTitle },
  subtitle: { marginTop: space.xs, ...typeStyles.body, fontSize: 15, lineHeight: 22 },
  helper: { ...typeStyles.caption, marginBottom: space.md },
  empty: { flex: 1, justifyContent: "center", paddingHorizontal: space.xs, gap: space.sm },
  emptyTitle: { ...typeStyles.cardTitle, fontSize: 18, marginBottom: 0 },
  emptyBody: { ...typeStyles.body, marginBottom: space.sm },
  groupedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: space.lg,
    gap: space.lg,
    minHeight: 48,
  },
  groupedRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  groupedLabel: { ...typeStyles.label, flex: 1 },
  groupedValue: {
    fontFamily: font,
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    textAlign: "right",
    flexShrink: 1,
    maxWidth: "52%",
  },
  metricHero: {
    marginBottom: space.xl,
    paddingBottom: space.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  metricHeroLabel: { ...typeStyles.sectionTitle, marginBottom: space.sm },
  metricHeroValueRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  metricHeroUnit: { fontFamily: font, fontSize: 18, color: colors.faint, fontWeight: "500" },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: space.lg,
    gap: space.md,
    minHeight: 48,
  },
  listRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  listLabel: {
    flex: 1,
    fontFamily: font,
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
  },
  pressableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
    gap: space.md,
    ...card,
  },
  pressableCopy: { flex: 1, gap: space.xs },
  textButton: { paddingVertical: space.sm, paddingHorizontal: space.xs, minHeight: 44, justifyContent: "center" },
  textButtonLabel: {
    fontFamily: font,
    fontSize: 16,
    fontWeight: "600",
    color: colors.accentStrong,
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    minHeight: 44,
    marginBottom: space.sm,
    marginLeft: -4,
  },
  backText: {
    fontFamily: font,
    color: colors.muted,
    fontSize: 16,
    fontWeight: "500",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: space.md,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  iconButtonPrimary: {
    ...button.iconPrimary,
    width: 52,
    height: 52,
    borderWidth: 0,
  },
  disabled: { opacity: 0.45 },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  segmented: {
    flexDirection: "row",
    gap: space.xs,
    marginBottom: space.xl,
    padding: 3,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: "center",
    minHeight: 40,
    justifyContent: "center",
  },
  segmentSelected: {
    backgroundColor: colors.accentMuted,
  },
  segmentText: {
    fontFamily: font,
    fontSize: 14,
    fontWeight: "500",
    color: colors.faint,
  },
  segmentTextSelected: {
    color: colors.accentStrong,
    fontWeight: "600",
  },
  formSection: {
    marginBottom: space.xxl,
    gap: space.md,
  },
  formTitle: {
    fontFamily: font,
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  formHint: {
    ...typeStyles.caption,
    marginTop: -space.xs,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "stretch",
    alignSelf: "stretch",
    width: "100%",
    gap: space.sm,
  },
  buttonFlexSlot: {
    flex: 1,
    minWidth: 0,
  },
  buttonFlexInner: {
    flex: 1,
    width: "100%",
    paddingHorizontal: space.md,
  },
  buttonFlexText: {
    fontSize: 15,
  },
});
