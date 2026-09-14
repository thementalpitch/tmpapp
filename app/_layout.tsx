import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { syncNotificationTimezone } from "../src/api";
import {
  hasNotificationPermissions,
  openNotificationSettings,
  requestNotificationPermissions,
  scheduleNotifications,
  setupNotificationListeners,
} from "../src/services/notifications";
import { colors } from "../src/theme";

function NotificationSetup() {
  const { user } = useAuth();
  const router = useRouter();
  const promptedForSettings = useRef(false);

  useEffect(() => {
    if (!user) return;

    // Setup notification tap handler
    const cleanup = setupNotificationListeners(() => {
      router.push("/journal");
    });

    // Load and schedule notifications
    const initializeNotifications = async () => {
      try {
        const granted = await hasNotificationPermissions();
        if (!granted) {
          await requestNotificationPermissions();
        }

        const preferences = await syncNotificationTimezone();
        const permissionAfterRequest = await hasNotificationPermissions();
        if (preferences.enabled && !permissionAfterRequest && !promptedForSettings.current) {
          promptedForSettings.current = true;
          Alert.alert(
            "Turn On Notifications",
            "Journal reminders are enabled, but notifications are off for this iPhone.",
            [
              { text: "Not Now", style: "cancel" },
              { text: "Open Settings", onPress: openNotificationSettings },
            ]
          );
        }
        await scheduleNotifications(preferences);
      } catch (error: any) {
        // Silently handle errors - don't crash the app
        // Common errors: permissions denied, Expo Go limitations, table doesn't exist
        const errorMessage = error?.message || "";
        if (
          errorMessage.includes("permission") ||
          errorMessage.includes("Unauthorized") ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("relation")
        ) {
          console.warn("Notification preferences not available:", error.message);
        } else {
          console.error("Error initializing notifications:", error);
        }
      }
    };

    initializeNotifications();

    return cleanup;
  }, [user, router]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationSetup />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg }
            }}
          />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

