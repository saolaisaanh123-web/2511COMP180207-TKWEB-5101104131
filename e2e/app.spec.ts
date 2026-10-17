import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parse, merge, empty, record } from "../src/core";
const corpus = parse(readFileSync("public/data/vocabulary.txt", "utf8"));
test("dashboard, scheduled study, persistence, evidence and backup", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hôm nay, mình học gì?" }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/lexi-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await expect(page.locator(".study h2")).toHaveText("avoid");
  await page.getByRole("button", { name: "Mở đáp án để tự đánh giá" }).click();
  await page.getByRole("button", { name: "Nhớ rõ", exact: true }).click();
  await expect(page.getByText("Đã lưu tự đánh giá.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Tiếp tục phiên học" }).click();
  await expect(
    page.getByText("Lượt này đã được lưu. Tiếp tục để tránh tính trùng."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.locator(".study h2")).toHaveText("tránh");
  await expect(page.locator(".answer")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Câu trả lời" }).fill(" AVOID ");
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).dblclick();
  await expect(page.getByText(/Chính xác!/)).toBeVisible();
  await page.getByRole("button", { name: "Tiến độ", exact: true }).click();
  await expect(page.getByText("100% · 1 lượt").first()).toBeVisible();
  await page.getByRole("button", { name: "Cài đặt & sao lưu" }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sao lưu toàn bộ JSON" }).click();
  const backup = await dl;
  await backup.saveAs("/tmp/lexi-backup-test.json");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Cài đặt & sao lưu" }).click();
  await page
    .locator('input[type=file][accept=".json,application/json"]')
    .setInputFiles("/tmp/lexi-backup-test.json");
  await expect(
    page.getByRole("heading", { name: "Khôi phục bản sao lưu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận hợp nhất" }).click();
  await expect(page.getByText("Đã khôi phục dữ liệu.")).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(page.getByText("100% · 1 lượt").first()).toBeVisible();
  expect(errors).toEqual([]);
});
test("text import preview, safe rendering, source archive and mobile layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  const text =
    "\uFEFFid: personal-1\r\nword: <script>alert(1)</script>\r\nmeaning_vi: thử tiếng Việt /ə/\r\nexample_en: A safe example.\r\nexample_vi: Một ví dụ an toàn.\r\ncollections: personal\r\n";
  await page
    .locator('input[type=file][accept=".txt,text/plain"]')
    .setInputFiles({
      name: "words.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(text),
    });
  await expect(
    page.getByRole("heading", { name: "Xem trước cập nhật kho" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận cập nhật" }).click();
  await page
    .getByRole("textbox", { name: "Tìm từ và nghĩa" })
    .fill("thử tiếng Việt");
  await expect(page.locator(".word-card h3")).toHaveText(
    "<script>alert(1)</script>",
  );
  await page.reload();
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Tìm từ và nghĩa" })
    .fill("thử tiếng Việt");
  await expect(page.locator(".word-card")).toHaveCount(1);
  const invalid = text + "\r\n---\r\n" + text.replace(/^\uFEFF/, "");
  await page
    .locator('input[type=file][accept=".txt,text/plain"]')
    .setInputFiles({
      name: "bad.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(invalid),
    });
  await expect(page.getByRole("status")).toContainText("ID trùng");
  await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
  await page.screenshot({ path: "/tmp/lexi-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("source refresh adds and archives without erasing study evidence", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await page.getByRole("button", { name: "Mở đáp án để tự đánh giá" }).click();
  await page.getByRole("button", { name: "Nhớ rõ", exact: true }).click();
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  const text =
    "id: avoid-verb-01\nword: avoid\nmeaning_vi: tránh\nexample_en: I avoid late nights.\nexample_vi: Tôi tránh thức khuya.\n";
  // Use existing stable ID; adding a second ID requires no UI source modification.
  const updated =
    text.replace("avoid-verb-01", "avoid-01") +
    "---\nid: extra-01\nword: extra\nmeaning_vi: thêm\nexample_en: I need extra time.\nexample_vi: Tôi cần thêm thời gian.\n";
  await page.route("**/data/vocabulary.txt", (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/plain;charset=utf-8",
      body: updated,
    }),
  );
  await page.getByRole("button", { name: "↻ Cập nhật kho mặc định" }).click();
  await expect(page.locator(".preview-counts")).toContainText(
    String(corpus.length - 1),
  );
  await page.getByRole("button", { name: "Xác nhận cập nhật" }).click();
  await expect(page.locator(".word-card")).toHaveCount(2);
  const snapshot = await page.evaluate(
    async () =>
      new Promise<any>((resolve) => {
        const req = indexedDB.open("lexi-learning", 1);
        req.onsuccess = () => {
          const q = req.result
            .transaction("state")
            .objectStore("state")
            .get("main");
          q.onsuccess = () => resolve(q.result);
        };
      }),
  );
  expect(snapshot.history).toHaveLength(1);
  expect(snapshot.entries["achieve-01"].archived).toBe(true);
  expect(snapshot.entries["avoid-01"].word.example_en).toBe(
    "I avoid late nights.",
  );
});
test("audio fallback and unavailable voices do not crash or count a skipped test", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.speechSynthesis, "getVoices", {
      value: () => [],
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Luyện tập", exact: true }).click();
  await page.locator(".practice-card").nth(3).click();
  await page.getByRole("button", { name: /Bắt đầu luyện/ }).click();
  await expect(page.locator(".study h2")).toHaveText(
    "Lắng nghe và thử nhớ lại",
  );
  await expect(page.locator(".study")).not.toContainText("avoid");
  await page.getByRole("button", { name: "Nghe từ", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Chưa có giọng tiếng Anh",
  );
  await page
    .getByRole("button", { name: "Không nghe được? Bỏ qua lượt này" })
    .click();
  await expect(page.getByText("Luyện tự do · 2/20")).toBeVisible();
  await page.getByRole("button", { name: "Tiến độ", exact: true }).click();
  await expect(
    page.getByText("Chưa đủ dữ liệu để kết luận.", { exact: false }),
  ).toBeVisible();
});

test("existing learner previews Oxford corpus update without losing progress or private edits", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hôm nay, mình học gì?" }),
  ).toBeVisible();
  const sample = parse(
    readFileSync("public/data/vocabulary.sample.txt", "utf8"),
  );
  let old = merge(empty(), sample, "default");
  old = record(
    old,
    {
      id: "old-review",
      wordId: "commute-01",
      time: Date.now() - 86400000,
      skill: 1,
      answer: "commute",
      correct: true,
      hint: false,
      method: "rule",
      elapsed: 2000,
      session: "old-session",
      review: "old-review",
      gap: 0,
      first: true,
    },
    true,
  );
  old.entries["achieve-01"].origin = "personal";
  old.entries["achieve-01"].word.meaning_vi = "bản sửa riêng của tôi";
  await page.evaluate(async (saved) => {
    await new Promise<void>((resolve, reject) => {
      const q = indexedDB.open("lexi-learning", 1);
      q.onsuccess = () => {
        const tx = q.result.transaction("state", "readwrite");
        tx.objectStore("state").put(saved, "main");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  }, old);
  await page.reload();
  await page.getByRole("button", { name: "Xem bản cập nhật" }).click();
  await expect(page.locator(".preview-counts")).toContainText("2Lưu trữ");
  await page.getByRole("button", { name: "Xác nhận cập nhật" }).click();
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await expect(page.locator(".word-card")).toHaveCount(corpus.length);
  await page
    .getByRole("textbox", { name: "Tìm từ và nghĩa" })
    .fill("bản sửa riêng của tôi");
  await expect(page.locator(".word-card")).toHaveCount(1);
  await page.getByRole("textbox", { name: "Tìm từ và nghĩa" }).fill("avoid");
  await page.locator(".word-card").click();
  await expect(page.locator(".dict-headword")).toHaveText("avoid");
  await expect(page.locator(".dict-level")).toHaveText("A2");
  await expect(page.locator(".dict-header")).toHaveCSS("display", "block");
  const headwordBox = await page.locator(".dict-headword").boundingBox();
  expect(headwordBox!.width).toBeGreaterThan(200);
  await expect(page.getByText("IPA chưa đối chiếu")).toBeVisible();
  await expect(
    page.getByText("Giải nghĩa biên soạn", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/lexi-dictionary.png", fullPage: true });
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Xem bản cập nhật" }),
  ).toHaveCount(0);
  const saved = await page.evaluate(
    async () =>
      new Promise<any>((resolve) => {
        const req = indexedDB.open("lexi-learning", 1);
        req.onsuccess = () => {
          const q = req.result
            .transaction("state")
            .objectStore("state")
            .get("main");
          q.onsuccess = () => resolve(q.result);
        };
      }),
  );
  expect(saved.history).toHaveLength(1);
  expect(saved.schedules["commute-01:1"]).toEqual(
    old.schedules["commute-01:1"],
  );
  expect(saved.entries["commute-01"].archived).toBe(true);
  expect(saved.entries["take-part-in-01"].archived).toBe(true);
});
