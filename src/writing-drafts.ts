import { read, save, type State, type WritingDraft } from "./core";

/** A draft belongs to one word and one original/revised sentence. */
export const writingDraftKey = (wordId: string, parentId?: string) =>
  JSON.stringify([wordId, parentId || ""]);

let pending: Promise<unknown> = Promise.resolve();
export const writingDraftSavedEvent = "jeongyeon-writing-draft-saved";
export const writingDraftFlushEvent = "jeongyeon-writing-draft-flush";
export type WritingDraftFlushDetail = {
  waitUntil: (write: Promise<unknown>) => void;
};

function announceDraftSave() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(writingDraftSavedEvent));
}

/** Ask mounted editors to enqueue their debounced edits before backup/sync. */
export async function flushWritingDrafts(): Promise<void> {
  const writes: Promise<unknown>[] = [];
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent<WritingDraftFlushDetail>(writingDraftFlushEvent, {
        detail: { waitUntil: (write) => writes.push(write) },
      }),
    );
  await Promise.all(writes);
  await pending;
}

export function withWritingDraft(state: State, draft: WritingDraft): State {
  if (!Object.hasOwn(state.entries, draft.wordId)) return state;
  const key = writingDraftKey(draft.wordId, draft.parentId);
  const existing = state.writingDrafts?.[key];
  if (existing && existing.updatedAt > draft.updatedAt) return state;
  if (
    existing &&
    existing.updatedAt === draft.updatedAt &&
    existing.text === draft.text &&
    existing.contentVersion === draft.contentVersion
  )
    return state;
  return {
    ...state,
    writingDrafts: { ...state.writingDrafts, [key]: { ...draft } },
  };
}

/** Serialize small personal-state writes; never replace vocabulary/history. */
export function persistWritingDraft(draft: WritingDraft): Promise<void> {
  const operation = pending.then(async () => {
    const base = await read();
    const next = withWritingDraft(base, draft);
    if (next !== base) {
      await save(next, base);
      announceDraftSave();
    }
  });
  pending = operation.catch(() => undefined);
  return operation;
}

export async function loadWritingDraft(
  wordId: string,
  parentId?: string,
): Promise<WritingDraft | undefined> {
  await pending;
  return findWritingDraft(await read(), wordId, parentId);
}

/** Reopening a saved sentence may resume a draft of one of its revisions.
 * An unrelated sentence thread must not replace an explicitly opened one. */
export function findWritingDraft(
  state: State,
  wordId: string,
  parentId?: string,
): WritingDraft | undefined {
  const parents = new Map(
    (state.writing || []).map((attempt) => [attempt.id, attempt.parentId]),
  );
  const belongsToThread = (draft: WritingDraft) => {
    if (!parentId) return true;
    const seen = new Set<string>();
    let ancestor = draft.parentId;
    while (ancestor && !seen.has(ancestor)) {
      if (ancestor === parentId) return true;
      seen.add(ancestor);
      ancestor = parents.get(ancestor);
    }
    return false;
  };
  return Object.values(state.writingDrafts || {})
    .filter((draft) => draft.wordId === wordId && belongsToThread(draft))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

/** A successful save clears only the exact draft that was submitted. A newer
 * edit from another tab survives, even when saving the answer took a while. */
export function clearedWritingDraft(
  state: State,
  submitted: WritingDraft,
  now = Date.now(),
): State {
  const existing =
    state.writingDrafts?.[
      writingDraftKey(submitted.wordId, submitted.parentId)
    ];
  if (
    !existing ||
    existing.updatedAt !== submitted.updatedAt ||
    existing.text !== submitted.text ||
    existing.contentVersion !== submitted.contentVersion
  )
    return state;
  return withWritingDraft(state, {
    ...existing,
    text: "",
    updatedAt: Math.max(now, existing.updatedAt + 1),
  });
}

/** Keep a tombstone so an older backup cannot revive the submitted text. */
export function clearWritingDraft(draft: WritingDraft): Promise<void> {
  const operation = pending.then(async () => {
    const base = await read();
    const next = clearedWritingDraft(base, draft);
    if (next !== base) {
      await save(next, base);
      announceDraftSave();
    }
  });
  pending = operation.catch(() => undefined);
  return operation;
}
