import { describe, expect, it } from "vitest";
import {
  contentKey,
  empty,
  independence,
  interleaveQueue,
  merge,
  record,
  type Result,
  type State,
  type StudyTask,
  type Word,
} from "./core";
import { selectLearningEvidence } from "./evidence";
import { orderScheduledTasks } from "./session-planning";

const DAY = 86_400_000;
const START = Date.UTC(2026, 5, 1, 12);
const word: Word = {
  id: "rotating-apple",
  word: "apple",
  part_of_speech: "noun",
  meaning_vi: "quả táo",
  example_en: "I eat an apple every day.",
  example_vi: "Tôi ăn một quả táo mỗi ngày.",
  content_status: "reviewed",
};
const setup = () => merge(empty(), [word], "default");
const tasks = (id = word.id): StudyTask[] =>
  [0, 1, 2, 3, 4, 5].map((skill) => ({
    id,
    skill,
    review: `${id}-review-${skill}`,
  }));
const answer = (
  skill: number,
  time: number,
  session: string,
  index: number,
): Result => ({
  id: `${session}:${index}`,
  wordId: word.id,
  time,
  skill,
  answer: word.word,
  correct: skill !== 5,
  hint: false,
  method: skill === 5 ? "ungraded" : [0, 2].includes(skill) ? "self" : "rule",
  elapsed: 1000,
  session,
  review: `${session}-review-${skill}`,
  gap: 0,
  first: true,
  evidenceVersion: 2,
  independent: true,
  audioPlayed: [2, 3].includes(skill) ? true : undefined,
  contentVersion: contentKey(word, skill),
});

describe("New scheduled-session planning", () => {
  it("rotates the first objective skill across real review dates and keeps SRS unchanged", () => {
    let state = setup();
    const firstSkills: number[] = [];
    for (const [round, day] of [0, 1, 4, 11, 25, 55].entries()) {
      const time = START + day * DAY + round * 60_000;
      const queue =
        round === 0
          ? tasks()
          : orderScheduledTasks(
              state,
              tasks().filter((task) => task.skill !== 5),
              time,
            );
      if (round > 0) firstSkills.push(queue[0].skill);
      for (const [index, task] of queue.entries()) {
        const at = time + index * 1000;
        state = record(
          state,
          {
            ...answer(task.skill, at, `round-${round}`, index),
            independent: independence(state, word.id, at),
          },
          true,
        );
      }
    }
    expect(firstSkills).toEqual([3, 4, 1, 3, 4]);
    const delayed = selectLearningEvidence(state, START + 60 * DAY).delayed;
    for (const skill of [1, 3, 4]) {
      expect(
        delayed.some((result) => result.skill === skill),
        `skill ${skill}`,
      ).toBe(true);
      expect(state.schedules[`${word.id}:${skill}`].step).toBe(4);
    }
    // Later answers still stay non-independent after the first answer reveals
    // the word. Rotation adds opportunities rather than granting extra credit.
    expect(delayed).toHaveLength(5);
  });

  it("keeps every task, review and snapshot while preserving word-group order for interleaving", () => {
    const state = setup();
    const other = { ...word, id: "another-apple" };
    state.entries[other.id] = {
      word: other,
      origin: "default",
      archived: false,
    };
    const queue = [...tasks(word.id), ...tasks(other.id)];
    queue[4].context = {
      id: "frozen",
      en: "An apple fell.",
      vi: "Một quả táo rơi.",
      targetVersion: contentKey(word, 4),
    };
    state.session = {
      id: "already-open",
      queue: structuredClone(queue),
      index: 2,
      started: START,
      scheduled: true,
      count: queue.length,
    };
    state.pausedScheduled = structuredClone(state.session);
    const before = structuredClone({ state, queue });
    const ordered = orderScheduledTasks(state, queue, START);
    expect(ordered).toHaveLength(queue.length);
    expect(new Set(ordered)).toEqual(new Set(queue));
    expect({ state, queue }).toEqual(before);
    const interleaved = interleaveQueue(ordered);
    expect(interleaved.slice(0, 4).map((task) => task.id)).toEqual([
      word.id,
      other.id,
      word.id,
      other.id,
    ]);
    expect(
      interleaved.find((task) => task.skill === 4 && task.id === word.id)
        ?.context,
    ).toEqual(queue[4].context);
    expect(orderScheduledTasks(state, queue, START + 1000)).toEqual(ordered);
  });

  it("uses each word's own last session, skipping stale meanings, future records and free practice", () => {
    const state = setup();
    const previous = answer(1, START - DAY, "previous", 0);
    state.history = [{ ...previous, scheduled: true }];
    expect(orderScheduledTasks(state, tasks(), START)[0].skill).toBe(3);
    for (const changed of [
      { ...previous, scheduled: false },
      { ...previous, scheduled: true, contentVersion: "old-meaning" },
      { ...previous, scheduled: true, time: START + DAY },
    ]) {
      const next = { ...state, history: [changed] };
      expect(orderScheduledTasks(next, tasks(), START)[0].skill).toBe(1);
    }
    const onlyWriting = tasks().filter((task) =>
      [0, 1, 5].includes(task.skill),
    );
    expect(
      orderScheduledTasks(state, onlyWriting, START).map((task) => task.skill),
    ).toEqual([1, 0, 5]);
  });
});
