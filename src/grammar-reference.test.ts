import { describe, expect, it } from "vitest";
import {
  normalizeGrammarSearch,
  searchGrammar,
  type GrammarArticle,
} from "./grammar-reference";

// Search fixtures only; these are never loaded as published grammar lessons.
const fixture = (
  id: string,
  title: string,
  aliases: string[],
  groupId = "sentences",
): GrammarArticle => ({
  id,
  title,
  aliases,
  groupId,
  summary: "Nội dung riêng phục vụ kiểm thử tìm kiếm.",
  whenToUse: [],
  structures: [],
  examples: [],
  notes: [],
  mistakes: [],
  comparisons: [],
  details: [],
  sources: [],
});
const passive = fixture("passive", "Câu bị động", [
  "passive",
  "passive voice",
  "thể bị động",
]);
const present = fixture(
  "present-simple",
  "Hiện tại đơn",
  ["present simple", "simple present", "thì hiện tại đơn"],
  "tenses",
);
const articles = [
  present,
  passive,
  fixture("articles", "Mạo từ", ["a an the", "articles", "article"]),
];

describe("Grammar lookup search", () => {
  it.each([
    "bị động",
    "bi dong",
    "BỊ ĐỘNG",
    "passive",
    "passive voice",
    "thể bị động",
  ])("finds the same topic for %s", (query) => {
    expect(searchGrammar(articles, query)[0].id).toBe("passive");
  });
  it("supports equivalent English names and reordered Vietnamese terms", () => {
    for (const query of [
      "simple present",
      "present simple",
      "hien tai don",
      "don hien tai",
    ])
      expect(searchGrammar(articles, query)[0].id).toBe("present-simple");
  });
  it("handles Vietnamese đ, accents, spacing and punctuation consistently", () => {
    expect(normalizeGrammarSearch("  Động từ: ‘TO-BE’  ")).toBe(
      "dong tu to be",
    );
    expect(searchGrammar(articles, "a/an/the")[0].id).toBe("articles");
  });
  it("keeps category filters active when a query matches another group", () => {
    expect(searchGrammar(articles, "passive", "tenses")).toEqual([]);
    expect(searchGrammar(articles, "", "tenses")).toEqual([present]);
    expect(searchGrammar(articles, "passive", "all")).toEqual([passive]);
  });
  it("prioritizes topic names over mentions in another article's explanation", () => {
    const other = {
      ...present,
      notes: ["Phân biệt với passive voice trong mục liên quan."],
    };
    expect(searchGrammar([other, passive], "passive").map((a) => a.id)).toEqual(
      ["passive", "present-simple"],
    );
  });
  it("requires all query words and gives an empty result instead of guessing", () => {
    expect(searchGrammar(articles, "passive nonexistent")).toEqual([]);
    expect(searchGrammar(articles, "xyz-123-unknown")).toEqual([]);
  });
  it("does not confuse bi dong with fragments of biệt and dòng in unrelated text", () => {
    const other = {
      ...present,
      summary: "Một trường hợp đặc biệt được mô tả ở dòng tiếp theo.",
    };
    expect(searchGrammar([other, passive], "bi dong").map((a) => a.id)).toEqual(
      ["passive"],
    );
    expect(searchGrammar([other, passive], "bị động").map((a) => a.id)).toEqual(
      ["passive"],
    );
    expect(searchGrammar([other, passive], "pass").map((a) => a.id)).toEqual([
      "passive",
    ]);
  });
  it("keeps source data and original order unchanged across searches", () => {
    const before = structuredClone(articles);
    expect(searchGrammar(articles, "  ")).toEqual(articles);
    searchGrammar(articles, "passive");
    searchGrammar(articles, "the");
    expect(articles).toEqual(before);
    expect(searchGrammar(articles, "").map((a) => a.id)).toEqual([
      "present-simple",
      "passive",
      "articles",
    ]);
  });
});
