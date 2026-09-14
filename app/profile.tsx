import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../src/contexts/AuthContext";
import { getProfile, updateProfile, upsertProfile, getProfileStatsSummary } from "../src/api";
import type { Profile, ProfileUpdate, ProfileStatsSummary } from "../src/api/types";
import { ProfileHeader } from "../src/components/ProfileHeader";
import { SportPreferences } from "../src/components/SportPreferences";
import { QuickStats } from "../src/components/QuickStats";
import { EditProfileForm } from "../src/components/EditProfileForm";
import { ListGroup, ListRow, Page, PageHeader, Section, TextButton } from "../src/components/AppChrome";
import { colors, space } from "../src/theme";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [profileData, statsData] = await Promise.all([
        getProfile(),
        getProfileStatsSummary(),
      ]);

      if (!profileData && user) {
        setProfile(
          await upsertProfile({
            id: user.id,
            first_name: null,
            last_name: null,
            preferred_sport: null,
            preferred_position: null,
          })
        );
      } else {
        setProfile(profileData);
      }

      setStats(statsData);
    } catch (error: any) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: ProfileUpdate) => {
    const updated = await updateProfile(updates);
    setProfile(updated);
    setEditing(false);
    Alert.alert("Saved", "Profile updated.");
  };

  if (loading) {
    return (
      <Page>
        <PageHeader title="Profile" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentSolid} size="large" />
        </View>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Profile"
        onBack={() => router.back()}
        action={!editing ? <TextButton label="Edit" onPress={() => setEditing(true)} /> : undefined}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {editing ? (
          <EditProfileForm profile={profile} onSave={handleSave} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <ProfileHeader profile={profile} email={user?.email} />
            <SportPreferences profile={profile} />
            {stats && <QuickStats stats={stats} />}
            <Section>
              <ListGroup>
                <ListRow icon="stats-chart-outline" label="View stats" onPress={() => router.push("/stats")} />
                <ListRow icon="settings-outline" label="Settings" onPress={() => router.push("/settings")} border={false} />
              </ListGroup>
            </Section>
          </>
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: space.xxxl },
});
