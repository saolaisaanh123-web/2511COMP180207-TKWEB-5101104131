import { expect, test, type Page } from "@playwright/test";
import { empty, merge, serialize, type State, type Word } from "../src/core";

const noun: Word = {
  id: "pronunciation-record-noun",
  word: "record",
  part_of_speech: "noun",
  meaning_vi: "bản ghi chép",
  example_en: "The clinic keeps a record of every visit.",
  example_vi: "Phòng khám lưu hồ sơ của mỗi lần thăm khám.",
  content_status: "reviewed",
  learning_status: "ready",
  example_type: "authored",
};
const verb: Word = {
  ...noun,
  id: "pronunciation-record-verb",
  part_of_speech: "verb",
  meaning_vi: "ghi lại",
  example_en: "Please record the meeting for our colleague.",
  example_vi: "Hãy ghi lại cuộc họp cho đồng nghiệp của chúng ta.",
};

async function open(page: Page, words: Word[]) {
  await page.addInitScript(() => {
    const played = {
      speech: [] as { text: string; lang: string; voice: string }[],
      audio: [] as string[],
    };
    (
      window as unknown as { pronunciationPlayback: typeof played }
    ).pronunciationPlayback = played;
    class Utterance {
      text: string;
      lang = "";
      rate = 1;
      voice?: { lang: string; name: string };
      onend?: () => void;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: Utterance,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [
          { lang: "en-GB", name: "British test voice" },
          { lang: "en-US", name: "American test voice" },
        ],
        cancel: () => {},
        speak: (value: Utterance) => {
          played.speech.push({
            text: value.text,
            lang: value.lang,
            voice: value.voice?.name || "",
          });
          setTimeout(() => value.onend?.(), 0);
        },
      },
    });
    class RecordedAudio {
      onended?: () => void;
      onerror?: () => void;
      constructor(private url: string) {}
      play() {
        played.audio.push(this.url);
        setTimeout(() => this.onended?.(), 0);
        return Promise.resolve();
      }
      pause() {}
    }
    Object.defineProperty(window, "Audio", {
      configurable: true,
      value: RecordedAudio,
    });
  });
  await page.route("**/data/vocabulary.txt", (route) =>
    route.fulfill({
      contentType: "text/plain;charset=utf-8",
      body: serialize(words),
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hôm nay, mình học gì?" }),
  ).toBeVisible();
}

async function resumeListening(page: Page, words: Word[], target: Word) {
  const state = merge(empty(), words, "default");
  for (const entry of Object.values(state.entries)) entry.enrolled = true;
  state.session = {
    id: "contextual-listening-session",
    queue: [{ id: target.id, skill: 2, review: "contextual-listening-review" }],
    index: 0,
    started: Date.now(),
    count: 1,
    scheduled: true,
  };
  await page.evaluate(async (value: State) => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    await core.save(value, await core.read(), { replace: true });
  }, state);
  await page.reload();
  await page
    .getByRole("button", { name: "Tiếp tục phiên học", exact: true })
    .click();
  await expect(page.locator(".study")).toBeVisible();
}

async function playback(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          pronunciationPlayback: {
            speech: { text: string; lang: string; voice: string }[];
            audio: string[];
          };
        }
      ).pronunciationPlayback,
  );
}

for (const target of [noun, verb]) {
  test(`listening to record as a ${target.part_of_speech} uses its own authored context and US voice without revealing the written target`, async ({
    page,
  }) => {
    await open(page, [noun, verb]);
    await resumeListening(page, [noun, verb], target);
    const study = page.locator(".study");
    const reveal = study.getByRole("button", { name: /Mở đáp án/ });
    await expect(reveal).toBeDisabled();
    await expect(study).not.toContainText(/\brecord\b/i);
    await expect(study.locator(".answer")).toHaveCount(0);
    await study
      .getByRole("button", { name: "Nghe từ trong câu", exact: true })
      .click();
    await expect(reveal).toBeEnabled();
    expect(await playback(page)).toEqual({
      speech: [
        {
          text: target.example_en,
          lang: "en-US",
          voice: "American test voice",
        },
      ],
      audio: [],
    });
    await expect(study).not.toContainText(/\brecord\b/i);
    await expect(study).toContainText("vẫn có thể nhấn sai trọng âm");
    await reveal.click();
    await expect(study.locator(".answer")).toContainText(target.meaning_vi);
    await expect(study.locator(".answer")).toContainText(target.example_en);
    await study
      .locator(".answer")
      .getByRole("button", { name: "Nghe từ trong câu", exact: true })
      .click();
    expect((await playback(page)).speech.at(-1)?.text).toBe(target.example_en);
  });
}

test("explicit personal word audio retains word playback in the dictionary and listening task", async ({
  page,
}) => {
  const target = {
    ...noun,
    audio_word: "https://audio.example.org/personal/record-noun.mp3",
  };
  await open(page, [target, verb]);
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await page
    .locator(".word-card")
    .filter({ hasText: target.meaning_vi })
    .click();
  const dictionary = page.locator(".dict-entry");
  await expect(dictionary).toContainText("IPA chưa đối chiếu");
  await dictionary
    .getByRole("button", { name: "Nghe từ", exact: true })
    .click();
  await expect
    .poll(async () => (await playback(page)).audio)
    .toEqual([target.audio_word]);
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await resumeListening(page, [target, verb], target);
  const study = page.locator(".study");
  const reveal = study.getByRole("button", { name: /Mở đáp án/ });
  await expect(reveal).toBeDisabled();
  await study.getByRole("button", { name: "Nghe từ", exact: true }).click();
  await expect(reveal).toBeEnabled();
  expect(await playback(page)).toEqual({
    speech: [],
    audio: [target.audio_word],
  });
  await expect(study).not.toContainText(/\brecord\b/i);
});
