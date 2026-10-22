import { describe, expect, it } from "vitest";
import {
  contentKey,
  empty,
  merge,
  record,
  validateBackup,
  type Result,
  type State,
  type Word,
} from "./core";
import {
  compatibleSchedules,
  mergeBackupSchedules,
  scheduleForEntries,
} from "./schedule-state";
import { rebaseState, StorageConflictError } from "./storage";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 22, 8);
const oldWord: Word = {
  id: "bee-sense-safety",
  word: "bee",
  part_of_speech: "noun",
  meaning_vi: "nhà thơ",
  example_en: "A bee landed on the flower.",
  example_vi: "Một con ong đậu trên bông hoa.",
};
const newWord = { ...oldWord, meaning_vi: "con ong" };
const key = `${oldWord.id}:1`;
const fixture = (word = oldWord) => merge(empty(), [word], "default");
const review = (word: Word, overrides: Partial<Result> = {}): Result => ({
  id: "review",
  wordId: word.id,
  time: NOW,
  skill: 1,
  answer: "bee",
  correct: true,
  hint: false,
  method: "rule",
  elapsed: 2000,
  session: "session",
  review: "review",
  gap: 0,
  first: true,
  independent: true,
  evidenceVersion: 2,
  scheduled: true,
  contentVersion: contentKey(word, 1),
  ...overrides,
});
function oldSnapshot() {
  const state = fixture();
  state.schedules[key] = { last: NOW - 30 * DAY, due: NOW - 1000, step: 4 };
  return state;
}

describe("schedule meaning safety", () => {
  it("keeps unchanged legacy schedules without resetting their stages or due dates", () => {
    const state = oldSnapshot();
    const before = structuredClone(state);
    expect(compatibleSchedules(state)).toEqual(state.schedules);
    expect(mergeBackupSchedules(fixture(), state)).toEqual(state.schedules);
    expect(state).toEqual(before);
  });

  it("does not resurrect an old-sense legacy schedule when the current meaning won a backup union", () => {
    const backup = oldSnapshot();
    backup.history = [review(oldWord, { time: backup.schedules[key].last })];
    const current = merge(backup, [newWord], "default");
    expect(current.schedules).toEqual({});
    expect(mergeBackupSchedules(current, backup)).toEqual({});
    expect(current.entries[oldWord.id].word.meaning_vi).toBe("con ong");
    expect(current.history).toEqual(backup.history);
  });

  it("restores compatible backup-only words and preserves the current schedule first", () => {
    const backup = oldSnapshot();
    const blank = empty();
    expect(mergeBackupSchedules(blank, backup)).toEqual(backup.schedules);
    const current = oldSnapshot();
    current.schedules[key] = { last: NOW, due: NOW + DAY, step: 0 };
    expect(mergeBackupSchedules(current, backup)[key]).toEqual(
      current.schedules[key],
    );
  });

  it("ignores explicitly wrong-sense schedules and legacy schedules contradicted by their setting review", () => {
    const state = oldSnapshot();
    state.entries[oldWord.id].word = newWord;
    state.schedules[key] = {
      ...state.schedules[key],
      contentVersion: contentKey(oldWord, 1),
    };
    expect(compatibleSchedules(state)).toEqual({});
    delete state.schedules[key].contentVersion;
    state.history = [review(oldWord, { time: state.schedules[key].last })];
    expect(scheduleForEntries(state, key, state.entries)).toBeUndefined();
    // Historical evidence is still structurally valid and is never deleted.
    expect(validateBackup(state).history).toEqual(state.history);
  });

  it("prevents a later old-tab review from replacing the current meaning's short schedule", () => {
    const base = oldSnapshot();
    const current = record(
      merge(base, [newWord], "default"),
      review(newWord, {
        id: "new-meaning",
        session: "new-tab",
        review: "new-meaning",
        time: NOW - 500,
      }),
      true,
    );
    const stale = record(
      base,
      review(oldWord, {
        id: "old-meaning",
        session: "old-tab",
        review: "old-meaning",
        time: NOW,
      }),
      true,
    );
    expect(current.schedules[key].step).toBe(0);
    expect(stale.schedules[key].step).toBe(4);
    const saved = rebaseState(base, stale, current);
    expect(saved.entries[oldWord.id].word).toEqual(newWord);
    expect(saved.schedules[key]).toEqual(current.schedules[key]);
    expect(saved.history.map((r) => r.id)).toEqual([
      "new-meaning",
      "old-meaning",
    ]);
    expect(saved.history.at(-1)?.contentVersion).toBe(contentKey(oldWord, 1));
  });

  it("also rejects an unstamped review from an older client and ignores its stale schedule deletion", () => {
    const base = oldSnapshot();
    const current = record(
      merge(base, [newWord], "default"),
      review(newWord, {
        id: "new",
        session: "new",
        review: "new",
        time: NOW - 500,
      }),
      true,
    );
    const stale = structuredClone(base);
    stale.history.push(review(oldWord, { id: "older-client" }));
    stale.schedules[key] = { last: NOW, due: NOW + 30 * DAY, step: 4 };
    expect(rebaseState(base, stale, current).schedules).toEqual(
      current.schedules,
    );
    delete stale.schedules[key];
    expect(rebaseState(base, stale, current).schedules).toEqual(
      current.schedules,
    );
  });

  it("removes affected schedules after a real source change but keeps unrelated skills and personal settings", () => {
    const base = fixture(newWord);
    base.schedules = {
      [`${newWord.id}:0`]: { last: NOW, due: NOW + DAY, step: 1 },
      [`${newWord.id}:4`]: { last: NOW, due: NOW + DAY, step: 1 },
    };
    const next = merge(
      base,
      [{ ...newWord, example_en: "A bee flew past the window." }],
      "default",
    );
    const saved = rebaseState(base, { ...next, voice: "en-US" }, base);
    expect(saved.schedules[`${newWord.id}:0`]).toEqual(
      base.schedules[`${newWord.id}:0`],
    );
    expect(saved.schedules[`${newWord.id}:4`]).toBeUndefined();
    expect(saved.voice).toBe("en-US");
  });
});

