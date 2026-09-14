import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Profile } from "../api/types";
import { colors, font, radius, space, type as typeStyles } from "../theme";

interface ProfileHeaderProps {
  profile: Profile | null;
  email: string | undefined;
}

export function ProfileHeader({ profile, email }: ProfileHeaderProps) {
  const firstName = profile?.first_name || "";
  const lastName = profile?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Athlete";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "A";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "Recently";

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.name}>{fullName}</Text>
        {email ? <Text style={typeStyles.caption}>{email}</Text> : null}
        <Text style={styles.meta}>Member since {memberSince}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    paddingBottom: space.xxl,
    marginBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: font,
    fontSize: 22,
    fontWeight: "600",
    color: colors.accentStrong,
  },
  copy: { flex: 1, gap: 2 },
  name: {
    fontFamily: font,
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  meta: {
    fontFamily: font,
    fontSize: 13,
    color: colors.faint,
    marginTop: space.xs,
  },
});
