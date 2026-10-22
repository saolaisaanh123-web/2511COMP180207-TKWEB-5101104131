import { describe, expect, it } from "vitest";
import type { Result, Session } from "./core";
import {
  sessionProgress,
  sessionSummaryLines,
  summarizeSession,
} from "./session-guidance";

const task = (id: string, review = id, skill = 1) => ({ id, review, skill });
const lesson = (queue = [task("a"), task("b"), task("a")]): Session => ({
  id: "lesson",
  started: 10,
  queue,
  index: 0,
  count: 2,
  scheduled: true,
});
const result = (index: number, extra: Partial<Result> = {}): Result => ({
  id: `lesson:${index}`,
  session: "lesson",
  wordId: "a",
  review: "a",
  time: 20 + index,
  skill: 1,
  answer: "answer",
  correct: true,
  hint: false,
  method: "rule",
  elapsed: 1000,
  gap: 0,
  first: index === 0,
  ...extra,
});

describe("session guidance without changing evidence", () => {
  it("separates original goals from the saved retry and pending feedback", () => {
    const session = lesson();
    session.index = 2;
    const history = [result(0, { correct: false })];
    const before = structuredClone({ session, history });
    expect(sessionProgress(session, history)).toMatchObject({
      words: 2,
      originalTasks: 2,
      answered: 1,
      remaining: 0,
      skipped: 1,
      retries: 1,
      pendingRetries: 1,
      isRetry: true,
    });
    expect(sessionProgress(session, [...history, result(2)])).toMatchObject({
      pendingRetries: 0,
      isRetry: true,
    });
    expect({ session, history }).toEqual(before);
  });

  it("keeps a repaired first error out of first-answer accuracy", () => {
    const session = lesson();
    const history = [
      result(0, { correct: false }),
      result(1, { wordId: "b", review: "b", first: true }),
      result(2),
    ];
    expect(summarizeSession(session, history)).toMatchObject({
      initialTests: 2,
      initialCorrect: 1,
      failed: 1,
      repaired: 1,
      unresolved: 0,
      retryAnswers: 1,
    });
    expect(sessionSummaryLines(session, history).join(" ")).toContain(
      "chưa phải bằng chứng nhớ lâu",
    );
  });

  it("does not call a hinted, self-rated or ungraded retry a confirmed repair", () => {
    for (const retry of [
      result(2, { hint: true }),
      result(2, { method: "self" }),
      result(2, { method: "ungraded", correct: false }),
    ])
      expect(
        summarizeSession(lesson(), [result(0, { correct: false }), retry]),
      ).toMatchObject({ repaired: 0, unresolved: 1, initialCorrect: 0 });
  });

  it("uses the latest retry, so a later failure is not hidden by earlier success", () => {
    const session = lesson([task("a"), task("a"), task("a")]);
    expect(
      summarizeSession(session, [
        result(0, { correct: false }),
        result(1),
        result(2, { correct: false }),
      ]),
    ).toMatchObject({ repaired: 0, unresolved: 1, retryAnswers: 2 });
  });

  it("retains legacy sessions, deduplicates IDs and excludes other sessions", () => {
    const session = lesson([task("a"), task("b", "b", 0), task("c", "c", 5)]);
    const first = result(0);
    const history = [
      first,
      first,
      result(1, {
        wordId: "b",
        review: "b",
        skill: 0,
        method: "self",
        first: true,
      }),
      result(2, {
        wordId: "c",
        review: "c",
        skill: 5,
        method: "ungraded",
        first: true,
        correct: false,
      }),
      result(3, { session: "another-session", correct: false }),
    ];
    expect(summarizeSession(session, history)).toMatchObject({
      initialTests: 1,
      initialCorrect: 1,
      selfRated: 1,
      ungraded: 1,
      retryAnswers: 0,
      failed: 0,
    });
  });

  it("counts a skipped final original task without inventing an answer", () => {
    const session = lesson([task("a"), task("b")]);
    session.index = 1;
    expect(summarizeSession(session, [result(0)])).toMatchObject({
      originalTasks: 2,
      skipped: 1,
      initialTests: 1,
    });
  });
});
