import { describe, expect, it } from "vitest";
import {
  frequencyScore,
  parse,
  serialize,
  sortForLearning,
  type Entry,
} from "./core";

const entry = (id: string, level: string, score = ""): Entry => ({
  origin: "default",
  archived: false,
  word: {
    id,
    word: id,
    level,
    frequency_zipf: score,
    meaning_vi: "nghĩa",
    example_en: "An example.",
    example_vi: "Một ví dụ.",
  },
});

describe("Learning order", () => {
  it("prioritizes CEFR, then frequency, then alphabet, with missing data last", () => {
    const entries = [
      entry("unknown-level", "", "8"),
      entry("a2-common", "A2", "8"),
      entry("a1-missing", "A1"),
      entry("a1-rare", "A1", "1"),
      entry("a1-common-z", "A1", "6"),
      entry("a1-common-a", "A1", "6"),
      entry("a1-zero", "A1", "0"),
      entry("c2", "C2", "4"),
    ];
    const before = entries.slice();
    expect(sortForLearning(entries).map((e) => e.word.id)).toEqual([
      "a1-common-a",
      "a1-common-z",
      "a1-rare",
      "a1-zero",
      "a1-missing",
      "a2-common",
      "c2",
      "unknown-level",
    ]);
    expect(entries).toEqual(before);
  });

  it("handles invalid imported frequencies as unavailable and ties by stable ID", () => {
    for (const score of ["", "NaN", "Infinity", "-1", "10", "unknown"]) {
      expect(frequencyScore(entry("test", "A1", score).word)).toBeUndefined();
    }
    const a = entry("b", "a1", "6.12");
    const b = entry("a", "A1", "6.12");
    a.word.word = b.word.word = "same";
    expect(sortForLearning([a, b])).toEqual([b, a]);
  });

  it("preserves frequency and verified news metadata through TXT import/export", () => {
    const word = {
      ...entry("test", "", "").word,
      expression_type: "idiom",
      frequency_source: "wordfreq-3.1.1-en-large",
      news_source: "Example publisher",
      news_title: "A title",
      news_date: "2024-01-01",
      news_url: "https://example.org/story",
      news_excerpt: "A short quotation.",
      news_context_vi: "Ngữ cảnh đã đối chiếu.",
      news_source_type: "reporting",
    };
    const imported = parse(serialize([word]));
    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject(word);
    expect(parse(serialize(imported))).toEqual(imported);
  });
});
