import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
  AppState,
} from "react-native";
import { useRouter } from "expo-router";
import {
  resolveDailyReminderTimes,
  syncNotificationTimezone,
  updateNotificationPreferences,
} from "../../src/api";
import { AppButton, Card, Page, PageHeader, Section } from "../../src/components/AppChrome";
import { TimePicker } from "../../src/components/TimePicker";
import { colors, font, radius, space, type as typeStyles } from "../../src/theme";
import {
  cancelAllNotifications,
  hasNotificationPermissions,
  openNotificationSettings,
  registerNotificationToken,
  requestNotificationPermissions,
  scheduleNotifications,
} from "../../src/services/notifications";

const DAYS = [
  { label: "Sun", name: "Sunday" },
  { label: "Mon", name: "Monday" },
  { label: "Tue", name: "Tuesday" },
  { label: "Wed", name: "Wednesday" },
  { label: "Thu", name: "Thursday" },
  { label: "Fri", name: "Friday" },
  { label: "Sat", name: "Saturday" },
];

export default function NotificationSettings() {
  const router = useRouter();
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dailyReminderTimes, setDailyReminderTimes] = useState<Record<string, string>>({});
  const [permissionGranted, setPermissionGranted] = useState(false);

  const refreshNotificationPermission = async () => {
    const granted = await hasNotificationPermissions();
    setPermissionGranted(granted);
    return granted;
  };

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const [prefs, granted] = await Promise.all([
          syncNotificationTimezone(),
          hasNotificationPermissions(),
        ]);
        setNotificationsEnabled(prefs.enabled);
        setDailyReminderTimes(resolveDailyReminderTimes(prefs));
        setPermissionGranted(granted);
      } catch (error: any) {
        Alert.alert("Notifications", error?.message || "Failed to load notification settings.");
      } finally {
        setLoadingNotifications(false);
      }
    };

    loadNotifications();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshNotificationPermission().catch(() => {});
      }
    });

    return () => subscription.remove();
  }, []);

  const showNotificationSettingsPrompt = () => {
    Alert.alert(
      "Turn On Notifications",
      "Allow notifications in iPhone Settings to receive journal reminders.",
      [
        { text: "Not Now", style: "cancel" },
        { text: "Open Settings", onPress: openNotificationSettings },
      ]
    );
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!enabled) {
      setNotificationsEnabled(false);
      return;
    }

    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);
    if (!granted) {
      setNotificationsEnabled(false);
      showNotificationSettingsPrompt();
      return;
    }

    setNotificationsEnabled(true);
    await registerNotificationToken();
  };

  const toggleDay = (day: number) => {
    const key = String(day);
    setDailyReminderTimes((current) => {
      if (current[key]) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: "18:00" };
    });
  };

  const handleSaveNotifications = async () => {
    try {
      setSavingNotifications(true);
      let enabled = notificationsEnabled;
      const reminderDays = Object.keys(dailyReminderTimes)
        .map(Number)
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        .sort((a, b) => a - b);

      if (enabled && reminderDays.length === 0) {
        Alert.alert("Choose a day", "Turn on at least one day for journal reminders.");
        return;
      }

      if (enabled) {
        const granted = await requestNotificationPermissions();
        setPermissionGranted(granted);
        if (!granted) {
          enabled = false;
          setNotificationsEnabled(false);
          Alert.alert("Notifications Off", "Notification access was not granted.");
        } else {
          await registerNotificationToken();
        }
      }

      const prefs = await updateNotificationPreferences({
        enabled,
        daily_reminder_times: dailyReminderTimes,
        // Keep legacy fields populated for older deployed clients.
        reminder_times: [...new Set(Object.values(dailyReminderTimes))],
        reminder_days: reminderDays,
      });

      if (prefs.enabled) {
        await scheduleNotifications(prefs);
      } else {
        await cancelAllNotifications();
      }

      Alert.alert("Saved", "Notification settings updated.");
    } catch (error: any) {
      Alert.alert("Notifications", error?.message || "Failed to save notification settings.");
    } finally {
      setSavingNotifications(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Journal reminders"
        subtitle="Daily journal reminders"
        onBack={() => router.back()}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Section>
          {loadingNotifications ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Card style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingCopy}>
                  <Text style={typeStyles.cardTitle}>Journal reminders</Text>
                  <Text style={typeStyles.caption}>
                    {permissionGranted ? "Notifications allowed on this device." : "Turn on to request access."}
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled && permissionGranted}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: colors.border, true: colors.accentStrong }}
                  thumbColor={colors.white}
                />
              </View>
              {notificationsEnabled && !permissionGranted ? (
                <AppButton
                  label="Open iPhone Settings"
                  onPress={openNotificationSettings}
                  variant="secondary"
                />
              ) : null}

              <View style={styles.scheduleHeader}>
                <View style={styles.scheduleTitleRow}>
                  <Text style={typeStyles.label}>Weekly schedule</Text>
                  <View style={styles.countPill}>
                    <Text style={styles.countPillText}>
                      {DAYS.filter((_, i) => dailyReminderTimes[String(i)]).length} of 7 on
                    </Text>
                  </View>
                </View>
                <Text style={typeStyles.caption}>Set a different time for each day.</Text>
              </View>
              <View style={styles.scheduleList}>
                {DAYS.map((day, index) => {
                  const key = String(index);
                  const selected = Boolean(dailyReminderTimes[key]);
                  return (
                    <View
                      key={day.name}
                      style={[
                        styles.scheduleRow,
                        index < DAYS.length - 1 && styles.scheduleRowBorder,
                      ]}
                    >
                      <Text style={[styles.dayLabel, !selected && styles.dayLabelDisabled]}>
                        {day.name}
                      </Text>
                      {selected ? (
                        <TimePicker
                          time={dailyReminderTimes[key]}
                          compact
                          onTimeChange={(time) =>
                            setDailyReminderTimes((current) => ({
                              ...current,
                              [key]: time,
                            }))
                          }
                        />
                      ) : (
                        <View style={styles.offChip}>
                          <Text style={styles.offChipText}>Off</Text>
                        </View>
                      )}
                      <Switch
                        value={selected}
                        onValueChange={() => toggleDay(index)}
                        trackColor={{ false: colors.border, true: colors.accentStrong }}
                        thumbColor={colors.white}
                        accessibilityLabel={`${day.name} reminders`}
                      />
                    </View>
                  );
                })}
              </View>

              <View style={styles.notificationActions}>
                <AppButton
                  label={savingNotifications ? "Saving..." : "Save reminders"}
                  onPress={handleSaveNotifications}
                  disabled={savingNotifications}
                />
              </View>
            </Card>
          )}
        </Section>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: space.xxxl },
  settingCard: { gap: 4 },
  settingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  settingCopy: { flex: 1, paddingRight: 8, gap: 4 },
  notificationActions: { marginTop: space.sm },
  scheduleHeader: { gap: space.xs, marginTop: space.lg, marginBottom: space.sm },
  scheduleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  countPillText: {
    fontFamily: font,
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
  },
  scheduleList: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
  },
  scheduleRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    backgroundColor: colors.surfaceRaised,
  },
  scheduleRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  dayLabel: { flex: 1, fontFamily: font, fontSize: 16, fontWeight: "600", color: colors.text },
  dayLabelDisabled: { color: colors.muted },
  offChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  offChipText: {
    fontFamily: font,
    fontSize: 14,
    fontWeight: "500",
    color: colors.faint,
  },
});
