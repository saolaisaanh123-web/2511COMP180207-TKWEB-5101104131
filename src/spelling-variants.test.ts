import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  cloze,
  contentKey,
  empty,
  grade,
  merge,
  parse,
  record,
  serialize,
  validateBackup,
  type Word,
} from "./core";

const words = parse(readFileSync("public/data/vocabulary.txt", "utf8"));
const reviewed = words.filter((w) => !!w.spelling_variants);

describe("Reviewed spelling variants preserve learning data", () => {
  it.each(reviewed.map((w) => [w.word, w] as const))(
    "accepts the reviewed spelling of %s without accepting a typo",
    (_, word) => {
      expect(grade(word.word, word)).toBe(true);
      for (const variant of word.spelling_variants.split("|")) {
        expect(grade(variant, word)).toBe(true);
        expect(grade(variant + "x", word)).toBe(false);
      }
      expect(parse(serialize([word]))[0].spelling_variants).toBe(
        word.spelling_variants,
      );
    },
  );

  it("keeps the verb spelling distinction from the noun practice", () => {
    const noun = words.find(
      (w) => w.word === "practice" && w.part_of_speech === "noun",
    )!;
    expect(noun).toBeDefined();
    expect(grade("practise", noun)).toBe(false);
  });

  it("preserves existing content keys, all schedules, past results and the active queue on a spelling-only update", () => {
    for (const word of reviewed) {
      const old: Word = { ...word };
      delete old.spelling_variants;
      let state = merge(empty(), [old], "default");
      const time = Date.UTC(2026, 8, 1, 12);
      state = record(
        state,
        {
          id: "spelling-before-update",
          wordId: old.id,
          time,
          skill: 1,
          answer: old.word,
          correct: true,
          hint: false,
          method: "rule",
          elapsed: 2000,
          session: "previous",
          review: "previous",
          first: true,
          gap: 0,
          evidenceVersion: 2,
          independent: true,
        },
        true,
      );
      for (let skill = 0; skill < 6; skill++) {
        expect(contentKey(word, skill)).toBe(contentKey(old, skill));
        state.schedules[`${word.id}:${skill}`] = {
          last: time,
          due: time + 14 * 86400000,
          step: 3,
        };
      }
      state.session = {
        id: "existing-session",
        queue: [{ id: word.id, skill: 1, review: "pending" }],
        index: 0,
        started: time,
        count: 1,
        scheduled: true,
        draft: {
          key: "existing-session:0",
          answer: "draft",
          hint: false,
          revealed: false,
        },
      };
      const next = merge(state, [word], "default");
      expect(next.schedules).toEqual(state.schedules);
      expect(next.history).toEqual(state.history);
      expect(next.session).toEqual(state.session);
      expect(
        grade(word.spelling_variants.split("|")[0], next.entries[word.id].word),
      ).toBe(true);
      expect(validateBackup(JSON.parse(JSON.stringify(next)))).toEqual(next);
    }
  });

  it("masks spelling variants in context and respects explicit case requirements", () => {
    const word = words.find((w) => w.word === "neighbour")!;
    expect(
      cloze({ ...word, example_en: "My neighbor waved to another neighbour." }),
    ).toBe("My ________ waved to another ________.");
    expect(grade("NEIGHBOR", { ...word, case_sensitive: "true" })).toBe(false);
    expect(grade("neighbor", { ...word, case_sensitive: "true" })).toBe(true);
  });

  it("keeps old TXT files valid without adding an empty optional field", () => {
    const word = { ...words[0] };
    delete word.spelling_variants;
    const text = serialize([word]);
    expect(text).not.toContain("spelling_variants:");
    expect(parse(text)[0].spelling_variants).toBeUndefined();
  });
});
