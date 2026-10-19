import { expect, test, type Page } from "@playwright/test";
import type { GrammarArticle, GrammarGroup } from "../src/grammar-reference";

// These display/search fixtures are not grammar lessons, verified sources or
// application data. They are served only by this test's intercepted document;
// the real app, IndexedDB and published vocabulary are never loaded or changed.
const groups: GrammarGroup[] = [
  {
    id: "verbs",
    title: "Động từ và câu",
    description: "Nhóm kiểm thử cấu trúc câu.",
  },
  {
    id: "nouns",
    title: "Danh từ và từ hạn định",
    description: "Nhóm kiểm thử từ loại.",
  },
];

function fixtureArticle(
  id: string,
  groupId: string,
  title: string,
  aliases: string[],
): GrammarArticle {
  return {
    id,
    groupId,
    title,
    aliases,
    summary: `Tóm tắt kiểm tra hiển thị của ${title}.`,
    whenToUse: [
      "Một đoạn mẫu đủ dài để kiểm tra cách xuống dòng trên màn hình điện thoại nhỏ.",
    ],
    structures: [
      "subject + auxiliary + past participle + optional information",
    ],
    examples: [
      { en: "This is a display test.", vi: "Đây là kiểm tra hiển thị." },
      {
        en: "The component is being tested.",
        vi: "Thành phần đang được kiểm tra.",
      },
      { en: "Here is another example.", vi: "Đây là một ví dụ khác." },
    ],
    notes: ["Lưu ý mẫu dùng kiểm tra phần có thể mở rộng."],
    mistakes: [
      {
        wrong: "An incorrect fixture sentence.",
        correct: "A corrected fixture sentence.",
        explanation: "Giải thích mẫu, không phải phản hồi cho bài học thực tế.",
      },
    ],
    comparisons: [
      {
        title: "Phân biệt hai cách dùng",
        explanation: "Nội dung mẫu dùng kiểm tra phần so sánh.",
      },
    ],
    details: [
      {
        title: "Giải thích chi tiết",
        paragraphs: ["Nội dung mẫu dùng kiểm tra phần giải thích mở rộng."],
      },
    ],
    sources: [
      {
        title: "Nguồn giả lập riêng cho kiểm thử giao diện",
        url: `https://example.org/grammar-ui-fixture/${id}`,
        accessedAt: "2026-10-20",
      },
    ],
  };
}

const articles: GrammarArticle[] = [
  fixtureArticle("passive", "verbs", "Câu bị động (Passive voice)", [
    "bị động",
    "passive",
  ]),
  fixtureArticle("questions", "verbs", "Câu hỏi (Questions)", [
    "câu hỏi",
    "interrogative",
  ]),
  fixtureArticle("articles", "nouns", "Mạo từ (Articles)", [
    "mạo từ",
    "determiners",
  ]),
];

