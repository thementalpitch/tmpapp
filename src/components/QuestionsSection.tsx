import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
} from "expo-speech-recognition";
import type { JournalQuestion } from "../api";
import { FormSection } from "./AppChrome";
import { colors, font, input, radius, space, type as typeStyles } from "../theme";

let activeSpeechOwner: symbol | null = null;
let pendingSpeechEnd: (() => void) | null = null;

function settlePendingSpeechEnd() {
  pendingSpeechEnd?.();
}

async function stopActiveSpeechRecognition() {
  if (!activeSpeechOwner) return;

  await new Promise<void>((resolve) => {
    const finish = () => {
      if (pendingSpeechEnd === finish) {
        pendingSpeechEnd = null;
      }
      resolve();
    };
    pendingSpeechEnd = finish;
    ExpoSpeechRecognitionModule.abort();
    setTimeout(finish, 400);
  });
}

interface QuestionsSectionProps {
  questions: JournalQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, text: string) => void;
  title?: string;
}

export function QuestionsSection({
  questions,
  answers,
  onAnswerChange,
  title = "Questions",
}: QuestionsSectionProps) {
  const carouselRef = useRef<ScrollView>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [listeningQuestionId, setListeningQuestionId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<{ questionId: string; message: string } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const listeningQuestionRef = useRef<string | null>(null);
  const speechOwnerRef = useRef(Symbol("question-section-speech"));
  const answerBeforeListeningRef = useRef("");
  const micPulse = useRef(new Animated.Value(0)).current;
  const meterBars = useRef([
    new Animated.Value(0.35),
    new Animated.Value(0.35),
    new Animated.Value(0.35),
  ]).current;
  const questionIds = questions.map((question) => question.id).join("|");

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!listeningQuestionId || reduceMotion) {
      micPulse.stopAnimation();
      micPulse.setValue(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(micPulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(micPulse, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [listeningQuestionId, micPulse, reduceMotion]);

  useEffect(
    () => () => {
      if (listeningQuestionRef.current) {
        ExpoSpeechRecognitionModule.abort();
      }
      if (activeSpeechOwner === speechOwnerRef.current) {
        activeSpeechOwner = null;
      }
    },
    []
  );

  useSpeechRecognitionEvent("start", () => {
    setListeningQuestionId(listeningQuestionRef.current);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const questionId = listeningQuestionRef.current;
    const transcript = event.results[0]?.transcript?.trim();
    if (!questionId || !transcript) return;

    const base = answerBeforeListeningRef.current;
    onAnswerChange(questionId, base ? `${base} ${transcript}` : transcript);
  });

  useSpeechRecognitionEvent("volumechange", (event) => {
    if (!listeningQuestionRef.current || reduceMotion) return;
    const normalized = Math.max(0.12, Math.min(1, (event.value + 2) / 12));
    meterBars.forEach((bar, index) => {
      const offset = index === 1 ? 0.2 : index === 0 ? -0.08 : 0.06;
      Animated.timing(bar, {
        toValue: Math.max(0.22, Math.min(1, normalized + offset)),
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  });

  useSpeechRecognitionEvent("end", () => {
    settlePendingSpeechEnd();
    if (activeSpeechOwner !== speechOwnerRef.current) return;
    activeSpeechOwner = null;
    listeningQuestionRef.current = null;
    setListeningQuestionId(null);
  });

  useSpeechRecognitionEvent("error", (event) => {
    settlePendingSpeechEnd();
    if (activeSpeechOwner !== speechOwnerRef.current) return;
    const questionId = listeningQuestionRef.current;
    if (questionId && event.error !== "aborted") {
      setSpeechError({
        questionId,
        message: speechErrorMessage(event.error),
      });
    }
    activeSpeechOwner = null;
    listeningQuestionRef.current = null;
    setListeningQuestionId(null);
  });

  useEffect(() => {
    setActiveIndex(0);
    carouselRef.current?.scrollTo({ x: 0, animated: false });
  }, [questionIds]);

  if (questions.length === 0) return null;

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (Math.abs(nextWidth - carouselWidth) > 1) {
      setCarouselWidth(nextWidth);
      carouselRef.current?.scrollTo({
        x: activeIndex * nextWidth,
        animated: false,
      });
    }
  };

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    if (!carouselWidth) return;
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / carouselWidth
    );
    const settledIndex = Math.max(0, Math.min(nextIndex, questions.length - 1));
    setActiveIndex(settledIndex);
    inputRefs.current[settledIndex]?.focus();
  };

  const handleScrollBegin = () => {
    if (listeningQuestionRef.current) {
      ExpoSpeechRecognitionModule.stop();
    }
  };

  const goToQuestion = (index: number) => {
    if (listeningQuestionRef.current) {
      ExpoSpeechRecognitionModule.stop();
    }
    setActiveIndex(index);
    carouselRef.current?.scrollTo({
      x: index * carouselWidth,
      animated: true,
    });
  };

  const toggleVoiceAnswer = async (question: JournalQuestion, index: number) => {
    if (listeningQuestionRef.current === question.id) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    setSpeechError(null);
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setSpeechError({
        questionId: question.id,
        message: "Speech recognition is not available on this device.",
      });
      return;
    }

    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setSpeechError({
          questionId: question.id,
          message: "Microphone and speech access are needed for voice answers.",
        });
        return;
      }

      if (activeSpeechOwner) {
        await stopActiveSpeechRecognition();
      }

      Keyboard.dismiss();
      inputRefs.current[index]?.blur();
      listeningQuestionRef.current = question.id;
      activeSpeechOwner = speechOwnerRef.current;
      answerBeforeListeningRef.current = (answers[question.id] ?? "").trim();
      setListeningQuestionId(question.id);

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        maxAlternatives: 1,
        addsPunctuation: true,
        continuous: false,
        volumeChangeEventOptions: {
          enabled: !reduceMotion,
          intervalMillis: 120,
        },
      });
    } catch {
      if (activeSpeechOwner === speechOwnerRef.current) {
        activeSpeechOwner = null;
      }
      listeningQuestionRef.current = null;
      setListeningQuestionId(null);
      setSpeechError({
        questionId: question.id,
        message: "Voice input could not start. Please try again.",
      });
    }
  };

  return (
    <FormSection title={title}>
      <View style={styles.carousel} onLayout={handleLayout}>
        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={handleScrollBegin}
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {questions.map((question, index) => (
            <View
              key={question.id}
              style={[styles.slide, carouselWidth ? { width: carouselWidth } : null]}
            >
              <View style={styles.card}>
                <Text style={styles.position}>
                  Question {index + 1} of {questions.length}
                </Text>
                <Text style={styles.prompt}>{question.prompt}</Text>
                {question.help_text ? (
                  <Text style={styles.help}>{question.help_text}</Text>
                ) : null}
                <Text style={styles.answerLabel}>Your answer</Text>
                <TouchableOpacity
                  style={[
                    styles.voiceButton,
                    listeningQuestionId === question.id && styles.voiceButtonListening,
                  ]}
                  onPress={() => toggleVoiceAnswer(question, index)}
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityState={{ selected: listeningQuestionId === question.id }}
                  accessibilityLabel={
                    listeningQuestionId === question.id
                      ? "Stop listening"
                      : `Answer question ${index + 1} by voice`
                  }
                >
                  <View style={styles.micShell}>
                    {listeningQuestionId === question.id ? (
                      <Animated.View
                        style={[
                          styles.micPulse,
                          {
                            opacity: micPulse.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.28, 0],
                            }),
                            transform: [
                              {
                                scale: micPulse.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.9, 1.5],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    ) : null}
                    <Ionicons
                      name={listeningQuestionId === question.id ? "stop" : "mic-outline"}
                      size={18}
                      color={
                        listeningQuestionId === question.id
                          ? colors.onPrimary
                          : colors.accentStrong
                      }
                    />
                  </View>
                  <View style={styles.voiceCopy}>
                    <Text
                      style={[
                        styles.voiceTitle,
                        listeningQuestionId === question.id && styles.voiceTitleListening,
                      ]}
                    >
                      {listeningQuestionId === question.id ? "Listening" : "Answer by voice"}
                    </Text>
                    <Text
                      style={[
                        styles.voiceHint,
                        listeningQuestionId === question.id && styles.voiceHintListening,
                      ]}
                    >
                      {listeningQuestionId === question.id
                        ? "Speak naturally. Tap to stop."
                        : "Tap once, then start speaking."}
                    </Text>
                  </View>
                  {listeningQuestionId === question.id ? (
                    <View style={styles.meter} accessibilityElementsHidden>
                      {meterBars.map((bar, barIndex) => (
                        <Animated.View
                          key={barIndex}
                          style={[styles.meterBar, { transform: [{ scaleY: bar }] }]}
                        />
                      ))}
                    </View>
                  ) : null}
                </TouchableOpacity>
                {speechError?.questionId === question.id ? (
                  <Text style={styles.speechError} accessibilityRole="alert">
                    {speechError.message}
                  </Text>
                ) : null}
                <TextInput
                  ref={(input) => {
                    inputRefs.current[index] = input;
                  }}
                  style={styles.field}
                  multiline
                  rejectResponderTermination
                  placeholder="Type your answer (optional)"
                  placeholderTextColor={colors.faint}
                  value={answers[question.id] ?? ""}
                  onChangeText={(text) => onAnswerChange(question.id, text)}
                  textAlignVertical="top"
                  accessibilityLabel={`Answer for question ${index + 1}: ${question.prompt}`}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {questions.length > 1 ? (
        <View
          style={styles.pagination}
          accessibilityRole="tablist"
          accessibilityLabel={`${title} progress`}
        >
          {questions.map((question, index) => {
            const selected = index === activeIndex;
            return (
              <TouchableOpacity
                key={question.id}
                style={styles.dotTarget}
                onPress={() => goToQuestion(index)}
                activeOpacity={0.72}
                hitSlop={6}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`Question ${index + 1} of ${questions.length}`}
              >
                <View style={[styles.dot, selected && styles.dotActive]} />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </FormSection>
  );
}

const styles = StyleSheet.create({
  carousel: {
    width: "100%",
    overflow: "hidden",
  },
  slide: {
    paddingHorizontal: 1,
  },
  card: {
    minHeight: 430,
    padding: space.lg,
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  position: {
    ...typeStyles.caption,
    color: colors.muted,
    fontWeight: "500",
  },
  prompt: {
    fontFamily: font,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: colors.text,
  },
  help: {
    ...typeStyles.caption,
    color: colors.muted,
  },
  answerLabel: {
    ...typeStyles.label,
    color: colors.text,
    fontWeight: "600",
  },
  voiceButton: {
    minHeight: 56,
    paddingVertical: 9,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  voiceButtonListening: {
    borderColor: colors.accentSolid,
    backgroundColor: colors.accentMuted,
  },
  micShell: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  micPulse: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSolid,
  },
  voiceCopy: { flex: 1, minWidth: 0 },
  voiceTitle: {
    fontFamily: font,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
    color: colors.text,
  },
  voiceTitleListening: { color: colors.accent },
  voiceHint: {
    fontFamily: font,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  voiceHintListening: { color: colors.text },
  meter: {
    width: 30,
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  meterBar: {
    width: 3,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.accentStrong,
  },
  speechError: {
    fontFamily: font,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
    marginTop: -space.xs,
  },
  field: {
    ...input,
    flex: 1,
    minHeight: 156,
    fontFamily: font,
    lineHeight: 24,
    paddingTop: space.md,
  },
  pagination: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  dotTarget: {
    width: 28,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.accentSolid,
  },
});

function speechErrorMessage(error: ExpoSpeechRecognitionErrorCode): string {
  if (error === "not-allowed") {
    return "Microphone and speech access are needed for voice answers.";
  }
  if (error === "no-speech" || error === "speech-timeout") {
    return "No speech was detected. Tap the microphone and try again.";
  }
  if (error === "network") {
    return "Speech recognition could not connect. Check your connection and try again.";
  }
  if (error === "busy") {
    return "The microphone is already in use. Wait a moment and try again.";
  }
  return "Voice input stopped unexpectedly. Please try again.";
}
