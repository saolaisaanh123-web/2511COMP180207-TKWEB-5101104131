import {
  canPractice,
  collectFresh,
  contentKey,
  day,
  frequencyScore,
  type Entry,
  type Result,
  type State,
} from "./core";

import type { LearningMode } from "./practice-data";
export type { LearningMode } from "./practice-data";
export const selectionModes: {
  value: LearningMode;
  label: string;
  description: string;
}[] = [
  {
    value: "smart",
    label: "Thông minh",
    description: "Cân bằng tần suất, bằng chứng ghi nhớ và sự đa dạng.",
  },
  {
    value: "common",
    label: "Ưu tiên thông dụng",
    description: "Ưu tiên tần suất đã có trong dữ liệu, CEFR chỉ hỗ trợ.",
  },
  {
    value: "weak",
    label: "Củng cố từ yếu",
    description: "Chỉ chọn từ có bài trả lời sai hoặc cần gợi ý còn phù hợp.",
  },
  {
    value: "mixed",
    label: "Trộn từ",
    description:
      "Trộn có kiểm soát; thứ tự ổn định trong ngày khi dữ liệu không đổi.",
  },
];

export type WordRecommendation = {
  entry: Entry;
  reason: string;
  score: number;
};
type SkillMemory = {
  days: Set<string>;
  longGap: boolean;
  latest: Result;
};
type Summary = {
  count: number;
  latest: number;
  recent: Result[];
  independentDays: Set<string>;
  skillMemory: Map<number, SkillMemory>;
};
type Evidence = Summary & {
  weak: boolean;
  mistakes: number;
  stable: boolean;
};
type Candidate = WordRecommendation & {
  family: string;
  part: string;
  topic: string;
};
const DAY = 86400000;
const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const levelOf = (e: Entry) =>
  levels.indexOf((e.word.level || "").trim().toUpperCase());
const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// This is only a visual-form heuristic, never a claim of semantic similarity.
function wordFamily(text: string): string {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z -]/g, "");
  if (normalized.length < 5 || normalized.includes(" ")) return normalized;
  const root = normalized.replace(
    /(?:ations?|ments?|ingly|ing|edly|ed|es|s)$/,
    "",
  );
  return root.length >= 4 ? root : normalized;
}
function firstTag(text: string | undefined): string {
  return (text || "").split(/[,;|]/)[0].trim().toLowerCase();
}
function hash(text: string): number {
  let result = 2166136261;
  for (let i = 0; i < text.length; i++) {
    result ^= text.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0) / 4294967296;
}
function calendarAge(now: number, previous: number): number {
  if (!previous) return 30;
  const a = new Date(now);
  const b = new Date(previous);
  return Math.max(
    0,
    Math.round(
      (Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) -
        Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) /
        DAY,
    ),
  );
}

