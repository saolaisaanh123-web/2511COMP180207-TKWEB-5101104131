export type GrammarExample = { en: string; vi: string };
export type GrammarSource = {
  title: string;
  url: string;
  accessedAt: string;
};
export type GrammarGroup = {
  id: string;
  title: string;
  description: string;
};
export type GrammarArticle = {
  id: string;
  groupId: string;
  title: string;
  aliases: string[];
  summary: string;
  whenToUse: string[];
  structures: string[];
  examples: GrammarExample[];
  notes: string[];
  mistakes: {
    context?: string;
    wrong: string;
    correct: string;
    explanation: string;
  }[];
  comparisons: {
    title: string;
    explanation: string;
    examples?: GrammarExample[];
  }[];
  details: {
    title: string;
    paragraphs: string[];
    examples?: GrammarExample[];
  }[];
  sources: GrammarSource[];
};

export const normalizeGrammarSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi-VN")
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

/** Search authored names and explanations; never modifies learning state. */
export function searchGrammar(
  articles: GrammarArticle[],
  query: string,
  groupId?: string,
): GrammarArticle[] {
  const queryText = normalizeGrammarSearch(query);
  const tokens = queryText.split(" ").filter(Boolean);
  return articles
    .map((article, index) => {
      if (groupId && groupId !== "all" && article.groupId !== groupId)
        return { article, index, score: -1 };
      if (!tokens.length) return { article, index, score: 0 };
      const names = [article.title, ...article.aliases].map(
        normalizeGrammarSearch,
      );
      const body = normalizeGrammarSearch(
        [
          article.summary,
          ...article.whenToUse,
          ...article.structures,
          ...article.notes,
          ...article.details.flatMap((section) => [
            section.title,
            ...section.paragraphs,
          ]),
          ...article.comparisons.flatMap((item) => [
            item.title,
            item.explanation,
          ]),
        ].join(" "),
      );
      const fullText = [...names, body].join(" ");
      const words = new Set(fullText.split(" "));
      const nameWords = names.flatMap((name) => name.split(" "));
      // Match Vietnamese syllables as words: "bi dong" must not match
      // "đặc biệt" plus "dòng" in unrelated prose. Longer name prefixes
      // still support looking up "pass" → "passive".
      if (
        !tokens.every(
          (token) =>
            words.has(token) ||
            (token.length >= 3 &&
              nameWords.some((name) => name.startsWith(token))),
        )
      )
        return { article, index, score: -1 };
      const score = names.some((name) => name === queryText)
        ? 100
        : names.some((name) => name.includes(queryText))
          ? 70
          : tokens.every((token) => names.some((name) => name.includes(token)))
            ? 40
            : 10;
      return { article, index, score };
    })
    .filter((result) => result.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((result) => result.article);
}
