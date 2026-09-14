/**
 * Notification service — server-side push delivery via Supabase Edge Function.
 *
 * The app registers Expo push tokens and user reminder preferences (with timezone).
 * pg_cron invokes send-journal-reminders every minute to deliver pushes.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";
import type { NotificationPreferences } from "../api/types";
import { upsertNotificationToken } from "../api/notificationPreferences";
import { getDeviceTimezone } from "../utils/timezone";

const isExpoGo = Constants.executionEnvironment === "storeClient";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isExpoGo) {
    console.warn(
      "Notifications have limited support in Expo Go. Use a development or production build."
    );
    return false;
  }

  if (!Device.isDevice) {
    console.warn("Notifications only work on physical devices");
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
}

export async function hasNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

export async function openNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

export async function registerNotificationToken(): Promise<string | null> {
  if (isExpoGo || !Device.isDevice) return null;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const projectId =
    Constants.easConfig?.projectId ||
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;

  if (!projectId) {
    console.warn("Missing EAS projectId; cannot register Expo push token.");
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await upsertNotificationToken({
    expo_push_token: token,
    device_id: Device.osInternalBuildId || Device.deviceName || null,
    platform: Platform.OS,
    app_version: Constants.expoConfig?.version || null,
  });
  return token;
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Returns device timezone for server-side reminder scheduling. */
export function getNotificationTimezone(): string {
  return getDeviceTimezone();
}

/**
 * Sync push registration with server-side delivery.
 * Clears any legacy local schedules to avoid duplicate reminders.
 */
export async function scheduleNotifications(
  preferences: NotificationPreferences
): Promise<void> {
  if (isExpoGo) {
    console.warn("Server push requires a development or production build.");
    return;
  }

  try {
    await cancelAllNotifications();
  } catch (error) {
    console.error("Error cancelling local notifications:", error);
  }

  if (!preferences.enabled) {
    return;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.warn("Notification permissions not granted");
    return;
  }

  await registerNotificationToken().catch((error) => {
    console.warn("Could not register notification token:", error);
  });
}

export function setupNotificationListeners(
  onNotificationTap: () => void
): () => void {
  if (isExpoGo) {
    return () => {};
  }

  try {
    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notification tapped:", response);
      onNotificationTap();
    });

    return () => {
      try {
        receivedListener.remove();
        responseListener.remove();
      } catch (error) {
        console.error("Error removing notification listeners:", error);
      }
    };
  } catch (error) {
    console.error("Error setting up notification listeners:", error);
    return () => {};
  }
}
