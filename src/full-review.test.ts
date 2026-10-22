import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canPractice,
  contentKey,
  merge,
  empty,
  parse,
  type Word,
} from "./core";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const manifestPath = "data/authoring/full-review-2026-10.json";
const review = read(manifestPath);
type Evidence = {
  url: string;
  status: number;
  checkedAt: string;
  sha256: string;
  scope: string;
  source_id?: string;
  sense_ref?: string;
  synset?: string;
};
type Reviewed = Partial<Word> & {
  id: string;
  word: string;
  part_of_speech: string;
  definition_source: "oewn" | "authored";
  source_evidence: Evidence | Evidence[];
  previous_part_of_speech?: string;
  review_note?: string;
};
const reviewed: Reviewed[] = [
  ...(review.entries || []),
  ...(review.shards || []).flatMap((shard: string) => {
    const document = read(resolve(dirname(manifestPath), shard));
    return Array.isArray(document) ? document : document.entries;
  }),
];
const reviewById = new Map(reviewed.map((row) => [row.id, row]));
const text = readFileSync("public/data/vocabulary.txt", "utf8");
const words = parse(text);
const byId = new Map(words.map((word) => [word.id, word]));
const byWord = new Map<string, Word>();
for (const word of words)
  if (!byWord.has(word.word)) byWord.set(word.word, word);
const evidenceFor = (row: Reviewed): Evidence[] => {
  const entries = Array.isArray(row.source_evidence)
    ? row.source_evidence
    : [row.source_evidence];
  const sources = Array.isArray(review.sources)
    ? Object.fromEntries(
        review.sources.map((source: Evidence & { id: string }) => [
          source.id,
          source,
        ]),
      )
    : review.sources || {};
  return entries.map((source) =>
    source.source_id ? { ...sources[source.source_id], ...source } : source,
  );
};

