import type { Result, Session } from "./core";

const taskKey = (task: Session["queue"][number]) =>
  JSON.stringify([task.id, task.skill, task.review]);
const resultKey = (result: Result) =>
  JSON.stringify([result.wordId, result.skill, result.review]);

/** Derived presentation only: never reorder the queue or rewrite evidence. */
export function sessionProgress(
  session: Session,
  history: Result[],
  finished = false,
) {
  const originals = new Map<string, number>();
  const retries: number[] = [];
  session.queue.forEach((task, index) => {
    const key = taskKey(task);
    if (originals.has(key)) retries.push(index);
    else originals.set(key, index);
  });
  const ids = new Set<string>();
  const results = history
    .filter((r) => {
      if (
        r.session !== session.id ||
        !originals.has(resultKey(r)) ||
        ids.has(r.id)
      )
        return false;
      ids.add(r.id);
      return true;
    })
    .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  const answered = new Set(results.map(resultKey));
  let remaining = 0;
  let skipped = 0;
  for (const [key, index] of originals) {
    if (answered.has(key)) continue;
    if (finished || index < session.index) skipped++;
    else remaining++;
  }
  return {
    words: new Set(session.queue.map((task) => task.id)).size,
    originalTasks: originals.size,
    answered: answered.size,
    remaining,
    skipped,
    retries: retries.length,
    pendingRetries: finished
      ? 0
      : retries.filter(
          (index) =>
            index >= session.index && !ids.has(`${session.id}:${index}`),
        ).length,
    isRetry: retries.includes(session.index),
    results,
  };
}

export function summarizeSession(session: Session, history: Result[]) {
  const progress = sessionProgress(session, history, true);
  const groups = new Map<string, Result[]>();
  for (const result of progress.results) {
    const key = resultKey(result);
    groups.set(key, [...(groups.get(key) || []), result]);
  }
  const first = [...groups.values()].map((group) => group[0]);
  const objective = first.filter(
    (r) => r.first && r.method === "rule" && !r.hint,
  );
  const failed = [...groups.values()].filter(
    (group) => group[0].method === "rule" && !group[0].correct,
  );
  const repaired = failed.filter((group) => {
    const latest = group.at(-1)!;
    return (
      group.length > 1 &&
      latest.method === "rule" &&
      latest.correct &&
      !latest.hint
    );
  }).length;
  return {
    ...progress,
    initialTests: objective.length,
    initialCorrect: objective.filter((r) => r.correct).length,
    supported: first.filter((r) => r.method === "rule" && r.hint).length,
    selfRated: first.filter((r) => r.method === "self").length,
    ungraded: first.filter((r) => r.method === "ungraded").length,
    failed: failed.length,
    repaired,
    unresolved: failed.length - repaired,
    retryAnswers: progress.results.length - first.length,
  };
}

export function sessionSummaryLines(session: Session, history: Result[]) {
  const summary = summarizeSession(session, history);
  const lines = [
    `Bạn đã thực hiện ${summary.results.length} lượt trên ${summary.words} từ.`,
    `Lần đầu: ${summary.initialCorrect}/${summary.initialTests} lượt kiểm tra đúng không gợi ý; ${summary.supported} lượt có hỗ trợ; ${summary.selfRated} lượt tự đánh giá; ${summary.ungraded} lượt chưa chấm; ${summary.skipped} lượt bỏ qua.`,
  ];
  if (summary.failed)
    lines.push(
      `Sửa sai: ${summary.repaired}/${summary.failed} bài trả lời sai ban đầu đã được trả lời lại đúng không gợi ý; ${summary.unresolved} bài còn cần kiểm tra lại.`,
    );
  if (summary.retryAnswers)
    lines.push(
      `${summary.retryAnswers} lượt thử lại được ghi riêng. Trả lời đúng sau khi xem đáp án trong phiên chưa phải bằng chứng nhớ lâu.`,
    );
  lines.push(
    "Tự đánh giá và câu chưa chấm không được tính là kiểm tra đúng. Khả năng nhớ lâu cần kết quả độc lập sau một khoảng thời gian.",
  );
  return lines;
}