describe("new local-first records preserve independent tab edits", () => {
  it("unions exposure events once and rejects an immutable event ID rewritten by a tab", () => {
    const base = fixture(newWord);
    const first = { id: "event-a", wordId: newWord.id, time: NOW };
    const second = { id: "event-b", wordId: newWord.id, time: NOW + 100 };
    const latest = { ...base, exposureEvents: [first] };
    const next = { ...base, exposureEvents: [second] };
    const saved = rebaseState(base, next, latest);
    expect(saved.exposureEvents).toEqual([first, second]);
    expect(rebaseState(base, next, saved).exposureEvents).toEqual([
      first,
      second,
    ]);
    expect(() =>
      rebaseState(
        latest,
        {
          ...latest,
          exposureEvents: [{ ...first, time: NOW + 200 }],
        },
        latest,
      ),
    ).toThrow(StorageConflictError);
  });

  it("keeps an explicit restore's event removals while allowing a stale tab's new event", () => {
    const old = { id: "event-old", wordId: newWord.id, time: NOW };
    const added = { id: "event-new", wordId: newWord.id, time: NOW + 100 };
    const base = { ...fixture(newWord), exposureEvents: [old] };
    const latest = { ...base, exposureEvents: [] };
    const next = { ...base, exposureEvents: [old, added] };
    expect(rebaseState(base, next, latest).exposureEvents).toEqual([added]);
  });

  it("merges drafts of different words and rejects conflicting text for the same draft key", () => {
    const base = fixture(newWord);
    const a = {
      wordId: newWord.id,
      text: "A bee landed here.",
      updatedAt: NOW,
    };
    const b = {
      wordId: newWord.id,
      text: "A bee flew away.",
      updatedAt: NOW + 100,
    };
    const latest = { ...base, writingDrafts: { draftA: a } };
    const next = { ...base, writingDrafts: { draftB: b } };
    expect(rebaseState(base, next, latest).writingDrafts).toEqual({
      draftA: a,
      draftB: b,
    });
    expect(() =>
      rebaseState(
        base,
        {
          ...base,
          writingDrafts: { draftA: b },
        },
        latest,
      ),
    ).toThrow(StorageConflictError);
    const cleared = { ...latest, writingDrafts: {} };
    expect(rebaseState(latest, cleared, latest).writingDrafts).toEqual({});
  });
});
