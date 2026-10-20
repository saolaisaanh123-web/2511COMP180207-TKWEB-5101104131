import { expect, test, type Page } from "@playwright/test";
import { empty, merge, serialize, type State, type Word } from "../src/core";

const word: Word = {
  id: "stable-neighbour-id",
  word: "neighbour",
  preferred_us_spelling: "neighbor",
  part_of_speech: "noun",
  meaning_vi: "người hàng xóm",
  example_en: "Our neighbour helped us move.",
  example_vi: "Người hàng xóm giúp chúng tôi chuyển nhà.",
  content_status: "curated",
};

async function open(page: Page, words = [word]) {
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

async function seed(page: Page, state: State) {
  await page.evaluate(async (value) => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    await core.save(value, await core.read(), { replace: true });
  }, state);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hôm nay, mình học gì?" }),
  ).toBeVisible();
}

test("a new profile shows and searches the reviewed US spelling while retaining its source spelling and US YouGlish link", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  const search = page.getByPlaceholder(/Tìm từ/);
  await search.fill("neighbor");
  await expect(page.locator(".word-card h3")).toHaveText("neighbor");
  await search.fill("neighbour");
  await expect(page.locator(".word-card h3")).toHaveText("neighbor");
  await page.locator(".word-card").click();
  await expect(page.locator(".dict-headword")).toHaveText("neighbor");
  await expect(page.locator(".dict-spelling-note")).toContainText("neighbour");
  const link = page.getByRole("link", {
    name: "Nghe người Mỹ dùng từ (YouGlish)",
  });
  await expect(link).toHaveAttribute(
    "href",
    "https://youglish.com/pronounce/neighbor/english/us",
  );
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.locator("iframe[src*='youglish']")).toHaveCount(0);
});

test("an existing British preference survives reload and keeps British display with an explicit American alternative", async ({
  page,
}) => {
  await open(page);
  const state = merge(empty(), [word], "default");
  state.voice = "en-GB";
  await seed(page, state);
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await expect(page.locator(".word-card h3")).toHaveText("neighbour");
  await page.locator(".word-card").click();
  await expect(page.locator(".dict-headword")).toHaveText("neighbour");
  await expect(page.locator(".dict-spelling-note")).toContainText(
    "Cách viết Anh–Mỹ: neighbor",
  );
});

test("recall accepts a US spelling under the original ID and keeps the existing scheduled session", async ({
  page,
}) => {
  await open(page);
  const state = merge(empty(), [word], "default");
  state.entries[word.id].enrolled = true;
  state.schedules[`${word.id}:1`] = {
    last: Date.now() - 8 * 86_400_000,
    due: Date.now() - 1000,
    step: 2,
  };
  state.session = {
    id: "original-session",
    queue: [{ id: word.id, skill: 1, review: "original-review" }],
    index: 0,
    started: Date.now(),
    count: 1,
    scheduled: true,
  };
  await seed(page, state);
  await page
    .getByRole("button", { name: "Tiếp tục phiên học", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Câu trả lời", exact: true })
    .fill("neighbor");
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect(page.getByText(/Chính xác!/)).toBeVisible();
  const saved = await page.evaluate(async () => {
    const path = "/src/core.ts";
    return (await import(/* @vite-ignore */ path)).read();
  });
  expect(saved.history.at(-1)).toMatchObject({
    wordId: word.id,
    answer: "neighbor",
    correct: true,
    review: "original-review",
  });
  expect(saved.entries[word.id].word.word).toBe("neighbour");
  expect(saved.schedules[`${word.id}:1`].step).toBe(3);
  expect(saved.session?.id).toBe("original-session");
});

test("headword playback uses the US spelling and selected US synthesis voice", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class Utterance {
      text: string;
      voice: unknown;
      lang = "";
      rate = 1;
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
        getVoices: () => [{ lang: "en-GB" }, { lang: "en-US" }],
        cancel: () => {},
        speak: (value: Utterance) => {
          (
            window as unknown as { lastSpeech: { text: string; lang: string } }
          ).lastSpeech = { text: value.text, lang: value.lang };
          setTimeout(() => value.onend?.(), 0);
        },
      },
    });
  });
  await open(page);
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await page.locator(".word-card").click();
  await page.getByRole("button", { name: "Nghe từ", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { lastSpeech: { text: string; lang: string } })
          .lastSpeech,
    ),
  ).toEqual({ text: "neighbor", lang: "en-US" });
});

