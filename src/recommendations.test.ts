import { describe, expect, it } from "vitest";
import {
  contentKey,
  empty,
  sortForLearning,
  type Entry,
  type Result,
  type State,
} from "./core";
import { rankNewWords, recommendWords } from "./recommendations";

const DAY = 86400000;
const NOW = new Date(2026, 9, 19, 12).getTime();
function entry(id: string, extra: Partial<Entry["word"]> = {}): Entry {
  return {
    word: {
      id,
      word: id,
      meaning_vi: "nghĩa đã rà",
      example_en: `I can use ${id} here.`,
      example_vi: "Tôi có thể dùng từ này ở đây.",
      content_status: "reviewed",
      learning_status: "ready",
      level: "B1",
      frequency_zipf: "5",
      ...extra,
    },
    origin: "default",
    archived: false,
  };
}
function state(...entries: Entry[]): State {
  return {
    ...empty(),
    entries: Object.fromEntries(entries.map((e) => [e.word.id, e])),
  };
}
function result(e: Entry, extra: Partial<Result> = {}): Result {
  const skill = extra.skill ?? 1;
  return {
    id: `r-${e.word.id}-${extra.time ?? NOW - DAY}-${skill}`,
    wordId: e.word.id,
    time: NOW - DAY,
    skill,
    answer: e.word.word,
    correct: true,
    hint: false,
    method: "rule",
    elapsed: 1000,
    session: "session",
    review: "review",
    gap: 8 * DAY,
    exposureGap: 8 * DAY,
    first: true,
    independent: true,
    evidenceVersion: 2,
    contentVersion: contentKey(e.word, skill),
    audioPlayed: true,
    ...extra,
  };
}
const ids = (recommendations: ReturnType<typeof recommendWords>) =>
  recommendations.map((r) => r.entry.word.id);
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const part of Object.values(value)) freeze(part);
  }
  return value;
}

