export const skills = [
  "Hiểu nghĩa",
  "Nhớ để viết",
  "Nghe nhận biết",
  "Nghe và chính tả",
  "Dùng trong ngữ cảnh",
  "Tự sử dụng",
];
export type Word = {
  id: string;
  word: string;
  meaning_vi: string;
  example_en: string;
  example_vi: string;
  [key: string]: string;
};
export type Entry = {
  word: Word;
  origin: string;
  archived: boolean;
  known?: boolean;
  goal?: string;
  notes?: string;
};
export type Result = {
  id: string;
  wordId: string;
  time: number;
  skill: number;
  answer: string;
  correct: boolean;
  hint: boolean;
  method: "self" | "rule" | "ungraded";
  elapsed: number;
  session: string;
  review: string;
  gap: number;
  first: boolean;
};
export type Schedule = { due: number; last: number; step: number };
export type Session = {
  id: string;
  queue: { id: string; skill: number; review: string }[];
  index: number;
  started: number;
  scheduled: boolean;
  count: number;
};
export type State = {
  version: 1;
  entries: Record<string, Entry>;
  history: Result[];
  schedules: Record<string, Schedule>;
  daily: number;
  voice: string;
  rate: number;
  session?: Session;
};
export const empty = (): State => ({
  version: 1,
  entries: {},
  history: [],
  schedules: {},
  daily: 5,
  voice: "en-GB",
  rate: 0.85,
});
export const fields = [
  "id",
  "word",
  "part_of_speech",
  "meaning_vi",
  "definition_en",
  "ipa",
  "level",
  "topics",
  "collections",
  "collocation",
  "example_en",
  "example_vi",
  "audio_word",
  "audio_example",
  "accepted_answers",
  "source",
  "note",
];
export function parse(text: string): Word[] {
  const blocks = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const words: Word[] = [];
  const ids = new Set<string>();
  let current: Record<string, string> = {};
  let start = 1;
  function finish() {
    if (!Object.keys(current).length) return;
    for (const key of ["id", "word", "meaning_vi", "example_en", "example_vi"])
      if (!current[key]?.trim())
        throw Error(
          `Mục ${current.id || words.length + 1}, dòng ${start}: thiếu ${key}`,
        );
    if (ids.has(current.id))
      throw Error(`Dòng ${start}: ID trùng "${current.id}"`);
    if (["__proto__", "constructor", "prototype"].includes(current.id))
      throw Error(`Dòng ${start}: ID không được hỗ trợ`);
    ids.add(current.id);
    words.push(current as Word);
    current = {};
  }
  blocks.forEach((line, i) => {
    if (line.trim() === "---") {
      finish();
      start = i + 2;
      return;
    }
    if (!line.trim()) return;
    const match = line.match(/^([a-z_]+):\s?(.*)$/);
    if (!match) throw Error(`Dòng ${i + 1}: cần định dạng trường: nội dung`);
    if (!fields.includes(match[1]))
      throw Error(`Dòng ${i + 1}: trường không hỗ trợ ${match[1]}`);
    if (match[1] in current)
      throw Error(`Dòng ${i + 1}: trường ${match[1]} bị lặp`);
    current[match[1]] = match[2];
  });
  finish();
  if (!words.length) throw Error("File không có mục từ.");
  return words;
}
export const serialize = (words: Word[]) =>
  words
    .map((w) =>
      fields
        .map((f) => `${f}: ${(w[f] || "").replace(/[\r\n]+/g, " ")}`)
        .join("\n"),
    )
    .join("\n---\n") + "\n";
export function diff(state: State, words: Word[], origin: string) {
  const incoming = new Set(words.map((w) => w.id));
  return {
    added: words.filter((w) => !state.entries[w.id]).length,
    changed: words.filter(
      (w) =>
        state.entries[w.id] &&
        JSON.stringify(state.entries[w.id].word) !== JSON.stringify(w),
    ).length,
    archived: Object.values(state.entries).filter(
      (e) => e.origin === origin && !e.archived && !incoming.has(e.word.id),
    ).length,
  };
}
export function merge(state: State, words: Word[], origin: string): State {
  const next = structuredClone(state);
  const ids = new Set(words.map((w) => w.id));
  Object.values(next.entries).forEach((e) => {
    if (e.origin === origin && !ids.has(e.word.id)) e.archived = true;
  });
  words.forEach((word) => {
    const old = next.entries[word.id];
    if (old && old.origin !== origin && origin === "default") return;
    next.entries[word.id] = { ...old, word, origin, archived: false };
  });
  return next;
}
export const normalize = (s: string) =>
  s.trim().replace(/\s+/g, " ").toLocaleLowerCase();
export const grade = (answer: string, w: Word) =>
  [w.word, ...(w.accepted_answers || "").split("|")]
    .filter(Boolean)
    .some((a) => normalize(a) === normalize(answer));
