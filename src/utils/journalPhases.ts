import type { JournalQuestion } from "../api";

export function isGameName(name?: string | null): boolean {
  return (name || "").trim().toLowerCase() === "game";
}

export function isTrainingName(name?: string | null): boolean {
  return (name || "").trim().toLowerCase() === "training";
}

export function isPhasedJournalName(name?: string | null): boolean {
  return isGameName(name) || isTrainingName(name);
}

export function getPhaseLabels(name?: string | null) {
  const training = isTrainingName(name);
  return {
    pre: training ? "Pre-training" : "Pregame",
    post: training ? "Post-training" : "Postgame",
    session: training ? "training" : "game",
  };
}

export function questionPhase(question: JournalQuestion): "pre" | "post" | null {
  const help = (question.help_text || "").toLowerCase();
  if (help.includes("pregame") || help.includes("pre-training")) return "pre";
  if (help.includes("postgame") || help.includes("post-training")) return "post";
  return null;
}

export function getPreQuestions(questions: JournalQuestion[]) {
  return questions.filter((question) => questionPhase(question) === "pre");
}

export function getPostQuestions(questions: JournalQuestion[]) {
  return questions.filter((question) => questionPhase(question) !== "pre");
}
