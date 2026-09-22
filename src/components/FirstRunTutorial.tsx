import React, { useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "./AppChrome";
import { colors, font, radius, space, type as typeStyles } from "../theme";
import { openOnrise } from "../utils/onrise";

const TUTORIAL_PAGES = 6;

export function FirstRunTutorial({
  onComplete,
}: {
  onComplete: (nextMode: "signin" | "signup") => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  const goNext = () => {
    if (page === TUTORIAL_PAGES - 1) {
      onComplete("signup");
      return;
    }
    scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage((current) => Math.min(current + 1, TUTORIAL_PAGES - 1));
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Image
          source={require("../../assets/images/mental_pitch_logo.png")}
          style={styles.brandLogo}
          resizeMode="contain"
          accessibilityLabel="The MentalPitch"
        />
        <TouchableOpacity
          onPress={() => onComplete("signin")}
          style={styles.skipButton}
          activeOpacity={0.72}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Skip tutorial</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.tutorialScroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        <TutorialPage
          width={width}
          title="Start a journal"
          body="Tap + whenever you want to log a game, training session, or reflection."
        >
          <View style={styles.startVisual}>
            <View style={styles.journalLineWide} />
            <View style={styles.journalLineShort} />
            <View style={styles.addButtonShadow}>
              <View style={styles.addButton}>
                <Ionicons name="add" size={38} color={colors.onPrimary} />
              </View>
            </View>
            <Text style={styles.visualCaption}>This button starts a new journal</Text>
          </View>
        </TutorialPage>

        <TutorialPage
          width={width}
          title="One question at a time"
          body="Swipe each question card left, just like you are swiping through this tutorial."
        >
          <View style={styles.questionVisual}>
            <Text style={styles.questionPosition}>Question 1 of 3</Text>
            <Text style={styles.questionPrompt}>What do you want to focus on today?</Text>
            <View style={styles.answerPreview}>
              <Text style={styles.answerPreviewText}>Type or answer by voice</Text>
            </View>
            <View style={styles.questionDots}>
              <View style={styles.questionDotActive} />
              <View style={styles.questionDot} />
              <View style={styles.questionDot} />
            </View>
          </View>
        </TutorialPage>

        <TutorialPage
          width={width}
          title="Make it yours"
          body="Hide questions you don't need or add your own. Open Customize questions in Settings to shape each journal."
        >
          <View style={styles.customizeVisual}>
            <View style={styles.customizeRow}>
              <Text style={styles.customizeQuestion}>What went well today?</Text>
              <View style={[styles.toggle, styles.toggleOn]}>
                <View style={styles.knobOn} />
              </View>
            </View>
            <View style={styles.customizeRow}>
              <Text style={styles.customizeQuestion}>What do you want to focus on?</Text>
              <View style={[styles.toggle, styles.toggleOn]}>
                <View style={styles.knobOn} />
              </View>
            </View>
            <View style={styles.customizeRow}>
              <Text style={[styles.customizeQuestion, styles.customizeHidden]}>
                Morning routine check-in
              </Text>
              <View style={styles.toggle}>
                <View style={styles.knob} />
              </View>
            </View>
            <View style={styles.addRow}>
              <Ionicons name="add" size={18} color={colors.accentSolid} />
              <Text style={styles.addRowText}>Add your own question</Text>
            </View>
          </View>
        </TutorialPage>

        <TutorialPage
          width={width}
          title="See patterns over time"
          body="The calendar groups entries by day and colors dates using your average mood."
        >
          <View style={styles.calendarVisual}>
            <View style={styles.calendarHeader}>
              <Ionicons name="chevron-back" size={18} color={colors.muted} />
              <Text style={styles.calendarMonth}>Your month</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
            <View style={styles.calendarGrid}>
              {Array.from({ length: 14 }, (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.calendarDay,
                    index === 3 && styles.calendarDayLow,
                    index === 8 && styles.calendarDayMid,
                    index === 11 && styles.calendarDayHigh,
                  ]}
                >
                  <Text style={styles.calendarDayText}>{index + 1}</Text>
                </View>
              ))}
            </View>
          </View>
        </TutorialPage>

        <TutorialPage
          width={width}
          title="Daily reminders"
          body="Turn on journal reminders in Settings and pick a time for each day of the week."
        >
          <View style={styles.remindersVisual}>
            <View style={styles.bellWrap}>
              <Ionicons name="notifications-outline" size={42} color={colors.accentSolid} />
            </View>
            {[
              ["Mon", "8:00 PM"],
              ["Wed", "8:00 PM"],
              ["Fri", "7:30 PM"],
            ].map(([day, time]) => (
              <View key={day} style={styles.reminderRow}>
                <Text style={styles.reminderDay}>{day}</Text>
                <Text style={styles.reminderTime}>{time}</Text>
              </View>
            ))}
            <Text style={styles.visualCaption}>Set a different time for each day</Text>
          </View>
        </TutorialPage>

        <TutorialPage
          width={width}
          title="Support through Onrise"
          body="Book a confidential session with an Onrise provider using the link in the app."
        >
          <View style={styles.onriseVisual}>
            <Image
              source={require("../../assets/images/company_logo.png")}
              style={styles.onriseLogo}
              resizeMode="contain"
              accessibilityLabel="Onrise"
            />
            <AppButton
              label="Open Onrise"
              icon="open-outline"
              variant="secondary"
              onPress={openOnrise}
            />
          </View>
        </TutorialPage>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.progress} accessibilityLabel={`${page + 1} of ${TUTORIAL_PAGES}`}>
          {Array.from({ length: TUTORIAL_PAGES }, (_, index) => (
            <View key={index} style={[styles.progressDot, index === page && styles.progressDotActive]} />
          ))}
        </View>
        <AppButton
          label={page === TUTORIAL_PAGES - 1 ? "Continue to sign up" : "Continue"}
          onPress={goNext}
        />
      </View>
    </SafeAreaView>
  );
}

