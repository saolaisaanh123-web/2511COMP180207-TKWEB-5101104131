import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import {
  contentKey,
  empty,
  merge,
  parse,
  record,
  serialize,
  validateBackup,
  type Result,
  type State,
  type Word,
} from "../src/core";

const DAY = 86_400_000;
const corpus = parse(readFileSync("public/data/vocabulary.txt", "utf8"));
const actual = (headword: string) =>
  corpus.find((word) => word.word === headword)!;
const suggest = actual("suggest");
const avoid = actual("avoid");
const bee = actual("bee");
const usage = JSON.parse(readFileSync("data/usage/group-a.json", "utf8")) as {
  wordId: string;
  example: { id: string; en: string; vi: string; alternatives?: string[] };
}[];

async function open(page: Page, words: Word[]) {
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

async function read(page: Page): Promise<State> {
  return page.evaluate(async () => {
    const path = "/src/core.ts";
    return (await import(/* @vite-ignore */ path)).read();
  });
}

async function seed(page: Page, state: State) {
  await page.evaluate(async (value) => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    const base = await core.read();
    await core.save({ ...value, sourceVersion: base.sourceVersion }, base, {
      replace: true,
    });
  }, state);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hôm nay, mình học gì?" }),
  ).toBeVisible();
}

async function resume(page: Page) {
  await page
    .getByRole("button", { name: "Tiếp tục phiên học", exact: true })
    .click();
  await expect(page.locator(".study")).toBeVisible();
}

function result(
  word: Word,
  id: string,
  overrides: Partial<Result> = {},
): Result {
  return {
    id,
    wordId: word.id,
    time: Date.now() - 8 * DAY,
    skill: 1,
    answer: word.word,
    correct: true,
    hint: false,
    method: "rule",
    elapsed: 1800,
    session: id,
    review: id,
    gap: 8 * DAY,
    first: true,
    independent: true,
    exposureGap: 8 * DAY,
    evidenceVersion: 2,
    scheduled: true,
    contentVersion: contentKey(word, 1),
    ...overrides,
  };
}

