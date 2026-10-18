import { test, expect, type Page } from "@playwright/test";
import {
  contentKey,
  empty,
  merge,
  serialize,
  type Result,
  type State,
  type Word,
} from "../src/core";
import type { LearningMode } from "../src/practice-data";

const DAY = 86_400_000;
const apple: Word = {
  id: "upgrade-apple",
  word: "apple",
  meaning_vi: "quả táo",
  example_en: "She packed an apple for lunch.",
  example_vi: "Cô ấy mang theo một quả táo cho bữa trưa.",
  accepted_answers: "apple",
  part_of_speech: "noun",
  level: "A1",
  frequency_zipf: "4.1",
  content_status: "reviewed",
  learning_status: "ready",
  collections: "foundation",
};
const available: Word = {
  ...apple,
  id: "upgrade-available",
  word: "available",
  accepted_answers: "available",
  meaning_vi: "có thể sử dụng",
  example_en: "The room is available today.",
  example_vi: "Phòng có thể sử dụng hôm nay.",
  part_of_speech: "adjective",
  level: "B2",
  frequency_zipf: "6.8",
};
const confirm: Word = {
  ...apple,
  id: "upgrade-confirm",
  word: "confirm",
  accepted_answers: "confirm",
  meaning_vi: "xác nhận",
  example_en: "Please confirm the booking.",
  example_vi: "Vui lòng xác nhận đặt chỗ.",
  part_of_speech: "verb",
  level: "B1",
  frequency_zipf: "5.0",
};
const fixture = [apple, available, confirm];
async function openFixture(page: Page) {
  await page.route("**/data/vocabulary.txt", (route) =>
    route.fulfill({
      contentType: "text/plain;charset=utf-8",
      body: serialize(fixture),
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hôm nay, mình học gì?" }),
  ).toBeVisible();
}
async function read(page: Page): Promise<State> {
  return page.evaluate(async () => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    return core.read();
  });
}
async function seed(page: Page, value: State) {
  await page.evaluate(async (saved) => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    const base = await core.read();
    await core.save(saved, base, { replace: true });
  }, value);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hôm nay, mình học gì?" }),
  ).toBeVisible();
}
function evidence(word: Word, id: string, extra: Partial<Result> = {}): Result {
  return {
    id,
    wordId: word.id,
    time: Date.now() - DAY,
    skill: 1,
    answer: word.word,
    correct: true,
    hint: false,
    method: "rule",
    elapsed: 1500,
    session: id,
    review: id,
    gap: 30 * DAY,
    first: true,
    evidenceVersion: 2,
    independent: true,
    contentVersion: contentKey(word, 1),
    ...extra,
  };
}
async function progress(page: Page) {
  await page.getByRole("button", { name: "Tiến độ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bạn thực sự nhớ được gì?" }),
  ).toBeVisible();
}

for (const mode of ["smart", "common", "weak", "mixed"] as LearningMode[]) {
  test(`${mode} mode persists and keeps a created practice queue stable across reload`, async ({
    page,
  }) => {
    await openFixture(page);
    const state = merge(empty(), fixture, "default");
    state.history = [
      evidence(apple, "previous-mistake", { correct: false, exposureGap: DAY }),
    ];
    await seed(page, state);
    const homeMode = page.getByRole("combobox", {
      name: "Chế độ chọn từ",
      exact: true,
    });
    if (mode === "smart") await expect(homeMode).toHaveValue("smart");
    await homeMode.selectOption(mode);
    await expect
      .poll(async () => (await read(page)).learningMode || "smart")
      .toBe(mode);
    await page.reload();
    await expect(homeMode).toHaveValue(mode);
    await page.getByRole("button", { name: "Luyện tập", exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: "Chế độ luyện từ", exact: true }),
    ).toHaveValue(mode);
    await page.locator(".practice-card").nth(1).click();
    await page.getByRole("button", { name: /Bắt đầu luyện/ }).click();
    await expect(page.locator(".study")).toBeVisible();
    const before = await read(page);
    expect(before.session?.scheduled).toBe(false);
    expect(before.session?.queue.length).toBeGreaterThan(0);
    if (mode === "common")
      expect(before.session?.queue[0].id).toBe(available.id);
    if (mode === "weak")
      expect(before.session?.queue.map((q) => q.id)).toEqual([apple.id]);
    if (mode === "mixed")
      expect(new Set(before.session?.queue.map((q) => q.id))).toEqual(
        new Set(fixture.map((w) => w.id)),
      );
    await page.getByRole("button", { name: /Lưu & tạm dừng/ }).click();
    await page.reload();
    await expect(homeMode).toHaveValue(mode);
    await page
      .getByRole("button", { name: "Tiếp tục phiên học", exact: true })
      .click();
    await expect(page.locator(".study")).toBeVisible();
    const after = await read(page);
    expect(after.session?.id).toBe(before.session?.id);
    expect(after.session?.queue).toEqual(before.session?.queue);
    expect(after.session?.index).toBe(before.session?.index);
    expect(after.history).toEqual(before.history);
    expect(after.schedules).toEqual(before.schedules);
  });
}

