import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  contentKey,
  empty,
  merge,
  parse,
  serialize,
  type State,
} from "../src/core";
import type { GrammarArticle, GrammarGroup } from "../src/grammar-reference";

const DAY = 86_400_000;
const words = parse(readFileSync("public/data/vocabulary.txt", "utf8")).filter(
  (word) => ["achieve-01", "avoid-01"].includes(word.id),
);

async function openApp(page: Page) {
  await page.route("**/data/vocabulary.txt", (route) =>
    route.fulfill({
      contentType: "text/plain; charset=utf-8",
      body: serialize(words),
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Hôm nay, mình học gì\?/ }),
  ).toBeVisible();
}

async function openReference(page: Page) {
  const navigation = page.getByRole("button", {
    name: "Tra cứu ngữ pháp",
    exact: true,
  });
  await navigation.scrollIntoViewIfNeeded();
  await navigation.click();
  await expect(
    page.getByRole("heading", { name: "Tra cứu ngữ pháp", exact: true }),
  ).toBeVisible();
  return navigation;
}

async function snapshot(page: Page): Promise<State> {
  return page.evaluate(async () => {
    const path = "/src/core.ts";
    return (await import(/* @vite-ignore */ path)).read();
  });
}

async function publishedGrammar(page: Page): Promise<{
  grammarArticles: GrammarArticle[];
  grammarGroups: GrammarGroup[];
}> {
  // import.meta.glob is resolved by Vite in the browser, not by Playwright's
  // Node transform. Inspect the exact dataset loaded by the real application.
  return page.evaluate(async () => {
    const path = "/src/grammar-data.ts";
    const data = await import(/* @vite-ignore */ path);
    return {
      grammarArticles: data.grammarArticles,
      grammarGroups: data.grammarGroups,
    };
  });
}

function seededProgress() {
  expect(words).toHaveLength(2);
  const state = merge(empty(), words, "default");
  const word = words[0];
  const now = Date.now();
  const time = now - 8 * DAY;
  state.entries[word.id].enrolled = true;
  state.entries[word.id].enrolledAt = time;
  state.entries[word.id].notes = "Ghi chú cá nhân cần được giữ nguyên.";
  state.entries[word.id].goal = "all";
  state.history = [
    {
      id: "grammar-preserved-result",
      wordId: word.id,
      time,
      skill: 1,
      answer: word.word,
      correct: true,
      hint: false,
      method: "rule",
      elapsed: 2100,
      session: "earlier-session",
      review: "earlier-review",
      gap: 7 * DAY,
      first: true,
      independent: true,
      evidenceVersion: 2,
      scheduled: true,
      contentVersion: contentKey(word, 1),
      exposureGap: 7 * DAY,
    },
  ];
  state.schedules[`${word.id}:1`] = { last: time, due: now - 1000, step: 2 };
  state.session = {
    id: "grammar-preserved-session",
    queue: [
      { id: word.id, skill: 1, review: "grammar-preserved-review" },
      { id: words[1].id, skill: 4, review: "grammar-next-review" },
    ],
    index: 0,
    started: now - 10000,
    scheduled: true,
    count: 1,
    draft: {
      key: `${word.id}:1:grammar-preserved-review`,
      answer: "An unfinished answer",
      hint: false,
      revealed: false,
    },
  };
  state.writing = [
    {
      id: "grammar-preserved-writing",
      wordId: word.id,
      time,
      text: `I hope to ${word.word} my goal.`,
      source: "local",
      status: "ungraded",
      issues: [],
      summary: "Chưa thể chấm tự động.",
      assessment: {
        grammar: "uncertain",
        usage: "uncertain",
        naturalness: "uncertain",
      },
      contentVersion: contentKey(word, 5),
    },
  ];
  state.conversations = [
    {
      id: "grammar-preserved-conversation",
      dialogueId: "preserved-dialogue",
      dialogueVersion: "1",
      time,
      targetIds: [word.id],
      targetContentVersions: { [word.id]: contentKey(word, 5) },
      answers: [],
      read: true,
      listenedLineIds: [],
      listenedComplete: false,
    },
  ];
  state.exposures = { [word.id]: time };
  state.learningMode = "weak";
  return state;
}