describe("Complete source-backed vocabulary review", () => {
  it("reviews every actual record once and retains the pinned stable-ID order", () => {
    expect(review.expectedEntryCount).toBe(5558);
    expect(reviewed).toHaveLength(review.expectedEntryCount);
    expect(words).toHaveLength(review.baseline.entryCount);
    expect(reviewed).toHaveLength(words.length);
    expect(reviewById.size).toBe(words.length);
    expect([...byId.keys()].sort()).toEqual([...reviewById.keys()].sort());
    expect(hash(words.map((word) => word.id).join("\n"))).toBe(
      review.baseline.idsSha256,
    );
    expect(review.baseline.vocabularySha256).toBe(
      "19fb2f4dd2ffab355ac9fe59abf1442bfad79fbe036e7262d90197132667d004",
    );
  });

  it("protects every undeclared field instead of merely keeping the record count", () => {
    const fields: string[] = review.baseline.preservedFields;
    expect(fields).toEqual([...new Set(fields)].sort());
    for (const required of [
      "id",
      "word",
      "accepted_answers",
      "case_sensitive",
      "level",
      "collections",
      "frequency_zipf",
      "frequency_source",
      "source_fact_index",
      "preferred_us_spelling",
    ])
      expect(fields).toContain(required);
    expect(Object.keys(review.baseline.preservedFieldHashes)).toHaveLength(
      words.length,
    );
    for (const word of words) {
      const values = fields.map((field) => word[field] || "");
      expect(hash(JSON.stringify(values)), word.id).toBe(
        review.baseline.preservedFieldHashes[word.id],
      );
      const prior = review.baseline.priorStudyRows[word.id];
      expect(prior, word.id).toBeDefined();
      const originalPos = Array.isArray(prior)
        ? prior[2]
        : prior.part_of_speech;
      if (word.word === "diplomatic") {
        expect(originalPos).toBe("noun");
        expect(word.part_of_speech).toBe("adjective");
        expect(reviewById.get(word.id)?.previous_part_of_speech).toBe("noun");
      } else {
        expect(word.part_of_speech, word.id).toBe(originalPos);
      }
    }
  });

  it("requires successful directly read source evidence for each selected sense", () => {
    for (const row of reviewed) {
      const evidence = evidenceFor(row);
      expect(evidence.length, row.id).toBeGreaterThan(0);
      for (const source of evidence) {
        const url = new URL(source.url);
        expect(url.protocol, row.id).toBe("https:");
        expect(url.username + url.password).toBe("");
        expect(source.status, row.id).toBe(200);
        expect(source.sha256, row.id).toMatch(/^[a-f0-9]{64}$/);
        expect(source.checkedAt, row.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(source.scope.length, row.id).toBeGreaterThan(8);
      }
      if (row.definition_source === "oewn") {
        expect(
          evidence.some((source) =>
            /^https:\/\/(?:raw\.githubusercontent\.com|github\.com)\/globalwordnet\/english-wordnet\//.test(
              source.url,
            ),
          ),
          row.id,
        ).toBe(true);
        expect(
          evidence.some((source) =>
            /^\d{8}-[nvars]$/.test(source.sense_ref || source.synset || ""),
          ),
          row.id,
        ).toBe(true);
      }
    }
  });

  it("uses actual authored teaching content and keeps licensed gloss attribution explicit", () => {
    for (const row of reviewed) {
      const word = byId.get(row.id)!;
      expect(word.word).toBe(row.word);
      expect(word.part_of_speech).toBe(row.part_of_speech);
      for (const field of [
        "meaning_vi",
        "definition_en",
        "example_en",
        "example_vi",
      ])
        expect(word[field], `${row.id}:${field}`).toBe(row[field]);
      expect(word.meaning_vi).not.toMatch(
        /^\s*(?:xem mục|xem thêm|see(?: also)?|→|=>|=)\s+\S/iu,
      );
      const redirect = /^\s*xem\s+([a-z][a-z' -]*)\.?\s*$/iu.exec(
        word.meaning_vi,
      );
      if (redirect)
        expect(
          ["qua", "ra", "phim", "video", "clip", "tv", "tivi", "ti vi"],
          word.id,
        ).toContain(redirect[1].trim().toLowerCase());
      expect(word.definition_en.length, row.id).toBeGreaterThan(3);
      expect(word.example_en.length, row.id).toBeGreaterThan(10);
      expect(word.example_vi.length, row.id).toBeGreaterThan(8);
      expect(word.content_status).toBe("reviewed");
      expect(word.learning_status).toBe("ready");
      expect(["authored", "no-cloze"]).toContain(word.example_type);
      expect(["oewn", "authored"]).toContain(word.definition_source);
      for (const source of evidenceFor(row))
        expect(word.source, row.id).toContain(source.url);
      if (word.definition_source === "oewn") {
        expect(word.source).toContain("Open English WordNet");
        expect(word.source).toContain("CC BY 4.0");
        expect(word.source).toContain("Princeton");
      }
      expect(word.note).not.toContain("chưa rà soát thủ công từng mục");
      for (const skill of [0, 1, 2, 3, 5])
        expect(canPractice(word, skill), `${word.id}:${skill}`).toBe(true);
      expect(canPractice(word, 4), word.id).toBe(
        word.example_type !== "no-cloze",
      );
    }
  });

  it("corrects the demonstrably wrong bee meaning and obsolete default learning senses", () => {
    expect(byWord.get("bee")!.meaning_vi).toContain("ong");
    expect(byWord.get("bee")!.meaning_vi).not.toContain("nhà thơ");
    expect(byWord.get("advertise")!.meaning_vi).toContain("quảng cáo");
    expect(byWord.get("flow")!.meaning_vi).toContain("chảy");
    expect(byWord.get("cast")!.meaning_vi).toContain("diễn viên");
    expect(byWord.get("file")!.meaning_vi).toMatch(/hồ sơ|tệp/);
    expect(byWord.get("globalization")!.meaning_vi).toContain("toàn cầu");
    expect(byWord.get("suddenly")!.meaning_vi).toMatch(
      /đột ngột|đột nhiên|bất ngờ|bỗng/,
    );
  });

  it("supports American regional teaching without fabricating levels or word frequency", () => {
    const biscuit = byWord.get("biscuit")!;
    expect(biscuit.meaning_vi).toMatch(/bánh mì|Mỹ/);
    for (const word of [
      biscuit,
      byWord.get("chip")!,
      byWord.get("cinema")!,
      byWord.get("college")!,
    ]) {
      expect(
        evidenceFor(reviewById.get(word.id)!).some((source) =>
          source.url.includes("/definition/american_english/"),
        ),
        word.id,
      ).toBe(true);
    }
    const practical = words.find(
      (word) => word.word === "practical" && word.part_of_speech === "noun",
    )!;
    expect(practical.note + practical.region + practical.meaning_vi).toMatch(
      /Anh–Anh|Anh-Anh|British|BrE/,
    );
    for (const term of [
      "climate grief",
      "climate haven",
      "climate migration",
      "climate vandalism",
    ]) {
      const word = byWord.get(term)!;
      expect(word.level).toBe("");
      expect(word.frequency_zipf).toBe("");
      expect(word.definition_source).toBe("authored");
      expect(word.register + word.note).toMatch(
        /đương đại|thuật ngữ|Thuật ngữ|phê phán|blog|Blog/,
      );
      expect(
        evidenceFor(reviewById.get(word.id)!).some((source) =>
          source.url.startsWith("https://dictionaryblog.cambridge.org/"),
        ),
      ).toBe(true);
    }
  });

  it("keeps metadata checksums and evidence aligned with the canonical learning corpus", () => {
    const checksum = hash(text);
    const provenance = read("public/data/full-review-provenance.json");
    expect(provenance.canonicalVocabularySha256).toBe(checksum);
    expect(provenance.entries).toHaveLength(reviewed.length);
    expect(provenance.coverage.learningReady).toBe(words.length);
    expect(provenance.coverage.lookupOnly).toBe(0);
    const recorded = new Map<string, { evidence: Evidence[] }>(
      provenance.entries.map((row: { id: string; evidence: Evidence[] }) => [
        row.id,
        row,
      ]),
    );
    for (const row of reviewed)
      expect(recorded.get(row.id)?.evidence).toEqual(evidenceFor(row));
    const manifest = read("public/data/vocabulary-version.json");
    expect(manifest.version).toBe(checksum);
    expect(manifest.entryCount).toBe(words.length);
    expect(manifest.bytes).toBe(Buffer.byteLength(text));
    for (const filename of [
      "oxford-provenance.json",
      "content-review-provenance.json",
      "source-update-provenance.json",
      "frequency-provenance.json",
    ])
      expect(
        read(`public/data/${filename}`).fullVocabularyReview
          .canonicalVocabularySha256,
      ).toBe(checksum);
  });

  it("does not replace personal edits when default reviewed vocabulary is imported", () => {
    const source = byWord.get("bee")!;
    const custom = {
      ...source,
      meaning_vi: "nghĩa riêng của tôi",
      example_en: "A bee lives nearby.",
    };
    const state = merge(empty(), [custom], "personal");
    const next = merge(state, [source], "default");
    expect(next.entries[source.id].word).toEqual(custom);
    expect(next.entries[source.id].origin).toBe("personal");
    expect(state.entries[source.id].word).toEqual(custom);
  });

  it("keeps prior history while invalidating schedules only for changed teaching content", () => {
    const source = byWord.get("bee")!;
    const prior = { ...source, meaning_vi: "nhà thơ" };
    const state = merge(empty(), [prior], "default");
    const key = `${source.id}:0`;
    state.schedules[key] = { last: 1000, due: 1234, step: 2 };
    state.history.push({
      id: "prior-bee-answer",
      wordId: source.id,
      time: 1000,
      skill: 0,
      answer: "nhà thơ",
      correct: true,
      hint: false,
      method: "rule",
      elapsed: 2000,
      session: "older-session",
      review: "older-review",
      gap: 86400000,
      first: true,
      contentVersion: contentKey(prior),
    });
    const next = merge(state, [source], "default");
    expect(contentKey(prior)).not.toBe(contentKey(source));
    expect(next.schedules[key]).toBeUndefined();
    expect(next.history).toEqual(state.history);
    expect(next.history).toHaveLength(1);
    const unchanged = merge(empty(), [source], "default");
    unchanged.schedules[key] = { last: 1000, due: 1234, step: 2 };
    expect(merge(unchanged, [source], "default").schedules[key]).toEqual(
      unchanged.schedules[key],
    );
  });
});
