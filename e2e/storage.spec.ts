import { expect, test, type Page } from "@playwright/test";
import { empty, type Result, type State } from "../src/core";

const sample = (): State => ({
  ...empty(),
  entries: {
    apple: {
      origin: "default",
      archived: false,
      word: {
        id: "apple",
        word: "apple",
        meaning_vi: "quả táo",
        example_en: "I eat an apple.",
        example_vi: "Tôi ăn một quả táo.",
      },
    },
  },
});
const result = (id: string, time: number): Result => ({
  id,
  wordId: "apple",
  time,
  skill: 1,
  answer: "apple",
  correct: true,
  hint: false,
  method: "rule",
  elapsed: 1000,
  session: id,
  review: id,
  gap: 0,
  first: true,
});

async function harness(page: Page) {
  await page.route("**/storage-harness", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Storage test</title>",
    }),
  );
  await page.goto("/storage-harness");
}

// These pages deliberately do not run React, so each imported module has its
// own cold in-memory state just like two independent learner tabs.
test("legacy database migration preserves exported data and separates vocabulary writes", async ({
  page,
}) => {
  await harness(page);
  const original = sample();
  original.history.push(result("old", 1000));
  original.schedules["apple:1"] = { last: 1000, due: 10000, step: 0 };
  await page.evaluate(async (state) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("lexi-learning", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("state");
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("state", "readwrite");
        tx.objectStore("state").put(state, "main");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }, original);
  const migrated = await page.evaluate(async () => {
    const { readStoredState, saveStoredState } =
      await import("/src/storage.ts");
    const { empty } = await import("/src/core.ts");
    const before = await readStoredState(empty);
    const saved = await saveStoredState({ ...before, voice: "en-US" }, before);
    const raw = await new Promise<any>((resolve, reject) => {
      const request = indexedDB.open("lexi-learning");
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(["state", "vocabulary"], "readonly");
        const metadata = tx.objectStore("state").get("main");
        const words = tx.objectStore("vocabulary").getAll();
        tx.oncomplete = () => {
          resolve({
            version: db.version,
            metadata: metadata.result,
            words: words.result,
          });
          db.close();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
    return { before, saved, raw };
  });
  expect(migrated.before).toEqual(original);
  expect(migrated.saved.history).toEqual(original.history);
  expect(migrated.saved.schedules).toEqual(original.schedules);
  expect(migrated.raw.version).toBe(2);
  expect(migrated.raw.metadata.entries.apple.word).toBeUndefined();
  expect(migrated.raw.words).toEqual([original.entries.apple.word]);

  const writes = await page.evaluate(async () => {
    const { readStoredState, saveStoredState } =
      await import("/src/storage.ts");
    const { empty } = await import("/src/core.ts");
    const stores: string[] = [];
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
      stores.push(this.name);
      return put.apply(this, args);
    };
    try {
      const before = await readStoredState(empty);
      const settings = await saveStoredState({ ...before, rate: 1 }, before);
      const progressWrites = stores.splice(0);
      const changed = structuredClone(settings);
      changed.entries.apple.word.meaning_vi = "táo";
      await saveStoredState(changed, settings);
      return { progressWrites, wordWrites: stores };
    } finally {
      IDBObjectStore.prototype.put = put;
    }
  });
  expect(writes.progressWrites).toEqual(["state"]);
  expect(
    writes.wordWrites.filter((name) => name === "vocabulary"),
  ).toHaveLength(1);
});

test("isolated tabs rebase stale settings and independent reviews without losing progress", async ({
  page,
  context,
}) => {
  await harness(page);
  await page.evaluate(async (state) => {
    const { saveStoredState } = await import("/src/storage.ts");
    await saveStoredState(state, undefined, { replace: true });
  }, sample());
  const second = await context.newPage();
  await harness(second);
  await second.evaluate(async () => {
    const storage = await import("/src/storage.ts");
    const { empty } = await import("/src/core.ts");
    (window as any).base = await storage.readStoredState(empty);
    (window as any).updates = 0;
    storage.subscribeStoredState(() => (window as any).updates++);
  });
  await page.evaluate(
    async (answer) => {
      const { readStoredState, saveStoredState } =
        await import("/src/storage.ts");
      const { empty } = await import("/src/core.ts");
      const base = await readStoredState(empty);
      const next = structuredClone(base);
      next.history.push(answer);
      next.schedules["apple:1"] = { last: answer.time, due: 10000, step: 0 };
      await saveStoredState(next, base);
    },
    result("tab-a", 1000),
  );
  await expect
    .poll(() => second.evaluate(() => (window as any).updates))
    .toBeGreaterThan(0);
  const settings = await second.evaluate(async () => {
    const { saveStoredState } = await import("/src/storage.ts");
    const base = (window as any).base;
    return saveStoredState({ ...base, voice: "en-US" }, base);
  });
  expect(settings.history.map((item: Result) => item.id)).toEqual(["tab-a"]);
  expect(settings.schedules["apple:1"].last).toBe(1000);
  expect(settings.voice).toBe("en-US");
  const coldRead = await second.evaluate(async () => {
    const { readStoredState } = await import("/src/storage.ts");
    const { empty } = await import("/src/core.ts");
    return readStoredState(empty);
  });
  expect(coldRead).toEqual(settings);
  const writeReview = async (tab: Page, answer: Result) =>
    tab.evaluate(
      async ({ base, answer }) => {
        const { saveStoredState } = await import("/src/storage.ts");
        const next = structuredClone(base);
        next.history.push(answer);
        next.schedules["apple:1"] = {
          last: answer.time,
          due: answer.time + 10000,
          step: 1,
        };
        next.exposures = { apple: answer.time };
        return saveStoredState(next, base);
      },
      { base: coldRead, answer },
    );
  await Promise.all([
    writeReview(page, result("tab-a-second", 2000)),
    writeReview(second, result("tab-b-first", 3000)),
  ]);
  const combined = await page.evaluate(async () => {
    const { readStoredState } = await import("/src/storage.ts");
    const { empty } = await import("/src/core.ts");
    return readStoredState(empty);
  });
  expect(combined.history.map((item: Result) => item.id)).toEqual([
    "tab-a",
    "tab-a-second",
    "tab-b-first",
  ]);
  expect(combined.schedules["apple:1"].last).toBe(3000);
  expect(combined.exposures).toEqual({ apple: 3000 });
});

test("conflicting positions in a shared session reject atomically and preserve the saved tab", async ({
  page,
  context,
}) => {
  await harness(page);
  const initial = sample();
  initial.session = {
    id: "shared-session",
    index: 0,
    scheduled: true,
    started: 100,
    count: 1,
    queue: [
      { id: "apple", skill: 1, review: "a" },
      { id: "apple", skill: 2, review: "b" },
    ],
  };
  await page.evaluate(async (state) => {
    const { saveStoredState } = await import("/src/storage.ts");
    await saveStoredState(state, undefined, { replace: true });
  }, initial);
  const second = await context.newPage();
  await harness(second);
  await second.evaluate(async (base) => {
    const { saveStoredState } = await import("/src/storage.ts");
    await saveStoredState(
      { ...base, session: { ...base.session!, index: 1 } },
      base,
    );
  }, initial);
  const output = await page.evaluate(
    async ({ base, answer }) => {
      const { readStoredState, saveStoredState } =
        await import("/src/storage.ts");
      const { empty } = await import("/src/core.ts");
      const next = structuredClone(base);
      next.history.push(answer);
      next.session!.queue.push({ id: "apple", skill: 3, review: "c" });
      let error = "";
      try {
        await saveStoredState(next, base);
      } catch (failure) {
        error = String(failure);
      }
      return { error, saved: await readStoredState(empty) };
    },
    { base: initial, answer: result("conflict-answer", 2000) },
  );
  expect(output.error).toContain("StorageConflictError");
  expect(output.saved.history).toHaveLength(0);
  expect(output.saved.session!.index).toBe(1);
  expect(output.saved.session!.queue).toHaveLength(2);
});

test("explicit backup replacement removes old entries while ordinary writes preserve evidence", async ({
  page,
}) => {
  await harness(page);
  const original = sample();
  original.history.push(result("old", 1000));
  const output = await page.evaluate(async (state) => {
    const { readStoredState, saveStoredState } =
      await import("/src/storage.ts");
    const { empty } = await import("/src/core.ts");
    const absent = await readStoredState(empty);
    const seeded = await saveStoredState(state, absent);
    const ordinary = await saveStoredState({ ...seeded, history: [] }, seeded);
    const replacement = await saveStoredState(empty(), ordinary, {
      replace: true,
    });
    const current = await readStoredState(empty);
    const count = await new Promise<number>((resolve) => {
      const request = indexedDB.open("lexi-learning");
      request.onsuccess = () => {
        const db = request.result;
        const query = db
          .transaction("vocabulary")
          .objectStore("vocabulary")
          .count();
        query.onsuccess = () => {
          resolve(query.result);
          db.close();
        };
      };
    });
    return { absent, ordinary, replacement, current, count };
  }, original);
  expect(output.absent).toEqual(empty());
  expect(output.ordinary.history).toHaveLength(1);
  expect(output.replacement).toEqual(empty());
  expect(output.current).toEqual(empty());
  expect(output.count).toBe(0);
});

test("failed transaction preserves previous data and does not poison the next save", async ({
  page,
}) => {
  await harness(page);
  const output = await page.evaluate(async (state) => {
    const { readStoredState, saveStoredState } =
      await import("/src/storage.ts");
    const { empty } = await import("/src/core.ts");
    const base = await saveStoredState(state, undefined, { replace: true });
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
      if (this.name === "state")
        throw new DOMException("Test quota", "QuotaExceededError");
      return put.apply(this, args);
    };
    let failure = "";
    try {
      await saveStoredState({ ...base, daily: 7 }, base);
    } catch (error) {
      failure = String(error);
    } finally {
      IDBObjectStore.prototype.put = put;
    }
    const afterFailure = await readStoredState(empty);
    const retry = await saveStoredState(
      { ...afterFailure, daily: 8 },
      afterFailure,
    );
    return { failure, afterFailure, retry };
  }, sample());
  expect(output.failure).toContain("QuotaExceededError");
  expect(output.afterFailure.daily).toBe(5);
  expect(output.retry.daily).toBe(8);
  expect(output.retry.entries.apple.word.meaning_vi).toBe("quả táo");
});
