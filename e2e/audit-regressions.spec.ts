import { test, expect, type Page } from "@playwright/test";
import {
  contentKey,
  empty,
  merge,
  serialize,
  type State,
  type Word,
} from "../src/core";

// These tiny, explicit fixtures exercise learning behaviour without depending on
// the meanings or ordering of the published dictionary snapshot.
const apple: Word = {
  id: "audit-apple",
  word: "apple",
  meaning_vi: "quả táo",
  example_en: "She packed an apple for lunch.",
  example_vi: "Cô ấy mang theo một quả táo cho bữa trưa.",
  accepted_answers: "apple",
  level: "A1",
  topics: "food",
  collections: "foundation",
  content_status: "reviewed",
  learning_status: "ready",
  source: "Nội dung giả lập riêng cho kiểm thử chức năng.",
};

async function openFixture(page: Page, words: Word[] = [apple]) {
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

async function snapshot(page: Page): Promise<State> {
  return page.evaluate(async () => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    return core.read();
  });
}

async function seed(page: Page, saved: State) {
  await page.evaluate(async (value) => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    const base = await core.read();
    await core.save(value, base, { replace: true });
  }, saved);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hôm nay, mình học gì?" }),
  ).toBeVisible();
}

async function startPractice(page: Page, skill: number) {
  await page.getByRole("button", { name: "Luyện tập", exact: true }).click();
  await page.locator(".practice-card").nth(skill).click();
  await page.getByRole("button", { name: /Bắt đầu luyện/ }).click();
  await expect(page.locator(".study")).toBeVisible();
}

test("lookup-only meanings stay searchable but never enter a study queue", async ({
  page,
}) => {
  const lookup = {
    ...apple,
    id: "audit-lookup",
    word: "unchecked",
    content_status: "dictionary",
    learning_status: "lookup",
  };
  await openFixture(page, [apple, lookup]);
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await expect(page.locator(".word-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  const saved = await snapshot(page);
  expect(saved.session?.queue.length).toBeGreaterThan(0);
  expect(new Set(saved.session?.queue.map((task) => task.id))).toEqual(
    new Set([apple.id]),
  );
});

test("free practice does not orphan a word from its first scheduled lesson", async ({
  page,
}) => {
  await openFixture(page);
  await startPractice(page, 1);
  await page.getByRole("textbox", { name: "Câu trả lời" }).fill("apple");
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  const free = await snapshot(page);
  expect(free.history).toHaveLength(1);
  expect(free.schedules).toEqual({});
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  const scheduled = await snapshot(page);
  expect(scheduled.session?.scheduled).toBe(true);
  expect(scheduled.session?.queue.some((task) => task.id === apple.id)).toBe(
    true,
  );
});

test("listening cannot be graded before playback or after failed playback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.speechSynthesis, "getVoices", {
      value: () => [],
    });
  });
  await openFixture(page);
  await startPractice(page, 3);
  await page.getByRole("textbox", { name: "Câu trả lời" }).fill("apple");
  await expect(
    page.getByRole("button", { name: "Kiểm tra", exact: true }),
  ).toBeDisabled();
  expect((await snapshot(page)).history).toHaveLength(0);
  await page.getByRole("button", { name: "Nghe từ", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Chưa có giọng tiếng Anh" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kiểm tra", exact: true }),
  ).toBeDisabled();
  expect((await snapshot(page)).history).toHaveLength(0);
});