test("changing any selection mode preserves the unfinished scheduled session", async ({
  page,
}) => {
  await openFixture(page);
  const saved = merge(empty(), fixture, "default");
  saved.session = {
    id: "scheduled-before-mode-change",
    started: Date.now() - 1000,
    index: 1,
    scheduled: true,
    count: 2,
    queue: [
      { id: apple.id, skill: 1, review: "due-apple" },
      { id: available.id, skill: 3, review: "due-available" },
    ],
  };
  await seed(page, saved);
  for (const mode of ["common", "mixed", "weak", "smart"] as LearningMode[]) {
    await page
      .getByRole("combobox", { name: "Chế độ chọn từ", exact: true })
      .selectOption(mode);
    await expect.poll(async () => (await read(page)).learningMode).toBe(mode);
    expect((await read(page)).session).toEqual(saved.session);
    await page.getByRole("button", { name: "Luyện tập", exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: "Chế độ luyện từ", exact: true }),
    ).toHaveValue(mode);
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "Chế độ chọn từ", exact: true }),
    ).toHaveValue(mode);
    expect((await read(page)).session).toEqual(saved.session);
  }
});

test("all due and unfinished enrolled-word tasks stay before fresh introductions without moving due dates", async ({
  page,
}) => {
  await openFixture(page);
  const saved = merge(empty(), fixture, "default"),
    now = Date.now();
  saved.learningMode = "common";
  saved.daily = 2;
  saved.entries[apple.id].enrolled = true;
  saved.entries[available.id].enrolled = true;
  saved.schedules = {
    [`${apple.id}:1`]: { due: now - 2 * DAY, last: now - 3 * DAY, step: 0 },
    [`${available.id}:3`]: { due: now - DAY, last: now - 4 * DAY, step: 1 },
  };
  await seed(page, saved);
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await expect(page.locator(".study")).toBeVisible();
  const after = await read(page),
    queue = after.session!.queue;
  const firstFresh = queue.findIndex((q) => q.id === confirm.id);
  expect(firstFresh).toBeGreaterThanOrEqual(2);
  expect(
    queue
      .slice(0, firstFresh)
      .every((q) => q.id === apple.id || q.id === available.id),
  ).toBe(true);
  expect(queue.slice(firstFresh).every((q) => q.id === confirm.id)).toBe(true);
  expect(
    queue.findIndex((q) => q.id === apple.id && q.skill === 1),
  ).toBeLessThan(firstFresh);
  expect(
    queue.findIndex((q) => q.id === available.id && q.skill === 3),
  ).toBeLessThan(firstFresh);
  expect(after.schedules).toEqual(saved.schedules);
  expect(after.history).toEqual(saved.history);
});