function TutorialPage({
  width,
  title,
  body,
  children,
}: {
  width: number;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.visual}>{children}</View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    minHeight: 52,
    paddingHorizontal: space.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandLogo: { width: 56, height: 40 },
  skipButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.xs },
  skipText: { fontFamily: font, fontSize: 14, fontWeight: "600", color: colors.muted },
  page: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.xl },
  tutorialScroll: { flex: 1 },
  visual: { flex: 1, justifyContent: "center" },
  copy: { paddingTop: space.xl, gap: space.sm },
  title: { ...typeStyles.pageTitle, fontSize: 30, lineHeight: 36 },
  body: { ...typeStyles.body, color: colors.text, maxWidth: 340 },
  footer: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.lg, gap: space.lg },
  progress: { height: 12, flexDirection: "row", alignItems: "center", gap: 7 },
  progressDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.border },
  progressDotActive: { width: 24, backgroundColor: colors.accentSolid },
  startVisual: {
    minHeight: 280,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xxl,
  },
  journalLineWide: { width: "70%", height: 10, borderRadius: radius.pill, backgroundColor: colors.border },
  journalLineShort: { width: "46%", height: 8, borderRadius: radius.pill, backgroundColor: colors.borderSubtle, marginTop: 12 },
  addButtonShadow: { marginTop: 36, borderRadius: radius.pill, backgroundColor: colors.accentMuted, padding: 10 },
  addButton: {
    width: 66,
    height: 66,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSolid,
    alignItems: "center",
    justifyContent: "center",
  },
  visualCaption: { ...typeStyles.caption, color: colors.muted, marginTop: space.lg },
  questionVisual: {
    minHeight: 300,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: space.xl,
    justifyContent: "center",
    gap: space.lg,
  },
  questionPosition: { ...typeStyles.caption },
  questionPrompt: { fontFamily: font, fontSize: 21, lineHeight: 29, fontWeight: "600", color: colors.text },
  answerPreview: {
    height: 78,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: space.md,
  },
  answerPreviewText: { ...typeStyles.caption, color: colors.muted },
  questionDots: { minHeight: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  questionDot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.border },
  questionDotActive: { width: 20, height: 6, borderRadius: radius.pill, backgroundColor: colors.accentSolid },
  calendarVisual: {
    minHeight: 300,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: space.xl,
    justifyContent: "center",
  },
  calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.xl },
  calendarMonth: { fontFamily: font, fontSize: 17, fontWeight: "600", color: colors.text },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  calendarDay: {
    width: "11.8%",
    aspectRatio: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayLow: { backgroundColor: "#7f1d1d" },
  calendarDayMid: { backgroundColor: "#85510e" },
  calendarDayHigh: { backgroundColor: "#14532d" },
  calendarDayText: { fontFamily: font, fontSize: 11, fontWeight: "600", color: colors.text },
  onriseVisual: {
    minHeight: 280,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xxl,
    padding: space.xxl,
  },
  onriseLogo: { width: 190, height: 92 },
  customizeVisual: {
    minHeight: 300,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: space.xl,
    justifyContent: "center",
    gap: space.md,
  },
  customizeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    gap: space.md,
  },
  customizeQuestion: {
    flex: 1,
    fontFamily: font,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
    color: colors.text,
  },
  customizeHidden: { color: colors.muted },
  toggle: {
    width: 46,
    height: 27,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: colors.accentStrong, alignItems: "flex-end" },
  knob: {
    width: 21,
    height: 21,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  knobOn: {
    width: 21,
    height: 21,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    paddingTop: space.sm,
  },
  addRowText: {
    fontFamily: font,
    fontSize: 15,
    fontWeight: "600",
    color: colors.accentSolid,
  },
  remindersVisual: {
    minHeight: 300,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: space.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
  },
  bellWrap: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  reminderRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
  },
  reminderDay: {
    fontFamily: font,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  reminderTime: {
    fontFamily: font,
    fontSize: 15,
    color: colors.muted,
  },
});