test("merging an older backup keeps the current meaning without resurrecting its old-sense review schedule", async ({
  page,
}) => {
  await open(page, [bee]);
  const oldWord = { ...bee, meaning_vi: "nhà thơ" };
  const old = merge(empty(), [oldWord], "default");
  const oldAnswer = result(oldWord, "old-bee-answer");
  old.history = [oldAnswer];
  // This intentionally reproduces an older backup with no schedule version.
  old.schedules[`${bee.id}:1`] = {
    last: oldAnswer.time,
    due: oldAnswer.time + 30 * DAY,
    step: 4,
  };
  const current = merge(old, [bee], "default");
  expect(current.schedules).toEqual({});
  await seed(page, current);
  const before = await read(page);
  await page.getByRole("button", { name: "Cài đặt & sao lưu" }).click();
  await page
    .locator('input[type=file][accept=".json,application/json"]')
    .setInputFiles({
      name: "old-meaning-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(old)),
    });
  await expect(
    page.getByRole("heading", { name: "Khôi phục bản sao lưu" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xác nhận hợp nhất", exact: true })
    .click();
  await expect(
    page.getByText("Đã khôi phục dữ liệu.", { exact: true }).first(),
  ).toBeVisible();
  const after = await read(page);
  expect(after.entries[bee.id].word).toEqual(bee);
  expect(after.schedules).toEqual(before.schedules);
  expect(after.history).toEqual(before.history);
  await page.reload();
  expect((await read(page)).schedules[`${bee.id}:1`]).toBeUndefined();
});

test("an immutable exposure collision shows a recoverable import error without partially changing local data", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await open(page, [bee]);
  const current = merge(empty(), [bee], "default");
  const answer = result(bee, "current-answer-before-invalid-merge");
  current.history = [answer];
  current.schedules[`${bee.id}:1`] = {
    last: answer.time,
    due: answer.time + 14 * DAY,
    step: 3,
    contentVersion: contentKey(bee, 1),
  };
  current.exposureEvents = [
    { id: "immutable-view-collision", wordId: bee.id, time: answer.time + DAY },
  ];
  const backup = merge(empty(), [bee, avoid], "default");
  backup.history = [result(avoid, "backup-only-answer")];
  backup.schedules[`${avoid.id}:1`] = {
    last: backup.history[0].time,
    due: backup.history[0].time + DAY,
    step: 0,
    contentVersion: contentKey(avoid, 1),
  };
  backup.exposureEvents = [
    {
      id: "immutable-view-collision",
      wordId: bee.id,
      time: answer.time + DAY + 1000,
    },
  ];
  // Both files satisfy the schema; only their shared immutable ID conflicts.
  expect(() => validateBackup(current)).not.toThrow();
  expect(() => validateBackup(backup)).not.toThrow();
  await seed(page, current);
  const before = await read(page);
  await page.getByRole("button", { name: "Cài đặt & sao lưu" }).click();
  await page
    .locator('input[type=file][accept=".json,application/json"]')
    .setInputFiles({
      name: "conflicting-exposure-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await expect(
    page.getByRole("heading", { name: "Khôi phục bản sao lưu" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xác nhận hợp nhất", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({
        hasText: "ID sự kiện tiếp xúc trùng nhưng nội dung khác nhau.",
      })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Khôi phục bản sao lưu" }),
  ).toBeVisible();
  expect(await read(page)).toEqual(before);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hôm nay, mình học gì?" }),
  ).toBeVisible();
  expect(await read(page)).toEqual(before);
  expect(pageErrors).toEqual([]);
});

test("a later answer from a stale tab preserves the current sense's short review schedule and both histories", async ({
  page,
  context,
}) => {
  const harness = async (tab: Page) => {
    await tab.route("**/audit-safety-storage-harness", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Audit storage</title>",
      }),
    );
    await tab.goto("/audit-safety-storage-harness");
  };
  const oldWord = { ...bee, meaning_vi: "nhà thơ" };
  const initial = merge(empty(), [oldWord], "default");
  const previous = result(oldWord, "old-meaning-original", {
    time: Date.now() - 32 * DAY,
  });
  initial.history = [previous];
  initial.schedules[`${bee.id}:1`] = {
    last: previous.time,
    due: previous.time + 30 * DAY,
    step: 4,
    contentVersion: contentKey(oldWord, 1),
  };
  await harness(page);
  await page.evaluate(async (value) => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    await core.save(value, undefined, { replace: true });
  }, initial);
  const stale = await context.newPage();
  await harness(stale);
  await stale.evaluate(async () => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    (window as unknown as { auditBase: State }).auditBase = await core.read();
  });
  const current = await page.evaluate(async (word) => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    const base = await core.read();
    const changed = core.merge(base, [word], "default");
    const answer = {
      id: "new-meaning-answer",
      wordId: word.id,
      time: Date.now() - 1000,
      skill: 1,
      answer: word.word,
      correct: true,
      hint: false,
      method: "rule" as const,
      elapsed: 1500,
      session: "new-meaning-session",
      review: "new-meaning-review",
      gap: 0,
      first: true,
      independent: true,
      evidenceVersion: 2 as const,
    };
    return core.save(core.record(changed, answer, true), base);
  }, bee);
  expect(current.schedules[`${bee.id}:1`].step).toBe(0);
  const merged = await stale.evaluate(async () => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    const base = (window as unknown as { auditBase: State }).auditBase;
    const word = Object.values(base.entries)[0].word;
    const answer = {
      id: "stale-old-meaning-answer",
      wordId: word.id,
      time: Date.now(),
      skill: 1,
      answer: word.word,
      correct: true,
      hint: false,
      method: "rule" as const,
      elapsed: 1500,
      session: "stale-old-meaning-session",
      review: "stale-old-meaning-review",
      gap: 0,
      first: true,
      independent: true,
      evidenceVersion: 2 as const,
    };
    return core.save(core.record(base, answer, true), base);
  });
  expect(merged.entries[bee.id].word.meaning_vi).toBe(bee.meaning_vi);
  expect(merged.schedules).toEqual(current.schedules);
  expect(merged.history.map((answer) => answer.id)).toEqual([
    "old-meaning-original",
    "new-meaning-answer",
    "stale-old-meaning-answer",
  ]);
  expect(merged.history.at(-1)?.contentVersion).toBe(contentKey(oldWord, 1));
  expect((await read(page)).schedules).toEqual(current.schedules);
});

