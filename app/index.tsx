import { View, StyleSheet, Text, Animated, Image, ScrollView } from "react-native";
import React, { useEffect, useRef } from "react";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, ListGroup, ListRow } from "../src/components/AppChrome";
import { LoadingScreen } from "../src/components/LoadingScreen";
import { AuthScreen } from "../src/components/AuthScreen";
import { useAuth } from "../src/contexts/AuthContext";
import { colors, font, layout } from "../src/theme";
import { openOnrise } from "../src/utils/onrise";

const LOGO_SIZE = 132;

const menuItems: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; path: Href }[] = [
  { label: "Stats", icon: "bar-chart-outline", path: "/stats" },
  { label: "Calendar", icon: "calendar-outline", path: "/calendar" },
  { label: "Profile", icon: "person-outline", path: "/profile" },
  { label: "Settings", icon: "settings-outline", path: "/settings" },
];

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) return;
    Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [loading, fade]);

  if (loading) return <LoadingScreen message="Checking authentication..." />;
  if (!user) return <AuthScreen />;

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
                onPress={() => router.push(item.path)}
                border={index < menuItems.length - 1}
              />
            ))}
          </ListGroup>

          <View style={styles.onriseSection}>
            <Image
              source={require("../assets/images/company_logo.png")}
              style={styles.onriseLogo}
              resizeMode="contain"
              accessibilityLabel="Onrise"
            />
            <AppButton
              label="Book with Onrise"
              icon="open-outline"
              variant="secondary"
              onPress={openOnrise}
            />
          </View>
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
  onriseSection: { alignItems: "center", gap: 12, paddingTop: 4 },
  onriseLogo: { width: 132, height: 58 },
});
