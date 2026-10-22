import type { Entry, State, Word } from "./core";
import { compatibleSchedules, scheduleForEntries } from "./schedule-state";
import {
  mergeExposureEvents,
  exposureEventsForSnapshot,
} from "./exposure-events";

type StoredEntry = Omit<Entry, "word">;
type StoredState = Omit<State, "entries"> & {
  storageVersion: 2;
  revision: number;
  wordRevision: number;
  entries: Record<string, StoredEntry>;
};

/** A rejected write leaves the existing transaction and all progress intact. */
export class StorageConflictError extends Error {
  constructor(detail: string) {
    super(
      `Dữ liệu đã thay đổi ở tab khác (${detail}). Tải lại dữ liệu để tiếp tục; tiến độ đã lưu vẫn được giữ.`,
    );
    this.name = "StorageConflictError";
  }
}

const same = (a: unknown, b: unknown): boolean =>
  a === b || JSON.stringify(a) === JSON.stringify(b);
const clone = <T>(value: T): T =>
  value === undefined ? value : structuredClone(value);

function changedValue<T>(base: T, next: T, latest: T, label: string): T {
  if (same(base, next)) return latest;
  if (same(base, latest) || same(next, latest)) return clone(next);
  throw new StorageConflictError(label);
}

function changedObject<T extends object>(
  base: T | undefined,
  next: T | undefined,
  latest: T | undefined,
  label: string,
): T | undefined {
  if (same(base, next)) return latest;
  if (same(base, latest) || same(next, latest)) return clone(next);
  if (!next || !latest) throw new StorageConflictError(label);
  const before = (base || {}) as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  const result = { ...latest } as Record<string, unknown>;
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const value = changedValue(before[key], after[key], result[key], label);
    if (value === undefined) delete result[key];
    else result[key] = value;
  }
  return result as T;
}

/** Append-only practice evidence merges by ID rather than replacing a device's list. */
function mergePracticeEvidence<T extends { id: string; time: number }>(
  base: readonly T[] | undefined,
  next: readonly T[] | undefined,
  latest: readonly T[] | undefined,
  label: string,
  wordIds: (item: T) => readonly string[],
  entries: State["entries"],
): T[] | undefined {
  if (base === undefined && next === undefined && latest === undefined)
    return undefined;
  const result: T[] = [];
  const known = new Map<string, T>();
  const before = new Map<string, T>();
  for (const item of base || []) {
    const existing = before.get(item.id);
    if (existing && !same(existing, item))
      throw new StorageConflictError(`${label}: ID trùng có nội dung khác`);
    before.set(item.id, item);
  }
  for (const item of latest || []) {
    const existing = known.get(item.id);
    if (existing && !same(existing, item))
      throw new StorageConflictError(`${label}: ID trùng có nội dung khác`);
    if (!existing) {
      result.push(item);
      known.set(item.id, item);
    }
  }
  for (const item of next || []) {
    const original = before.get(item.id);
    // A rewrite is not a new attempt. Corrections must receive a new record ID.
    if (original && !same(original, item))
      throw new StorageConflictError(`${label}: bản ghi đã lưu không thể sửa`);
    const existing = known.get(item.id);
    if (existing && !same(existing, item))
      throw new StorageConflictError(`${label}: ID trùng có nội dung khác`);
    // An explicit restore in another tab can remove old evidence. A stale,
    // unchanged record must not resurrect the replaced backup's history.
    if (!existing && !original) {
      const added = clone(item);
      result.push(added);
      known.set(item.id, added);
    }
  }
  for (const item of result)
    if (wordIds(item).some((id) => !Object.hasOwn(entries, id)))
      throw new StorageConflictError(`${label}: kho từ đã được thay thế`);
  return result.sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
}

