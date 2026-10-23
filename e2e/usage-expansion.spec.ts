import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import {
  contentKey,
  empty,
  merge,
  parse,
  serialize,
  type State,
  type Word,
} from "../src/core";
import type { UsageEntry } from "../src/usage";

const corpus = parse(readFileSync("public/data/vocabulary.txt", "utf8"));
const supplements: UsageEntry[] = readdirSync("data/usage")
  .filter((file) => file.endsWith(".json"))
  .flatMap((file) => JSON.parse(readFileSync(`data/usage/${file}`, "utf8")));
const targets = ["ask", "knowledge", "capable"].map((headword) =>
  corpus.find((word) => word.word === headword)!,
);
const apple: Word = {
  id: "usage-filter-apple",
  word: "apple",
  part_of_speech: "noun",
  meaning_vi: "quả táo",
  example_en: "There is an apple on the desk.",
  example_vi: "Có một quả táo trên bàn.",
  learning_status: "ready",
  content_status: "reviewed",
};
const fixture = [...targets, apple];
const filterLabel = "Có cách dùng đã đối chiếu";
const DAY = 86_400_000;

async function snapshot(page: Page): Promise<State> {
  return page.evaluate(async () => {
    const path = "/src/core.ts";
    return (await import(/* @vite-ignore */ path)).read();
  });
}

async function open(page: Page, words = fixture) {
  const text = serialize(words);
  const version = createHash("sha256").update(text).digest("hex");
  await page.route("**/data/vocabulary-version.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        version,
        entryCount: words.length,
        bytes: Buffer.byteLength(text),
      }),
    }),
  );
  await page.route("**/data/vocabulary.txt", (route) =>
    route.fulfill({ contentType: "text/plain;charset=utf-8", body: text }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Hôm nay, mình học gì/ }),
  ).toBeVisible();
  return version;
}

function enrolledState(words: Word[], version: string): State {
  const state = merge(empty(), words, "default");
  state.sourceVersion = version;
  const time = Date.now() - 8 * DAY;
  for (const entry of Object.values(state.entries)) {
    entry.enrolled = true;
    entry.enrolledAt = time;
  }
  return state;
}

function preservedStudyState(version: string): State {
  const state = enrolledState(fixture, version);
  const word = targets[0];
  const time = Date.now() - 8 * DAY;
  state.history = [
    {
      id: "expanded-preserved-result",
      wordId: word.id,
      time,
      skill: 1,
      answer: word.word,
      correct: true,
      hint: false,
      method: "rule",
      elapsed: 1600,
      session: "expanded-earlier-session",
      review: "expanded-earlier-review",
      gap: 7 * DAY,
      first: true,
      independent: true,
      evidenceVersion: 2,
      contentVersion: contentKey(word, 1),
      exposureGap: 7 * DAY,
      scheduled: true,
    },
  ];
  state.exposures = { [word.id]: time };
  state.exposureEvents = [
    {
      id: "result:expanded-preserved-result",
      wordId: word.id,
      time,
      resultId: "expanded-preserved-result",
    },
  ];
  state.schedules[`${word.id}:1`] = {
    last: time,
    due: Date.now() - 1000,
    step: 2,
    contentVersion: contentKey(word, 1),
  };
  state.session = {
    id: "expanded-preserved-session",
    index: 0,
    started: Date.now() - 1000,
    scheduled: true,
    count: 2,
    queue: [
      { id: word.id, skill: 1, review: "expanded-scheduled-review" },
      { id: targets[1].id, skill: 4, review: "expanded-pending-review" },
    ],
    draft: {
      key: "expanded-preserved-session:0",
      answer: "An unfinished answer",
      hint: false,
      revealed: false,
    },
  };
  return state;
}

async function seed(page: Page, state: State) {
  await page.evaluate(async (value) => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    await core.save(value, await core.read(), { replace: true });
  }, state);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Hôm nay, mình học gì/ }),
  ).toBeVisible();
}

async function selectUsage(page: Page) {
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Trạng thái", exact: true })
    .selectOption("usage");
}

function protectedLearning(state: State) {
  return {
    entries: state.entries,
    history: state.history,
    schedules: state.schedules,
    session: state.session,
    pausedScheduled: state.pausedScheduled,
    writing: state.writing,
    conversations: state.conversations,
    voice: state.voice,
    rate: state.rate,
    daily: state.daily,
    learningFloor: state.learningFloor,
    studySkills: state.studySkills,
  };
}

