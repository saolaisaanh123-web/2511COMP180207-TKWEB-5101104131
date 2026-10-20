import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parse } from "../src/core";

const corpus = parse(readFileSync("public/data/vocabulary.txt", "utf8"));

test("the published corpus exposes American Oxford and OPAL additions with exact sources while emerging Blog terms remain lookup-only", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hôm nay, mình học gì?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kho từ", exact: true }).click();
  await expect(page.locator(".word-grid")).toHaveAttribute(
    "data-total-items",
    String(corpus.length),
  );
  const search = page.getByRole("textbox", {
    name: "Tìm từ và nghĩa",
    exact: true,
  });
  const collection = page.getByRole("combobox", { name: "Bộ từ", exact: true });

  await collection.selectOption("american-3000");
  await search.fill("elevator");
  await page
    .locator(".word-card")
    .filter({
      has: page.getByRole("heading", { name: "elevator", exact: true }),
    })
    .click();
  await expect(page.locator(".dict-translation")).toContainText("thang máy");
  await expect(page.locator(".dict-reference-list a").first()).toHaveAttribute(
    "href",
    /oxfordlearnersdictionaries\.com/,
  );
  await expect(
    page.getByRole("link", { name: "Nghe người Mỹ dùng từ (YouGlish)" }),
  ).toHaveAttribute(
    "href",
    "https://youglish.com/pronounce/elevator/english/us",
  );
  await page.getByRole("button", { name: "Đóng", exact: true }).click();

  await collection.selectOption("academic");
  await search.fill("qualitative");
  await page
    .locator(".word-card")
    .filter({
      has: page.getByRole("heading", { name: "qualitative", exact: true }),
    })
    .click();
  await expect(page.locator(".dict-opal")).toContainText("Oxford OPAL");
  await expect(page.locator(".dict-ipa")).not.toContainText("chưa đối chiếu");
  await expect(page.locator(".dict-reference-list a").first()).toHaveAttribute(
    "href",
    "https://www.oxfordlearnersdictionaries.com/definition/academic/qualitative",
  );
  await page.getByRole("button", { name: "Đóng", exact: true }).click();

  await collection.selectOption("cambridge-blog");
  await search.fill("green hushing");
  await page
    .locator(".word-card")
    .filter({
      has: page.getByRole("heading", { name: "green hushing", exact: true }),
    })
    .click();
  await expect(page.locator(".dict-learning-note")).toContainText(
    "Chỉ tra cứu",
  );
  await expect(page.locator(".dict-learning-note")).toContainText(
    "không chứng minh",
  );
  await expect(page.locator(".dict-example-heading h3")).toHaveText(
    "Ví dụ biên soạn",
  );
  await expect(page.locator(".dict-reference-list a").first()).toHaveAttribute(
    "href",
    /dictionaryblog\.cambridge\.org/,
  );
  await page.getByRole("button", { name: "Đóng", exact: true }).click();

  await context.setOffline(true);
  try {
    await collection.selectOption("american-3000");
    await search.fill("elevator");
    await expect(page.locator(".word-card h3")).toHaveText("elevator");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(320);
    const progress = await page.evaluate(async () => {
      const path = "/src/core.ts";
      const state = await (await import(/* @vite-ignore */ path)).read();
      return { history: state.history, schedules: state.schedules };
    });
    expect(progress).toEqual({ history: [], schedules: {} });
  } finally {
    await context.setOffline(false);
  }
});
