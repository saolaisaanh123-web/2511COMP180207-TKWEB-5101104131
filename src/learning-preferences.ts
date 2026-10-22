import { canPractice, type Entry, type State } from "./core";

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const allSkills = [0, 1, 2, 3, 4, 5];

/** A personal starting preference, never a placement result. Missing CEFR is
 * unknown and stays eligible rather than being guessed below the chosen level.
 * Use only before selecting fresh words; scheduled reviews must bypass it. */
export function freshForPreference(
  entries: readonly Entry[],
  floor: State["learningFloor"] = "all",
): Entry[] {
  const minimum = levels.indexOf(floor || "all");
  return entries.filter((entry) => {
    const rank = levels.indexOf((entry.word.level || "").trim().toUpperCase());
    return minimum < 0 || rank < 0 || rank >= minimum;
  });
}

/** Select future introductions/unfinished skills only. Existing scheduled
 * tasks and a saved session keep all their original skills and order. */
export function chosenStudySkills(state: State, entry: Entry): number[] {
  const configured = (state.studySkills || allSkills).filter(
    (skill) => Number.isInteger(skill) && skill >= 0 && skill <= 5,
  );
  const chosen = new Set(configured.length ? configured : allSkills);
  return allSkills.filter(
    (skill) =>
      chosen.has(skill) &&
      (entry.goal !== "recognition" || skill === 0 || skill === 2) &&
      canPractice(entry.word, skill),
  );
}

/** Filters a new pending-skill list, never a list of due reviews. The generic
 * task shape preserves review IDs/context snapshots if the caller adds them. */
export function filterPendingForPreference<
  T extends { id: string; skill: number },
>(state: State, tasks: readonly T[]): T[] {
  const allowed = new Map<string, number[]>();
  return tasks.filter((task) => {
    const entry = state.entries[task.id];
    if (!entry) return false;
    let skills = allowed.get(task.id);
    if (!skills) {
      skills = chosenStudySkills(state, entry);
      allowed.set(task.id, skills);
    }
    return skills.includes(task.skill);
  });
}