for (const width of [320, 390]) {
  test(`expanded verb, noun and adjective usage is discoverable and readable at ${width}px without grading or changing the saved lesson`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const word of targets)
      expect(supplements.find((item) => item.wordId === word.id)).toBeDefined();
    const version = await open(page);
    await seed(page, preservedStudyState(version));
    const before = await snapshot(page);
    await selectUsage(page);
    await expect(page.locator(".word-grid")).toHaveAttribute(
      "data-total-items",
      "3",
    );
    await expect(page.locator(".word-card")).toHaveCount(3);
    await expect(page.locator("main")).toContainText(
      `Trạng thái: ${filterLabel}`,
    );
    await expect(page.locator(".word-card h3")).not.toContainText(["apple"]);

    for (const word of targets) {
      const usage = supplements.find((item) => item.wordId === word.id)!;
      await page
        .locator(".word-card")
        .filter({
          has: page.getByRole("heading", { name: word.word, exact: true }),
        })
        .click();
      const panel = page.getByRole("region", {
        name: "Cách dùng đã đối chiếu",
      });
      await expect(panel).toBeVisible();
      await expect(panel).toContainText(usage.patterns[0].form);
      if (usage.countability)
        await expect(panel.locator(".usage-countability")).toHaveText(
          usage.countability,
        );
      await expect(panel.locator(".usage-second-example")).toContainText(
        usage.example.en,
      );
      await expect(panel.locator(".usage-second-example")).toContainText(
        usage.example.vi,
      );
      await panel
        .getByText("Lỗi dễ gặp trong cách dùng này", { exact: true })
        .click();
      await expect(panel.locator(".usage-mistake")).toContainText(
        usage.mistake.explanation,
      );
      const source = panel.locator(".usage-sources a").first();
      await expect(source).toHaveAttribute("href", usage.sources[0].url);
      await expect(source).toHaveAttribute("rel", "noopener noreferrer");
      const bounds = await source.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
      await page.getByRole("button", { name: "Đóng", exact: true }).click();
    }

    await page
      .getByRole("combobox", { name: "Trạng thái", exact: true })
      .selectOption("");
    await expect(page.locator(".word-card")).toHaveCount(4);
    await page
      .getByRole("combobox", { name: "Trạng thái", exact: true })
      .selectOption("usage");
    expect(protectedLearning(await snapshot(page))).toEqual(
      protectedLearning(before),
    );
  });
}

test("personal sense and word-class changes do not inherit the source supplement or enter its filter", async ({
  page,
}) => {
  const personal = [
    { ...targets[1], meaning_vi: "Nghĩa riêng đã thay đổi của tôi" },
    { ...targets[2], part_of_speech: "noun" },
  ];
  const version = await open(page, personal);
  const state = enrolledState(personal, version);
  for (const entry of Object.values(state.entries)) entry.origin = "personal";
  await seed(page, state);
  await selectUsage(page);
  await expect(page.locator(".word-card")).toHaveCount(0);
  await expect(page.locator(".empty-state")).toContainText(
    "Không có từ phù hợp",
  );
  await page
    .getByRole("combobox", { name: "Trạng thái", exact: true })
    .selectOption("");
  await expect(page.locator(".word-card")).toHaveCount(2);
  await page
    .locator(".word-card")
    .filter({
      has: page.getByRole("heading", { name: "knowledge", exact: true }),
    })
    .click();
  await expect(page.locator(".dict-translation")).toHaveText(
    personal[0].meaning_vi,
  );
  await expect(page.locator(".dict-usage")).toHaveCount(0);
  expect((await snapshot(page)).history).toEqual([]);
  expect((await snapshot(page)).schedules).toEqual({});
});

test("the source-usage filter carries into real context practice and preserves the paused scheduled lesson", async ({
  page,
}) => {
  const version = await open(page);
  const initial = preservedStudyState(version);
  await seed(page, initial);
  await selectUsage(page);
  await page.getByRole("button", { name: "Luyện tập", exact: true }).click();
  await page.locator(".practice-card").nth(4).click();
  await expect(page.locator("main")).toContainText(
    `Trạng thái: ${filterLabel}`,
  );
  await expect(
    page.getByRole("button", { name: /Bắt đầu luyện · 3 mục/ }),
  ).toBeEnabled();
  await page.getByRole("button", { name: /Bắt đầu luyện · 3 mục/ }).click();
  await expect(page.locator(".study")).toBeVisible();
  const started = await snapshot(page);
  expect(started.session?.scheduled).toBe(false);
  expect(started.session?.queue).toHaveLength(3);
  expect(new Set(started.session?.queue.map((task) => task.id))).toEqual(
    new Set(targets.map((word) => word.id)),
  );
  expect(started.session?.queue.every((task) => task.skill === 4)).toBe(true);
  expect(started.pausedScheduled).toEqual(initial.session);
  expect(started.schedules).toEqual(initial.schedules);
  expect(started.history).toEqual(initial.history);
  await page.getByRole("button", { name: /Lưu & tạm dừng/ }).click();
  await page.reload();
  const restored = await snapshot(page);
  expect(restored.session).toEqual(started.session);
  expect(restored.pausedScheduled).toEqual(initial.session);
  expect(restored.schedules).toEqual(initial.schedules);
  expect(restored.history).toEqual(initial.history);
});
