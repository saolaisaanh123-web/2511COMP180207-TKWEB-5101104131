import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { parse, serialize, type State, type Word } from "../src/core";
import { dialogues } from "../src/conversations";

const suggest: Word = {
  id: "audit-ui-suggest",
  word: "suggest",
  part_of_speech: "verb",
  meaning_vi: "đề xuất",
  example_en: "I suggest leaving early.",
  example_vi: "Tôi đề nghị đi sớm.",
  level: "B1",
  learning_status: "ready",
  content_status: "reviewed",
};
const avoid: Word = {
  ...suggest,
  id: "audit-ui-avoid",
  word: "avoid",
  meaning_vi: "tránh",
};
const dialogue = dialogues.find((item) => item.id === "assignment-feedback")!;
const targetIds = new Set(dialogue.targets.map((target) => target.id));
const dialogueWords = parse(
  readFileSync("public/data/vocabulary.txt", "utf8"),
).filter((word) => targetIds.has(word.id));

async function open(page: Page, words: Word[] = [suggest]) {
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
    return (await import(/* @vite-ignore */ path)).read();
  });
}
async function progress(page: Page) {
  await page.getByRole("button", { name: "Tiến độ", exact: true }).click();
  await expect(page.locator(".writing-feedback")).toBeVisible();
}
const editor = (page: Page) =>
  page.getByRole("textbox", { name: "Câu tiếng Anh của bạn", exact: true });
const draftText = "I suggest reviewing these notes tomorrow.";

