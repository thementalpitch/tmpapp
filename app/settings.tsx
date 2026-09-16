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
import { useAuth } from "../src/contexts/AuthContext";
import {
  deleteAccount,
  resolveDailyReminderTimes,
  syncNotificationTimezone,
  updateNotificationPreferences,
} from "../src/api";
import { AppButton, ButtonRow, Card, Page, PageHeader, Section, SectionTitle } from "../src/components/AppChrome";
import { TimePicker } from "../src/components/TimePicker";
import { colors, font, radius, space, type as typeStyles } from "../src/theme";
import {
  cancelAllNotifications,
  hasNotificationPermissions,
  openNotificationSettings,
  registerNotificationToken,
  requestNotificationPermissions,
  scheduleNotifications,
} from "../src/services/notifications";

const DAYS = [
  { label: "Sun", name: "Sunday" },
  { label: "Mon", name: "Monday" },
  { label: "Tue", name: "Tuesday" },
  { label: "Wed", name: "Wednesday" },
  { label: "Thu", name: "Thursday" },
  { label: "Fri", name: "Friday" },
  { label: "Sat", name: "Saturday" },
];

export default function Settings() {
  const { user, signOut } = useAuth();
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

  const handleLogout = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              router.replace("/");
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to sign out");
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone. All your data, including journal entries, stats, and preferences, will be permanently deleted.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Alert.alert(
              "Final Confirmation",
              "This is your last chance to cancel. Your account and all data will be permanently deleted. This cannot be undone.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Yes, Delete My Account",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      await signOut();
                      router.replace("/");
                      Alert.alert(
                        "Account Deleted",
                        "Your account has been successfully deleted."
                      );
                    } catch (error: any) {
                      Alert.alert(
                        "Error",
                        error.message ||
                          "Failed to delete account. Please try again or contact support."
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Account and reminders" onBack={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Section>
          <SectionTitle>Account</SectionTitle>
          <Card>
            <Text style={typeStyles.label}>Email</Text>
            <Text style={styles.infoValue}>{user?.email || "Not available"}</Text>
          </Card>
        </Section>

        <Section>
          <SectionTitle>Journal questions</SectionTitle>
          <Card>
            <Text style={typeStyles.cardTitle}>Customize questions</Text>
            <Text style={typeStyles.caption}>
              Choose which questions appear in each journal, or add your own.
            </Text>
            <View style={styles.notificationActions}>
              <AppButton
                label="Customize questions"
                onPress={() => router.push("/settings/questions")}
                variant="secondary"
              />
            </View>
          </Card>
        </Section>

        <Section>
          <SectionTitle>Notifications</SectionTitle>
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
                <Text style={typeStyles.label}>Weekly schedule</Text>
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
                      <Switch
                        value={selected}
                        onValueChange={() => toggleDay(index)}
                        trackColor={{ false: colors.border, true: colors.accentStrong }}
                        thumbColor={colors.white}
                        accessibilityLabel={`${day.name} reminders`}
                      />
                      <Text style={[styles.dayLabel, !selected && styles.dayLabelDisabled]}>
                        {day.label}
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
                        <Text style={styles.dayOff}>Off</Text>
                      )}
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

        <Section>
          <SectionTitle>Account actions</SectionTitle>
          <ButtonRow>
            <AppButton label="Sign out" onPress={handleLogout} variant="secondary" flex />
            <AppButton label="Delete account" onPress={handleDeleteAccount} variant="dangerOutline" flex />
          </ButtonRow>
          <Text style={styles.dangerHint}>Deleting your account removes all journal data permanently.</Text>
        </Section>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: space.xxxl },
  infoValue: {
    fontFamily: font,
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    marginTop: 4,
  },
  settingCard: { gap: 4 },
  settingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  settingCopy: { flex: 1, paddingRight: 8, gap: 4 },
  scheduleHeader: { gap: space.xs, marginTop: space.lg, marginBottom: space.sm },
  scheduleList: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
  },
  scheduleRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: colors.surfaceRaised,
  },
  scheduleRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  dayLabel: { flex: 1, fontFamily: font, fontSize: 15, fontWeight: "600", color: colors.text },
  dayLabelDisabled: { color: colors.muted },
  dayOff: { fontFamily: font, fontSize: 14, color: colors.faint, paddingRight: space.sm },
  notificationActions: { marginTop: space.sm },
  dangerHint: {
    fontFamily: font,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    marginTop: space.lg,
    textAlign: "center",
  },
});