// One pass through history. Legacy/self-marked/obsolete answers remain in the
// backup but cannot justify either a weakness claim or a memory claim here.
function indexEvidence(
  state: State,
  entries: Entry[],
  now: number,
  skill?: number,
): Map<string, Evidence> {
  const words = new Map(entries.map((e) => [e.word.id, e.word]));
  const versions = new Map<string, string>();
  const summaries = new Map<string, Summary>();
  for (const r of state.history) {
    const word = words.get(r.wordId);
    if (
      !word ||
      (skill !== undefined && r.skill !== skill) ||
      !canPractice(word, r.skill) ||
      r.method !== "rule" ||
      !r.first ||
      r.evidenceVersion !== 2 ||
      !Number.isFinite(r.time) ||
      r.time > now ||
      ([2, 3].includes(r.skill) && r.audioPlayed !== true)
    )
      continue;
    const key = `${r.wordId}:${r.skill}`;
    let version = versions.get(key);
    if (!version) {
      version = contentKey(word, r.skill);
      versions.set(key, version);
    }
    if (r.contentVersion !== version) continue;
    const summary: Summary = summaries.get(r.wordId) || {
      count: 0,
      latest: 0,
      recent: [],
      independentDays: new Set<string>(),
      skillMemory: new Map<number, SkillMemory>(),
    };
    summary.count++;
    summary.latest = Math.max(summary.latest, r.time);
    // Fixed four-result window, including when imported history is unsorted.
    summary.recent.push(r);
    summary.recent.sort((a, b) => b.time - a.time || compareIds(a.id, b.id));
    summary.recent.length = Math.min(4, summary.recent.length);
    const memory: SkillMemory = summary.skillMemory.get(r.skill) || {
      days: new Set<string>(),
      longGap: false,
      latest: r,
    };
    if (
      r.time > memory.latest.time ||
      (r.time === memory.latest.time && compareIds(r.id, memory.latest.id) < 0)
    )
      memory.latest = r;
    if (
      r.correct &&
      !r.hint &&
      r.independent === true &&
      (r.exposureGap === undefined || r.exposureGap >= DAY)
    ) {
      summary.independentDays.add(day(r.time));
      memory.days.add(day(r.time));
      // A long interval in this skill does not prove a long interval without
      // seeing the word elsewhere. Older backups lacking this field stay valid
      // history but cannot establish seven-day retention.
      if ((r.exposureGap ?? 0) >= 7 * DAY) memory.longGap = true;
    }
    summary.skillMemory.set(r.skill, memory);
    summaries.set(r.wordId, summary);
  }
  const evidence = new Map<string, Evidence>();
  for (const [id, summary] of summaries) {
    const mistakes = summary.recent.filter((r) => !r.correct || r.hint).length;
    const latest = summary.recent[0];
    const weak =
      !latest.correct ||
      latest.hint ||
      mistakes >= 2 ||
      (mistakes > 0 && summary.independentDays.size < 3);
    evidence.set(id, {
      ...summary,
      mistakes,
      weak,
      stable:
        !weak &&
        [...summary.skillMemory.values()].some(
          (memory) =>
            memory.days.size >= 3 &&
            memory.longGap &&
            memory.latest.correct &&
            !memory.latest.hint,
        ),
    });
  }
  return evidence;
}

function supportedLevel(
  entries: Entry[],
  evidence: Map<string, Evidence>,
): number {
  const byLevel = new Map<number, Set<string>>();
  for (const e of entries) {
    const level = levelOf(e);
    const proof = evidence.get(e.word.id);
    if (
      level < 0 ||
      !proof ||
      ![...proof.skillMemory.values()].some(
        (memory) =>
          memory.days.size >= 2 && memory.latest.correct && !memory.latest.hint,
      ) ||
      proof.weak
    )
      continue;
    const ids = byLevel.get(level) || new Set<string>();
    ids.add(e.word.id);
    byLevel.set(level, ids);
  }
  // B1 is a selection prior for this personal app, never a proficiency result.
  // Raise it only after repeated independent recall of several distinct words.
  let target = 2;
  for (const [level, ids] of byLevel)
    if (ids.size >= 3) target = Math.max(target, Math.min(4, level));
  return target;
}
function memoryReason(proof: Evidence | undefined, exposed: boolean): string {
  if (!proof)
    return exposed
      ? "Đã tiếp xúc; chưa có lượt trả lời được chấm phù hợp."
      : "Chưa có lượt trả lời được chấm phù hợp.";
  if (proof.weak)
    return `${proof.mistakes}/${proof.recent.length} lượt gần nhất sai hoặc cần gợi ý.`;
  if (proof.stable)
    return "Ít nhất một kỹ năng đã trả lời độc lập trên ít nhất 3 ngày, có khoảng cách không tiếp xúc từ 7 ngày; giảm ưu tiên luyện lại.";
  if (proof.independentDays.size)
    return `Có bằng chứng nhớ độc lập trên ${proof.independentDays.size} ngày; chưa đủ kết luận nhớ vững.`;
  return "Đã trả lời; chưa có bằng chứng nhớ độc lập sau một khoảng thời gian.";
}
function diversityPenalty(candidate: Candidate, recent: Candidate[]): number {
  let penalty = 0;
  for (let i = 0; i < recent.length; i++) {
    const previous = recent[recent.length - 1 - i];
    const weight = i === 0 ? 1 : 0.4;
    if (candidate.family && candidate.family === previous.family)
      penalty += 22 * weight;
    if (candidate.part && candidate.part === previous.part)
      penalty += 3 * weight;
    if (candidate.topic && candidate.topic === previous.topic)
      penalty += 4 * weight;
  }
  return penalty;
}

/**
 * Learning recommendations, separate from the library's CEFR order and SRS.
 * No mutation, random calls, queue changes, schedule changes or enrolment.
 * Complexity: one history pass, a word sort, then a bounded 12-item lookahead.
 */