export const day = (n: number) => new Date(n).toLocaleDateString("sv-SE");
export function strength(state: State, id: string, skill: number) {
  const h = state.history.filter((r) => r.wordId === id && r.skill === skill);
  const clean = h.filter(
    (r) => r.correct && !r.hint && r.method === "rule" && r.first,
  );
  if (!h.length) return "Chưa đủ dữ liệu";
  if (h.slice(-2).some((r) => !r.correct && r.method !== "ungraded"))
    return "Cần củng cố";
  if (
    new Set(clean.map((r) => day(r.time))).size >= 3 &&
    clean.some((r) => r.gap >= 7 * 86400000)
  )
    return "Nhớ khá vững";
  return clean.length ? "Chưa ổn định" : "Đang làm quen";
}
export function record(state: State, r: Result, scheduled: boolean) {
  if (state.history.some((x) => x.id === r.id)) return state;
  const next = structuredClone(state);
  next.history.push(r);
  const key = `${r.wordId}:${r.skill}`;
  if (
    scheduled &&
    r.method !== "ungraded" &&
    !next.history.slice(0, -1).some((x) => x.review === r.review)
  ) {
    const old = next.schedules[key];
    const step = r.correct && !r.hint ? Math.min((old?.step ?? -1) + 1, 4) : 0;
    const due = new Date(r.time);
    due.setDate(due.getDate() + (r.correct ? [1, 3, 7, 14, 30][step] : 1));
    next.schedules[key] = { last: r.time, due: due.getTime(), step };
  }
  return next;
}
let db: IDBDatabase;
export async function read(): Promise<State> {
  db = await new Promise((resolve, reject) => {
    const req = indexedDB.open("lexi-learning", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("state");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return new Promise((resolve, reject) => {
    const req = db.transaction("state").objectStore("state").get("main");
    req.onsuccess = () => resolve(req.result || empty());
    req.onerror = () => reject(req.error);
  });
}
export async function save(state: State) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").put(state, "main");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export function validateBackup(x: unknown): State {
  const s = x as State;
  if (
    !s ||
    s.version !== 1 ||
    !s.entries ||
    typeof s.entries !== "object" ||
    Array.isArray(s.entries) ||
    !Array.isArray(s.history) ||
    !s.schedules ||
    typeof s.schedules !== "object" ||
    !Number.isInteger(s.daily) ||
    s.daily < 1 ||
    s.daily > 30 ||
    typeof s.voice !== "string" ||
    !Number.isFinite(s.rate) ||
    s.rate < 0.1 ||
    s.rate > 2
  )
    throw Error("Bản sao lưu không hợp lệ.");
  for (const [id, e] of Object.entries(s.entries)) {
    if (
      !e?.word ||
      e.word.id !== id ||
      typeof e.origin !== "string" ||
      typeof e.archived !== "boolean" ||
      (e.notes !== undefined && typeof e.notes !== "string") ||
      Object.values(e.word).some((v) => typeof v !== "string")
    )
      throw Error("Mục từ sao lưu không hợp lệ.");
    parse(serialize([e.word]));
  }
  const ids = new Set<string>();
  for (const r of s.history) {
    if (
      !r ||
      typeof r.id !== "string" ||
      ids.has(r.id) ||
      !s.entries[r.wordId] ||
      !Number.isFinite(r.time) ||
      !Number.isInteger(r.skill) ||
      r.skill < 0 ||
      r.skill > 5 ||
      !["self", "rule", "ungraded"].includes(r.method) ||
      typeof r.answer !== "string" ||
      typeof r.correct !== "boolean" ||
      typeof r.hint !== "boolean" ||
      typeof r.first !== "boolean" ||
      typeof r.session !== "string" ||
      typeof r.review !== "string" ||
      !Number.isFinite(r.elapsed) ||
      !Number.isFinite(r.gap)
    )
      throw Error("Lịch sử sao lưu không hợp lệ.");
    ids.add(r.id);
  }
  for (const [key, v] of Object.entries(s.schedules)) {
    const cut = key.lastIndexOf(":");
    if (
      !s.entries[key.slice(0, cut)] ||
      !/^[0-5]$/.test(key.slice(cut + 1)) ||
      !Number.isFinite(v.due) ||
      !Number.isFinite(v.last) ||
      !Number.isInteger(v.step) ||
      v.step < 0 ||
      v.step > 4
    )
      throw Error("Lịch ôn không hợp lệ.");
  }
  if (s.session) {
    const v = s.session;
    if (
      typeof v.id !== "string" ||
      !Array.isArray(v.queue) ||
      !Number.isInteger(v.index) ||
      v.index < 0 ||
      v.index >= v.queue.length ||
      typeof v.scheduled !== "boolean" ||
      !Number.isFinite(v.started) ||
      v.queue.some(
        (t) =>
          !s.entries[t.id] ||
          !Number.isInteger(t.skill) ||
          t.skill < 0 ||
          t.skill > 5 ||
          typeof t.review !== "string",
      )
    )
      throw Error("Phiên học sao lưu không hợp lệ.");
  }
  return s;
}
