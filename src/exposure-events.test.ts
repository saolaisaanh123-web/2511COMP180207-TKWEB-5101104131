import { describe, expect, it } from "vitest";
import { contentKey, empty, type Result, type State } from "./core";
import {
  appendExposureEvent,
  deriveResultExposure,
  exposureEventsForSnapshot,
  mergeExposureEvents,
  validateExposureEvents,
  type ExposureEvent,
} from "./exposure-events";
import { mergeCloudState } from "./sync";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 22, 12);
function state(): State {
  const next = empty();
  next.entries.word = {
    origin: "default",
    archived: false,
    word: {
      id: "word",
      word: "suggest",
      part_of_speech: "verb",
      meaning_vi: "đề xuất",
      example_en: "I suggest leaving early.",
      example_vi: "Tôi đề xuất đi sớm.",
    },
  };
  return next;
}
function result(overrides: Partial<Result> = {}): Result {
  return {
    id: "answer",
    wordId: "word",
    time: NOW - 60_000,
    skill: 1,
    answer: "suggest",
    correct: true,
    hint: false,
    method: "rule",
    elapsed: 1000,
    session: "local-session",
    review: "review",
    gap: 0,
    first: true,
    independent: true,
    evidenceVersion: 2,
    exposureGap: 8 * DAY - 60_000,
    contentVersion: contentKey(state().entries.word.word, 1),
    ...overrides,
  };
}
const older: ExposureEvent = {
  id: "older",
  wordId: "word",
  time: NOW - 8 * DAY,
};