test("new insights never infer seven or thirty-day retention from legacy same-skill gaps", async ({
  page,
}) => {
  await openFixture(page);
  const state = merge(empty(), fixture, "default"),
    now = Date.now();
  state.history = [40, 20, 1].map((days, i) =>
    evidence(apple, `old-gap-${i}`, { time: now - days * DAY, gap: 30 * DAY }),
  );
  await seed(page, state);
  await progress(page);
  const insights = page.locator(".learning-insights");
  await expect(insights.locator(".insight-status-retained strong")).toHaveText(
    "0",
  );
  for (const article of await insights
    .locator(".insight-retention article")
    .all())
    await expect(article).toContainText("Chưa đủ dữ liệu");
  await expect(insights).toContainText(
    "3 lượt độc lập cũ chưa lưu đủ khoảng nghỉ",
  );
  expect((await read(page)).history).toEqual(state.history);
});

test("new retention counts real all-exposure gaps and excludes stale-content answers", async ({
  page,
}) => {
  await openFixture(page);
  const state = merge(empty(), fixture, "default"),
    now = Date.now();
  state.history = [
    evidence(apple, "rest-one-day", { time: now - 50 * DAY, exposureGap: DAY }),
    evidence(apple, "rest-seven-days", {
      time: now - 40 * DAY,
      exposureGap: 7 * DAY,
      correct: false,
    }),
    evidence(apple, "obsolete-sense", {
      time: now - 2 * DAY,
      exposureGap: 30 * DAY,
      contentVersion: "an earlier meaning",
    }),
    evidence(apple, "rest-thirty-days", {
      time: now - DAY,
      exposureGap: 30 * DAY,
    }),
  ];
  await seed(page, state);
  await progress(page);
  const buckets = page.locator(".learning-insights .insight-retention article");
  await expect(buckets).toHaveCount(3);
  await expect(buckets.nth(0).locator(".insight-metric strong")).toHaveText(
    "100% · 1/1 lượt",
  );
  await expect(buckets.nth(1).locator(".insight-metric strong")).toHaveText(
    "0% · 0/1 lượt",
  );
  await expect(buckets.nth(2).locator(".insight-metric strong")).toHaveText(
    "100% · 1/1 lượt",
  );
  await expect(buckets.nth(2)).toContainText("Ít dữ liệu");
  expect((await read(page)).history).toEqual(state.history);
});

test("empty insights stay finite and explain missing verified active-use evidence on narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openFixture(page);
  await progress(page);
  const insights = page.locator(".learning-insights");
  await expect(insights).not.toContainText(/NaN|Infinity|undefined/);
  await expect(insights).toContainText(
    "Chưa có đủ bằng chứng để chỉ ra điểm yếu cụ thể",
  );
  await insights.locator(".insight-status-active").click();
  await expect(insights).toContainText(
    "Chưa đủ bằng chứng sử dụng chủ động đã được xác minh",
  );
  await expect(insights.locator(".insight-status-retained strong")).toHaveText(
    "0",
  );
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(320);
  expect((await read(page)).history).toHaveLength(0);
});

test("unstarted mixed recommendations remain stable across a reload on the same day", async ({
  page,
}) => {
  await openFixture(page);
  await page
    .getByRole("combobox", { name: "Chế độ chọn từ", exact: true })
    .selectOption("mixed");
  await expect.poll(async () => (await read(page)).learningMode).toBe("mixed");
  const homeSuggestion = await page.locator(".front-card strong").innerText();
  await page.getByRole("button", { name: "Luyện tập", exact: true }).click();
  await page.locator(".practice-card").nth(1).click();
  const suggestion = page
    .locator("p.fineprint")
    .filter({ hasText: "Thứ tự trộn cố định trong ngày" })
    .locator("strong");
  const practiceSuggestion = await suggestion.innerText();
  expect((await read(page)).session).toBeUndefined();
  await page.reload();
  await expect(page.locator(".front-card strong")).toHaveText(homeSuggestion);
  await page.getByRole("button", { name: "Luyện tập", exact: true }).click();
  await page.locator(".practice-card").nth(1).click();
  await expect(suggestion).toHaveText(practiceSuggestion);
  expect((await read(page)).session).toBeUndefined();
  expect((await read(page)).history).toHaveLength(0);
});
