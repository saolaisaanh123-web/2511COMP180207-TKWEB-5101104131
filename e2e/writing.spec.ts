import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { serialize, type State, type Word } from "../src/core";

const suggest: Word = {
  id: "writing-test-suggest",
  word: "suggest",
  meaning_vi: "đề xuất",
  example_en: "He suggested that I study English.",
  example_vi: "Anh ấy đề xuất tôi học tiếng Anh.",
  level: "B1",
  learning_status: "ready",
  content_status: "reviewed",
  collections: "personal",
  source: "Dữ liệu riêng cho kiểm thử chức năng viết câu.",
};
const original = "He suggested me to study English.";
const corrected = "He suggested that I study English.";
const draft = "He suggested that I practise English every day.";

async function openFixture(page: Page) {
  await page.route("**/data/vocabulary.txt", (route) =>
    route.fulfill({
      contentType: "text/plain;charset=utf-8",
      body: serialize([suggest]),
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

async function fitsViewport(page: Page, width: number) {
  expect(
    await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    })),
  ).toEqual({ document: width, body: width });
}

for (const viewport of [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
]) {
  test(`integrated writing keeps drafts, revisions, old history and backup at ${viewport.width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    const externalRequests: string[] = [];
    context.on("page", (opened) =>
      opened.on("pageerror", (error) => errors.push(error.message)),
    );
    page.on("pageerror", (error) => errors.push(error.message));
    context.on("request", (request) => {
      const url = new URL(request.url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname))
        externalRequests.push(url.href);
    });
    await openFixture(page);
    // An empty optional collection verifies that backup/restore keeps both new
    // record arrays without inventing a conversation result for this learner.
    await page.evaluate(async () => {
      const path = "/src/core.ts";
      const core = await import(/* @vite-ignore */ path);
      const before = await core.read();
      await core.save({ ...before, conversations: [] }, before);
    });
    await page.reload();
    await page.getByRole("button", { name: "Luyện tập", exact: true }).click();
    await page.locator(".practice-card").nth(5).click();
    await page.getByRole("button", { name: /Bắt đầu luyện/ }).click();
    const editor = page.getByRole("textbox", { name: "Câu tiếng Anh của bạn" });
    await expect(editor).toBeVisible();
    // Warm the test's persistence reader, then prove feedback and revision
    // saving work with actual browser networking disabled.
    await snapshot(page);
    await context.setOffline(true);
    await editor.fill(original);
    await page
      .getByRole("button", { name: "Kiểm tra cấu trúc và lưu", exact: true })
      .click();
    await expect(page.locator(".writing-original mark")).toHaveText(
      "suggested me to study",
    );
    await expect(page.locator(".writing-proposal p")).toHaveText(corrected);
    await expect
      .poll(async () => (await snapshot(page)).writing?.length)
      .toBe(1);
    const first = (await snapshot(page)).writing![0];
    expect(first.text).toBe(original);
    expect(first.status).toBe("issues");
    expect(first.source).toBe("local");
    expect(first.assessment.usage).toBe("uncertain");
    expect(first.assessment.naturalness).toBe("uncertain");
    expect((await snapshot(page)).history).toHaveLength(0);
    expect((await snapshot(page)).schedules).toEqual({});
    await fitsViewport(page, viewport.width);

    await page
      .getByRole("button", { name: "Dùng gợi ý để viết lại", exact: true })
      .click();
    await expect(editor).toHaveValue(corrected);
    await page
      .getByRole("button", { name: "Kiểm tra cấu trúc và lưu", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Chưa thể chấm tự động", exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () => (await snapshot(page)).writing?.length)
      .toBe(2);
    const revisions = (await snapshot(page)).writing!;
    expect(revisions[0]).toEqual(first);
    expect(revisions[1].parentId).toBe(first.id);
    expect(revisions[1].text).toBe(corrected);
    expect(revisions[1].status).toBe("ungraded");
    await context.setOffline(false);

    // Typing into the replacement editor must still update the old session
    // draft, including when pausing immediately before the debounce fires.
    await editor.fill(draft);
    await page.getByRole("button", { name: /Lưu & tạm dừng/ }).click();
    await page.reload();
    await page.getByRole("button", { name: "Tiếp tục phiên học" }).click();
    await expect(editor).toHaveValue(draft);
    await fitsViewport(page, viewport.width);

    // The established save-and-continue action remains independent of the
    // narrow grammar checker and still records an ungraded skill-5 answer.
    await page.getByRole("button", { name: "Lưu câu", exact: true }).click();
    await expect(editor).toBeDisabled();
    const stored = await snapshot(page);
    expect(stored.history).toHaveLength(1);
    expect(stored.history[0]).toMatchObject({
      answer: draft,
      skill: 5,
      method: "ungraded",
      correct: false,
      scheduled: false,
    });
    expect(stored.writing).toEqual(revisions);
    expect(stored.schedules).toEqual({});
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

    await page.getByRole("button", { name: "Tiến độ", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Kiểm tra cấu trúc / viết lại",
        exact: true,
      })
      .click();
    await expect(editor).toHaveValue(draft);
    await expect(page.locator("#writing-review")).toBeVisible();
    await fitsViewport(page, viewport.width);

    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Sao lưu toàn bộ JSON" }).click();
    const download = await downloading;
    const path = await download.path();
    if (!path) throw new Error("Browser did not provide a backup download.");
    const bytes = readFileSync(path);
    const backup: State = JSON.parse(bytes.toString("utf8"));
    expect(backup.writing).toEqual(revisions);
    expect(backup.conversations).toEqual([]);
    expect(backup.history[0].answer).toBe(draft);
    expect(backup.schedules).toEqual({});
    expect(backup).not.toHaveProperty("access_token");
    await page.getByRole("button", { name: "Đóng", exact: true }).click();

    // Restore into a separate browser context, then merge the same file again:
    // no existing learning or immutable sentence record may be duplicated.
    const restoredContext = await page
      .context()
      .browser()!
      .newContext({ viewport, baseURL: new URL(page.url()).origin });
    const restoredPage = await restoredContext.newPage();
    restoredPage.on("pageerror", (error) => errors.push(error.message));
    restoredPage.on("request", (request) => {
      const url = new URL(request.url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname))
        externalRequests.push(url.href);
    });
    await openFixture(restoredPage);
    for (let repetition = 0; repetition < 2; repetition++) {
      await restoredPage
        .getByRole("button", { name: "Cài đặt", exact: true })
        .click();
      await restoredPage
        .locator('input[type="file"][accept=".json,application/json"]')
        .setInputFiles({
          name: "writing-backup.json",
          mimeType: "application/json",
          buffer: bytes,
        });
      await restoredPage
        .getByRole("button", { name: "Xác nhận hợp nhất", exact: true })
        .click();
      await expect(
        restoredPage.getByRole("heading", {
          name: "Khôi phục bản sao lưu",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        restoredPage
          .getByRole("status")
          .filter({ hasText: "Đã khôi phục dữ liệu." })
          .first(),
      ).toBeVisible();
      await restoredPage
        .getByRole("button", { name: "Đóng", exact: true })
        .click();
      const recovered = await snapshot(restoredPage);
      expect(recovered.writing).toEqual(revisions);
      expect(recovered.conversations).toEqual([]);
      expect(recovered.history).toHaveLength(1);
      expect(recovered.history[0].answer).toBe(draft);
      expect(recovered.schedules).toEqual({});
    }
    await restoredContext.close();
    expect(externalRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
}
