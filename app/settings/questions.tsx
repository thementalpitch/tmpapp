import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import {
  createQuestion,
  getHiddenQuestionIds,
  getQuestionsWithWorkoutTypes,
  getSystemWorkoutTypes,
  hideQuestion,
  unhideQuestion,
  updateQuestion,
  type JournalQuestionWithWorkoutType,
  type WorkoutType,
} from "../../src/api";
import {
  AppButton,
  Card,
  Page,
  PageHeader,
  Section,
  SectionTitle,
} from "../../src/components/AppChrome";
import { colors, font, radius, space, type as typeStyles } from "../../src/theme";
import {
  getPhaseLabels,
  isPhasedJournalName,
  questionPhase,
} from "../../src/utils/journalPhases";

type PhaseChoice = "pre" | "post";

function phaseOf(question: JournalQuestionWithWorkoutType): PhaseChoice {
  return questionPhase(question) === "pre" ? "pre" : "post";
}

export default function CustomizeQuestions() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState<WorkoutType[]>([]);
  const [questions, setQuestions] = useState<JournalQuestionWithWorkoutType[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // Add-question form state (one open at a time, keyed by workout type id or "general")
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState("");
  const [newPhase, setNewPhase] = useState<PhaseChoice>("post");
  const [savingNew, setSavingNew] = useState(false);

  // Edit-question state (custom questions only)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedTypes, fetchedQuestions, hiddenIds] = await Promise.all([
        getSystemWorkoutTypes(),
        getQuestionsWithWorkoutTypes(),
        getHiddenQuestionIds().catch(() => [] as string[]),
      ]);
      setTypes(fetchedTypes);
      setQuestions(fetchedQuestions);
      setHidden(new Set(hiddenIds));
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load questions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleOfType = useCallback(
    (workoutTypeId: string | null) =>
      questions.filter(
        (q) => (q.workout_type_id ?? null) === workoutTypeId && !hidden.has(q.id)
      ),
    [questions, hidden]
  );

  const handleToggle = useCallback(
    async (question: JournalQuestionWithWorkoutType, turnOn: boolean) => {
      if (savingId) return;
      const typeId = question.workout_type_id ?? null;
      const typeName = question.workout_type_name ?? "General";

      if (!turnOn) {
        // Hiding: guard against emptying a journal or a phase.
        const remaining = visibleOfType(typeId).filter((q) => q.id !== question.id);
        if (remaining.length === 0) {
          Alert.alert(
            "Keep at least one",
            `Each journal needs at least one visible question. "${typeName}" would have none left.`
          );
          return;
        }
        if (isPhasedJournalName(typeName)) {
          const phase = phaseOf(question);
          const labels = getPhaseLabels(typeName);
          const remainingInPhase = remaining.filter((q) => phaseOf(q) === phase);
          if (remainingInPhase.length === 0) {
            Alert.alert(
              "Keep at least one",
              `Keep at least one ${phase === "pre" ? labels.pre.toLowerCase() : labels.post.toLowerCase()} question visible so the two-part journal flow keeps working.`
            );
            return;
          }
        }
      }

      try {
        setSavingId(question.id);
        if (turnOn) {
          await unhideQuestion(question.id);
          setHidden((prev) => {
            const next = new Set(prev);
            next.delete(question.id);
            return next;
          });
        } else {
          await hideQuestion(question.id);
          setHidden((prev) => new Set(prev).add(question.id));
        }
      } catch (error: any) {
        Alert.alert("Error", error?.message || "Failed to update question.");
      } finally {
        setSavingId(null);
      }
    },
    [savingId, visibleOfType]
  );

  const handleSaveNew = useCallback(
    async (workoutTypeId: string | null, typeName: string) => {
      const prompt = newPrompt.trim();
      if (!prompt) {
        Alert.alert("Write a question", "Type your question before saving it.");
        return;
      }
      if (!user) {
        Alert.alert("Error", "You must be signed in to add questions.");
        return;
      }
      try {
        setSavingNew(true);
        const typeQuestions = questions.filter(
          (q) => (q.workout_type_id ?? null) === workoutTypeId
        );
        const maxSort = typeQuestions.reduce((max, q) => Math.max(max, q.sort_order ?? 0), 0);
        const phased = isPhasedJournalName(typeName);
        const labels = phased ? getPhaseLabels(typeName) : null;
        const created = await createQuestion({
          owner_id: user.id,
          workout_type_id: workoutTypeId,
          prompt,
          help_text: phased && labels ? `Phase: ${newPhase === "pre" ? labels.pre : labels.post}` : null,
          is_required: false,
          sort_order: maxSort + 10,
          is_system_default: false,
        });
        setQuestions((prev) => [
          ...prev,
          { ...created, workout_type_name: typeName === "General" ? null : typeName },
        ]);
        setNewPrompt("");
        setNewPhase("post");
        setAddingFor(null);
      } catch (error: any) {
        Alert.alert("Error", error?.message || "Failed to add question.");
      } finally {
        setSavingNew(false);
      }
    },
    [newPrompt, newPhase, questions, user]
  );

  const handleSaveEdit = useCallback(
    async (question: JournalQuestionWithWorkoutType) => {
      const prompt = editPrompt.trim();
      if (!prompt) {
        Alert.alert("Write a question", "The question can't be empty.");
        return;
      }
      try {
        setSavingId(question.id);
        const updated = await updateQuestion(question.id, { prompt });
        setQuestions((prev) =>
          prev.map((q) => (q.id === question.id ? { ...q, prompt: updated.prompt } : q))
        );
        setEditingId(null);
        setEditPrompt("");
      } catch (error: any) {
        Alert.alert("Error", error?.message || "Failed to save changes.");
      } finally {
        setSavingId(null);
      }
    },
    [editPrompt]
  );

  const handleRemoveCustom = useCallback(
    (question: JournalQuestionWithWorkoutType) => {
      Alert.alert(
        "Remove question?",
        "It will stop appearing in your journals. Answers you've already written are kept.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                setSavingId(question.id);
                await hideQuestion(question.id);
                setHidden((prev) => new Set(prev).add(question.id));
              } catch (error: any) {
                Alert.alert("Error", error?.message || "Failed to remove question.");
              } finally {
                setSavingId(null);
              }
            },
          },
        ]
      );
    },
    []
  );

  const sections = useMemo(() => {
    const ordered = [...types].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const result: { key: string; title: string; workoutTypeId: string | null }[] =
      ordered.map((t) => ({ key: t.id, title: t.name, workoutTypeId: t.id }));
    result.push({ key: "general", title: "General", workoutTypeId: null });
    return result;
  }, [types]);

  const questionsFor = useCallback(
    (workoutTypeId: string | null) =>
      questions
        .filter((q) => (q.workout_type_id ?? null) === workoutTypeId)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [questions]
  );

  if (loading) {
    return (
      <Page>
        <PageHeader title="Journal questions" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Journal questions"
        subtitle="Pick what shows up in your journals"
        onBack={() => router.back()}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>
          Turn off any question to hide it from your journals. Add your own questions too.
          Hidden questions keep the answers you've already written.
        </Text>

        {sections.map((section) => {
          const sectionQuestions = questionsFor(section.workoutTypeId);
          const phased = isPhasedJournalName(section.title);
          const labels = phased ? getPhaseLabels(section.title) : null;
          const isAdding = addingFor === section.key;

          return (
            <Section key={section.key}>
              <SectionTitle>{section.title}</SectionTitle>
              <Card style={styles.card}>
                {sectionQuestions.length === 0 && (
                  <Text style={typeStyles.caption}>No questions yet.</Text>
                )}
                {sectionQuestions.map((q, index) => {
                  const isHidden = hidden.has(q.id);
                  const isCustom = q.owner_id !== null;
                  const isEditing = editingId === q.id;
                  const phase = phased ? phaseOf(q) : null;

                  return (
                    <View
                      key={q.id}
                      style={[
                        styles.row,
                        index < sectionQuestions.length - 1 && styles.rowBorder,
                        isHidden && styles.rowHidden,
                      ]}
                    >
                      {isEditing ? (
                        <View style={styles.editWrap}>
                          <TextInput
                            style={styles.input}
                            value={editPrompt}
                            onChangeText={setEditPrompt}
                            multiline
                            autoFocus
                          />
                          <View style={styles.editActions}>
                            <AppButton
                              label="Cancel"
                              variant="secondary"
                              onPress={() => {
                                setEditingId(null);
                                setEditPrompt("");
                              }}
                              flex
                            />
                            <AppButton
                              label={savingId === q.id ? "Saving..." : "Save"}
                              onPress={() => handleSaveEdit(q)}
                              disabled={savingId === q.id}
                              flex
                            />
                          </View>
                        </View>
                      ) : (
                        <>
                          <View style={styles.rowCopy}>
                            <Text style={[styles.prompt, isHidden && styles.promptHidden]}>
                              {q.prompt}
                            </Text>
                            <View style={styles.badges}>
                              {phase && labels ? (
                                <View style={styles.badge}>
                                  <Text style={styles.badgeText}>
                                    {phase === "pre" ? labels.pre : labels.post}
                                  </Text>
                                </View>
                              ) : null}
                              {isCustom ? (
                                <View style={[styles.badge, styles.badgeCustom]}>
                                  <Text style={styles.badgeText}>Yours</Text>
                                </View>
                              ) : null}
                            </View>
                            {isCustom ? (
                              <View style={styles.customActions}>
                                <TouchableOpacity
                                  onPress={() => {
                                    setEditingId(q.id);
                                    setEditPrompt(q.prompt);
                                  }}
                                >
                                  <Text style={styles.linkText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleRemoveCustom(q)}>
                                  <Text style={[styles.linkText, styles.linkDanger]}>Remove</Text>
                                </TouchableOpacity>
                              </View>
                            ) : null}
                          </View>
                          {savingId === q.id ? (
                            <ActivityIndicator color={colors.accent} />
                          ) : (
                            <Switch
                              value={!isHidden}
                              onValueChange={(on) => handleToggle(q, on)}
                              trackColor={{ false: colors.border, true: colors.accentStrong }}
                              thumbColor={colors.white}
                              accessibilityLabel={`Show "${q.prompt}"`}
                            />
                          )}
                        </>
                      )}
                    </View>
                  );
                })}

                {isAdding ? (
                  <View style={styles.addForm}>
                    <Text style={typeStyles.label}>Your question</Text>
                    <TextInput
                      style={styles.input}
                      value={newPrompt}
                      onChangeText={setNewPrompt}
                      placeholder="e.g. What did I eat before training?"
                      placeholderTextColor={colors.faint}
                      multiline
                      autoFocus
                    />
                    {phased && labels ? (
                      <View style={styles.phasePicker}>
                        {(["pre", "post"] as PhaseChoice[]).map((p) => (
                          <TouchableOpacity
                            key={p}
                            style={[
                              styles.phaseOption,
                              newPhase === p && styles.phaseOptionActive,
                            ]}
                            onPress={() => setNewPhase(p)}
                          >
                            <Text
                              style={[
                                styles.phaseOptionText,
                                newPhase === p && styles.phaseOptionTextActive,
                              ]}
                            >
                              {p === "pre" ? labels.pre : labels.post}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                    <View style={styles.editActions}>
                      <AppButton
                        label="Cancel"
                        variant="secondary"
                        onPress={() => {
                          setAddingFor(null);
                          setNewPrompt("");
                        }}
                        flex
                      />
                      <AppButton
                        label={savingNew ? "Adding..." : "Add question"}
                        onPress={() => handleSaveNew(section.workoutTypeId, section.title)}
                        disabled={savingNew}
                        flex
                      />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                      setAddingFor(section.key);
                      setNewPrompt("");
                      setNewPhase("post");
                    }}
                  >
                    <Text style={styles.addButtonText}>+ Add your own question</Text>
                  </TouchableOpacity>
                )}
              </Card>
            </Section>
          );
        })}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: space.xxxl },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  intro: {
    fontFamily: font,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginBottom: space.md,
  },
  card: { gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  rowHidden: { opacity: 0.55 },
  rowCopy: { flex: 1, gap: 6 },
  prompt: {
    fontFamily: font,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  promptHidden: { color: colors.muted },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: {
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeCustom: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  badgeText: {
    fontFamily: font,
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
  customActions: { flexDirection: "row", gap: 12 },
  linkText: {
    fontFamily: font,
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentStrong,
  },
  linkDanger: { color: colors.danger },
  input: {
    fontFamily: font,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  editWrap: { flex: 1, gap: 10 },
  editActions: { flexDirection: "row", gap: 10 },
  addForm: { gap: 10, marginTop: 12 },
  phasePicker: { flexDirection: "row", gap: 10 },
  phaseOption: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  phaseOptionActive: {
    borderColor: colors.accentStrong,
    backgroundColor: colors.accentMuted,
  },
  phaseOptionText: {
    fontFamily: font,
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  phaseOptionTextActive: { color: colors.accentStrong },
  addButton: {
    marginTop: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    paddingVertical: 12,
    alignItems: "center",
  },
  addButtonText: {
    fontFamily: font,
    fontSize: 14,
    fontWeight: "600",
    color: colors.accentStrong,
  },
});
