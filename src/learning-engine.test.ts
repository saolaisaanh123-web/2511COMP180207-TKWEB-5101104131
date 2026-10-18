import { describe, expect, it } from "vitest";
import {
  canPractice,
  collectFresh,
  contentKey,
  diff,
  empty,
  expose,
  independence,
  interleaveQueue,
  merge,
  pendingScheduledTasks,
  record,
  selectFreePractice,
  strength,
  validateBackup,
  type Result,
  type State,
  type Word,
} from "./core";
const day = 86400000;
const word: Word = {
  id: "apple",
  word: "apple",
  meaning_vi: "quả táo",
  part_of_speech: "noun",
  example_en: "I eat an apple every day.",
  example_vi: "Tôi ăn một quả táo mỗi ngày.",
  content_status: "reviewed",
  collections: "foundation",
};
const initial = () => merge(empty(), [word], "default");
const result = (time: number, extra: Partial<Result> = {}): Result => ({
  id: `r-${time}`,
  wordId: word.id,
  time,
  skill: 1,
  answer: "apple",
  correct: true,
  hint: false,
  method: "rule",
  elapsed: 1000,
  session: `s-${time}`,
  review: `v-${time}`,
  gap: 8 * day,
  first: true,
  evidenceVersion: 2,
  independent: true,
  audioPlayed: true,
  ...extra,
});
describe("Independent learning evidence", () => {
  it("does not certify recall immediately after seeing the answer in another skill", () => {
    let s = initial();
    s = record(s, result(day), true);
    s = record(s, result(9 * day), true);
    s = expose(s, word.id, 17 * day);
    expect(independence(s, word.id, 17 * day + 1000)).toBe(false);
    s = record(s, result(17 * day + 1000), true);
    expect(s.history.at(-1)?.independent).toBe(false);
    expect(strength(s, word.id, 1)).not.toBe("Nhớ khá vững");
    expect(s.schedules["apple:1"].step).toBe(0);
  });
  it("retains legacy results without treating them as independent mastery", () => {
    let s = initial();
    for (let i = 1; i <= 3; i++) {
      const r = result(i * 8 * day);
      delete r.evidenceVersion;
      delete r.independent;
      s = record(s, r, true);
    }
    expect(s.history).toHaveLength(3);
    expect(strength(s, word.id, 1)).not.toBe("Nhớ khá vững");
  });
  it("requires successful audio and refuses to schedule unavailable listening", () => {
    for (const skill of [2, 3]) {
      const s = record(
        initial(),
        result(day, { skill, audioPlayed: false }),
        true,
      );
      expect(s.history[0]).toMatchObject({
        correct: false,
        method: "ungraded",
        independent: false,
      });
      expect(s.schedules).toEqual({});
    }
  });
  it("only counts results for the current meaning and selectively resets changed context", () => {
    let s = initial();
    for (let i = 1; i <= 3; i++) s = record(s, result(i * 8 * day), true);
    expect(strength(s, word.id, 1)).toBe("Nhớ khá vững");
    s.schedules["apple:4"] = { last: day, due: 2 * day, step: 0 };
    const context = merge(
      s,
      [
        {
          ...word,
          example_en: "This apple tastes sweet.",
          example_vi: "Quả táo này có vị ngọt.",
        },
      ],
      "default",
    );
    expect(context.schedules["apple:1"]).toEqual(s.schedules["apple:1"]);
    expect(context.schedules["apple:4"]).toBeUndefined();
    const meaning = merge(
      s,
      [{ ...word, meaning_vi: "nghĩa mới cần kiểm tra" }],
      "default",
    );
    expect(meaning.history).toEqual(s.history);
    expect(meaning.schedules).toEqual({});
    expect(strength(meaning, word.id, 1)).not.toBe("Nhớ khá vững");
    expect(
      pendingScheduledTasks(meaning, Object.values(meaning.entries)),
    ).toContainEqual({ id: word.id, skill: 1 });
  });
});
describe("Quality gates and learning plan", () => {
  it("keeps unreviewed entries searchable but out of all automatic exercises", () => {
    for (const status of ["dictionary", "reference"]) {
      const w = { ...word, content_status: status };
      expect(canPractice(w, 1)).toBe(false);
      expect(canPractice({ ...w, learning_status: "ready" }, 1)).toBe(true);
    }
    for (const meaning_vi of [".", "...", "(như) goal", "xem mục jail"]) {
      expect(canPractice({ ...word, meaning_vi }, 1)).toBe(false);
    }
    expect(canPractice({ ...word, learning_status: "lookup" }, 1)).toBe(false);
  });
  it("does not exclude free-practiced vocabulary from its first scheduled introduction", () => {
    const s = record(initial(), result(day), false);
    expect(s.schedules).toEqual({});
    expect(s.entries.apple.enrolled).not.toBe(true);
    expect(
      collectFresh(s, Object.values(s.entries)).map((e) => e.word.id),
    ).toEqual(["apple"]);
    const enrolled = record(s, result(2 * day), true);
    expect(collectFresh(enrolled, Object.values(enrolled.entries))).toEqual([]);
    expect(
      pendingScheduledTasks(enrolled, Object.values(enrolled.entries)),
    ).not.toContainEqual({ id: "apple", skill: 1 });
    expect(
      pendingScheduledTasks(enrolled, Object.values(enrolled.entries)),
    ).toContainEqual({ id: "apple", skill: 3 });
  });
  it("interleaves different words and rotates free practice away from already practiced items", () => {
    expect(
      interleaveQueue([
        { id: "a", skill: 0 },
        { id: "a", skill: 1 },
        { id: "b", skill: 0 },
        { id: "b", skill: 1 },
      ]),
    ).toEqual([
      { id: "a", skill: 0 },
      { id: "b", skill: 0 },
      { id: "a", skill: 1 },
      { id: "b", skill: 1 },
    ]);
    let s = merge(
      initial(),
      [word, { ...word, id: "pear", word: "pear" }],
      "default",
    );
    s = record(s, result(day), false);
    expect(selectFreePractice(s, Object.values(s.entries), 1)[0].word.id).toBe(
      "pear",
    );
  });
});
describe("Preserved learner choices and valid backups", () => {
  it("preserves user archives and reports while explicitly previewing source restoration", () => {
    const s = initial();
    s.entries.apple.archived = true;
    s.entries.apple.reports = ["Cần kiểm tra ví dụ"];
    expect(diff(s, [word], "default").revived).toBe(0);
    expect(merge(s, [word], "default").entries.apple).toMatchObject({
      archived: true,
      archivedReason: "user",
      reports: s.entries.apple.reports,
    });
    s.entries.apple.archivedReason = "source";
    expect(diff(s, [word], "default").revived).toBe(1);
    expect(merge(s, [word], "default").entries.apple.archived).toBe(false);
  });
  it("handles IDs matching Object prototype names without mistaking them for existing entries", () => {
    const w = { ...word, id: "toString" };
    expect(diff(empty(), [w], "default").added).toBe(1);
    expect(
      Object.values(merge(empty(), [w], "default").entries)[0].word.word,
    ).toBe("apple");
  });
  it("roundtrips drafts, paused sessions and evidence while rejecting invalid new state", () => {
    const s: State = record(initial(), result(day), true);
    s.exposures = { apple: day };
    s.sourceVersion = "sha256-source";
    s.pausedScheduled = {
      id: "scheduled",
      queue: [{ id: "apple", skill: 5, review: "review" }],
      index: 0,
      count: 1,
      scheduled: true,
      started: day,
      draft: {
        key: "scheduled:0",
        answer: "I ate an apple.",
        hint: false,
        revealed: false,
      },
    };
    expect(validateBackup(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(() => validateBackup({ ...s, daily: 1.5 })).toThrow();
    expect(() =>
      validateBackup({ ...s, exposures: { missing: day } }),
    ).toThrow();
    expect(() =>
      validateBackup({
        ...s,
        pausedScheduled: { ...s.pausedScheduled, scheduled: false },
      }),
    ).toThrow();
    expect(() => validateBackup({ ...s, session: null })).toThrow();
    expect(s.history[0].contentVersion).toBe(contentKey(word, 1));
  });
});
