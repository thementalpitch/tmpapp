import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getEntryWithAnswers,
  updateEntry,
  updateAnswer,
  getQuestionsByWorkoutType,
  createAnswers,
  deleteEntry,
  getJournalAiInsight,
  requestJournalAiInsight,
  type JournalAiInsight,
  type JournalEntryWithAnswers,
  type JournalQuestion,
} from "../../src/api";
import { TimeInput } from "../../src/components/TimeInput";
import { MoodScoreInput, RpeInput } from "../../src/components/MoodScoreInput";
import { QuestionsSection } from "../../src/components/QuestionsSection";
import { AppButton, BottomNav, ButtonRow, PageHeader } from "../../src/components/AppChrome";
import { AiInsightCards } from "../../src/components/JournalAiInsight";
import { colors, layout, space } from "../../src/theme";
import { OtherNotes } from "../../src/components/OtherNotes";
import { normalizeTime, validateMoodScore } from "../../src/utils/timeValidation";
import { formatDateLocal } from "../../src/utils/date";
import {
  getPhaseLabels,
  getPostQuestions,
  getPreQuestions,
  isPhasedJournalName,
} from "../../src/utils/journalPhases";
import { useKeyboardVisible } from "../../src/hooks/useKeyboardVisible";

function formatEntryDate(dateStr: string): string {
  return formatDateLocal(dateStr, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function JournalEntryDetail() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entry, setEntry] = useState<JournalEntryWithAnswers | null>(null);
  const [aiInsight, setAiInsight] = useState<JournalAiInsight | null>(null);
  const [questions, setQuestions] = useState<JournalQuestion[]>([]);
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [moodScore, setMoodScore] = useState<string>("");
  const [rpeScore, setRpeScore] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [timeString, setTimeString] = useState<string>("");
  const [amPm, setAmPm] = useState<"AM" | "PM">("AM");
  const [deleting, setDeleting] = useState(false);
  const isKeyboardVisible = useKeyboardVisible();
  const isPhasedEntry = isPhasedJournalName(entry?.title);
  const isFoodEntry = (entry?.title || "").toLowerCase().includes("food");
  const isFinishingPhase = isPhasedEntry && entry?.mood_score == null;

  const hasChanges = useMemo(() => {
    if (!entry) return false;

    const storedTime = entry.entry_time?.match(/(\d{2}):(\d{2})/);
    const timeChanged =
      !isFinishingPhase &&
      !isFoodEntry &&
      normalizeTime(timeString, amPm) !==
        (storedTime ? `${storedTime[1]}:${storedTime[2]}:00` : null);
    const answersChanged = questions.some((question) => {
      const saved = entry.answers.find((answer) => answer.question_id === question.id);
      return (answerTexts[question.id] ?? "").trim() !== (saved?.answer_text ?? "").trim();
    });

    return (
      timeChanged ||
      moodScore.trim() !== (entry.mood_score == null ? "" : String(entry.mood_score)) ||
      rpeScore !== entry.rpe_score ||
      notes.trim() !== (entry.notes ?? "").trim() ||
      answersChanged
    );
  }, [
    amPm,
    answerTexts,
    entry,
    isFinishingPhase,
    isFoodEntry,
    moodScore,
    notes,
    questions,
    rpeScore,
    timeString,
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (!entryId) return;

        // Load entry + answers
        const data = await getEntryWithAnswers(entryId as string);
        setAiInsight(await getJournalAiInsight(entryId as string).catch(() => null));
        setEntry(data);
        setMoodScore(data.mood_score != null ? String(data.mood_score) : "");
        setRpeScore(data.rpe_score);
        setNotes(data.notes || "");

        // Initialize time + AM/PM from stored 24h time
        if (data.entry_time) {
          const match = data.entry_time.match(/(\d{2}):(\d{2})/);
          if (match) {
            let hour24 = Number(match[1]);
            const minute = match[2];
            const isAM = hour24 < 12;
            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
            setTimeString(`${String(hour12)}:${minute}`);
            setAmPm(isAM ? "AM" : "PM");
          }
        }

        // Load questions for this workout type so UI matches new-entry screen
        let qs: JournalQuestion[] = [];
        if (data.workout_type_id) {
          qs = await getQuestionsByWorkoutType(data.workout_type_id);
        }
        setQuestions(qs);

        // Build initial answer text map for all questions
        const initial: Record<string, string> = {};
        qs.forEach((q) => {
          initial[q.id] = "";
        });
        for (const ans of data.answers) {
          if (ans.question_id in initial) {
            initial[ans.question_id] = ans.answer_text ?? "";
          }
        }
        setAnswerTexts(initial);
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Failed to load entry");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [entryId]);

  const handleSave = async () => {
    if (!entry || !hasChanges) return;
    try {
      setSaving(true);

      // Validate and normalize time
      const normalizedTime = isFinishingPhase || isFoodEntry ? entry.entry_time : normalizeTime(timeString, amPm);
      if (!isFinishingPhase && !isFoodEntry && !normalizedTime) {
        Alert.alert("Error", "Please enter a valid time (hour: 1-12, minute: 0-59).");
        setSaving(false);
        return;
      }

      // Validate mood
      const numericMood = validateMoodScore(moodScore);
      if (numericMood === null) {
        Alert.alert("Error", "Mood score must be a number between 1 and 10");
        setSaving(false);
        return;
      }

      await updateEntry(entry.id, {
        entry_time: normalizedTime,
        mood_score: numericMood ?? null,
        rpe_score: rpeScore,
        notes: notes.trim() || null,
      });

      // Sync answers: update existing answers and create new ones for questions
      const postSessionQuestions = getPostQuestions(questions);
      const questionsToSave =
        isFinishingPhase && postSessionQuestions.length ? postSessionQuestions : questions;
      if (questionsToSave.length > 0) {
        const existingByQuestion = new Map(
          entry.answers.map((a) => [a.question_id, a])
        );

        const updatePromises: Promise<unknown>[] = [];
        for (const q of questionsToSave) {
          const newText = (answerTexts[q.id] ?? "").trim();
          const existingAnswer = existingByQuestion.get(q.id);

          if (existingAnswer) {
            // Update existing answer
            if (newText !== (existingAnswer.answer_text ?? "").trim()) {
              updatePromises.push(
                updateAnswer(existingAnswer.id, {
                  answer_text: newText || null,
                })
              );
            }
          } else if (newText) {
            // Create new answer if text is provided for a previously unanswered question
            updatePromises.push(
              createAnswers([{
                entry_id: entry.id,
                question_id: q.id,
                answer_text: newText,
              }])
            );
          }
        }

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
        }
      }

      await requestJournalAiInsight(entry.id).catch((error) => {
        console.warn("Failed to request journal AI insight:", error);
      });

      Alert.alert("Saved", isFinishingPhase ? "Journal finished." : "Your updates have been saved.");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!entry) return;
    
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteEntry(entry.id);
              Alert.alert("Deleted", "Entry has been deleted.");
              router.replace("/journal");
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to delete entry");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !entry) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accentSolid} />
      </View>
    );
  }

  const preQuestions = getPreQuestions(questions);
  const postQuestions = getPostQuestions(questions);
  const phaseLabels = getPhaseLabels(entry.title);
  const hasPhasedQuestions = preQuestions.length > 0 || postQuestions.length > 0;
  const visibleQuestions = isFinishingPhase && postQuestions.length ? postQuestions : questions;

  return (
    <View style={layout.page}>
      <PageHeader
        title={isFinishingPhase ? `Finish ${entry.title} Journal` : entry.title || "Journal Entry"}
        subtitle={formatEntryDate(entry.entry_date)}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {!isFinishingPhase && !isFoodEntry && (
            <TimeInput
              timeString={timeString}
              amPm={amPm}
              onTimeChange={setTimeString}
              onAmPmChange={setAmPm}
            />
          )}

          <MoodScoreInput
            moodScore={moodScore}
            onMoodChange={setMoodScore}
          />
          {!isFoodEntry && <RpeInput rpeScore={rpeScore} onRpeChange={setRpeScore} />}

          <AiInsightCards insight={aiInsight} />

          {isPhasedEntry && !isFinishingPhase && hasPhasedQuestions ? (
            <>
              <QuestionsSection
                title={`${phaseLabels.pre} questions`}
                questions={preQuestions}
                answers={answerTexts}
                onAnswerChange={(questionId, text) =>
                  setAnswerTexts((prev) => ({ ...prev, [questionId]: text }))
                }
              />
              <QuestionsSection
                title={`${phaseLabels.post} questions`}
                questions={postQuestions}
                answers={answerTexts}
                onAnswerChange={(questionId, text) =>
                  setAnswerTexts((prev) => ({ ...prev, [questionId]: text }))
                }
              />
            </>
          ) : (
            <QuestionsSection
              title={isFinishingPhase ? `${phaseLabels.post} questions` : "Questions"}
              questions={visibleQuestions}
              answers={answerTexts}
              onAnswerChange={(questionId, text) =>
                setAnswerTexts((prev) => ({ ...prev, [questionId]: text }))
              }
            />
          )}
          <OtherNotes value={notes} onChangeText={setNotes} />
        </ScrollView>
      </KeyboardAvoidingView>

      {!isKeyboardVisible ? (
        <>
          <View style={styles.footer}>
            <ButtonRow>
              <AppButton
                label={deleting ? "Deleting..." : "Delete entry"}
                onPress={handleDelete}
                disabled={deleting || saving}
                variant="dangerOutline"
                flex
              />
              <AppButton
                label={saving ? "Saving..." : isFinishingPhase ? "Finish journal" : "Save changes"}
                onPress={handleSave}
                disabled={saving || deleting || !hasChanges}
                flex
              />
            </ButtonRow>
          </View>
          <BottomNav onHome={() => router.push("/")} onCalendar={() => router.push("/calendar")} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: space.lg },
  footer: {
    paddingTop: space.md,
    paddingBottom: space.sm,
    alignSelf: "stretch",
    width: "100%",
  },
});
