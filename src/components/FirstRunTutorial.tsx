import React, { useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "./AppChrome";
import { colors, font, radius, space, type as typeStyles } from "../theme";

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
          source={require("../../assets/images/mental_pitch_logo_transparent.png")}
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
          image={require("../../assets/images/tutorial-start.png")}
          imageLabel="Home screen with the Start a journal entry button circled"
          title="Start a journal"
          body="One tap opens a new entry — log a game, training session, or reflection."
        />
        <TutorialPage
          width={width}
          image={require("../../assets/images/tutorial-questions.png")}
          imageLabel="Question card with the one-question-at-a-time layout circled"
          title="One question at a time"
          body="Answer by voice or typing, then swipe left for the next question."
        />
        <TutorialPage
          width={width}
          image={require("../../assets/images/tutorial-customize.png")}
          imageLabel="Customize questions screen with a toggle and the add-your-own row circled"
          title="Make it yours"
          body="Open Customize questions in Settings to hide questions or add your own."
        />
        <TutorialPage
          width={width}
          image={require("../../assets/images/tutorial-patterns.png")}
          imageLabel="Calendar with mood-colored dates circled"
          title="See patterns over time"
          body="The calendar colors each day by your average mood."
        />
        <TutorialPage
          width={width}
          image={require("../../assets/images/tutorial-reminders.png")}
          imageLabel="Reminder schedule with a per-day time circled"
          title="Daily reminders"
          body="Turn on reminders in Settings and pick a time for each day."
        />
        <TutorialPage
          width={width}
          image={require("../../assets/images/tutorial-onrise.png")}
          imageLabel="Home screen with the Book with Onrise button circled"
          title="Support through Onrise"
          body="Book a confidential session with an Onrise provider from the home screen."
        />
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
  image,
  imageLabel,
  title,
  body,
}: {
  width: number;
  image: ImageSourcePropType;
  imageLabel: string;
  title: string;
  body: string;
}) {
  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.shotWrap}>
        <Image
          source={image}
          style={styles.shot}
          resizeMode="contain"
          accessibilityLabel={imageLabel}
        />
      </View>
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
  page: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.sm },
  tutorialScroll: { flex: 1 },
  shotWrap: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  shot: { width: "100%", height: "100%" },
  copy: { paddingTop: space.lg, paddingBottom: space.sm, gap: space.xs },
  title: { ...typeStyles.pageTitle, fontSize: 26, lineHeight: 32 },
  body: { ...typeStyles.body, color: colors.text, maxWidth: 340 },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.lg, gap: space.md },
  progress: { height: 12, flexDirection: "row", alignItems: "center", gap: 7 },
  progressDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.border },
  progressDotActive: { width: 24, backgroundColor: colors.accentSolid },
});
