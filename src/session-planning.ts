import type { Result, State, StudyTask } from "./core";
import { selectLearningEvidence } from "./evidence";

const objectiveCycle = [1, 3, 4];
const selfAndWriting = [0, 2, 5];
const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function savedPosition(result: Result): number {
  if (!result.id.startsWith(`${result.session}:`)) return Infinity;
  const suffix = result.id.slice(result.session.length + 1);
  return /^\d+$/.test(suffix) ? Number(suffix) : Infinity;
}

/** For a NEW queue only. Each word gets a different first blind skill than
 * its previous scheduled session; all tasks/reviews/context snapshots stay.
 * The caller interleaves word groups afterwards and keeps introductions last.
 * This does not lower the independent-recall threshold or change due dates. */
export function orderScheduledTasks(
  state: State,
  tasks: StudyTask[],
  now = Date.now(),
): StudyTask[] {
  const groups = new Map<string, StudyTask[]>();
  for (const task of tasks) {
    const group = groups.get(task.id) || [];
    group.push(task);
    groups.set(task.id, group);
  }
  const firstBySession = new Map<string, Result>();
  for (const result of selectLearningEvidence(state, now).current) {
    if (
      !groups.has(result.wordId) ||
      !result.scheduled ||
      !result.first ||
      result.method !== "rule" ||
      !objectiveCycle.includes(result.skill)
    )
      continue;
    const key = JSON.stringify([result.wordId, result.session]);
    const old = firstBySession.get(key);
    if (
      !old ||
      result.time < old.time ||
      (result.time === old.time &&
        savedPosition(result) < savedPosition(old)) ||
      (result.time === old.time &&
        savedPosition(result) === savedPosition(old) &&
        compareIds(result.id, old.id) < 0)
    )
      firstBySession.set(key, result);
  }
  const lastSession = new Map<string, Result>();
  for (const result of firstBySession.values()) {
    const old = lastSession.get(result.wordId);
    if (
      !old ||
      result.time > old.time ||
      (result.time === old.time && compareIds(result.session, old.session) > 0)
    )
      lastSession.set(result.wordId, result);
  }
  return [...groups.entries()].flatMap(([id, group]) => {
    const last = lastSession.get(id);
    const offset = last
      ? (objectiveCycle.indexOf(last.skill) + 1) % objectiveCycle.length
      : 0;
    const priority = [
      ...objectiveCycle.slice(offset),
      ...objectiveCycle.slice(0, offset),
      ...selfAndWriting,
    ];
    return group
      .slice()
      .sort((a, b) => priority.indexOf(a.skill) - priority.indexOf(b.skill));
  });
}