describe("immutable cross-device exposure evidence", () => {
  it("unions event IDs deterministically without losing older observations or changing inputs", () => {
    const phone = { id: "phone", wordId: "word", time: NOW - 90_000 };
    const left = [phone, older],
      right = [{ ...older }];
    const before = structuredClone({ left, right });
    expect(mergeExposureEvents(left, right)).toEqual([older, phone]);
    expect(mergeExposureEvents(right, left)).toEqual([older, phone]);
    expect({ left, right }).toEqual(before);
    expect(mergeExposureEvents(undefined, undefined)).toBeUndefined();
  });

  it("rejects an immutable ID collision and malformed backup observations", () => {
    expect(() =>
      mergeExposureEvents([older], [{ ...older, time: NOW }]),
    ).toThrow();
    const current = state();
    for (const exposureEvents of [
      "not an array",
      [{ ...older, time: -1 }],
      [{ ...older, time: NaN }],
      [{ ...older, wordId: "missing" }],
      [older, older],
      [{ ...older, resultId: "" }],
    ])
      expect(() =>
        validateExposureEvents({ ...current, exposureEvents }),
      ).toThrow();
    expect(() => validateExposureEvents(current)).not.toThrow();
  });

  it("appends an observation without lowering the legacy latest-time map", () => {
    const current = state();
    current.exposures = { word: NOW };
    const updated = appendExposureEvent(current, older);
    expect(updated.exposures?.word).toBe(NOW);
    expect(updated.exposureEvents).toEqual([older]);
    expect(current.exposureEvents).toBeUndefined();
    expect(appendExposureEvent(updated, older).exposureEvents).toHaveLength(1);
  });

  it("excludes an answer's own history/event while preserving its observed eight-day gap", () => {
    const current = state(),
      answer = result();
    current.history = [answer];
    current.exposures = { word: answer.time };
    current.exposureEvents = [
      older,
      {
        id: "result:answer",
        wordId: "word",
        time: answer.time,
        resultId: answer.id,
      },
    ];
    expect(deriveResultExposure(current, answer)).toEqual({
      independent: true,
      exposureGap: answer.exposureGap,
    });
  });

  it("invalidates a saved eight-day result when another device viewed the meaning thirty seconds earlier", () => {
    const base = appendExposureEvent(state(), older);
    const local = structuredClone(base),
      phone = structuredClone(base);
    const answer = result();
    local.history = [answer];
    local.exposureEvents!.push({
      id: "result:answer",
      wordId: "word",
      time: answer.time,
      resultId: answer.id,
    });
    local.exposures = { word: answer.time };
    const observed = appendExposureEvent(phone, {
      id: "phone-read",
      wordId: "word",
      time: NOW - 90_000,
    });
    const merged = mergeCloudState(base, local, observed);
    expect(merged.conflicts).toEqual([]);
    expect(merged.state.exposureEvents).toHaveLength(3);
    expect(deriveResultExposure(merged.state, merged.state.history[0])).toEqual(
      {
        independent: false,
        exposureGap: 30_000,
      },
    );
    expect(merged.state.history[0]).toEqual(answer);
    expect(local.history[0]).toEqual(answer);
  });

  it("preserves older snapshots' distinct latest views before max-map merge loses their chronology", () => {
    const local = state(),
      phone = state();
    const answer = result();
    local.history = [answer];
    local.exposures = { word: answer.time };
    phone.exposures = { word: answer.time - 30_000 };
    const before = structuredClone({ local, phone });
    const merged = mergeCloudState(undefined, local, phone);
    expect(merged.conflicts).toEqual([]);
    expect(merged.state.exposures?.word).toBe(answer.time);
    expect(deriveResultExposure(merged.state, answer)).toEqual({
      independent: false,
      exposureGap: 30_000,
    });
    expect(merged.state.history[0]).toEqual(answer);
    expect({ local, phone }).toEqual(before);
  });

  it("migrates an own legacy answer timestamp idempotently without manufacturing a same-time view", () => {
    const current = state(),
      answer = result();
    current.history = [answer];
    current.exposures = { word: answer.time };
    const events = exposureEventsForSnapshot(current)!;
    expect(events).toHaveLength(1);
    expect(events[0].resultId).toBe(answer.id);
    const upgraded = { ...current, exposureEvents: events };
    expect(exposureEventsForSnapshot(upgraded)).toEqual(events);
    expect(deriveResultExposure(upgraded, answer)).toEqual({
      independent: true,
      exposureGap: answer.exposureGap,
    });
    expect(current.exposureEvents).toBeUndefined();
  });

  it("reports cloud event ID conflicts as immutable instead of silently choosing a device", () => {
    const local = appendExposureEvent(state(), older);
    const remote = appendExposureEvent(state(), { ...older, time: NOW });
    const merged = mergeCloudState(undefined, local, remote);
    expect(merged.conflicts).toMatchObject([
      { path: "exposureEvents.older", immutable: true },
    ]);
    expect(local.exposureEvents).toEqual([older]);
  });

  it("treats a distinct same-time exposure as ambiguous and ignores later/future observations", () => {
    const current = state(),
      answer = result();
    current.history = [answer];
    current.exposureEvents = [
      older,
      {
        id: "after-answer",
        wordId: "word",
        time: answer.time + 1,
      },
      {
        id: "future",
        wordId: "word",
        time: NOW + 100 * DAY,
      },
    ];
    expect(deriveResultExposure(current, answer).independent).toBe(true);
    const sameTime = {
      ...current,
      exposureEvents: [
        ...current.exposureEvents,
        { id: "other-device-same-ms", wordId: "word", time: answer.time },
      ],
    };
    expect(deriveResultExposure(sameTime, answer)).toEqual({
      independent: false,
      exposureGap: 0,
    });
  });

  it("uses a prior result or legacy timestamp as a shorter bound without inventing unknown legacy gaps", () => {
    const current = state(),
      answer = result();
    current.exposures = { word: answer.time - 3000 };
    expect(deriveResultExposure(current, answer)).toEqual({
      independent: false,
      exposureGap: 3000,
    });
    current.exposures = {};
    current.history = [
      { ...result(), id: "earlier-question", time: answer.time - 2000 },
    ];
    expect(deriveResultExposure(current, answer)).toEqual({
      independent: false,
      exposureGap: 2000,
    });
    const noKnownGap = result({ exposureGap: undefined });
    expect(deriveResultExposure(state(), noKnownGap)).toEqual({
      independent: true,
      exposureGap: undefined,
    });
  });

  it("never upgrades self-supported or repeated work into independent evidence", () => {
    const current = appendExposureEvent(state(), older);
    for (const patch of [
      { independent: false },
      { first: false },
      { hint: true },
    ])
      expect(deriveResultExposure(current, result(patch)).independent).toBe(
        false,
      );
  });

  it("rejects explicit old-sense schedule stamps even if a merged snapshot already contains the new meaning", () => {
    const local = state(),
      remote = state();
    local.schedules["word:1"] = {
      last: NOW - DAY,
      due: NOW,
      step: 0,
      contentVersion: contentKey(local.entries.word.word, 1),
    };
    remote.schedules["word:1"] = {
      last: NOW,
      due: NOW + 30 * DAY,
      step: 4,
      contentVersion: "old-sense",
    };
    const merged = mergeCloudState(undefined, local, remote);
    expect(merged.state.schedules["word:1"]).toEqual(local.schedules["word:1"]);
  });
});
