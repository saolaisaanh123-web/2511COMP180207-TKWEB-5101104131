import { describe, expect, it } from "vitest";
import type { Entry, Word } from "./core";
import { pronunciationPrompt } from "./pronunciation";

const recordNoun: Word = {
  id: "record-noun",
  word: "record",
  part_of_speech: "noun",
  meaning_vi: "bản ghi chép",
  example_en: "The clinic keeps a record of every visit.",
  example_vi: "Phòng khám lưu hồ sơ của mỗi lần thăm khám.",
  example_type: "authored",
};
const recordVerb: Word = {
  ...recordNoun,
  id: "record-verb",
  part_of_speech: "verb",
  meaning_vi: "ghi lại",
  example_en: "Please record the meeting for our colleague.",
  example_vi: "Hãy ghi lại cuộc họp cho đồng nghiệp của chúng ta.",
};

function entries(...words: Word[]): Record<string, Entry> {
  return Object.fromEntries(
    words.map((word) => [
      word.id,
      { word, archived: false, origin: "default" },
    ]),
  );
}

describe("Pronunciation prompts without invented IPA or audio", () => {
  it("uses the distinct existing sense examples for a noun and verb headword", () => {
    const active = entries(recordNoun, recordVerb);
    const before = structuredClone(active);
    expect(pronunciationPrompt(recordNoun, active)).toEqual({
      text: recordNoun.example_en,
      usesContext: true,
    });
    expect(pronunciationPrompt(recordVerb, active)).toEqual({
      text: recordVerb.example_en,
      usesContext: true,
    });
    expect(active).toEqual(before);
    expect(active[recordNoun.id].word.ipa).toBeUndefined();
  });

  it("retains a bare headword when there is no active different word class", () => {
    expect(pronunciationPrompt(recordNoun, entries(recordNoun))).toEqual({
      text: "record",
      usesContext: false,
    });
    const active = entries(recordNoun, recordVerb);
    active[recordVerb.id].archived = true;
    expect(pronunciationPrompt(recordNoun, active).usesContext).toBe(false);
    expect(
      pronunciationPrompt(
        recordNoun,
        entries(recordNoun, { ...recordVerb, part_of_speech: "noun" }),
      ).usesContext,
    ).toBe(false);
  });

  it("requires a bilingual authored example containing this entry's target", () => {
    const changes: Record<string, string>[] = [
      { example_en: "" },
      { example_vi: "" },
      { example_type: "source" },
      { example_en: "The clinic closes early." },
    ];
    for (const change of changes) {
      const word = { ...recordNoun, ...change };
      expect(pronunciationPrompt(word, entries(word, recordVerb))).toEqual({
        text: "record",
        usesContext: false,
      });
    }
  });

  it("keeps explicitly configured personal word audio ahead of TTS context", () => {
    const word = {
      ...recordNoun,
      audio_word: "https://audio.example.org/personal/record-noun.mp3",
    };
    expect(pronunciationPrompt(word, entries(word, recordVerb))).toEqual({
      text: "record",
      url: word.audio_word,
      usesContext: false,
    });
  });

  it("does not play unsafe or credential-bearing audio URLs", () => {
    for (const audio_word of [
      "javascript:alert(1)",
      "http://audio.example.org/record.mp3",
      "https://user:password@audio.example.org/record.mp3",
      "not a URL",
    ]) {
      const word = { ...recordNoun, audio_word };
      expect(pronunciationPrompt(word, entries(word, recordVerb))).toEqual({
        text: word.example_en,
        usesContext: true,
      });
    }
  });

  it("preserves the reviewed American spelling and saved British preference", () => {
    const word = {
      ...recordNoun,
      word: "neighbour",
      preferred_us_spelling: "neighbor",
    };
    const active = entries(word);
    expect(pronunciationPrompt(word, active).text).toBe("neighbor");
    expect(pronunciationPrompt(word, active, "en-GB").text).toBe("neighbour");
  });

  it("matches exact normalized headwords, not substrings or accepted inflections", () => {
    const active = entries(recordNoun, { ...recordVerb, word: " RECORD " });
    expect(pronunciationPrompt(recordNoun, active).usesContext).toBe(true);
    expect(
      pronunciationPrompt(
        recordNoun,
        entries(recordNoun, {
          ...recordVerb,
          word: "recording",
          accepted_answers: "record",
        }),
      ).usesContext,
    ).toBe(false);
  });

  it("supports explicit spelling aliases without altering the stored sentence", () => {
    const noun = {
      ...recordNoun,
      word: "colour",
      preferred_us_spelling: "color",
      example_en: "This colour suits the room.",
    };
    const verb = {
      ...recordVerb,
      word: "color",
      example_en: "We will color the picture together.",
    };
    expect(pronunciationPrompt(noun, entries(noun, verb))).toEqual({
      text: noun.example_en,
      usesContext: true,
    });
    expect(noun.example_en).toContain("colour");
  });
});