test("real grammar catalog covers its groups and searches Vietnamese, unaccented names, English and equivalent names", async ({
  page,
}) => {
  await openApp(page);
  await openReference(page);
  const { grammarArticles, grammarGroups } = await publishedGrammar(page);
  await expect(page.locator(".grammar-card")).toHaveCount(
    grammarArticles.length,
  );
  await expect(page.locator(".grammar-catalog-group")).toHaveCount(
    grammarGroups.length,
  );
  await expect(page.locator(".grammar-provenance")).toContainText(
    "British Council LearnEnglish",
  );

  const passive = grammarArticles.find((article) => article.id === "passive");
  expect(passive, "the requested passive topic exists").toBeDefined();
  const perfect = grammarArticles.find((article) =>
    article.aliases.some((alias) =>
      /^present perfect(?: simple)?$/i.test(alias),
    ),
  );
  expect(
    perfect,
    "present perfect has a searchable English alias",
  ).toBeDefined();
  const search = page.getByRole("searchbox", {
    name: "Tìm chủ điểm ngữ pháp",
    exact: true,
  });
  for (const query of ["bị động", "bi dong", "passive"]) {
    await search.fill(query);
    await expect(
      page.locator(`.grammar-card[data-grammar-id="${passive!.id}"]`),
    ).toBeVisible();
  }
  await search.fill("present perfect");
  await expect(
    page.locator(`.grammar-card[data-grammar-id="${perfect!.id}"]`),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa từ khóa tìm kiếm" }).click();
  await expect(search).toHaveValue("");

  for (const group of grammarGroups) {
    const count = grammarArticles.filter(
      (article) => article.groupId === group.id,
    ).length;
    expect(count, `group ${group.title} has real articles`).toBeGreaterThan(0);
    await page
      .getByRole("button", { name: `${group.title} ${count}`, exact: true })
      .click();
    await expect(page.locator(".grammar-card")).toHaveCount(count);
    await expect(page.locator(".grammar-catalog-group h2")).toHaveText(
      group.title,
    );
  }
  await search.fill("zzzz-no-such-grammar-topic");
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy chủ điểm phù hợp" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xem tất cả chủ điểm" }).click();
  await expect(page.locator(".grammar-card")).toHaveCount(
    grammarArticles.length,
  );
  await expect(search).toHaveValue("");
});

