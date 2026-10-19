import { describe, expect, it } from "vitest";
import {
  empty,
  expose,
  merge,
  record,
  strength,
  type Result,
  type State,
  type Word,
} from "./core";

const DAY = 86_400_000;
const START = Date.UTC(2026, 5, 1, 12);
const word: Word = {
  id: "apple-scheduling",
  word: "apple",
  part_of_speech: "noun",
  meaning_vi: "quả táo",
  example_en: "I eat an apple every day.",
  example_vi: "Tôi ăn một quả táo mỗi ngày.",
  content_status: "reviewed",
};
const initial = () => merge(empty(), [word], "default");
const atDay = (day: number) => START + day * DAY;
const key = (skill: number) => `${word.id}:${skill}`;
const answer = (time: number, extra: Partial<Result> = {}): Result => ({
  id: `result-${time}`,
  wordId: word.id,
  time,
  skill: 1,
  answer: "apple",
  correct: true,
  hint: false,
  method: "rule",
  elapsed: 2_000,
  session: `session-${time}`,
  review: `review-${time}`,
  gap: 0,
  first: true,
  evidenceVersion: 2,
  independent: true,
  audioPlayed: true,
  ...extra,
});

function established(): State {
  let state = initial();
  for (const day of [0, 1, 4]) state = record(state, answer(atDay(day)), true);
  return state;
}

