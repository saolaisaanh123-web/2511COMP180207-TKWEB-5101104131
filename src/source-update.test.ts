import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canPractice, grade, parse, serialize, type Word } from "./core";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const update = read("data/authoring/source-update-2026-10.json") as {
  baseline: {
    entryCount: number;
    idsSha256: string;
    protectedStudyFields: string[];
    protectedStudyContentSha256: string;
  };
  additions: Word[];
  corrections: Word[];
  americanSpellings: (Pick<Word, "id" | "word" | "part_of_speech"> & {
    preferred_us_spelling: string;
    sourceURL: string;
  })[];
  sources: { url: string; status: number; sha256: string; scope: string }[];
};
const words = parse(readFileSync("public/data/vocabulary.txt", "utf8"));
const byId = new Map(words.map((word) => [word.id, word]));
const normalized = (word: string) =>
  word.replace(/’/g, "'").replace(/™/g, "").trim();

describe("Source-checked vocabulary update", () => {
  it("preserves the entire original stable-ID prefix and appends only declared entries", () => {
    const hash = createHash("sha256")
      .update(
        words
          .slice(0, update.baseline.entryCount)
          .map((w) => w.id)
          .join("\n"),
      )
      .digest("hex");
    expect(hash).toBe(update.baseline.idsSha256);
    expect(words.slice(update.baseline.entryCount).map((w) => w.id)).toEqual(
      update.additions.map((w) => w.id),
    );
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length);
    expect(parse(serialize(words))).toHaveLength(words.length);
  });

  it("keeps every existing teaching field unchanged except the four explicitly corrected meanings", () => {
    const corrected = new Set(update.corrections.map((word) => word.id));
    const content = words
      .slice(0, update.baseline.entryCount)
      .filter((word) => !corrected.has(word.id))
      .map((word) =>
        update.baseline.protectedStudyFields.map((field) => word[field] || ""),
      );
    expect(
      createHash("sha256").update(JSON.stringify(content)).digest("hex"),
    ).toBe(update.baseline.protectedStudyContentSha256);
  });

  it("covers every headword in both directly fetched American Oxford PDFs without replacing British IDs", () => {
    const forms = new Set(
      words
        .flatMap((w) => [
          w.word,
          w.preferred_us_spelling || "",
          ...(w.spelling_variants || "").split("|"),
        ])
        .map(normalized),
    );
    if (forms.has("a, an")) {
      forms.add("a");
      forms.add("an");
    }
    const facts = read("data/lexicons/american-oxford-2026-10.json").facts as {
      word: string;
      cefr: string;
      source: string;
      pdfSha256: string;
    }[];
    expect(facts).toHaveLength(5325);
    const missing = [
      ...new Set(
        facts.filter((f) => !forms.has(normalized(f.word))).map((f) => f.word),
      ),
    ];
    expect(missing).toEqual([]);
    for (const fact of facts) {
      expect(fact.cefr).toMatch(/^[ABC][12]$/);
      expect(fact.source).toMatch(
        /^https:\/\/www\.oxfordlearnersdictionaries\.com\/external\/pdf\//,
      );
      expect(fact.pdfSha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("accepts each verified regional form under its original ID and retains the source spelling", () => {
    expect(update.americanSpellings).toHaveLength(61);
    for (const mapping of update.americanSpellings) {
      const word = byId.get(mapping.id)!;
      expect(word.word).toBe(mapping.word);
      expect(word.part_of_speech).toBe(mapping.part_of_speech);
      expect(word.preferred_us_spelling).toBe(mapping.preferred_us_spelling);
      expect(grade(mapping.preferred_us_spelling, word), mapping.id).toBe(true);
      expect(grade(mapping.word, word), mapping.id).toBe(true);
      expect(update.sources.some((s) => s.url === mapping.sourceURL)).toBe(
        true,
      );
    }
  });

  it("retains all OPAL single-word headwords without importing unreviewed phrase patterns as lessons", () => {
    const forms = new Set(
      words
        .flatMap((w) => [
          w.word,
          w.preferred_us_spelling || "",
          ...(w.spelling_variants || "").split("|"),
        ])
        .map(normalized),
    );
    const facts = read("data/lexicons/opal-2026-10.json").facts as Record<
      string,
      string
    >[];
    const singles = facts.filter(
      (f) => "data-opal_written" in f || "data-opal_spoken" in f,
    );
    expect(singles).toHaveLength(1511);
    expect([
      ...new Set(
        singles
          .filter((f) => !forms.has(normalized(f.word)))
          .map((f) => f.word),
      ),
    ]).toEqual([]);
    const practical = update.additions.find(
      (word) => word.word === "practical" && word.part_of_speech === "noun",
    )!;
    expect(practical.learning_status).toBe("lookup");
    expect(practical.meaning_vi).toContain("Anh–Anh");
  });

  it("corrects the four identified historical or regional meanings using the declared source review", () => {
    expect(update.corrections.map((w) => w.word)).toEqual([
      "hardly",
      "sensible",
      "execution",
      "pants",
    ]);
    const meanings = new Map(words.map((w) => [w.word, w.meaning_vi]));
    expect(meanings.get("hardly")).toContain("hầu như không");
    expect(meanings.get("sensible")).toContain("hợp lý");
    expect(meanings.get("execution")).toContain("thực hiện");
    expect(meanings.get("pants")).toContain("Anh–Mỹ");
    for (const correction of update.corrections) {
      expect(byId.get(correction.id)).toMatchObject(correction);
    }
  });

  it("never turns uncertain modern terminology into automatic practice or invents CEFR/frequency", () => {
    const uncertain = update.additions.filter(
      (w) => w.learning_status === "lookup",
    );
    expect(uncertain.length).toBeGreaterThanOrEqual(12);
    for (const declared of update.additions) {
      const word = byId.get(declared.id)!;
      expect(word).toMatchObject(declared);
      expect(word.frequency_zipf).toBe("");
      expect(word.audio_word).toBe("");
      expect(word.audio_example).toBe("");
      if (!word.collections.split(",").some((c) => c.startsWith("american-"))) {
        expect(word.level).toBe("");
      }
    }
    for (const declared of uncertain) {
      const word = byId.get(declared.id)!;
      for (let skill = 0; skill < 6; skill++)
        expect(canPractice(word, skill), word.id).toBe(false);
      expect(word.learning_note.length).toBeGreaterThan(30);
    }
  });

  it("keeps exact source evidence with explicit scopes instead of marking blocked Cambridge entries verified", () => {
    const sources = update.sources;
    expect(new Set(sources.map((s) => s.url)).size).toBe(sources.length);
    for (const source of sources) {
      expect(source.status, source.url).toBe(200);
      expect(source.sha256, source.url).toMatch(/^[a-f0-9]{64}$/);
      expect(source.scope.length).toBeGreaterThan(15);
      expect(new URL(source.url).protocol).toBe("https:");
      expect(new URL(source.url).hostname).not.toBe("dictionary.cambridge.org");
    }
  });
});