/** Three-way merge: a stale settings edit must never replace newer learning. */
export function rebaseState(base: State, next: State, latest: State): State {
  const result: State = {
    ...latest,
    entries: { ...latest.entries },
    history: [...latest.history],
    schedules: { ...latest.schedules },
  };
  for (const id of new Set([
    ...Object.keys(base.entries),
    ...Object.keys(next.entries),
  ])) {
    const before = base.entries[id];
    const after = next.entries[id];
    const current = latest.entries[id];
    if (before === after || same(before, after)) continue;
    if (!after || !current) {
      const entry = changedValue(before, after, current, `mục từ ${id}`);
      if (entry) result.entries[id] = entry;
      else delete result.entries[id];
      continue;
    }
    const {
      word: beforeWord,
      reports: beforeReports,
      enrolledAt: beforeEnrolled,
      ...beforePersonal
    } = before || ({} as Entry);
    const {
      word: afterWord,
      reports: afterReports,
      enrolledAt: afterEnrolled,
      ...afterPersonal
    } = after;
    const {
      word: currentWord,
      reports: currentReports,
      enrolledAt: currentEnrolled,
      ...currentPersonal
    } = current;
    const personal = changedObject(
      beforePersonal,
      afterPersonal,
      currentPersonal,
      `ghi chú của ${id}`,
    )!;
    const word = changedObject(
      beforeWord,
      afterWord,
      currentWord,
      `nội dung ${id}`,
    )!;
    const reports = same(beforeReports, afterReports)
      ? currentReports
      : [...new Set([...(currentReports || []), ...(afterReports || [])])];
    const enrolledAt = same(beforeEnrolled, afterEnrolled)
      ? currentEnrolled
      : afterEnrolled !== undefined && currentEnrolled !== undefined
        ? Math.min(afterEnrolled, currentEnrolled)
        : changedValue(
            beforeEnrolled,
            afterEnrolled,
            currentEnrolled,
            `lần bắt đầu học ${id}`,
          );
    result.entries[id] = { ...personal, word };
    if (reports !== undefined) result.entries[id].reports = reports;
    if (enrolledAt !== undefined) result.entries[id].enrolledAt = enrolledAt;
  }

  // Results are immutable evidence. Ordinary writes can add, never erase them.
  const knownResults = new Map(result.history.map((item) => [item.id, item]));
  const baseResults = new Map(base.history.map((item) => [item.id, item]));
  for (const item of next.history) {
    if (same(baseResults.get(item.id), item)) continue;
    if (!result.entries[item.wordId])
      throw new StorageConflictError("kho từ đã được thay thế ở tab khác");
    const existing = knownResults.get(item.id);
    if (existing && !same(existing, item))
      throw new StorageConflictError("câu trả lời trong cùng phiên học");
    if (!existing) {
      result.history.push(clone(item));
      knownResults.set(item.id, item);
    }
  }
  result.history.sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));

  const writing = mergePracticeEvidence(
    base.writing,
    next.writing,
    latest.writing,
    "lịch sử câu viết",
    (item) => [item.wordId],
    result.entries,
  );
  const conversations = mergePracticeEvidence(
    base.conversations,
    next.conversations,
    latest.conversations,
    "lịch sử hội thoại",
    (item) => item.targetIds,
    result.entries,
  );
  if (writing !== undefined) result.writing = writing;
  if (conversations !== undefined) result.conversations = conversations;
  const exposureEvents = mergePracticeEvidence(
    exposureEventsForSnapshot(base),
    exposureEventsForSnapshot(next),
    exposureEventsForSnapshot(latest),
    "lịch sử tiếp xúc",
    (event) => [event.wordId],
    result.entries,
  );
  if (exposureEvents !== undefined)
    result.exposureEvents = mergeExposureEvents(exposureEvents);
  const writingDrafts = changedObject(
    base.writingDrafts,
    next.writingDrafts,
    latest.writingDrafts,
    "nháp viết",
  );
  if (writingDrafts !== undefined) result.writingDrafts = writingDrafts;
  else delete result.writingDrafts;

  // Entry updates may legitimately change a sense while a tab is saving a
  // setting or a review. Bind every candidate to its originating snapshot.
  result.schedules = compatibleSchedules(latest, result.entries);

  for (const key of new Set([
    ...Object.keys(base.schedules),
    ...Object.keys(next.schedules),
  ])) {
    if (same(base.schedules[key], next.schedules[key])) continue;
    if (
      next.schedules[key] &&
      !result.entries[key.slice(0, key.lastIndexOf(":"))]
    )
      throw new StorageConflictError("kho từ của lịch ôn đã được thay thế");
    const before = scheduleForEntries(base, key, result.entries);
    const after = scheduleForEntries(next, key, result.entries);
    const current = scheduleForEntries(latest, key, result.entries);
    // An incompatible old-sense write/deletion is not a deletion or a newer
    // review of the current sense. Preserve its immutable result, not its due date.
    if ((next.schedules[key] && !after) || (!next.schedules[key] && !before))
      continue;
    if (after && current && !same(before, current)) {
      // Independent reviews of one skill keep the most recent review's timing.
      if (after.last > current.last) result.schedules[key] = clone(after);
      else if (after.last === current.last && !same(after, current))
        throw new StorageConflictError(`lịch ôn ${key}`);
      continue;
    }
    const schedule = changedValue(before, after, current, `lịch ôn ${key}`);
    if (schedule) result.schedules[key] = schedule;
    else delete result.schedules[key];
  }
  result.schedules = compatibleSchedules(result);
  result.session = changedValue(
    base.session,
    next.session,
    latest.session,
    "phiên học đang mở",
  );
  if (result.session?.queue.some((task) => !result.entries[task.id]))
    throw new StorageConflictError("kho từ của phiên học đã được thay thế");
  if (base.exposures || next.exposures || latest.exposures) {
    result.exposures = { ...latest.exposures };
    for (const [id, time] of Object.entries(next.exposures || {})) {
      if (time === base.exposures?.[id]) continue;
      if (!result.entries[id])
        throw new StorageConflictError("kho từ vừa xem đã được thay thế");
      result.exposures[id] = Math.max(time, result.exposures[id] || 0);
    }
  }
  const special = new Set([
    "entries",
    "history",
    "schedules",
    "session",
    "exposures",
    "writing",
    "conversations",
    "exposureEvents",
    "writingDrafts",
  ]);
  const a = base as unknown as Record<string, unknown>;
  const b = next as unknown as Record<string, unknown>;
  const out = result as unknown as Record<string, unknown>;
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (special.has(key)) continue;
    const value = changedValue(a[key], b[key], out[key], `cài đặt ${key}`);
    if (value === undefined) delete out[key];
    else out[key] = value;
  }
  return result;
}

