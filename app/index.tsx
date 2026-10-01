import { View, StyleSheet, Text, Animated, ScrollView } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppButton, ListGroup, ListRow } from "../src/components/AppChrome";
import { LoadingScreen } from "../src/components/LoadingScreen";
import { AuthScreen } from "../src/components/AuthScreen";
import { SportOnboarding, SPORT_PICKER_DISMISSED_KEY } from "../src/components/SportOnboarding";
import { useAuth } from "../src/contexts/AuthContext";
import { getProfile } from "../src/api";
import type { Profile } from "../src/api/types";
import { colors, font, layout } from "../src/theme";
import { openOnrise } from "../src/utils/onrise";

const LOGO_SIZE = 132;

const menuItems: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; path?: Href; action?: () => void }[] = [
  { label: "Stats", icon: "bar-chart-outline", path: "/stats" },
  { label: "Calendar", icon: "calendar-outline", path: "/calendar" },
  { label: "Profile", icon: "person-outline", path: "/profile" },
  { label: "Settings", icon: "settings-outline", path: "/settings" },
  { label: "Tutorial", icon: "school-outline", path: "/tutorial" },
  { label: "Onrise", icon: "people-outline", action: openOnrise },
];

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [pickerDismissed, setPickerDismissed] = useState(false);

  useEffect(() => {
    if (loading) return;
    Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [loading, fade]);

  useEffect(() => {
    if (!user) {
      setProfile(undefined);
      setPickerDismissed(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await getProfile();
        if (!cancelled) setProfile(p);
      } catch {
        if (!cancelled) setProfile(null);
      }
      try {
        const v = await AsyncStorage.getItem(SPORT_PICKER_DISMISSED_KEY);
        if (!cancelled) setPickerDismissed(v === "1");
      } catch {
        // storage unavailable: picker will show until a sport is saved
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) return <LoadingScreen message="Checking authentication..." />;
  if (!user) return <AuthScreen />;
  if (profile === undefined) return <LoadingScreen message="Loading profile..." />;

  // First-run (or never-set) sport picker. Skipping remembers the choice on-device.
  if (!pickerDismissed && (!profile || !profile.preferred_sport)) {
    return <SportOnboarding onComplete={() => setPickerDismissed(true)} />;
  }

  return (
    <View style={layout.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fade }]}>
          <View style={styles.hero}>
            <Animated.Image
              source={require("../assets/images/mental_pitch_logo_transparent.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Log preparation and reflection around every session.</Text>
          </View>

          <AppButton label="Your Journal" icon="book-outline" onPress={() => router.push("/journal")} />

          <ListGroup>
            {menuItems.map((item, index) => (
              <ListRow
                key={item.label}
                icon={item.icon}
                label={item.label}
                onPress={() => (item.action ? item.action() : item.path ? router.push(item.path) : undefined)}
                border={index < menuItems.length - 1}
              />
            ))}
          </ListGroup>

          <Text style={styles.onriseBlurb}>Onrise — Peer support and Clinical support</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingBottom: 40 },
  content: { gap: 24 },
  hero: { alignItems: "center", gap: 12, marginBottom: 4 },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  tagline: {
    fontFamily: font,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 280,
  },
  onriseBlurb: {
    fontFamily: font,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 280,
    alignSelf: "center",
  },
});