test("a reviewed alternative in the saved second context remains neutral without reset, retry or target-word credit", async ({
  page,
}) => {
  await open(page, [suggest]);
  const state = merge(empty(), [suggest], "default");
  const example = usage.find((entry) => entry.wordId === suggest.id)!.example;
  expect(example.alternatives).toContain("recommend");
  const previous = result(suggest, "previous-context", {
    skill: 4,
    contentVersion: contentKey(suggest, 4),
  });
  state.history = [previous];
  state.entries[suggest.id].enrolled = true;
  state.schedules[`${suggest.id}:4`] = {
    last: previous.time,
    due: Date.now() - 1000,
    step: 2,
    contentVersion: contentKey(suggest, 4),
  };
  const context = { ...example, targetVersion: contentKey(suggest, 4) };
  state.session = {
    id: "alternative-context-session",
    index: 0,
    started: Date.now(),
    scheduled: true,
    count: 1,
    queue: [
      {
        id: suggest.id,
        skill: 4,
        review: "alternative-context-review",
        context,
      },
    ],
  };
  await seed(page, state);
  const before = await read(page);
  await resume(page);
  await page
    .getByRole("textbox", { name: "Câu trả lời", exact: true })
    .fill("recommend");
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect(page.getByText(/phù hợp trong câu này/)).toBeVisible();
  const after = await read(page);
  expect(after.history.at(-1)).toMatchObject({
    method: "ungraded",
    correct: false,
    independent: false,
    answer: "recommend",
    context,
  });
  expect(after.history.at(-1)?.assessmentNote).toContain("không tính đúng/sai");
  expect(after.schedules).toEqual(before.schedules);
  expect(after.session?.queue).toEqual(before.session?.queue);
  await page.reload();
  expect((await read(page)).history).toEqual(after.history);
});

test("a recent hinted failure makes both the insight status and dictionary skill weak while preserving independent accuracy history", async ({
  page,
}) => {
  await open(page, [avoid]);
  const state = merge(empty(), [avoid], "default");
  state.history = [32, 24, 16, 8].map((days, index) =>
    result(avoid, `retained-${index}`, { time: Date.now() - days * DAY }),
  );
  state.history.push(
    result(avoid, "latest-supported-failure", {
      time: Date.now() - 3600_000,
      correct: false,
      hint: true,
      independent: false,
      exposureGap: 7 * DAY,
    }),
  );
  await seed(page, state);
  const before = await read(page);
  await page.getByRole("button", { name: "Tiến độ", exact: true }).click();
  await expect(page.locator(".insight-status-weak strong")).toHaveText("1");
  await expect(page.locator(".insight-status-retained strong")).toHaveText("0");
  const writingSkill = page.locator(".insight-skill").filter({
    has: page.getByRole("heading", { name: "Nhớ để viết", exact: true }),
  });
  await expect(
    writingSkill.locator(".insight-skill-metrics > div").first(),
  ).toContainText("100% · 4/4 lượt");
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await page.locator(".word-card").click();
  await page.locator(".dict-details > summary").click();
  await expect(
    page.locator(".dict-skill-list li").filter({ hasText: "Nhớ để viết" }),
  ).toContainText("Cần củng cố");
  expect((await read(page)).history).toEqual(before.history);
});

test("a first-ever answer with no observed quiet interval is not presented as recall after twenty-four hours", async ({
  page,
}) => {
  await open(page, [avoid]);
  const state = record(
    merge(empty(), [avoid], "default"),
    result(avoid, "first-ever", {
      time: Date.now() - 3600_000,
      gap: 0,
      exposureGap: undefined,
    }),
    false,
  );
  expect(state.history[0].exposureGap).toBeUndefined();
  expect(state.history[0].independent).toBe(true);
  await seed(page, state);
  await page.getByRole("button", { name: "Tiến độ", exact: true }).click();
  const writingSkill = page.locator(".insight-skill").filter({
    has: page.getByRole("heading", { name: "Nhớ để viết", exact: true }),
  });
  const delayed = writingSkill
    .locator(".insight-skill-metrics > div")
    .filter({ has: page.getByText("Nhớ độc lập ≥ 24 giờ", { exact: true }) });
  await expect(delayed.locator(".insight-metric strong")).toHaveText(
    "Chưa đủ dữ liệu",
  );
  await expect(writingSkill).toContainText(
    "chưa đủ bằng chứng về khoảng nghỉ độc lập",
  );
  await expect(
    page
      .locator(".stats .stat")
      .filter({ hasText: "Nhớ qua các ngày" })
      .locator("strong.metric"),
  ).toHaveText("Chưa đủ dữ liệu");
});