describe("Scheduling is separate from mastery evidence", () => {
  it.each([0, 2])(
    "advances self-rated skill %i over real review dates after revealing each answer, without certifying mastery",
    (skill) => {
      let state = initial();
      const reviewDays = [0, 1, 4, 11, 25];
      const dueDays = [1, 4, 11, 25, 55];
      for (const [step, reviewDay] of reviewDays.entries()) {
        const time = atDay(reviewDay);
        state = expose(state, word.id, time - 500);
        state = record(
          state,
          answer(time, { skill, method: "self", independent: false }),
          true,
        );
        expect(state.schedules[key(skill)]).toMatchObject({
          step,
          last: time,
          due: atDay(dueDays[step]),
        });
        expect(state.history.at(-1)?.independent).toBe(false);
        expect(strength(state, word.id, skill)).not.toBe("Nhớ khá vững");
      }
      expect(state.history).toHaveLength(reviewDays.length);
    },
  );

  it("advances an unhinted objective due check despite recent exposure, without certifying independent recall", () => {
    let state = established();
    expect(state.schedules[key(1)]).toMatchObject({ step: 2, due: atDay(11) });
    state = expose(state, word.id, atDay(11) - 60_000);
    state = record(state, answer(atDay(11)), true);
    expect(state.history.at(-1)).toMatchObject({
      correct: true,
      independent: false,
      exposureGap: 60_000,
    });
    expect(state.schedules[key(1)]).toMatchObject({ step: 3, due: atDay(25) });
    expect(strength(state, word.id, 1)).not.toBe("Nhớ khá vững");

    state = record(state, answer(atDay(12)), true);
    expect(state.history.at(-1)?.independent).toBe(true);
    expect(state.schedules[key(1)]).toMatchObject({ step: 3, due: atDay(25) });
    state = record(state, answer(atDay(25)), true);
    expect(state.history.at(-1)?.independent).toBe(true);
    expect(state.schedules[key(1)]).toMatchObject({ step: 4, due: atDay(55) });
  });

  it("lets all due skills advance across real multi-skill sessions at the same daily time", () => {
    let state = initial();
    const skillOrder = [1, 3, 4, 0, 2, 5];
    for (const [step, day] of [0, 1, 4].entries()) {
      for (const [index, skill] of skillOrder.entries()) {
        const time = atDay(day) + index * 2_000;
        const self = [0, 2].includes(skill);
        if (self || skill === 5) state = expose(state, word.id, time - 500);
        state = record(
          state,
          answer(time, {
            skill,
            method: skill === 5 ? "ungraded" : self ? "self" : "rule",
            correct: skill !== 5,
            session: `multi-skill-session-${day}`,
          }),
          true,
        );
        if (skill !== 5)
          expect(state.schedules[key(skill)]).toMatchObject({ step });
        // Yesterday's session ends after today's first-question time, and
        // each later skill has just seen another answer in this same session.
        if (day === 1 || index > 0)
          expect(state.history.at(-1)?.independent).toBe(false);
        expect(strength(state, word.id, skill)).not.toBe("Nhớ khá vững");
      }
    }
    expect(state.schedules[key(5)]).toBeUndefined();
    expect(state.history).toHaveLength(18);
  });

  it("keeps an established stage through repeated hinted successes instead of inflating or erasing it", () => {
    let state = established();
    for (const day of [11, 12, 13]) {
      state = record(state, answer(atDay(day), { hint: true }), true);
      expect(state.schedules[key(1)]).toMatchObject({
        step: 2,
        due: atDay(day + 1),
      });
      expect(state.history.at(-1)?.independent).toBe(false);
    }
  });

  it.each([
    { method: "rule" as const, hint: false },
    { method: "rule" as const, hint: true },
    { method: "self" as const, hint: false },
  ])(
    "does not move a future schedule for an early correct check: %j",
    (extra) => {
      const state = established();
      const schedule = state.schedules[key(1)];
      const next = record(state, answer(atDay(6), extra), true);
      expect(next.schedules[key(1)]).toEqual(schedule);
      expect(next.history).toHaveLength(state.history.length + 1);
      expect(state.schedules[key(1)]).toEqual(schedule);
    },
  );

  it("returns real failures to tomorrow even when reviewed before the due date", () => {
    for (const day of [6, 11]) {
      const state = record(
        established(),
        answer(atDay(day), { correct: false, answer: "pear" }),
        true,
      );
      expect(state.schedules[key(1)]).toMatchObject({
        step: 0,
        due: atDay(day + 1),
      });
    }
  });

  it("does not advance an overdue stage for a retry flagged as not first", () => {
    const state = record(
      established(),
      answer(atDay(11), { first: false }),
      true,
    );
    expect(state.schedules[key(1)]).toMatchObject({ step: 2, due: atDay(12) });
    expect(state.history.at(-1)?.independent).toBe(false);
  });

  it("preserves schedules for ungraded answers and free practice", () => {
    const state = established();
    for (const [method, scheduled] of [
      ["ungraded", true],
      ["rule", false],
    ] as const) {
      const next = record(state, answer(atDay(11), { method }), scheduled);
      expect(next.schedules).toEqual(state.schedules);
      expect(next.history).toHaveLength(state.history.length + 1);
    }
  });

  it("does not advance a duplicate review or alter the live session", () => {
    const state = established();
    state.session = {
      id: "live-session",
      queue: [{ id: word.id, skill: 1, review: "due-review" }],
      index: 0,
      started: atDay(11),
      scheduled: true,
      count: 1,
      draft: {
        key: "live-session:0",
        answer: "apple",
        hint: false,
        revealed: false,
      },
    };
    const result = answer(atDay(11), { review: "due-review" });
    const next = record(state, result, true);
    const retried = record(
      next,
      { ...result, id: "retry-same-review", time: atDay(12), first: false },
      true,
    );
    expect(retried.schedules).toEqual(next.schedules);
    expect(retried.session).toEqual(state.session);
    expect(retried.history).toHaveLength(next.history.length + 1);
    expect(record(next, result, true)).toBe(next);
  });

  it("caps sustained successful self reviews at the existing maximum stage", () => {
    let state = initial();
    state.schedules[key(0)] = { last: atDay(0), due: atDay(30), step: 4 };
    state = record(
      state,
      answer(atDay(30), { skill: 0, method: "self" }),
      true,
    );
    expect(state.schedules[key(0)]).toMatchObject({ step: 4, due: atDay(60) });
  });
});
