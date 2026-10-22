import { describe, expect, it } from "vitest";
import { contentKey, empty, type State, type WritingDraft } from "./core";
import {
  clearedWritingDraft,
  findWritingDraft,
  withWritingDraft,
  writingDraftKey,
} from "./writing-drafts";

function fixture(): State {
  const state = empty();
  for (const word of ["suggest", "avoid"])
    state.entries[word] = {
      origin: "personal",
      archived: false,
      word: {
        id: word,
        word,
        meaning_vi: "nghĩa đang học",
        example_en: `I ${word} doing this.`,
        example_vi: "Ví dụ kiểm tra.",
      },
    };
  return state;
}
const draft = (overrides: Partial<WritingDraft> = {}): WritingDraft => ({
  wordId: "suggest",
  text: "I suggest leaving early.",
  updatedAt: 100,
  contentVersion: "original-sense",
  ...overrides,
});

describe("durable writing drafts", () => {
  it("preserves vocabulary/history while separating words and sentence threads", () => {
    const base = fixture();
    const initial = JSON.stringify(base);
    let state = withWritingDraft(base, draft());
    state = withWritingDraft(
      state,
      draft({ parentId: "review-1", text: "A revision.", updatedAt: 200 }),
    );
    state = withWritingDraft(
      state,
      draft({ wordId: "avoid", text: "Another word.", updatedAt: 300 }),
    );
    expect(Object.keys(state.writingDrafts!)).toHaveLength(3);
    expect(state.entries).toBe(base.entries);
    expect(state.history).toBe(base.history);
    expect(JSON.stringify(base)).toBe(initial);
    expect(state.writingDrafts![writingDraftKey("suggest")].text).toBe(
      "I suggest leaving early.",
    );
  });

  it("never replaces a newer draft with a late stale write", () => {
    const state = withWritingDraft(fixture(), draft({ updatedAt: 300 }));
    expect(
      withWritingDraft(state, draft({ text: "stale", updatedAt: 200 })),
    ).toBe(state);
  });

  it("clears only the exact submitted draft and keeps a timestamped tombstone", () => {
    const submitted = draft();
    let state = withWritingDraft(fixture(), submitted);
    state = withWritingDraft(
      state,
      draft({ wordId: "avoid", text: "Keep this.", updatedAt: 99 }),
    );
    const cleared = clearedWritingDraft(state, submitted, 100);
    expect(cleared.writingDrafts![writingDraftKey("suggest")]).toMatchObject({
      text: "",
      updatedAt: 101,
    });
    expect(cleared.writingDrafts![writingDraftKey("avoid")].text).toBe(
      "Keep this.",
    );
    expect(withWritingDraft(cleared, submitted)).toBe(cleared);
  });

  it("preserves another tab's newer text while an older answer is being saved", () => {
    const submitted = draft();
    const state = withWritingDraft(
      fixture(),
      draft({ updatedAt: 200, text: "A newer edit on the other tab." }),
    );
    expect(clearedWritingDraft(state, submitted, 1000)).toBe(state);
    const changedMeaning = withWritingDraft(
      fixture(),
      draft({ contentVersion: "different-sense" }),
    );
    expect(clearedWritingDraft(changedMeaning, submitted)).toBe(changedMeaning);
  });

  it("resumes the newest related revision without replacing an explicitly different thread", () => {
    let state = fixture();
    const attempt = (id: string, parentId?: string) => ({
      id,
      wordId: "suggest",
      time: 1,
      text: "Saved sentence.",
      parentId,
      source: "local" as const,
      status: "ungraded" as const,
      issues: [],
      summary: "Chưa thể chấm tự động.",
      assessment: {
        grammar: "uncertain" as const,
        usage: "uncertain" as const,
        naturalness: "uncertain" as const,
      },
      contentVersion: contentKey(state.entries.suggest.word, 5),
    });
    state.writing = [
      attempt("original"),
      attempt("revision", "original"),
      attempt("other"),
    ];
    state = withWritingDraft(
      state,
      draft({ parentId: "original", text: "Old revision.", updatedAt: 100 }),
    );
    state = withWritingDraft(
      state,
      draft({
        parentId: "revision",
        text: "Latest related draft.",
        updatedAt: 200,
      }),
    );
    state = withWritingDraft(
      state,
      draft({ parentId: "other", text: "Unrelated draft.", updatedAt: 300 }),
    );
    expect(findWritingDraft(state, "suggest", "original")?.text).toBe(
      "Latest related draft.",
    );
    expect(findWritingDraft(state, "suggest", "other")?.text).toBe(
      "Unrelated draft.",
    );
    expect(findWritingDraft(state, "suggest")?.text).toBe("Unrelated draft.");
  });

  it("keeps the newest cleared revision as a tombstone instead of reviving an older unfinished sentence", () => {
    let state = fixture();
    state = withWritingDraft(
      state,
      draft({ text: "An older unfinished sentence.", updatedAt: 100 }),
    );
    const submitted = draft({
      parentId: "saved-original",
      text: "A submitted revision.",
      updatedAt: 200,
    });
    state = withWritingDraft(state, submitted);
    state = clearedWritingDraft(state, submitted, 300);
    expect(findWritingDraft(state, "suggest")?.text).toBe("");
    expect(findWritingDraft(state, "suggest", "saved-original")?.text).toBe("");
  });
});