async function openReferenceFixture(page: Page) {
  // Reuse the dependency URLs resolved by this project's actual Vite server,
  // including its current cache hashes, without mounting the learning app.
  const mainResponse = await page.request.get("/src/main.tsx");
  expect(mainResponse.ok()).toBe(true);
  const transformedMain = await mainResponse.text();
  const reactModule = transformedMain.match(
    /["']([^"']*\/react\.js(?:\?[^"']*)?)["']/,
  )?.[1];
  const reactDomModule = transformedMain.match(
    /["']([^"']*\/react-dom_client\.js(?:\?[^"']*)?)["']/,
  )?.[1];
  expect(reactModule, "Vite resolved the React browser module").toBeTruthy();
  expect(
    reactDomModule,
    "Vite resolved the ReactDOM browser module",
  ).toBeTruthy();
  await page.route("**/__grammar-reference-ui-fixture", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Grammar UI test fixture</title></head>
<body><div id="root"></div><script type="module">
import React from ${JSON.stringify(reactModule)};
import ReactDOM from ${JSON.stringify(reactDomModule)};
import GrammarReference from "/src/GrammarReference.tsx";
import "/src/style.css";
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement("main", { style: { padding: "20px", maxWidth: "1100px", margin: "0 auto" } },
    React.createElement(GrammarReference, { articles: ${JSON.stringify(articles)}, groups: ${JSON.stringify(groups)} })
  )
);
</script></body></html>`,
    }),
  );
  await page.goto("/__grammar-reference-ui-fixture");
  await expect(
    page.getByRole("heading", { name: "Tra cứu ngữ pháp", exact: true }),
  ).toBeVisible();
}

test("grammar reference searches Vietnamese, unaccented aliases and English, with category and empty filters", async ({
  page,
}) => {
  await openReferenceFixture(page);
  const search = page.getByRole("searchbox", { name: "Tìm chủ điểm ngữ pháp" });
  const passive = page.getByRole("button", {
    name: "Xem Câu bị động (Passive voice)",
    exact: true,
  });

  for (const query of ["bị động", "bi dong", "passive"]) {
    await search.fill(query);
    await expect(passive).toBeVisible();
    await expect(page.locator(".grammar-card")).toHaveCount(1);
    await expect(page.getByRole("status")).toContainText("1 chủ điểm");
  }

  await page.getByRole("button", { name: "Xóa từ khóa tìm kiếm" }).click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(page.locator(".grammar-card")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Danh từ và từ hạn định 1", exact: true })
    .click();
  await expect(page.locator(".grammar-card")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Xem Mạo từ (Articles)", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Danh từ và từ hạn định 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  await search.fill("passive");
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy chủ điểm phù hợp" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(page.locator(".grammar-card")).toHaveCount(3);
  await search.fill("zzzz-no-match");
  await expect(page.locator(".grammar-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Xem tất cả chủ điểm" }).click();
  await expect(page.locator(".grammar-card")).toHaveCount(3);
});

test("grammar article opens a quick reference, expandable details and source links, then restores keyboard focus", async ({
  page,
}) => {
  await openReferenceFixture(page);
  const passive = page.getByRole("button", {
    name: "Xem Câu bị động (Passive voice)",
    exact: true,
  });
  await passive.focus();
  await page.keyboard.press("Enter");
  const heading = page.getByRole("heading", {
    name: "Câu bị động (Passive voice)",
    exact: true,
  });
  await expect(heading).toBeFocused();
  await expect(page.locator(".grammar-summary")).toHaveText(
    articles[0].summary,
  );
  await expect(
    page.getByRole("heading", { name: "Dùng khi nào?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cấu trúc chính" }),
  ).toBeVisible();
  await expect(
    page.locator(".grammar-quick-reference .grammar-example"),
  ).toHaveCount(2);
  await expect(
    page.getByText(articles[0].notes[0], { exact: true }),
  ).toBeHidden();

  const source = page.getByRole("link", {
    name: /Nguồn giả lập riêng cho kiểm thử giao diện/,
  });
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute("href", articles[0].sources[0].url);
  await expect(source).toHaveAttribute("target", "_blank");
  await expect(source).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.locator(".grammar-source-date")).toHaveText(
    "Đối chiếu ngày 20/10/2026",
  );

  const notes = page.locator("summary", { hasText: "Lưu ý và ngoại lệ" });
  await notes.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(articles[0].notes[0], { exact: true }),
  ).toBeVisible();
  await page.locator("summary", { hasText: "Lỗi thường gặp" }).click();
  await expect(
    page.getByText(articles[0].mistakes[0].correct, { exact: true }),
  ).toBeVisible();
  await page.locator("summary", { hasText: "Ví dụ khác" }).click();
  await expect(
    page.getByText(articles[0].examples[2].en, { exact: true }),
  ).toBeVisible();
  await page.locator("summary", { hasText: "Phân biệt hai cách dùng" }).click();
  await expect(
    page.getByText(articles[0].comparisons[0].explanation, { exact: true }),
  ).toBeVisible();
  await page.locator("summary", { hasText: "Giải thích chi tiết" }).click();
  await expect(
    page.getByText(articles[0].details[0].paragraphs[0], { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Về danh mục ngữ pháp" }).click();
  await expect(passive).toBeFocused();
  await expect(page.getByRole("searchbox")).toBeVisible();
});

test("grammar catalog and article remain readable without horizontal overflow at phone, tablet and desktop widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openReferenceFixture(page);
  const hasHorizontalOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".grammar-card")).toHaveCount(3);
    expect(await hasHorizontalOverflow(), `catalog width ${width}`).toBe(false);
    const cardFont = await page
      .locator(".grammar-card strong")
      .first()
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      );
    expect(cardFont).toBeGreaterThanOrEqual(14);
    await page
      .getByRole("button", {
        name: "Xem Câu bị động (Passive voice)",
        exact: true,
      })
      .click();
    await page.locator("summary", { hasText: "Lỗi thường gặp" }).click();
    expect(await hasHorizontalOverflow(), `article width ${width}`).toBe(false);
    const textSizes = await page
      .locator(
        ".grammar-summary, .grammar-example p[lang='en'], .grammar-mistake p",
      )
      .evaluateAll((elements) =>
        elements.map((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        ),
      );
    expect(textSizes.length).toBeGreaterThan(0);
    expect(Math.min(...textSizes)).toBeGreaterThanOrEqual(14);
    const back = page.getByRole("button", { name: "Về danh mục ngữ pháp" });
    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await back.click();
  }

  expect(errors).toEqual([]);
});