describe("Personal learning recommendations", () => {
  it("keeps enrolled and due words out of new words without touching their schedule", () => {
    const fresh = entry("fresh"),
      due = entry("due"),
      enrolled = { ...entry("enrolled"), enrolled: true };
    const s = state(fresh, due, enrolled);
    s.schedules["due:1"] = { due: NOW - DAY, last: NOW - 3 * DAY, step: 1 };
    const before = structuredClone(s);
    expect(
      ids(rankNewWords(s, Object.values(s.entries), "smart", NOW)),
    ).toEqual(["fresh"]);
    expect(s).toEqual(before);
  });

  it("uses frequency ahead of CEFR while preserving the library's existing CEFR order", () => {
    const low = entry("low", { level: "A1", frequency_zipf: "3" });
    const useful = entry("useful", { level: "B2", frequency_zipf: "5.5" });
    const s = state(low, useful);
    const entries = Object.values(s.entries);
    expect(ids(rankNewWords(s, entries, "smart", NOW))).toEqual([
      "useful",
      "low",
    ]);
    expect(sortForLearning(entries).map((e) => e.word.id)).toEqual([
      "low",
      "useful",
    ]);
    expect(entries.map((e) => e.word.id)).toEqual(["low", "useful"]);
  });

  it("makes weak practice depend on actual graded errors rather than unseen words", () => {
    const common = entry("common", { frequency_zipf: "6" });
    const weak = entry("weak", { frequency_zipf: "5.8" });
    const unseen = entry("unseen", { frequency_zipf: "6.1" });
    const s = state(common, weak, unseen);
    s.history = [result(common), result(weak, { correct: false })];
    expect(
      ids(
        recommendWords(s, Object.values(s.entries), { mode: "weak", now: NOW }),
      ),
    ).toEqual(["weak"]);
    expect(
      ids(
        recommendWords(s, Object.values(s.entries), {
          mode: "common",
          now: NOW,
        }),
      )[0],
    ).toBe("unseen");
    const smart = recommendWords(s, Object.values(s.entries), {
      mode: "smart",
      now: NOW,
    });
    expect(ids(smart)[0]).toBe("weak");
    expect(smart[0].reason).toContain("1/1 lượt gần nhất sai hoặc cần gợi ý");
  });

  it("only calls free-practiced errors new when they have not entered the scheduled course", () => {
    const weak = entry("weak"),
      unseen = entry("unseen");
    const s = state(weak, unseen);
    s.history = [result(weak, { correct: false, scheduled: false })];
    expect(ids(rankNewWords(s, Object.values(s.entries), "weak", NOW))).toEqual(
      ["weak"],
    );
    s.entries.weak.enrolled = true;
    expect(rankNewWords(s, Object.values(s.entries), "weak", NOW)).toEqual([]);
  });

  it("ignores legacy, obsolete-meaning, self-marked, retry and unplayed-audio results", () => {
    const words = ["legacy", "changed", "self", "retry", "audio"].map((id) =>
      entry(id),
    );
    const s = state(...words);
    s.history = words.map((e) => result(e, { correct: false }));
    delete s.history[0].evidenceVersion;
    s.history[1].contentVersion = contentKey(
      { ...words[1].word, meaning_vi: "nghĩa cũ" },
      1,
    );
    s.history[2].method = "self";
    s.history[3].first = false;
    s.history[4] = result(words[4], {
      correct: false,
      skill: 3,
      audioPlayed: false,
    });
    expect(recommendWords(s, words, { mode: "weak", now: NOW })).toEqual([]);
    expect(
      recommendWords(s, words, { now: NOW }).every(
        (r) => !r.reason.includes("lượt gần nhất sai"),
      ),
    ).toBe(true);
  });

  it("does not let an error in one skill label a different skill weak", () => {
    const e = entry("confirm");
    const s = state(e);
    s.history = [
      result(e, { skill: 3, correct: false }),
      result(e, { skill: 1, correct: true }),
    ];
    expect(
      recommendWords(s, [e], { mode: "weak", skill: 1, now: NOW }),
    ).toEqual([]);
    expect(
      ids(recommendWords(s, [e], { mode: "weak", skill: 3, now: NOW })),
    ).toEqual(["confirm"]);
  });

  it("keeps mixed order stable across reloads, input order and clock changes within a local day", () => {
    const words = Array.from({ length: 30 }, (_, i) => entry(`word-${i}`));
    const s = state(...words);
    const a = recommendWords(s, words, { mode: "mixed", limit: 12, now: NOW });
    const b = recommendWords(structuredClone(s), [...words].reverse(), {
      mode: "mixed",
      limit: 12,
      now: NOW + 1000,
    });
    expect(a).toEqual(b);
    expect(new Set(ids(a)).size).toBe(12);
    expect(ids(a)).not.toEqual(
      ids(recommendWords(s, words, { mode: "common", limit: 12, now: NOW })),
    );
    expect(ids(a)).not.toEqual(
      ids(
        recommendWords(s, words, { mode: "mixed", limit: 12, now: NOW + DAY }),
      ),
    );
  });

  it("separates very similar written forms and alternates declared word types", () => {
    const confirm = entry("confirm", {
      frequency_zipf: "6",
      part_of_speech: "verb",
    });
    const confirmed = entry("confirmed", {
      frequency_zipf: "5.99",
      part_of_speech: "verb",
    });
    const appointment = entry("appointment", {
      frequency_zipf: "5.98",
      part_of_speech: "noun",
    });
    const s = state(confirm, confirmed, appointment);
    expect(
      ids(
        recommendWords(s, Object.values(s.entries), {
          mode: "common",
          now: NOW,
        }),
      ),
    ).toEqual(["confirm", "appointment", "confirmed"]);
  });

  it("does not certify memory from immediate correct answers or erase later mistakes", () => {
    const stable = entry("stable"),
      recent = entry("recent"),
      mistake = entry("mistake");
    const s = state(stable, recent, mistake);
    for (let i = 0; i < 3; i++) {
      s.history.push(result(stable, { time: NOW - (17 - i * 8) * DAY }));
      s.history.push(
        result(recent, {
          id: `immediate-${i}`,
          time: NOW - 1000 * (i + 1),
          independent: false,
          gap: 1000,
        }),
      );
      s.history.push(result(mistake, { time: NOW - (17 - i * 8) * DAY }));
    }
    s.history.push(result(mistake, { time: NOW - 1000, correct: false }));
    const results = recommendWords(s, [stable, recent, mistake], { now: NOW });
    expect(results.find((r) => r.entry.word.id === "stable")?.reason).toContain(
      "ít nhất 3 ngày",
    );
    expect(results.find((r) => r.entry.word.id === "recent")?.reason).toContain(
      "chưa có bằng chứng nhớ độc lập",
    );
    expect(
      ids(
        recommendWords(s, [stable, recent, mistake], {
          mode: "weak",
          now: NOW,
        }),
      ),
    ).toEqual(["mistake"]);
  });

  it("uses time since any exposure rather than a long same-skill gap or a missing legacy field", () => {
    const e = entry("remember");
    const s = state(e);
    const times = [NOW - 17 * DAY, NOW - 9 * DAY, NOW - DAY];
    s.history = times.map((time) => result(e, { time, exposureGap: 8 * DAY }));
    const retained = recommendWords(s, [e], { now: NOW })[0];
    expect(retained.reason).toContain("giảm ưu tiên luyện lại");
    for (const exposureGap of [60000, DAY, undefined]) {
      // The learner may have seen this word in another skill recently, even
      // though the last test of this particular skill was thirty days ago.
      s.history = times.map((time) =>
        result(e, { time, gap: 30 * DAY, exposureGap }),
      );
      const recommendation = recommendWords(s, [e], { now: NOW })[0];
      expect(recommendation.reason).not.toContain("giảm ưu tiên luyện lại");
      expect(recommendation.score).toBeGreaterThan(retained.score);
    }
  });

  it("requires three independent days and a seven-day exposure gap within the same skill", () => {
    const e = entry("confirm");
    const s = state(e);
    s.history = [0, 1, 3].map((skill, i) =>
      result(e, {
        skill,
        time: NOW - (17 - i * 8) * DAY,
        exposureGap: 8 * DAY,
      }),
    );
    expect(recommendWords(s, [e], { now: NOW })[0].reason).not.toContain(
      "giảm ưu tiên luyện lại",
    );
    s.history.push(
      result(e, { skill: 1, time: NOW - 25 * DAY, exposureGap: DAY }),
      result(e, { skill: 1, time: NOW - 17 * DAY, exposureGap: DAY }),
    );
    // Skill 1 now has three days, including its own long gap.
    expect(recommendWords(s, [e], { now: NOW })[0].reason).toContain(
      "giảm ưu tiên luyện lại",
    );
    s.history = s.history.map((r) =>
      r.skill === 1 ? { ...r, exposureGap: DAY } : r,
    );
    // A long gap belonging to skills 0/3 cannot be borrowed by skill 1.
    expect(recommendWords(s, [e], { now: NOW })[0].reason).not.toContain(
      "giảm ưu tiên luyện lại",
    );
  });

  it("keeps lookup, archived, known and skill-incompatible entries out and accepts unsorted history", () => {
    const good = entry("good"),
      lookup = entry("lookup", { learning_status: "lookup" });
    const dictionary = entry("dictionary", {
      learning_status: "",
      content_status: "dictionary",
    });
    const archived = { ...entry("archived"), archived: true };
    const known = { ...entry("known"), known: true };
    const noContext = entry("no-context", { example_en: "", example_vi: "" });
    const s = state(good, lookup, dictionary, archived, known, noContext);
    s.history = [
      result(good, { correct: false }),
      result(good, { time: NOW - 7 * DAY }),
    ];
    expect(
      ids(
        recommendWords(s, Object.values(s.entries), {
          mode: "weak",
          skill: 4,
          now: NOW,
        }),
      ),
    ).toEqual([]);
    expect(
      ids(
        recommendWords(s, Object.values(s.entries), { mode: "weak", now: NOW }),
      ),
    ).toEqual(["good"]);
    expect(
      ids(recommendWords(s, Object.values(s.entries), { skill: 4, now: NOW })),
    ).toEqual(["good"]);
  });

  it("never mutates data or active/paused queues and handles empty/zero-limited requests", () => {
    const e = entry("word");
    const s = state(e);
    s.history = [result(e)];
    s.session = {
      id: "active",
      queue: [{ id: "word", skill: 1, review: "r" }],
      index: 0,
      started: NOW,
      scheduled: true,
      count: 1,
    };
    s.pausedScheduled = structuredClone(s.session);
    const before = structuredClone(s);
    freeze(s);
    expect(() => recommendWords(s, [e], { now: NOW })).not.toThrow();
    expect(s).toEqual(before);
    expect(recommendWords(s, [], { now: NOW })).toEqual([]);
    expect(recommendWords(s, [e], { limit: 0, now: NOW })).toEqual([]);
  });
});
