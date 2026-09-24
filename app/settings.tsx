import React from "react";
import {
  View,
  StyleSheet,
  Text,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";
import { deleteAccount } from "../src/api";
import { AppButton, ButtonRow, Card, Page, PageHeader, Section, SectionTitle } from "../src/components/AppChrome";
import { colors, font, space, type as typeStyles } from "../src/theme";

export default function Settings() {
  const { user, signOut } = useAuth();
  const router = useRouter();

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
          <Card>
            <Text style={typeStyles.cardTitle}>Journal reminders</Text>
            <Text style={typeStyles.caption}>
              Choose days and times for journal reminders.
            </Text>
            <View style={styles.notificationActions}>
              <AppButton
                label="Journal reminders"
                onPress={() => router.push("/settings/notifications")}
                variant="secondary"
              />
            </View>
          </Card>
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