let database: Promise<IDBDatabase> | undefined;
let wordCache: { revision: number; words: Record<string, Word> } | undefined;
let lastRead: State | undefined;
let pendingWrites: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;
let watching = false;

function notifyExternal() {
  for (const listener of listeners) listener();
}

function watchChanges() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel("jeongyeon-learning-updates");
      channel.onmessage = notifyExternal;
    } catch {
      // Storage events still work when a browser disables BroadcastChannel.
    }
  }
  window.addEventListener("storage", (event) => {
    if (event.key === "jeongyeon-learning-revision") notifyExternal();
  });
}

export function subscribeStoredState(listener: () => void): () => void {
  watchChanges();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function announce(revision: number) {
  watchChanges();
  if (channel) channel.postMessage(revision);
  else {
    try {
      localStorage.setItem(
        "jeongyeon-learning-revision",
        `${revision}:${Date.now()}:${Math.random()}`,
      );
    } catch {
      // The transaction remains valid when storage events are unavailable.
    }
  }
}

function openDatabase(): Promise<IDBDatabase> {
  watchChanges();
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open("lexi-learning", 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("state")) db.createObjectStore("state");
      if (!db.objectStoreNames.contains("vocabulary"))
        db.createObjectStore("vocabulary");
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) {
        db.close();
        return;
      }
      db.onversionchange = () => {
        db.close();
        database = undefined;
        wordCache = undefined;
      };
      db.onclose = () => {
        database = undefined;
        wordCache = undefined;
      };
      resolve(db);
    };
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
    request.onblocked = () => {
      blocked = true;
      database = undefined;
      reject(
        new Error(
          "Cần đóng tab Jeongyeon cũ rồi tải lại để cập nhật nơi lưu tiến độ. Dữ liệu cũ vẫn được giữ.",
        ),
      );
    };
  });
  return database;
}

function isCompact(value: State | StoredState): value is StoredState {
  return "storageVersion" in value && value.storageVersion === 2;
}

function reconstruct(stored: StoredState, words: Record<string, Word>): State {
  const {
    storageVersion: _schema,
    revision: _rev,
    wordRevision: _words,
    ...rest
  } = stored;
  const entries: State["entries"] = {};
  for (const [id, entry] of Object.entries(stored.entries)) {
    if (!words[id])
      throw new Error(`Không đọc được nội dung mục ${id}; chưa ghi thay đổi.`);
    entries[id] = { ...entry, word: words[id] };
  }
  return { ...rest, entries };
}