test("every published grammar article renders its summary, authored examples, details and exact attributed source links", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openApp(page);
  await openReference(page);
  const { grammarArticles } = await publishedGrammar(page);
  for (const article of grammarArticles) {
    await page
      .locator(`.grammar-card[data-grammar-id="${article.id}"]`)
      .click();
    await expect(page.locator(".grammar-article")).toHaveAttribute(
      "data-grammar-id",
      article.id,
    );
    await expect(
      page.getByRole("heading", { name: article.title, exact: true }),
    ).toBeFocused();
    await expect(page.locator(".grammar-summary")).toHaveText(article.summary);
    await expect(
      page.locator(".grammar-quick-reference .grammar-example"),
    ).toHaveCount(Math.min(2, article.examples.length));
    await expect(
      page.locator(".grammar-quick-reference .grammar-example p[lang='en']"),
    ).toHaveText(article.examples.slice(0, 2).map((example) => example.en));
    await expect(
      page.locator(".grammar-quick-reference .grammar-example p:not([lang])"),
    ).toHaveText(article.examples.slice(0, 2).map((example) => example.vi));

    const sourceLinks = page.locator(".grammar-sources a");
    await expect(sourceLinks).toHaveCount(article.sources.length);
    for (const [index, source] of article.sources.entries()) {
      await expect(sourceLinks.nth(index)).toHaveAttribute(
        "href",
        new URL(source.url).href,
      );
      await expect(sourceLinks.nth(index)).toContainText(source.title);
      await expect(sourceLinks.nth(index)).toHaveAttribute("target", "_blank");
      await expect(sourceLinks.nth(index)).toHaveAttribute(
        "rel",
        "noopener noreferrer",
      );
    }
    await expect(page.locator(".grammar-detail")).toHaveCount(
      Number(article.examples.length > 2) +
        Number(article.notes.length > 0) +
        Number(article.mistakes.length > 0) +
        article.comparisons.length +
        article.details.length,
    );
    // Expand every actual article, so broken notes, corrections and additional
    // examples cannot hide behind a working summary-only catalog.
    for (const detail of await page.locator(".grammar-detail").all()) {
      await detail.locator("summary").click();
      await expect(detail).toHaveAttribute("open", "");
      await expect(detail.locator(".grammar-detail-body")).toBeVisible();
    }
    await expect(
      page.locator(".grammar-example p[lang='en']").first(),
    ).toBeVisible();
    for (const mistake of article.mistakes) {
      if (mistake.context) {
        await expect(
          page
            .locator(".grammar-mistake-context")
            .filter({ hasText: mistake.context }),
        ).toBeVisible();
      }
    }
    await page.getByRole("button", { name: "Về danh mục ngữ pháp" }).click();
    await expect(
      page.locator(`.grammar-card[data-grammar-id="${article.id}"]`),
    ).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test("grammar reading preserves vocabulary, schedules, history, the unfinished session, writing and conversation records", async ({
  page,
}) => {
  await openApp(page);
  const seed = seededProgress();
  // Keep the completed initial source load metadata; otherwise the existing
  // background source check can legitimately add this field after navigation.
  seed.sourceVersion = (await snapshot(page)).sourceVersion;
  await page.evaluate(async (value) => {
    const path = "/src/core.ts";
    const core = await import(/* @vite-ignore */ path);
    await core.save(value, await core.read(), { replace: true });
  }, seed);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Hôm nay, mình học gì\?/ }),
  ).toBeVisible();
  const beforeNavigation = await snapshot(page);
  await openReference(page);
  const baseline = await snapshot(page);
  // The existing home screen may legitimately record a visible word meaning.
  // Exclude that from the entry transition, then require the complete stored
  // state (including exposures) to stay byte-for-byte equivalent while reading.
  expect({ ...baseline, exposures: beforeNavigation.exposures }).toEqual(
    beforeNavigation,
  );
  expect(baseline.history).toEqual(seed.history);
  expect(baseline.schedules).toEqual(seed.schedules);
  expect(baseline.session).toEqual(seed.session);
  expect(baseline.writing).toEqual(seed.writing);
  expect(baseline.conversations).toEqual(seed.conversations);

  const search = page.getByRole("searchbox", {
    name: "Tìm chủ điểm ngữ pháp",
    exact: true,
  });
  await search.fill("passive");
  await page.locator('.grammar-card[data-grammar-id="passive"]').click();
  for (const detail of await page.locator(".grammar-detail").all()) {
    await detail.locator("summary").click();
  }
  await page.getByRole("button", { name: "Về danh mục ngữ pháp" }).click();
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await page.locator(".grammar-card").last().click();
  expect(await snapshot(page)).toEqual(baseline);
});

test("loaded grammar remains searchable and readable when navigating without an Internet connection", async ({
  page,
  context,
}) => {
  await openApp(page);
  await openReference(page);
  const { grammarArticles } = await publishedGrammar(page);
  await context.setOffline(true);
  try {
    await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
    await openReference(page);
    await page
      .getByRole("searchbox", { name: "Tìm chủ điểm ngữ pháp", exact: true })
      .fill("bi dong");
    await page.locator('.grammar-card[data-grammar-id="passive"]').click();
    await expect(page.locator(".grammar-summary")).toHaveText(
      grammarArticles.find((article) => article.id === "passive")!.summary,
    );
    await expect(page.locator(".grammar-sources a").first()).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test("grammar navigation, catalog and reading work at 320, 390, 768 and 1440 pixels", async ({
  page,
}) => {
  await openApp(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const navigation = await openReference(page);
    await expect(navigation).toHaveAttribute("aria-current", "page");
    await expect(navigation).toBeInViewport();
    const navBox = await navigation.boundingBox();
    expect(navBox!.width).toBeGreaterThanOrEqual(44);
    expect(navBox!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      `catalog at ${width}px`,
    ).toBe(false);
    await page.locator('.grammar-card[data-grammar-id="passive"]').click();
    for (const detail of await page.locator(".grammar-detail").all()) {
      await detail.locator("summary").click();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      `article at ${width}px`,
    ).toBe(false);
    const textSizes = await page
      .locator(
        ".grammar-summary, .grammar-example p[lang='en'], .grammar-mistake p",
      )
      .evaluateAll((elements) =>
        elements.map((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        ),
      );
    expect(Math.min(...textSizes)).toBeGreaterThanOrEqual(14);
    await page.getByRole("button", { name: "Về danh mục ngữ pháp" }).click();
    await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
  }
});
