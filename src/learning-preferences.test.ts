import { describe, expect, it } from "vitest";
import { empty, merge, type Entry, type Word } from "./core";
import {
  chosenStudySkills,
  filterPendingForPreference,
  freshForPreference,
} from "./learning-preferences";

function entry(id: string, level = "B1"): Entry {
  const word: Word = {
    id,
    word: id,
    meaning_vi: "nghĩa đã rà",
    example_en: `I use ${id} here.`,
    example_vi: "Tôi dùng từ ở đây.",
    level,
    content_status: "reviewed",
    learning_status: "ready",
  };
  return { word, origin: "personal", archived: false };
}

describe("Personal preferences for future learning", () => {
  it("filters lower fresh levels while retaining unknown CEFR and stable input order", () => {
    const entries = [
      entry("known-basic", "A1"),
      entry("unknown", ""),
      entry("middle", "b1"),
      entry("advanced", "C1"),
      entry("unrated", "unknown"),
    ];
    const before = structuredClone(entries);
    expect(freshForPreference(entries, "B1").map((e) => e.word.id)).toEqual([
      "unknown",
      "middle",
      "advanced",
      "unrated",
    ]);
    expect(freshForPreference(entries)).toEqual(entries);
    expect(entries).toEqual(before);
    expect(freshForPreference(entries, "C1").map((e) => e.word.id)).toEqual([
      "unknown",
      "advanced",
      "unrated",
    ]);
  });

  it("defaults to existing six skills but respects selected skills and recognition goals", () => {
    const word = entry("practice");
    const state = empty();
    expect(chosenStudySkills(state, word)).toEqual([0, 1, 2, 3, 4, 5]);
    state.studySkills = [4, 1, 1, 3];
    expect(chosenStudySkills(state, word)).toEqual([1, 3, 4]);
    expect(chosenStudySkills(state, { ...word, goal: "recognition" })).toEqual(
      [],
    );
    state.studySkills = [0, 1, 2, 4];
    expect(chosenStudySkills(state, { ...word, goal: "recognition" })).toEqual([
      0, 2,
    ]);
    expect(
      chosenStudySkills(empty(), { ...word, goal: "recognition" }),
    ).toEqual([0, 2]);
  });

  it("does not construct unavailable context tasks or revive an unreviewed word", () => {
    const state = { ...empty(), studySkills: [1, 4] };
    const noCloze = entry("article");
    noCloze.word.example_type = "no-cloze";
    expect(chosenStudySkills(state, noCloze)).toEqual([1]);
    noCloze.word.learning_status = "lookup";
    expect(chosenStudySkills(state, noCloze)).toEqual([]);
  });

  it("filters future pending skills without altering due schedules or frozen sessions", () => {
    const low = entry("basic", "A1");
    const word = entry("practice");
    const state = merge(empty(), [low.word, word.word], "default");
    state.learningFloor = "B1";
    state.studySkills = [3, 4];
    state.schedules["basic:1"] = { last: 1, due: 2, step: 0 };
    const tasks = [
      { id: "basic", skill: 1, review: "due-original" },
      { id: "practice", skill: 1, review: "pending-write" },
      { id: "practice", skill: 3, review: "pending-dictation" },
      {
        id: "practice",
        skill: 4,
        review: "pending-context",
        context: {
          id: "frozen",
          en: "A saved context.",
          vi: "Câu đã lưu.",
          targetVersion: "original",
        },
      },
    ];
    state.session = {
      id: "already-open",
      queue: tasks.slice(0, 2),
      index: 0,
      started: 10,
      scheduled: true,
      count: 2,
    };
    const before = structuredClone({ state, tasks });
    const pending = filterPendingForPreference(state, tasks.slice(1));
    expect(pending).toEqual(tasks.slice(2));
    expect(pending[1]).toBe(tasks[3]);
    expect({ state, tasks }).toEqual(before);
    // A CEFR floor deliberately does not affect unfinished enrolled skills.
    expect(
      filterPendingForPreference(state, [{ id: "basic", skill: 3 }]),
    ).toEqual([{ id: "basic", skill: 3 }]);
  });
});