test("an answer seen in another skill cannot supply a third independent mastery result", async ({
  page,
}) => {
  await openFixture(page);
  const saved = merge(empty(), [apple], "default");
  const now = Date.now();
  saved.history = [16, 8].map((days, index) => ({
    id: `independent-old-${index}`,
    wordId: apple.id,
    time: now - days * 86400000,
    skill: 1,
    answer: "apple",
    correct: true,
    hint: false,
    method: "rule" as const,
    elapsed: 3000,
    session: `old-${index}`,
    review: `old-${index}`,
    gap: 8 * 86400000,
    first: true,
    independent: true,
    evidenceVersion: 2 as const,
    scheduled: true,
    contentVersion: contentKey(apple, 1),
  }));
  saved.session = {
    id: "audit-exposure",
    queue: [
      { id: apple.id, skill: 0, review: "exposure-recognize" },
      { id: apple.id, skill: 1, review: "exposure-write" },
    ],
    index: 0,
    started: now,
    scheduled: true,
    count: 1,
  };
  await seed(page, saved);
  await page.getByRole("button", { name: "Tiếp tục phiên học" }).click();
  await page.getByRole("button", { name: "Mở đáp án để tự đánh giá" }).click();
  await page.getByRole("button", { name: "Nhớ rõ", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("textbox", { name: "Câu trả lời" }).fill("apple");
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  const outcome = await page.evaluate(async () => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    const state = await core.read();
    return {
      result: state.history.at(-1),
      strength: core.strength(state, "audit-apple", 1),
    };
  });
  expect(outcome.result.independent).toBe(false);
  expect(outcome.strength).not.toBe("Nhớ khá vững");
});

test("two tabs retain answers and schedules when the other tab changes a setting", async ({
  page,
  context,
}) => {
  await openFixture(page);
  const second = await context.newPage();
  await openFixture(second);
  await second.getByRole("button", { name: "Cài đặt & sao lưu" }).click();
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await page.getByRole("button", { name: "Mở đáp án để tự đánh giá" }).click();
  await page.getByRole("button", { name: "Nhớ rõ", exact: true }).click();
  await expect(page.getByText("Đã lưu tự đánh giá.")).toBeVisible();
  await second.getByLabel("Giọng đọc ưu tiên").selectOption("en-US");
  await expect.poll(async () => (await snapshot(second)).voice).toBe("en-US");
  const saved = await snapshot(second);
  expect(saved.history).toHaveLength(1);
  expect(Object.keys(saved.schedules)).toHaveLength(1);
  expect(saved.session?.scheduled).toBe(true);
  await page.reload();
  expect((await snapshot(page)).history).toHaveLength(1);
});

test("save and pause preserves an unfinished sentence across a reload", async ({
  page,
}) => {
  await openFixture(page);
  await startPractice(page, 5);
  const draft = "I brought an apple to share with my friend after class.";
  await page
    .getByRole("textbox", { name: "Câu tiếng Anh của bạn" })
    .fill(draft);
  await page.getByRole("button", { name: /Lưu & tạm dừng/ }).click();
  await page.reload();
  await page.getByRole("button", { name: "Tiếp tục phiên học" }).click();
  await expect(
    page.getByRole("textbox", { name: "Câu tiếng Anh của bạn" }),
  ).toHaveValue(draft);
  expect((await snapshot(page)).history).toHaveLength(0);
});

test("a short free-practice session preserves the paused scheduled queue", async ({
  page,
}) => {
  await openFixture(page);
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  const initial = (await snapshot(page)).session!;
  await page.getByRole("button", { name: /Lưu & tạm dừng/ }).click();
  await startPractice(page, 1);
  await page.getByRole("textbox", { name: "Câu trả lời" }).fill("apple");
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  const saved = await snapshot(page);
  const retained = saved.session?.scheduled
    ? saved.session
    : saved.pausedScheduled;
  expect(retained?.id).toBe(initial.id);
  expect(retained?.queue).toEqual(initial.queue);
  expect(retained?.index).toBe(initial.index);
});

test("refreshing unchanged default data does not revive a manually archived word", async ({
  page,
}) => {
  await openFixture(page);
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await page.locator(".word-card").click();
  await page.getByRole("button", { name: "Lưu trữ (giữ lịch sử)" }).click();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(page.locator(".word-card")).toHaveCount(0);
  await page.getByRole("button", { name: /Cập nhật kho mặc định/ }).click();
  await page.getByRole("button", { name: "Xác nhận cập nhật" }).click();
  await expect(page.locator(".word-card")).toHaveCount(0);
  expect((await snapshot(page)).entries[apple.id].archived).toBe(true);
});

test("editing an existing meaning preserves history and resets only its affected schedules", async ({
  page,
}) => {
  const pear = {
    ...apple,
    id: "audit-pear",
    word: "pear",
    meaning_vi: "quả lê",
  };
  await openFixture(page, [apple, pear]);
  const saved = merge(empty(), [apple, pear], "default");
  const previous = Date.now() - 8 * 86400000;
  saved.history = [
    {
      id: "before-manual-edit",
      wordId: apple.id,
      time: previous,
      skill: 1,
      answer: "apple",
      correct: true,
      hint: false,
      method: "rule",
      elapsed: 2000,
      session: "previous-lesson",
      review: "previous-review",
      gap: 0,
      first: true,
      evidenceVersion: 2,
      independent: true,
      scheduled: true,
      contentVersion: contentKey(apple, 1),
    },
  ];
  const schedule = { last: previous, due: Date.now() + 30 * 86400000, step: 4 };
  saved.schedules = {
    [`${apple.id}:1`]: { ...schedule },
    [`${apple.id}:4`]: { ...schedule },
    [`${pear.id}:1`]: { ...schedule },
  };
  saved.entries[apple.id].enrolled = true;
  await seed(page, saved);
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await page
    .locator(".word-card")
    .filter({ has: page.getByRole("heading", { name: "apple", exact: true }) })
    .click();
  await page.getByRole("button", { name: "Sửa mục từ", exact: true }).click();
  const editedMeaning = "quả táo ăn được, đã đối chiếu lại nghĩa";
  await page
    .getByRole("textbox", { name: "Nội dung mục từ" })
    .fill(serialize([{ ...apple, meaning_vi: editedMeaning }]));
  await page
    .getByRole("button", { name: "Lưu trên trình duyệt", exact: true })
    .click();
  await expect
    .poll(async () => (await snapshot(page)).entries[apple.id].word.meaning_vi)
    .toBe(editedMeaning);
  const updated = await snapshot(page);
  expect(updated.history).toEqual(saved.history);
  expect(updated.entries[apple.id].origin).toBe("personal");
  expect(updated.schedules[`${apple.id}:1`]).toBeUndefined();
  expect(updated.schedules[`${apple.id}:4`]).toBeUndefined();
  expect(updated.schedules[`${pear.id}:1`]).toEqual(schedule);
});

test("daily limits always remain integer values accepted by backup validation", async ({
  page,
}) => {
  await openFixture(page);
  await page.getByRole("button", { name: "Cài đặt & sao lưu" }).click();
  await page.getByRole("spinbutton").fill("1.5");
  const daily = (await snapshot(page)).daily;
  expect(Number.isInteger(daily)).toBe(true);
  expect(daily).toBeGreaterThanOrEqual(1);
  const valid = await page.evaluate(async () => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    return core.validateBackup(await core.read()).daily;
  });
  expect(valid).toBe(daily);
});

