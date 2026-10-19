import type { GrammarArticle, GrammarGroup } from "./grammar-reference";

// Eager JSON imports keep the authored reference in the static application
// bundle. Reading grammar never reads or writes the learner's vocabulary DB.
const files = import.meta.glob<GrammarArticle[]>("../data/grammar/*.json", {
  eager: true,
  import: "default",
});

export const grammarGroups: GrammarGroup[] = [
  {
    id: "foundations",
    title: "Cấu trúc câu và từ loại",
    description: "Thành phần câu, trật tự từ, câu hỏi và phủ định.",
  },
  {
    id: "nouns-pronouns",
    title: "Danh từ và đại từ",
    description: "Cụm danh từ, sở hữu, đại từ và hòa hợp chủ ngữ–động từ.",
  },
  {
    id: "determiners",
    title: "Mạo từ và lượng từ",
    description: "Xác định đối tượng và diễn đạt số lượng.",
  },
  {
    id: "tenses",
    title: "Thì và thể",
    description:
      "Thời gian, tiến trình, sự hoàn thành và cách nói về tương lai.",
  },
  {
    id: "verbs",
    title: "Động từ và cấu trúc động từ",
    description: "Khuyết thiếu, bị động, V-ing, nguyên mẫu và thói quen.",
  },
  {
    id: "clauses",
    title: "Mệnh đề và câu phức",
    description: "Gián tiếp, điều kiện, câu ước và mệnh đề quan hệ.",
  },
  {
    id: "modifiers",
    title: "Tính từ, trạng từ và so sánh",
    description: "Miêu tả, so sánh và diễn đạt mức độ.",
  },
  {
    id: "prepositions-linking",
    title: "Giới từ và liên từ",
    description: "Thời gian, vị trí và mối quan hệ giữa các ý.",
  },
];

const groupOrder = new Map(
  grammarGroups.map((group, index) => [group.id, index]),
);
export const grammarArticles: GrammarArticle[] = Object.entries(files)
  .sort(([left], [right]) => left.localeCompare(right, "en"))
  .flatMap(([, articles]) => articles)
  .sort(
    (left, right) =>
      (groupOrder.get(left.groupId) ?? 99) -
      (groupOrder.get(right.groupId) ?? 99),
  );
