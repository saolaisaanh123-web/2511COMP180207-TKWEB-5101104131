import { describe, expect, it } from "vitest";
import { empty, type Result, type State } from "./core";
import { rebaseState, StorageConflictError } from "./storage";

function fixture(): State {
  const state = empty();
  state.entries.apple = {
    origin: "default",
    archived: false,
    word: {
      id: "apple",
      word: "apple",
      meaning_vi: "quả táo",
      example_en: "I eat an apple.",
      example_vi: "Tôi ăn một quả táo.",
    },
  };
  return state;
}

const answer = (id = "session:0", time = 1000): Result => ({
  id,
  wordId: "apple",
  time,
  skill: 1,
  answer: "apple",
  correct: true,
  hint: false,
  method: "rule",
  elapsed: 2000,
  session: "session",
  review: id,
  gap: 0,
  first: true,
});

describe("concurrent state rebasing", () => {
  it("a stale voice edit preserves a completed review, schedule and active session", () => {
    const base = fixture();
    const latest = structuredClone(base);
    latest.history.push(answer());
    latest.schedules["apple:1"] = { last: 1000, due: 10000, step: 0 };
    latest.session = {
      id: "session",
      index: 1,
      queue: [
        { id: "apple", skill: 1, review: "a" },
        { id: "apple", skill: 2, review: "b" },
      ],
      scheduled: true,
      count: 1,
      started: 500,
    };
    const edit = { ...base, voice: "en-US" };
    const saved = rebaseState(base, edit, latest);
    expect(saved.voice).toBe("en-US");
    expect(saved.history).toEqual(latest.history);
    expect(saved.schedules).toEqual(latest.schedules);
    expect(saved.session).toEqual(latest.session);
    expect(base.voice).toBe("en-GB");
  });

  it("independent entry fields and source fields merge without deleting a learner report", () => {
    const base = fixture();
    const latest = structuredClone(base);
    latest.entries.apple.notes = "Cần rà lại nghĩa này";
    latest.entries.apple.word.example_en = "She ate an apple.";
    const edit = structuredClone(base);
    edit.entries.apple.known = true;
    edit.entries.apple.word.meaning_vi = "táo";
    const saved = rebaseState(base, edit, latest);
    expect(saved.entries.apple).toMatchObject({
      known: true,
      notes: "Cần rà lại nghĩa này",
      word: { meaning_vi: "táo", example_en: "She ate an apple." },
    });
  });

  it("keeps independent results once and uses the latest skill schedule", () => {
    const base = fixture();
    const latest = structuredClone(base);
    latest.history.push(answer("second", 3000));
    latest.schedules["apple:1"] = { last: 3000, due: 30000, step: 1 };
    const edit = structuredClone(base);
    edit.history.push(answer("first", 2000));
    edit.schedules["apple:1"] = { last: 2000, due: 20000, step: 0 };
    const saved = rebaseState(base, edit, latest);
    expect(saved.history.map((item) => item.id)).toEqual(["first", "second"]);
    expect(saved.schedules).toEqual(latest.schedules);
    expect(rebaseState(base, edit, saved).history).toHaveLength(2);
    expect(
      rebaseState(saved, { ...saved, history: [] }, saved).history,
    ).toHaveLength(2);
  });

  it("rejects conflicting evidence for the same question rather than silently overwriting", () => {
    const base = fixture();
    const latest = { ...base, history: [answer()] };
    const edit = {
      ...base,
      history: [{ ...answer(), answer: "pear", correct: false }],
    };
    expect(() => rebaseState(base, edit, latest)).toThrow(StorageConflictError);
    expect(latest.history[0].answer).toBe("apple");
  });

  it("rejects concurrent changes to the same entry field or session position", () => {
    const base = fixture();
    base.session = {
      id: "session",
      index: 0,
      queue: [{ id: "apple", skill: 1, review: "a" }],
      started: 0,
      scheduled: true,
      count: 1,
    };
    const latest = structuredClone(base);
    latest.session!.index = 1;
    const edit = structuredClone(base);
    edit.session!.queue.push({ id: "apple", skill: 2, review: "b" });
    expect(() => rebaseState(base, edit, latest)).toThrow(StorageConflictError);
    delete base.session;
    delete latest.session;
    delete edit.session;
    latest.entries.apple.notes = "tab A";
    edit.entries.apple.notes = "tab B";
    expect(() => rebaseState(base, edit, latest)).toThrow(StorageConflictError);
  });

  it("retains exposure timestamps, reports and first enrollment from both tabs", () => {
    const base = fixture();
    const latest = structuredClone(base);
    latest.exposures = { apple: 3000 };
    latest.entries.apple.reports = ["Cần ví dụ rõ hơn"];
    latest.entries.apple.enrolled = true;
    latest.entries.apple.enrolledAt = 3000;
    const edit = structuredClone(base);
    edit.exposures = { apple: 2000 };
    edit.entries.apple.reports = ["Cần rà nghĩa"];
    edit.entries.apple.enrolled = true;
    edit.entries.apple.enrolledAt = 2000;
    const saved = rebaseState(base, edit, latest);
    expect(saved.exposures).toEqual({ apple: 3000 });
    expect(saved.entries.apple.reports).toEqual([
      "Cần ví dụ rõ hơn",
      "Cần rà nghĩa",
    ]);
    expect(saved.entries.apple.enrolledAt).toBe(2000);
  });

  it("rejects a stale review after another tab replaced its vocabulary", () => {
    const base = fixture();
    const edit = { ...base, history: [answer()] };
    expect(() => rebaseState(base, edit, empty())).toThrow(
      StorageConflictError,
    );
    expect(
      rebaseState(base, { ...base, voice: "en-US" }, empty()).entries,
    ).toEqual({});
  });
});
