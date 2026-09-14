import React from "react";
import { GroupedList, GroupedRow, Section, SectionTitle } from "./AppChrome";

interface SportPreferencesProps {
  profile: { preferred_sport?: string | null; preferred_position?: string | null } | null;
}

export function SportPreferences({ profile }: SportPreferencesProps) {
  return (
    <Section>
      <SectionTitle>Sport</SectionTitle>
      <GroupedList>
        <GroupedRow label="Sport" value={profile?.preferred_sport || "Not set"} />
        <GroupedRow label="Position" value={profile?.preferred_position || "Not set"} border={false} />
      </GroupedList>
    </Section>
  );
}