test("the legacy forgotten-word action opens the weak skill instead of the previously selected practice mode", async ({
  page,
}) => {
  await open(page, [avoid]);
  const state = merge(empty(), [avoid], "default");
  state.history = [3, 1].map((days, index) =>
    result(avoid, `dictation-failure-${index}`, {
      time: Date.now() - days * DAY,
      skill: 3,
      correct: false,
      audioPlayed: true,
      contentVersion: contentKey(avoid, 3),
    }),
  );
  await seed(page, state);
  await page.getByRole("button", { name: "Luyện tập", exact: true }).click();
  await page.locator(".practice-card").nth(5).click();
  await page.getByRole("button", { name: "Tiến độ", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Nhóm bằng chứng", exact: true })
    .selectOption("forgotten");
  const legacyPanel = page.locator(".panel").filter({
    has: page.getByRole("heading", {
      name: "Nên tập trung vào đâu?",
      exact: true,
    }),
  });
  await legacyPanel
    .getByRole("button", { name: "Luyện ngay", exact: true })
    .click();
  await expect(page.locator(".study h2")).toHaveText(
    "Lắng nghe và thử nhớ lại",
  );
  expect(
    (await read(page)).session?.queue.map((item) => ({
      id: item.id,
      skill: item.skill,
    })),
  ).toEqual([{ id: avoid.id, skill: 3 }]);
});

test("new-word preferences reduce future tasks without excluding an existing due skill or changing an active queue", async ({
  page,
}) => {
  const apple: Word = {
    id: "safety-pref-apple",
    word: "apple",
    part_of_speech: "noun",
    meaning_vi: "quả táo",
    example_en: "I eat an apple.",
    example_vi: "Tôi ăn một quả táo.",
    level: "A1",
    content_status: "reviewed",
    learning_status: "ready",
    frequency_zipf: "4.5",
  };
  const low: Word = {
    ...apple,
    id: "safety-pref-window",
    word: "window",
    meaning_vi: "cửa sổ",
    example_en: "Open the window.",
    example_vi: "Mở cửa sổ.",
    frequency_zipf: "6.5",
  };
  const high: Word = {
    ...apple,
    id: "safety-pref-confirm",
    word: "confirm",
    part_of_speech: "verb",
    meaning_vi: "xác nhận",
    example_en: "Please confirm the booking.",
    example_vi: "Hãy xác nhận đặt chỗ.",
    level: "B1",
    frequency_zipf: "5.0",
  };
  const words = [apple, low, high];
  await open(page, words);
  const state = merge(empty(), words, "default");
  state.learningFloor = "B1";
  state.studySkills = [1, 4];
  state.daily = 1;
  state.entries[apple.id].enrolled = true;
  state.entries[apple.id].goal = "recognition";
  state.schedules[`${apple.id}:0`] = {
    last: Date.now() - 4 * DAY,
    due: Date.now() - DAY,
    step: 1,
    contentVersion: contentKey(apple, 0),
  };
  await seed(page, state);
  const before = await read(page);
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await expect(page.locator(".study")).toBeVisible();
  const started = await read(page);
  const queue = started.session!.queue;
  expect(queue[0]).toMatchObject({ id: apple.id, skill: 0 });
  expect(
    queue.filter((item) => item.id === high.id).map((item) => item.skill),
  ).toEqual([1, 4]);
  expect(queue.some((item) => item.id === low.id)).toBe(false);
  expect(started.schedules).toEqual(before.schedules);
  await page.getByRole("button", { name: "Cài đặt & sao lưu" }).click();
  const learningFloor = page.getByRole("combobox", {
    name: "Mức ưu tiên từ mới",
    exact: true,
  });
  await expect(learningFloor).toHaveValue("B1");
  await learningFloor.selectOption("C1");
  await expect.poll(async () => (await read(page)).learningFloor).toBe("C1");
  await expect(learningFloor).toHaveValue("C1");
  const preferenceSkills = page.getByRole("group", {
    name: "Kỹ năng ưu tiên ở phiên mới",
    exact: true,
  });
  const dictation = preferenceSkills.getByRole("checkbox", {
    name: "Nghe và chính tả",
    exact: true,
  });
  await dictation.click();
  await expect(dictation).toBeChecked();
  await expect
    .poll(async () => (await read(page)).studySkills)
    .toEqual([1, 3, 4]);
  const writing = preferenceSkills.getByRole("checkbox", {
    name: "Nhớ để viết",
    exact: true,
  });
  await writing.click();
  await expect(writing).not.toBeChecked();
  await expect.poll(async () => (await read(page)).studySkills).toEqual([3, 4]);
  const contextual = preferenceSkills.getByRole("checkbox", {
    name: "Dùng trong ngữ cảnh",
    exact: true,
  });
  await contextual.click();
  await expect(contextual).not.toBeChecked();
  await expect.poll(async () => (await read(page)).studySkills).toEqual([3]);
  await expect(dictation).toBeChecked();
  await expect(dictation).toBeDisabled();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.reload();
  await resume(page);
  const resumed = await read(page);
  expect(resumed.learningFloor).toBe("C1");
  expect(resumed.studySkills).toEqual([3]);
  expect(resumed.session?.queue).toEqual(queue);
  expect(resumed.session?.id).toBe(started.session?.id);
  expect(resumed.history).toEqual(started.history);
  expect(resumed.schedules).toEqual(started.schedules);
});