/** All requests are queued inside IDB callbacks, keeping read/rebase/write atomic. */
function readWithin(
  tx: IDBTransaction,
  emptyFactory: () => State,
  done: (
    state: State,
    stored: State | StoredState | undefined,
    words: Record<string, Word>,
  ) => void,
  fail: (error: unknown) => void,
) {
  const request = tx.objectStore("state").get("main");
  request.onsuccess = () => {
    try {
      const stored = request.result as State | StoredState | undefined;
      if (!stored || !isCompact(stored)) {
        const state = stored || emptyFactory();
        done(
          state,
          stored,
          Object.fromEntries(
            Object.entries(state.entries).map(([id, e]) => [id, e.word]),
          ),
        );
      } else if (wordCache?.revision === stored.wordRevision) {
        done(reconstruct(stored, wordCache.words), stored, wordCache.words);
      } else {
        const vocabulary = tx.objectStore("vocabulary").getAll();
        vocabulary.onsuccess = () => {
          try {
            const words = Object.fromEntries(
              (vocabulary.result as Word[]).map((word) => [word.id, word]),
            );
            wordCache = { revision: stored.wordRevision, words };
            done(reconstruct(stored, words), stored, words);
          } catch (error) {
            fail(error);
          }
        };
      }
    } catch (error) {
      fail(error);
    }
  };
}

export async function readStoredState(
  emptyFactory: () => State,
): Promise<State> {
  const db = await openDatabase();
  const state = await new Promise<State>((resolve, reject) => {
    const tx = db.transaction(["state", "vocabulary"], "readonly");
    let result: State;
    readWithin(tx, emptyFactory, (state) => (result = state), reject);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Không đọc được tiến độ."));
  });
  const compatible = { ...state, schedules: compatibleSchedules(state) };
  lastRead = compatible;
  return compatible;
}

export function saveStoredState(
  next: State,
  base: State | undefined = lastRead,
  options: { replace?: boolean } = {},
): Promise<State> {
  const operation = pendingWrites.then(async () => {
    const db = await openDatabase();
    let revision = 0;
    const state = await new Promise<State>((resolve, reject) => {
      const tx = db.transaction(["state", "vocabulary"], "readwrite");
      let persisted: State;
      let cacheAfter: typeof wordCache;
      let failure: unknown;
      const fail = (error: unknown) => {
        failure = error;
        tx.abort();
      };
      readWithin(
        tx,
        () => ({
          ...next,
          entries: {},
          history: [],
          schedules: {},
          session: undefined,
        }),
        (latest, stored, oldWords) => {
          try {
            persisted = options.replace
              ? clone(next)
              : rebaseState(base || latest, next, latest);
            persisted.schedules = compatibleSchedules(persisted);
            revision = (stored && isCompact(stored) ? stored.revision : 0) + 1;
            const oldWordRevision =
              stored && isCompact(stored) ? stored.wordRevision : 0;
            const vocabulary = tx.objectStore("vocabulary");
            const words: Record<string, Word> = {};
            let wordsChanged = !stored || !isCompact(stored);
            for (const [id, entry] of Object.entries(persisted.entries)) {
              if (wordsChanged || !same(oldWords[id], entry.word)) {
                vocabulary.put(entry.word, id);
                words[id] = entry.word;
              } else words[id] = oldWords[id];
            }
            for (const id of Object.keys(oldWords)) {
              if (!persisted.entries[id]) {
                vocabulary.delete(id);
                wordsChanged = true;
              }
            }
            // Check the content independently: do not rewrite all words when one changed.
            wordsChanged ||= Object.keys(words).some(
              (id) => !same(words[id], oldWords[id]),
            );
            const wordRevision = oldWordRevision + (wordsChanged ? 1 : 0);
            const compactEntries: StoredState["entries"] = {};
            for (const [id, { word: _word, ...personal }] of Object.entries(
              persisted.entries,
            ))
              compactEntries[id] = personal;
            tx.objectStore("state").put(
              {
                ...persisted,
                entries: compactEntries,
                storageVersion: 2,
                revision,
                wordRevision,
              } satisfies StoredState,
              "main",
            );
            cacheAfter = { revision: wordRevision, words };
          } catch (error) {
            fail(error);
          }
        },
        fail,
      );
      tx.oncomplete = () => {
        wordCache = cacheAfter;
        resolve(persisted);
      };
      tx.onerror = () => reject(failure || tx.error);
      tx.onabort = () =>
        reject(failure || tx.error || new Error("Chưa lưu được tiến độ."));
    });
    lastRead = state;
    announce(revision);
    return state;
  });
  // A quota/conflict error must not poison subsequent retry operations.
  pendingWrites = operation.catch(() => undefined);
  return operation;
}
