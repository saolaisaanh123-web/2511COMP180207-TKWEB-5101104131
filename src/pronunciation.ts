import { preferredHeadword } from "./american-english";
import { cloze, normalize, type Entry, type Word } from "./core";

export type PronunciationPrompt = {
  text: string;
  url?: string;
  usesContext: boolean;
};

function audioUrl(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? value.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

function headwords(word: Word): Set<string> {
  // Only explicit editorial spelling aliases identify the same headword here.
  // Accepted answers may include inflections and must not merge other entries.
  return new Set(
    [word.word, word.preferred_us_spelling || ""]
      .map(normalize)
      .filter(Boolean),
  );
}

/**
 * Supply grammatical context when one headword has several active word classes.
 * This does not certify TTS pronunciation or supply a missing IPA transcription.
 * Explicit audio remains the entry owner's choice; no remote URL is invented.
 */
export function pronunciationPrompt(
  word: Word,
  entries: Readonly<Record<string, Entry>>,
  voice = "en-US",
): PronunciationPrompt {
  const text = preferredHeadword(word, voice);
  const url = audioUrl(word.audio_word);
  if (url) return { text, url, usesContext: false };

  const pos = normalize(word.part_of_speech || "");
  const names = headwords(word);
  const hasOtherWordClass =
    !!pos &&
    Object.values(entries).some((entry) => {
      const otherPos = normalize(entry.word.part_of_speech || "");
      return (
        !entry.archived &&
        entry.word.id !== word.id &&
        !!otherPos &&
        otherPos !== pos &&
        [...headwords(entry.word)].some((name) => names.has(name))
      );
    });

  // Use the existing, bilingual authored example for this exact sense only.
  // A missing/unsuitable example must not be replaced with generated text.
  const hasContext =
    word.example_type === "authored" &&
    !!word.example_en?.trim() &&
    !!word.example_vi?.trim() &&
    cloze(word) !== word.example_en;
  if (hasOtherWordClass && hasContext) {
    return { text: word.example_en.trim(), usesContext: true };
  }
  return { text, usesContext: false };
}