for (const width of [320, 390]) {
  test(`writing header, badge and notice do not collide at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await open(page);
    await progress(page);
    const rectangles = await page
      .locator(".writing-feedback")
      .evaluate((panel) => {
        const box = (selector: string) => {
          const rect = panel.querySelector(selector)!.getBoundingClientRect();
          return {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
          };
        };
        return {
          header: box(".writing-heading"),
          title: box(".writing-heading > div"),
          badge: box(".writing-local"),
          notice: box(".writing-notice"),
        };
      });
    expect(rectangles.badge.bottom).toBeLessThanOrEqual(
      rectangles.header.bottom + 1,
    );
    expect(rectangles.title.bottom).toBeLessThanOrEqual(
      rectangles.header.bottom + 1,
    );
    expect(rectangles.header.bottom).toBeLessThanOrEqual(
      rectangles.notice.top + 1,
    );
    expect(rectangles.badge.left).toBeGreaterThanOrEqual(0);
    expect(rectangles.badge.right).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  });
}

test("Progress writing flushes the latest keystrokes on navigation and retains its draft in reload and JSON backup", async ({
  page,
}) => {
  await open(page);
  await progress(page);
  await editor(page).fill(draftText);
  // Deliberately navigate before the 250ms debounce can fire.
  await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
  await progress(page);
  await expect(editor(page)).toHaveValue(draftText);
  await page.reload();
  await progress(page);
  await expect(editor(page)).toHaveValue(draftText);
  const stored = await snapshot(page);
  expect(
    Object.values(stored.writingDrafts || {}).some(
      (draft) => draft.text === draftText,
    ),
  ).toBe(true);
  expect(stored.history).toEqual([]);
  expect(stored.schedules).toEqual({});
  const backup = await page.evaluate(async () => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    return core.validateBackup(JSON.parse(JSON.stringify(await core.read())));
  });
  expect(backup.writingDrafts).toEqual(stored.writingDrafts);
  const latestText = "I suggest keeping the latest unsaved changes.";
  await editor(page).fill(latestText);
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Sao lưu toàn bộ JSON", exact: true })
    .click();
  const file = await downloaded;
  const exported: State = JSON.parse(
    readFileSync((await file.path())!, "utf8"),
  );
  expect(
    Object.values(exported.writingDrafts || {}).some(
      (draft) => draft.text === latestText,
    ),
  ).toBe(true);
  expect(exported.history).toEqual([]);
  expect(exported.schedules).toEqual({});
});

test("a revised sentence resumes after navigation and saving clears only its submitted draft", async ({
  page,
}) => {
  await open(page, [suggest, avoid]);
  await progress(page);
  await page
    .getByRole("combobox", { name: "Từ để luyện viết", exact: true })
    .selectOption(suggest.id);
  await editor(page).fill("He suggested me to study English.");
  await page
    .getByRole("button", { name: "Kiểm tra cấu trúc và lưu", exact: true })
    .click();
  await expect(page.locator(".writing-proposal")).toBeVisible();
  const original = (await snapshot(page)).writing![0];
  await page
    .getByRole("button", { name: "Dùng gợi ý để viết lại", exact: true })
    .click();
  await editor(page).fill(draftText);
  await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
  await progress(page);
  await expect(editor(page)).toHaveValue(draftText);
  await page.reload();
  await progress(page);
  await expect(editor(page)).toHaveValue(draftText);
  await page.evaluate(async (wordId) => {
    const path = "/src/writing-drafts.ts";
    const drafts = await import(/* @vite-ignore */ path);
    await drafts.persistWritingDraft({
      wordId,
      text: "Keep this other draft.",
      updatedAt: Date.now(),
    });
  }, avoid.id);
  await page
    .getByRole("button", { name: "Kiểm tra cấu trúc và lưu", exact: true })
    .click();
  await expect(page.locator(".writing-message")).toContainText("Đã lưu câu");
  const after = await snapshot(page);
  expect(after.writing).toHaveLength(2);
  expect(after.writing![0]).toEqual(original);
  expect(after.writing![1]).toMatchObject({
    text: draftText,
    parentId: original.id,
  });
  expect(
    Object.values(after.writingDrafts || {}).find(
      (draft) => draft.wordId === avoid.id,
    )?.text,
  ).toBe("Keep this other draft.");
  expect(
    Object.values(after.writingDrafts || {})
      .filter((draft) => draft.wordId === suggest.id)
      .every((draft) => draft.text === ""),
  ).toBe(true);
});

test("an explicitly reopened saved sentence resumes its unfinished revision and survives a cleared tombstone", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(async (wordId) => {
    const corePath = "/src/core.ts";
    const draftPath = "/src/writing-drafts.ts";
    const writingPath = "/src/writing.ts";
    const componentPath = "/src/WritingFeedback.tsx";
    const reactPath = "/node_modules/.vite/deps/react.js";
    const domPath = "/node_modules/.vite/deps/react-dom_client.js";
    const [core, drafts, writing, component, react, dom] = await Promise.all([
      import(/* @vite-ignore */ corePath),
      import(/* @vite-ignore */ draftPath),
      import(/* @vite-ignore */ writingPath),
      import(/* @vite-ignore */ componentPath),
      import(/* @vite-ignore */ reactPath),
      import(/* @vite-ignore */ domPath),
    ]);
    const renderer = dom.default || dom;
    const factory = react.default || react;
    let state = await core.read();
    const saved = writing.makeWritingAttempt(
      state.entries[wordId].word,
      "I suggest leaving early.",
    );
    state = { ...state, writing: [saved] };
    const draft = {
      wordId,
      parentId: saved.id,
      text: "I suggest checking the revised plan.",
      updatedAt: Date.now(),
    };
    state = drafts.withWritingDraft(state, draft);
    await core.save(state);
    const host = document.createElement("div");
    host.id = "saved-writing-test";
    document.body.append(host);
    const root = renderer.createRoot(host);
    const render = (value: State) =>
      root.render(
        factory.createElement(component.default, {
          state: value,
          wordId,
          initialText: saved.text,
          parentId: saved.id,
          onSave: async () => undefined,
        }),
      );
    render(state);
    Object.assign(window, {
      reopenClearedWriting: async () => {
        root.unmount();
        state = drafts.clearedWritingDraft(state, draft);
        await core.save(state);
        const nextRoot = renderer.createRoot(host);
        nextRoot.render(
          factory.createElement(component.default, {
            state,
            wordId,
            initialText: saved.text,
            parentId: saved.id,
            onSave: async () => undefined,
          }),
        );
      },
    });
  }, suggest.id);
  const reopened = page
    .locator("#saved-writing-test")
    .getByRole("textbox", { name: "Câu tiếng Anh của bạn", exact: true });
  await expect(reopened).toHaveValue("I suggest checking the revised plan.");
  await page.evaluate(async () => {
    await (
      window as unknown as { reopenClearedWriting: () => Promise<void> }
    ).reopenClearedWriting();
  });
  await expect(reopened).toHaveValue("I suggest leaving early.");
});

async function openConversation(page: Page) {
  await page.getByRole("button", { name: "Luyện tập", exact: true }).click();
  await page
    .getByRole("button", { name: "Mở luyện hội thoại", exact: true })
    .click();
  await expect(page.locator(".conversation-lines")).toBeVisible();
}
async function fillConversation(page: Page) {
  for (const [index, question] of dialogue.questions.entries()) {
    if (question.options)
      await page
        .getByRole("radio", { name: question.accepted[0], exact: true })
        .check();
    else
      await page
        .getByRole("textbox", {
          name: `Câu ${index + 1}: điền từ`,
          exact: true,
        })
        .fill(question.accepted[0]);
  }
}

test("conversation recall hides transcript and translation, persists the phase, and never certifies delayed mastery", async ({
  page,
}) => {
  await open(page, dialogueWords);
  await openConversation(page);
  await page
    .getByRole("checkbox", { name: "Bản dịch tiếng Việt", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Ẩn đoạn để tự thử nhớ", exact: true })
    .click();
  await expect(
    page.locator(
      ".conversation-lines, .conversation-context, .conversation-translation",
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "Bản dịch tiếng Việt", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Luyện tập", exact: true }).click();
  await page
    .getByRole("button", { name: "Mở luyện hội thoại", exact: true })
    .click();
  await expect(page.locator(".conversation-lines")).toHaveCount(0);
  await fillConversation(page);
  await page
    .getByRole("button", { name: "Lưu và xem phản hồi", exact: true })
    .click();
  await expect(page.locator(".conversation-report")).toContainText(
    "Đã lưu: 3/3",
  );
  const saved = await snapshot(page);
  expect(saved.conversations).toHaveLength(1);
  expect(saved.conversations![0].answers.every((answer) => !answer.hint)).toBe(
    true,
  );
  expect(saved.history).toEqual([]);
  expect(saved.schedules).toEqual({});
  await expect(page.locator(".conversation-practice")).toContainText(
    "chưa phải bằng chứng nhớ lâu",
  );
});

test("reopening and hiding the transcript again cannot erase the hint flag", async ({
  page,
}) => {
  await open(page, dialogueWords);
  await openConversation(page);
  await page
    .getByRole("button", { name: "Ẩn đoạn để tự thử nhớ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xem lại đoạn · tính là gợi ý", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ẩn đoạn để tự thử nhớ", exact: true })
    .click();
  await fillConversation(page);
  await page
    .getByRole("button", { name: "Lưu và xem phản hồi", exact: true })
    .click();
  await expect(page.locator(".conversation-report")).toContainText(
    "Đã lưu: 3/3",
  );
  expect(
    (await snapshot(page)).conversations![0].answers.every(
      (answer) => answer.hint,
    ),
  ).toBe(true);
});