export function recommendWords(
  state: State,
  entries: Entry[],
  options: {
    mode?: LearningMode;
    intent?: "new" | "practice";
    limit?: number;
    now?: number;
    skill?: number;
  } = {},
): WordRecommendation[] {
  const mode = options.mode || "smart";
  const intent = options.intent || "practice";
  const now = options.now ?? Date.now();
  const skill = options.skill;
  if (
    skill !== undefined &&
    (!Number.isInteger(skill) || skill < 0 || skill > 5)
  )
    return [];
  const eligible = (
    intent === "new" ? collectFresh(state, entries) : entries
  ).filter((e) => !e.archived && !e.known && canPractice(e.word, skill ?? 0));
  const evidence = indexEvidence(state, entries, now, skill);
  // Ability inference uses all words, including words already in the schedule.
  const target = supportedLevel(entries, evidence);
  const seed = day(now);
  const seenIds = new Set<string>();
  const ranked: Candidate[] = [];
  for (const entry of eligible) {
    const id = entry.word.id;
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    const proof = evidence.get(id);
    if (mode === "weak" && !proof?.weak) continue;
    const frequency = frequencyScore(entry.word);
    const level = levelOf(entry);
    const affinity =
      level < 0 ? 0 : Math.max(-4, 6 - 2 * Math.abs(level - target));
    const age = calendarAge(
      now,
      Math.max(proof?.latest || 0, state.exposures?.[id] || 0),
    );
    let score: number;
    if (mode === "common") {
      score = (frequency ?? 2.5) * 20 + affinity * 0.15;
    } else if (mode === "weak") {
      score =
        (proof!.recent[0].correct && !proof!.recent[0].hint ? 0 : 26) +
        proof!.mistakes * 8 +
        (proof!.mistakes / proof!.recent.length) * 16 +
        Math.min(10, age) +
        (frequency ?? 2.5) * 2;
    } else if (mode === "mixed") {
      score =
        hash(`${seed}:${id}`) * 30 +
        (frequency ?? 2.5) * 2 +
        (!proof ? 4 : 0) +
        (proof?.weak ? 5 : 0) -
        (proof?.stable ? 8 : 0);
    } else {
      score =
        (frequency ?? 2.5) * 12 +
        affinity +
        (!proof ? 10 : 0) +
        (proof?.weak ? 26 + proof.mistakes * 2 : 0) -
        (proof?.stable ? 24 : 0) +
        (intent === "practice" ? Math.min(10, age) - (age < 1 ? 12 : 0) : 0);
    }
    const frequencyReason =
      frequency === undefined
        ? "Chưa có số liệu tần suất."
        : `Tần suất Zipf ${frequency.toFixed(2)}${entry.word.level ? `; CEFR ${entry.word.level}` : ""}.`;
    ranked.push({
      entry,
      score,
      reason: `${frequencyReason} ${memoryReason(proof, !!state.exposures?.[id])}${mode === "mixed" ? " Thứ tự trộn cố định trong ngày." : ""}`,
      family: wordFamily(entry.word.word),
      part: firstTag(entry.word.part_of_speech),
      topic: firstTag(entry.word.topics),
    });
  }
  ranked.sort(
    (a, b) => b.score - a.score || compareIds(a.entry.word.id, b.entry.word.id),
  );
  const requested = options.limit ?? ranked.length;
  const limit = Math.min(
    ranked.length,
    Math.max(
      0,
      requested === Infinity ? ranked.length : Math.floor(requested) || 0,
    ),
  );
  const result: Candidate[] = [];
  const window = ranked.slice(0, 12);
  let nextIndex = window.length;
  while (window.length && result.length < limit) {
    const recent = result.slice(-3);
    let best = 0;
    let adjustedScore = -Infinity;
    for (let i = 0; i < window.length; i++) {
      const adjusted = window[i].score - diversityPenalty(window[i], recent);
      if (adjusted > adjustedScore) {
        best = i;
        adjustedScore = adjusted;
      }
    }
    const [selected] = window.splice(best, 1);
    result.push({ ...selected, score: Math.round(adjustedScore * 100) / 100 });
    if (nextIndex < ranked.length) window.push(ranked[nextIndex++]);
  }
  return result.map(({ entry, reason, score }) => ({ entry, reason, score }));
}

export const rankNewWords = (
  state: State,
  entries: Entry[],
  mode: LearningMode = "smart",
  now?: number,
): WordRecommendation[] =>
  recommendWords(state, entries, { mode, intent: "new", now });