test("replacing a backup during a lesson returns to a usable home page", async ({
  page,
}) => {
  await openFixture(page);
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await page.getByRole("button", { name: "Cài đặt & sao lưu" }).click();
  const restored = merge(empty(), [apple], "default");
  await page
    .locator('input[type=file][accept=".json,application/json"]')
    .setInputFiles({
      name: "audit-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(restored)),
    });
  await page.getByLabel("Cách khôi phục").selectOption("replace");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Xác nhận thay thế/ }).click();
  await expect(
    page.getByRole("heading", { name: "Hôm nay, mình học gì?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bắt đầu học", exact: true }),
  ).toBeEnabled();
});

test("narrow C1 cards fit the configured viewport and all navigation stays accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const advanced = {
    ...apple,
    id: "audit-advanced",
    word: "disproportionately",
    level: "C1",
    example_en: "The new fees disproportionately affect small businesses.",
  };
  await openFixture(page, [advanced]);
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Trình độ", exact: true })
    .selectOption("C1");
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    visual: window.visualViewport?.width || 0,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(320);
  expect(dimensions.client).toBeLessThanOrEqual(320);
  expect(dimensions.visual).toBeLessThanOrEqual(320);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "Tiến độ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bạn thực sự nhớ được gì?" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 768, height: 1024 });
  for (const name of [
    "Hôm nay",
    "Kho từ",
    "Cụm động từ",
    "Slang",
    "Luyện tập",
    "Tiến độ",
  ]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
});

test("pagination and main navigation return the learner to the start of results", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const words = Array.from({ length: 65 }, (_, i) => ({
    ...apple,
    id: `audit-page-${i}`,
    word: `fixture${String(i).padStart(2, "0")}`,
  }));
  await openFixture(page, words);
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await page.getByRole("button", { name: "Trang sau →", exact: true }).click();
  await expect(page.locator(".word-card")).toHaveCount(5);
  await expect(page.locator(".word-card").first()).toBeInViewport();
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await page.getByRole("button", { name: "Slang", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Slang", exact: true }),
  ).toBeInViewport();
});
