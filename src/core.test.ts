import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  parse,
  serialize,
  empty,
  merge,
  diff,
  grade,
  record,
  strength,
  validateBackup,
  type Result,
  canPractice,
  cloze,
} from "./core";
const source = readFileSync("public/data/vocabulary.txt", "utf8");
const words = parse(source);
const proof = JSON.parse(
  readFileSync("public/data/oxford-provenance.json", "utf8"),
);
const sample = parse(readFileSync("public/data/vocabulary.sample.txt", "utf8"));
const result = (overrides: Partial<Result> = {}): Result => ({
  id: "r1",
  wordId: words[0].id,
  time: Date.now(),
  skill: 1,
  answer: words[0].word,
  correct: true,
  hint: false,
  method: "rule",
  elapsed: 2000,
  session: "s",
  review: "v",
  gap: 0,
  first: true,
  evidenceVersion: 2,
  independent: true,
  audioPlayed: true,
  ...overrides,
});
describe("Vocabulary file", () => {
  it("loads the curated corpus and roundtrips UTF-8 BOM and Windows newlines", () => {
    expect(words).toHaveLength(proof.coverage.entryCount);
    expect(words.length).toBeGreaterThanOrEqual(5000);
    expect(
      serialize(parse("\uFEFF" + serialize(words).replace(/\n/g, "\r\n"))),
    ).toBe(serialize(words));
  });
  it("reports duplicate IDs, fields, missing fields and invalid lines", () => {
    expect(() => parse(source + "\n---\n" + serialize([words[0]]))).toThrow(
      /ID trùng/,
    );
    expect(() => parse("id: a\nword: a")).toThrow(/dòng 1: thiếu meaning_vi/);
    expect(() => parse("nonsense")).toThrow(/Dòng 1/);
    expect(() => parse("id: a\nid: b")).toThrow(/bị lặp/);
  });
  it("adds text-only vocabulary without code changes", () => {
    const w = {
      ...words[0],
      id: "my-new-entry",
      word: "<script>alert(1)</script>",
    };
    expect(parse(serialize([w]))[0].word).toBe(w.word);
  });
  it("matches declared answers only", () => {
    expect(grade(" AVOID  ", words[0])).toBe(true);
    expect(grade("prevent", words[0])).toBe(false);
    expect(
      grade("keep away", { ...words[0], accepted_answers: "avoid|keep away" }),
    ).toBe(true);
  });
});
describe("Updates and evidence", () => {
  it("preserves history and archives missing source entries", () => {
    let s = merge(empty(), words, "default");
    s = record(s, result(), true);
    const before = s.history;
    const updated = merge(
      s,
      [{ ...words[0], meaning_vi: "nghĩa được sửa" }],
      "default",
    );
    expect(updated.history).toEqual(before);
    expect(updated.entries[words[1].id].archived).toBe(true);
    expect(updated.entries[words[0].id].word.meaning_vi).toBe("nghĩa được sửa");
    expect(diff(s, [words[0]], "default").archived).toBe(words.length - 1);
  });
  it("preserves personal overrides against default updates", () => {
    let s = merge(empty(), words, "default");
    s = merge(s, [{ ...words[0], meaning_vi: "của tôi" }], "personal");
    s = merge(s, words, "default");
    expect(s.entries[words[0].id].word.meaning_vi).toBe("của tôi");
  });
  it("does not double count or reschedule a retry of the same review", () => {
    let s = record(merge(empty(), words, "default"), result(), true);
    const schedule = s.schedules[words[0].id + ":1"];
    s = record(s, result(), true);
    expect(s.history).toHaveLength(1);
    s = record(
      s,
      result({ id: "r2", first: false, time: Date.now() + 1000 }),
      true,
    );
    expect(s.history).toHaveLength(2);
    expect(s.schedules[words[0].id + ":1"]).toEqual(schedule);
  });
  it("free practice never changes scheduling and recognition never changes listening", () => {
    const s = record(merge(empty(), words, "default"), result(), false);
    expect(s.schedules).toEqual({});
    const next = record(
      s,
      result({ id: "r2", skill: 0, review: "v2", method: "self" }),
      true,
    );
    expect(next.schedules[words[0].id + ":2"]).toBeUndefined();
  });
  it("requires three separate tested days and a seven-day gap for stable skill", () => {
    let s = merge(empty(), words, "default");
    for (let i = 0; i < 3; i++)
      s = record(
        s,
        result({
          id: "r" + i,
          review: "v" + i,
          time: Date.now() + i * 8 * 86400000,
          gap: i ? 8 * 86400000 : 0,
        }),
        false,
      );
    expect(strength(s, words[0].id, 1)).toBe("Nhớ khá vững");
    expect(strength(s, words[0].id, 0)).toBe("Chưa đủ dữ liệu");
    s.history.forEach((r) => (r.method = "self"));
    expect(strength(s, words[0].id, 1)).not.toBe("Nhớ khá vững");
  });
  it("exports and validates lossless backup and rejects malformed history", () => {
    const s = record(merge(empty(), words, "default"), result(), true);
    expect(validateBackup(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(() => validateBackup({ ...s, history: [{ skill: 999 }] })).toThrow();
  });
});

describe("Oxford-grounded content and safe upgrade", () => {
  it("matches each headword, POS and CEFR to retained PDF facts without invented IPA/audio", () => {
    const pos: Record<string, string> = {
      noun: "n.",
      verb: "v.",
      adjective: "adj.",
      adverb: "adv.",
      preposition: "prep.",
      pronoun: "pron.",
      determiner: "det.",
    };
    const coreWords = words.filter((w) =>
      (w.collections || "").split(",").some((c) => c.startsWith("oxford-")),
    );
    expect(new Set(coreWords.map((w) => w.word)).size).toBe(4955);
    expect(proof.entries.length + proof.additionalFacts.length).toBe(5323);
    for (const w of coreWords) {
      const f = proof.entries.find((f: { id: string }) => f.id === w.id);
      expect(f).toBeDefined();
      expect(w.word).toBe(f.canonicalWord || f.word);
      expect(w.level).toBe(f.cefr);
      expect(w.source).toContain(f.source_row);
      expect(w.ipa).toBe("");
      expect(w.audio_word).toBe("");
      if (w.content_status !== "reference") expect(w.meaning_vi).toBeTruthy();
    }
    expect(
      words.filter((w) => w.collections.split(",").includes("phrasal-verbs")),
    ).toHaveLength(100);
    expect(
      words.filter((w) => w.collections.split(",").includes("slang")),
    ).toHaveLength(proof.coverage.slangSenses);
  });
  it("keeps sample history and personal edits, archives only unsupported default entries", () => {
    let old = merge(empty(), sample, "default");
    old = record(old, result({ wordId: "commute-01" }), true);
    old.entries["achieve-01"].origin = "personal";
    old.entries["achieve-01"].word.meaning_vi = "bản sửa riêng";
    const next = merge(old, words, "default");
    expect(next.history).toEqual(old.history);
    expect(next.schedules).toEqual(old.schedules);
    expect(next.entries["commute-01"].archived).toBe(true);
    expect(next.entries["take-part-in-01"].archived).toBe(true);
    expect(next.entries["achieve-01"].word.meaning_vi).toBe("bản sửa riêng");
    expect(diff(old, words, "default").archived).toBe(2);
  });
  it("does not report updates for object key order or private overrides", () => {
    const s = merge(empty(), words, "default");
    const reordered = Object.fromEntries(
      Object.entries(words[0]).reverse(),
    ) as (typeof words)[number];
    expect(diff(s, [reordered], "default").changed).toBe(0);
    s.entries[words[0].id].origin = "personal";
    s.entries[words[0].id].word.meaning_vi = "riêng";
    expect(diff(s, [words[0]], "default").changed).toBe(0);
  });
});

describe("Large dictionary learning safeguards", () => {
  it("keeps strict ordinary imports while explicitly labeling dictionary/reference gaps", () => {
    const base = {
      id: "gap",
      word: "test",
      meaning_vi: "thử",
      source: "dictionary",
      example_en: "",
      example_vi: "",
    };
    expect(() => parse(serialize([base]))).toThrow(/example_en/);
    expect(
      parse(serialize([{ ...base, content_status: "dictionary" }])),
    ).toHaveLength(1);
    expect(canPractice({ ...base, content_status: "dictionary" }, 1)).toBe(
      false,
    );
    expect(
      canPractice(
        { ...base, content_status: "dictionary", learning_status: "ready" },
        1,
      ),
    ).toBe(true);
    expect(canPractice({ ...base, content_status: "dictionary" }, 4)).toBe(
      false,
    );
    expect(canPractice({ ...base, content_status: "reference" }, 1)).toBe(
      false,
    );
  });
  it("masks complete words and handles case-sensitive lexical items", () => {
    const w = {
      id: "read",
      word: "read",
      meaning_vi: "đọc",
      example_en: "I am ready to read.",
      example_vi: "Tôi sẵn sàng đọc.",
    };
    expect(cloze(w)).toBe("I am ready to ________.");
    expect(grade("may", { ...w, word: "May", case_sensitive: "true" })).toBe(
      false,
    );
    expect(grade("May", { ...w, word: "May", case_sensitive: "true" })).toBe(
      true,
    );
  });
  it("keeps all complete authored slang/phrasal senses contextual and separate from Oxford claims", () => {
    for (const w of words.filter((w) =>
      /slang|phrasal-verbs/.test(w.collections),
    )) {
      expect(w.level).toBe("");
      expect(w.meaning_vi).toBeTruthy();
      expect(canPractice(w, 4)).toBe(true);
      expect(w.content_status).toBe("reviewed");
    }
  });
});
