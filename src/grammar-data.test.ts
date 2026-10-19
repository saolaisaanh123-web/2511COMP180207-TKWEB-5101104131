import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { grammarArticles, grammarGroups } from "./grammar-data";
import { searchGrammar } from "./grammar-reference";

const requiredIds = [
  "sentence-parts",
  "word-classes",
  "clause-types",
  "questions",
  "negation",
  "question-tags",
  "nouns-countability",
  "noun-plurals",
  "noun-phrases-possessives",
  "personal-pronouns",
  "reflexive-reciprocal",
  "indefinite-pronouns",
  "dummy-it-there",
  "subject-verb-agreement",
  "articles",
  "quantifiers-some-any",
  "quantifiers-amount",
  "distributives",
  "present-simple",
  "present-continuous",
  "past-simple",
  "past-continuous",
  "present-perfect",
  "present-perfect-continuous",
  "past-perfect",
  "past-perfect-continuous",
  "future-forms",
  "future-continuous",
  "future-perfect",
  "modal-ability",
  "modal-permission-obligation",
  "modal-deduction",
  "passive",
  "gerunds-infinitives",
  "gerund-infinitive-meaning",
  "stative-verbs",
  "used-to",
  "reported-statements",
  "reported-questions-requests",
  "conditionals-real",
  "conditionals-unreal",
  "conditionals-third-mixed",
  "wishes",
  "relative-clauses",
  "participle-clauses",
  "adjectives-adverbs",
  "comparison",
  "degree-enough-so-such",
  "prepositions-time",
  "prepositions-place",
  "verb-adjective-prepositions",
  "linking-words",
];

const canonicalUrl = (value: string) => {
  const url = new URL(value);
  url.hash = "";
  return url.href;
};
const research = readdirSync("data/grammar/research")
  .filter((name) => name.endsWith("-sources.json"))
  .flatMap(
    (name) =>
      JSON.parse(readFileSync("data/grammar/research/" + name, "utf8")) as {
        url: string;
        title: string;
        status: number;
        checkedAt: string;
        sha256: string;
      }[],
  );
const evidence = new Map(
  research.map((source) => [canonicalUrl(source.url), source]),
);

describe("Published grammar reference completeness and source integrity", () => {
  it("covers every requested area with real articles in all eight groups", () => {
    expect(grammarArticles.length).toBeGreaterThanOrEqual(52);
    expect(new Set(grammarGroups.map((group) => group.id)).size).toBe(8);
    const ids = new Set(grammarArticles.map((article) => article.id));
    expect(ids.size).toBe(grammarArticles.length);
    for (const id of requiredIds) expect(ids.has(id), id).toBe(true);
    for (const group of grammarGroups)
      expect(
        grammarArticles.some((article) => article.groupId === group.id),
        group.id,
      ).toBe(true);
  });

  it("keeps every article usable as a reference instead of an empty heading", () => {
    const groups = new Set(grammarGroups.map((group) => group.id));
    for (const article of grammarArticles) {
      expect(groups.has(article.groupId), article.id).toBe(true);
      expect(article.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(article.title.trim().length, article.id).toBeGreaterThan(5);
      expect(article.summary.trim().length, article.id).toBeGreaterThan(35);
      expect(article.aliases.length, article.id).toBeGreaterThan(0);
      expect(article.whenToUse.length, article.id).toBeGreaterThan(0);
      expect(Array.isArray(article.structures), article.id).toBe(true);
      expect(article.examples.length, article.id).toBeGreaterThanOrEqual(2);
      expect(article.notes.length, article.id).toBeGreaterThan(0);
      expect(article.mistakes.length, article.id).toBeGreaterThan(0);
      expect(
        article.details.length + article.comparisons.length,
        article.id,
      ).toBeGreaterThan(0);
      for (const example of [
        ...article.examples,
        ...article.details.flatMap((detail) => detail.examples || []),
        ...article.comparisons.flatMap(
          (comparison) => comparison.examples || [],
        ),
      ]) {
        expect(example.en.trim().length, article.id).toBeGreaterThan(5);
        expect(example.vi.trim().length, article.id).toBeGreaterThan(5);
      }
      for (const mistake of article.mistakes) {
        expect(mistake.wrong).not.toBe(mistake.correct);
        expect(mistake.explanation.trim().length, article.id).toBeGreaterThan(
          15,
        );
      }
      const text = JSON.stringify(article);
      expect(text, article.id).not.toMatch(
        /TODO|Lorem ipsum|example\.org|placeholder|đang cập nhật|sẽ bổ sung/i,
      );
    }
  });

  it("links every source to an actual successful direct reading, not a guessed URL", () => {
    expect(evidence.size).toBeGreaterThan(30);
    for (const source of research) {
      expect(source.status, source.url).toBe(200);
      expect(source.sha256, source.url).toMatch(/^[a-f0-9]{64}$/);
      expect(source.checkedAt, source.url).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.title, source.url).not.toMatch(
        /just a moment|access denied|not found/i,
      );
    }
    for (const article of grammarArticles) {
      expect(article.sources.length, article.id).toBeGreaterThan(0);
      for (const source of article.sources) {
        const url = new URL(source.url);
        expect(url.origin, article.id).toBe(
          "https://learnenglish.britishcouncil.org",
        );
        expect(url.pathname, article.id).toMatch(
          /^\/free-resources\/grammar\//,
        );
        const proof = evidence.get(canonicalUrl(source.url));
        expect(proof, `${article.id}: ${source.url}`).toBeDefined();
        expect(source.accessedAt, article.id).toBe(proof!.checkedAt);
        expect(source.title.trim().length, article.id).toBeGreaterThan(5);
      }
    }
  });

  it.each([
    ["bị động", "passive"],
    ["bi dong", "passive"],
    ["passive", "passive"],
    ["present perfect", "present-perfect"],
    ["hien tai hoan thanh", "present-perfect"],
    ["reported speech", "reported-statements"],
    ["cau uoc", "wishes"],
  ])("finds a requested topic through %s", (query, id) => {
    expect(
      searchGrammar(grammarArticles, query)
        .slice(0, 3)
        .map((article) => article.id),
    ).toContain(id);
  });
});