test("authored lookup entries keep original examples distinct from publisher text and personal approval does not certify the publisher's scope", async ({
  page,
}) => {
  const references = ["authored", "no-cloze"].map((example_type, index) => ({
    ...word,
    id: `authored-reference-${index}`,
    word: `reference${index}`,
    preferred_us_spelling: "",
    content_status: "dictionary",
    learning_status: "lookup",
    example_type,
    learning_note:
      "Word Watcher ghi nhận cách dùng mới; không phải sự công nhận mục từ trong từ điển Cambridge.",
    source: "Cambridge Blog · bài tham khảo giới hạn phạm vi",
  }));
  await open(page, references);
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  for (const entry of references) {
    await page
      .getByRole("textbox", { name: "Tìm từ và nghĩa" })
      .fill(entry.word);
    await page.locator(".word-card").click();
    await expect(
      page.getByText("Giải nghĩa biên soạn", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ví dụ biên soạn", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".dict-example")).toContainText(
      "do Jeongyeon biên soạn",
    );
    await expect(page.locator(".dict-entry")).not.toContainText(
      "Nghĩa tiếng Việt · nguồn từ điển mở",
    );
    await expect(page.locator(".dict-entry > .notice")).toContainText(
      "hiện chỉ để tra cứu",
    );
    await expect(page.locator(".dict-learning-note")).toContainText(
      entry.learning_note,
    );
    const review = page.locator(".dict-review");
    const approve = review.getByRole("button", {
      name: "Xác nhận đã kiểm tra · cho phép học",
    });
    await expect(approve).toBeDisabled();
    for (const checkbox of await review.getByRole("checkbox").all())
      await checkbox.check();
    await approve.click();
    await expect(review).toContainText(
      "không phải xác nhận chất lượng hoặc công nhận mục từ bởi Cambridge/Oxford",
    );
    const saved = await page.evaluate(async () => {
      const path = "/src/core.ts";
      return (await import(/* @vite-ignore */ path)).read();
    });
    expect(saved.entries[entry.id].origin).toBe("personal");
    expect(saved.entries[entry.id].word.learning_status).toBe("ready");
    expect(saved.entries[entry.id].word.learning_note).toBe(
      entry.learning_note,
    );
    expect(saved.entries[entry.id].word.source).toBe(entry.source);
    expect(saved.history).toEqual([]);
    await page.getByRole("button", { name: "Đóng", exact: true }).click();
  }
});

test("the legacy no-cloze OVDP phrase retains source attribution", async ({
  page,
}) => {
  await open(page, [
    {
      ...word,
      id: "legacy-article",
      word: "a, an",
      preferred_us_spelling: "",
      content_status: "dictionary",
      learning_status: "lookup",
      example_type: "no-cloze",
      source_fact_index: "0",
      source:
        "Nghĩa/ngữ liệu: Free Vietnamese Dictionary Project; https://example.org/anhviet.dict",
      example_en: "a very cold day",
      example_vi: "một ngày rất lạnh",
    },
  ]);
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await page.locator(".word-card").click();
  await expect(
    page.getByText("Giải nghĩa từ nguồn", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ngữ liệu từ nguồn (có thể là cụm từ)" }),
  ).toBeVisible();
  await expect(page.locator(".dict-example")).toContainText(
    "Nghĩa và ngữ liệu được nhập theo giấy phép của nguồn từ điển mở",
  );
});

test("new collection labels retain their filter values and OPAL describes list membership and British academic speech scope", async ({
  page,
}) => {
  await open(page, [
    {
      ...word,
      collections:
        "academic,opal-written,opal-spoken,american-3000,american-5000,cambridge-blog",
    },
  ]);
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  const filter = page.getByRole("combobox", { name: "Bộ từ", exact: true });
  for (const [value, label] of Object.entries({
    academic: "Oxford OPAL · Học thuật",
    "opal-written": "OPAL · Văn viết học thuật",
    "opal-spoken": "OPAL · Văn nói học thuật",
    "american-3000": "American Oxford 3000",
    "american-5000": "American Oxford 5000 · Bổ sung",
    "cambridge-blog": "Cambridge Blog · Ngôn ngữ hiện đại",
  })) {
    await expect(filter.locator(`option[value="${value}"]`)).toHaveText(label);
    await filter.selectOption(value);
    await expect(page.locator(".word-card")).toHaveCount(1);
  }
  await page.locator(".word-card").click();
  const opal = page.getByRole("region", { name: "Phạm vi Oxford OPAL" });
  await expect(opal).toContainText("Văn viết học thuật · Văn nói học thuật");
  await expect(opal).toContainText(
    "không xác nhận riêng nghĩa hoặc ví dụ đang hiển thị",
  );
  await expect(opal).toContainText("ngữ liệu văn nói học thuật Anh–Anh");
  await expect(opal).toContainText("không phải thước đo tần suất tiếng Anh–Mỹ");
});
