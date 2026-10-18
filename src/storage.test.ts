import { describe, expect, it } from "vitest";
import { empty, type Result, type State } from "./core";
import { rebaseState, StorageConflictError } from "./storage";
import type { ConversationAttempt, WritingAttempt } from "./practice-data";

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

const writing = (id = "writing:1", time = 1000): WritingAttempt => ({
  id,
  wordId: "apple",
  time,
  text: "I ate an apple.",
  source: "local",
  status: "ungraded",
  issues: [],
  summary: "Chưa thể chấm tự động toàn bộ câu.",
  assessment: {
    grammar: "uncertain",
    usage: "uncertain",
    naturalness: "uncertain",
  },
  contentVersion: "apple:meaning:1",
});

const conversation = (
  id = "conversation:1",
  time = 1000,
): ConversationAttempt => ({
  id,
  dialogueId: "market",
  dialogueVersion: "1",
  time,
  targetIds: ["apple"],
  targetContentVersions: { apple: "apple:meaning:1" },
  answers: [
    {
      questionId: "market:reply",
      kind: "reply",
      answer: "Two apples, please.",
      targetIds: ["apple"],
      explanation: "Câu trả lời tự viết chưa được chấm.",
      hint: false,
    },
  ],
  read: true,
  listenedLineIds: ["market:a"],
  listenedComplete: false,
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

describe("append-only writing and conversation evidence", () => {
  it("adds collections to an older state without changing its existing progress", () => {
    const base = fixture();
    base.history.push(answer());
    base.schedules["apple:1"] = { last: 1000, due: 30000, step: 1 };
    const edit = {
      ...base,
      writing: [writing()],
      conversations: [conversation()],
      learningMode: "mixed" as const,
    };
    const saved = rebaseState(base, edit, base);
    expect(saved).toEqual(edit);
    expect(base).not.toHaveProperty("writing");
    expect(base).not.toHaveProperty("conversations");
    expect(rebaseState(base, { ...base, rate: 1 }, base)).not.toHaveProperty(
      "writing",
    );
  });

  it("unions concurrent attempts once and deterministically sorts them", () => {
    const base = fixture();
    const latest = {
      ...base,
      writing: [writing("b", 2000)],
      conversations: [conversation("d", 3000)],
    };
    const edit = {
      ...base,
      writing: [writing("a", 2000)],
      conversations: [conversation("c", 1000)],
    };
    const saved = rebaseState(base, edit, latest);
    expect(saved.writing?.map((a) => a.id)).toEqual(["a", "b"]);
    expect(saved.conversations?.map((a) => a.id)).toEqual(["c", "d"]);
    expect(rebaseState(base, edit, saved)).toEqual(saved);
    expect(latest.writing).toHaveLength(1);
    edit.writing[0].text = "Changed in memory after save";
    expect(saved.writing?.[0].text).toBe("I ate an apple.");
  });

  it("ordinary saves cannot erase evidence or lose it during a settings edit", () => {
    const base = {
      ...fixture(),
      writing: [writing()],
      conversations: [conversation()],
    };
    const next = { ...base, writing: [], conversations: [], voice: "en-US" };
    const saved = rebaseState(base, next, base);
    expect(saved.writing).toEqual(base.writing);
    expect(saved.conversations).toEqual(base.conversations);
    expect(saved.voice).toBe("en-US");
    const absent: State = { ...base };
    delete absent.writing;
    delete absent.conversations;
    expect(rebaseState(base, absent, saved).writing).toEqual(base.writing);
    expect(rebaseState(base, absent, saved).conversations).toEqual(
      base.conversations,
    );
  });

  it.each(["writing", "conversations"] as const)(
    "rejects changed content for an existing %s ID",
    (collection) => {
      const base = {
        ...fixture(),
        writing: [writing()],
        conversations: [conversation()],
      };
      const edit = structuredClone(base);
      edit[collection][0].time = 4000;
      expect(() => rebaseState(base, edit, base)).toThrow(StorageConflictError);
      // This also protects against a duplicate ID introduced independently.
      const original = fixture();
      expect(() => rebaseState(original, edit, base)).toThrow(
        StorageConflictError,
      );
      expect(base[collection][0].time).toBe(1000);
    },
  );

  it("rejects different duplicate IDs inside an incoming collection", () => {
    const base = fixture();
    const edit = {
      ...base,
      writing: [writing(), { ...writing(), text: "Another sentence." }],
    };
    expect(() => rebaseState(base, edit, base)).toThrow(StorageConflictError);
    expect(() =>
      rebaseState(
        base,
        {
          ...base,
          conversations: [conversation(), { ...conversation(), read: false }],
        },
        base,
      ),
    ).toThrow(StorageConflictError);
  });

  it("rejects practice records whose word disappeared and keeps the latest state intact", () => {
    const base = fixture();
    for (const edit of [
      { ...base, writing: [writing()] },
      { ...base, conversations: [conversation()] },
    ])
      expect(() => rebaseState(base, edit, empty())).toThrow(
        StorageConflictError,
      );
    const latest = {
      ...base,
      writing: [writing()],
      conversations: [conversation()],
    };
    expect(() =>
      rebaseState(latest, { ...latest, entries: {} }, latest),
    ).toThrow(StorageConflictError);
    expect(latest.entries).toHaveProperty("apple");
    expect(latest.writing).toHaveLength(1);
    expect(latest.conversations).toHaveLength(1);
  });

  it("does not resurrect unchanged evidence after another tab explicitly restored a backup", () => {
    const base = {
      ...fixture(),
      writing: [writing()],
      conversations: [conversation()],
    };
    const latest = fixture();
    const saved = rebaseState(base, { ...base, voice: "en-US" }, latest);
    expect(saved.writing).toEqual([]);
    expect(saved.conversations).toEqual([]);
    expect(saved.voice).toBe("en-US");
  });

  it("treats the chosen learning mode as a normal three-way setting", () => {
    const base = { ...fixture(), learningMode: "smart" as const };
    const latest = { ...base, learningMode: "common" as const };
    expect(rebaseState(base, { ...base, rate: 1 }, latest).learningMode).toBe(
      "common",
    );
    expect(() =>
      rebaseState(base, { ...base, learningMode: "weak" }, latest),
    ).toThrow(StorageConflictError);
  });
});
