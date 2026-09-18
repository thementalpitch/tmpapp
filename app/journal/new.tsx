import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  getWorkoutTypes,
  getVisibleQuestionsByWorkoutType,
  createEntry,
  createAnswers,
  updateEntry,
  createMeals,
  type WorkoutType,
  type JournalQuestion,
  type MealType,
} from "../../src/api";
import { TimeInput } from "../../src/components/TimeInput";
import { MoodScoreInput, RpeInput } from "../../src/components/MoodScoreInput";
import { QuestionsSection } from "../../src/components/QuestionsSection";
import { AppButton, BottomNav, FormSection, PageHeader, PressableCard } from "../../src/components/AppChrome";
import { OtherNotes } from "../../src/components/OtherNotes";
import { colors, font, input, layout, space } from "../../src/theme";
import { normalizeTime, validateMoodScore } from "../../src/utils/timeValidation";
import { todayLocalDateString } from "../../src/utils/date";
import {
  getPhaseLabels,
  getPreQuestions,
  isPhasedJournalName,
} from "../../src/utils/journalPhases";
import { useKeyboardVisible } from "../../src/hooks/useKeyboardVisible";

export default function NewJournalEntryScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [step, setStep] = useState<"type" | "questions">("type");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([]);
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [questions, setQuestions] = useState<JournalQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [moodScore, setMoodScore] = useState<string>("");
  const [rpeScore, setRpeScore] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [amPm, setAmPm] = useState<"AM" | "PM">("AM");
  const [timeString, setTimeString] = useState<string>("");
  const isKeyboardVisible = useKeyboardVisible();
  const [meals, setMeals] = useState<
    Record<MealType, { food: string; feeling: string }>
  >({
    Breakfast: { food: "", feeling: "" },
    Lunch: { food: "", feeling: "" },
    Snack: { food: "", feeling: "" },
    Dinner: { food: "", feeling: "" },
  });

  useEffect(() => {
    const loadTypes = async () => {
      try {
        setLoading(true);
        const types = await getWorkoutTypes();
        // Only show system defaults for now to keep list concise
        const systemTypes = types.filter((t) => t.is_system_default);
        setWorkoutTypes(systemTypes);
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Failed to load workout types");
      } finally {
        setLoading(false);
      }
    };

    loadTypes();
  }, []);

  const handleSelectType = async (type: WorkoutType) => {
    try {
      setSelectedType(type);
      setLoading(true);
      setNotes("");
      setMoodScore("");
      setRpeScore(null);
      setTimeString("");

      const isFood =
        type.name.toLowerCase().includes("food") ||
        type.name.toLowerCase().includes("nutrition");

      if (isFood) {
        // Food entries use the dedicated Food UI, not generic questions
        setQuestions([]);
        setAnswers({});
        setMeals({
          Breakfast: { food: "", feeling: "" },
          Lunch: { food: "", feeling: "" },
          Snack: { food: "", feeling: "" },
          Dinner: { food: "", feeling: "" },
        });
        setStep("questions");
        return;
      }

      const qs = await getVisibleQuestionsByWorkoutType(type.id);
      setQuestions(qs);
      // Initialize answers map (non-food)
      const initial: Record<string, string> = {};
      qs.forEach((q) => {
        initial[q.id] = "";
      });
      setAnswers(initial);
      setStep("questions");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedType) return;
    try {
      setSaving(true);

      // Validate and normalize time (only required for non-food entries)
      const normalizedTime = isFoodType ? null : normalizeTime(timeString, amPm);
      if (!isFoodType && !normalizedTime) {
        Alert.alert("Error", "Please enter a valid time (hour: 1-12, minute: 0-59).");
        setSaving(false);
        return;
      }

      const isPhasedStart = isPhasedJournalName(selectedType.name);

      // Validate mood after the session, not during a pre-session journal.
      const numericMood = validateMoodScore(moodScore);
      if (!isPhasedStart && numericMood === null) {
        Alert.alert("Error", "Please enter your mood score (1-10) before saving.");
        setSaving(false);
        return;
      }

      // Use provided date or default to today
      const isoDate = typeof date === "string" ? date : todayLocalDateString();

      const entry = await createEntry({
        workout_type_id: selectedType.id,
        entry_date: isoDate,
        title: selectedType.name,
        entry_time: normalizedTime,
        notes: isPhasedStart ? null : notes.trim() || null,
      });

      if (isFoodType) {
        // Save meals for Food entry (no time_of_day required)
        const mealInputs = (["Breakfast", "Lunch", "Snack", "Dinner"] as MealType[])
          .map((mealType) => ({
            mealType,
            fields: meals[mealType],
          }))
          .filter(
            ({ fields }) =>
              fields.food.trim().length > 0 || fields.feeling.trim().length > 0
          )
          .map(({ mealType, fields }) => ({
            entry_id: entry.id,
            meal_type: mealType,
            // time_of_day removed - no longer required for food entries
            food_items: fields.food.trim() || "(unspecified)",
            feeling_notes: fields.feeling.trim() || null,
          }));

        if (mealInputs.length > 0) {
          await createMeals(mealInputs);
        }
      } else {
        // Save question answers for non-food entries
        const preSessionQuestions = getPreQuestions(questions);
        const questionsToSave =
          isPhasedStart && preSessionQuestions.length ? preSessionQuestions : questions;
        const nonEmptyAnswers = questionsToSave
          .map((q) => ({
            question_id: q.id,
            text: (answers[q.id] || "").trim(),
          }))
          .filter((a) => a.text.length > 0);

        if (nonEmptyAnswers.length > 0) {
          await createAnswers(
            nonEmptyAnswers.map((a) => ({
              entry_id: entry.id,
              question_id: a.question_id,
              answer_text: a.text,
            }))
          );
        }
      }

      if (numericMood !== null || rpeScore !== null) {
        await updateEntry(entry.id, { mood_score: numericMood, rpe_score: rpeScore });
      }

      const phaseLabels = getPhaseLabels(selectedType.name);
      Alert.alert(
        "Saved",
        isPhasedStart
          ? `${phaseLabels.pre} journal started.`
          : "Your new entry has been created."
      );
      router.replace("/journal");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to create entry");
    } finally {
      setSaving(false);
    }
  };

  const isFoodType =
    selectedType ? selectedType.name.toLowerCase().includes("food") : false;
  const isPhasedType = isPhasedJournalName(selectedType?.name);
  const phaseLabels = getPhaseLabels(selectedType?.name);
  const preQuestions = getPreQuestions(questions);
  const visibleQuestions = isPhasedType && preQuestions.length ? preQuestions : questions;

  if (loading && step === "type") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accentSolid} />
      </View>
    );
  }

  const headerSubtitle =
    step === "type"
      ? "Choose a session type"
      : isPhasedType
      ? `${phaseLabels.pre} now. Finish after ${phaseLabels.session}.`
      : isFoodType
      ? "Skip meals you did not have."
      : undefined;

  return (
    <View style={layout.page}>
      <PageHeader
        title={
          step === "type"
            ? "New Entry"
            : isPhasedType
            ? `Start ${selectedType?.name} Journal`
            : selectedType?.name || "New Entry"
        }
        subtitle={headerSubtitle}
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
          {step === "type" ? (
            workoutTypes.map((type) => (
              <PressableCard
                key={type.id}
                title={type.name}
                subtitle={type.description || undefined}
                onPress={() => handleSelectType(type)}
              />
            ))
          ) : (
            <>
              {!isFoodType && (
                <TimeInput
                  timeString={timeString}
                  amPm={amPm}
                  onTimeChange={setTimeString}
                  onAmPmChange={setAmPm}
                />
              )}

              {!isPhasedType && (
                <>
                  <MoodScoreInput
                    moodScore={moodScore}
                    onMoodChange={setMoodScore}
                    isFoodType={isFoodType}
                  />
                  {!isFoodType && <RpeInput rpeScore={rpeScore} onRpeChange={setRpeScore} />}
                </>
              )}

              {isFoodType ? (
                <>
                  <FormSection title="Meals" hint="One block per meal. Skip any you did not have.">
                    {(["Breakfast", "Lunch", "Snack", "Dinner"] as MealType[]).map((mealType, index, arr) => (
                      <View key={mealType} style={[styles.mealBlock, index < arr.length - 1 && styles.mealBlockBorder]}>
                        <Text style={styles.mealLabel}>{mealType}</Text>
                        <TextInput
                          style={styles.mealInput}
                          multiline
                          scrollEnabled={false}
                          placeholder="What did you eat?"
                          placeholderTextColor={colors.faint}
                          value={meals[mealType].food}
                          onChangeText={(text) =>
                            setMeals((prev) => ({ ...prev, [mealType]: { ...prev[mealType], food: text } }))
                          }
                        />
                        <TextInput
                          style={styles.mealInput}
                          multiline
                          scrollEnabled={false}
                          placeholder="How did it feel? (optional)"
                          placeholderTextColor={colors.faint}
                          value={meals[mealType].feeling}
                          onChangeText={(text) =>
                            setMeals((prev) => ({ ...prev, [mealType]: { ...prev[mealType], feeling: text } }))
                          }
                        />
                      </View>
                    ))}
                  </FormSection>
                  <OtherNotes value={notes} onChangeText={setNotes} />
                </>
              ) : (
                <>
                  <QuestionsSection
                    title={isPhasedType ? `${phaseLabels.pre} questions` : "Questions"}
                    questions={visibleQuestions}
                    answers={answers}
                    onAnswerChange={(questionId, text) =>
                      setAnswers((prev) => ({ ...prev, [questionId]: text }))
                    }
                  />
                  {!isPhasedType && <OtherNotes value={notes} onChangeText={setNotes} />}
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {step === "questions" && !isKeyboardVisible && (
        <>
          <View style={styles.footer}>
            <AppButton
              label={saving ? "Saving..." : isPhasedType ? "Start Journal" : "Save Entry"}
              onPress={handleSave}
              disabled={saving}
            />
          </View>
          <BottomNav onHome={() => router.push("/")} onCalendar={() => router.push("/calendar")} />
        </>
      )}
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
  mealBlock: { gap: space.sm, paddingBottom: space.lg },
  mealBlockBorder: {
    marginBottom: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  mealLabel: {
    fontFamily: font,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  mealInput: { ...input, minHeight: 72, fontFamily: font, lineHeight: 24 },
  footer: { paddingTop: space.md, paddingBottom: space.sm },
});
