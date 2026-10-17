import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Download,
  Headphones,
  Leaf,
  MessageCircle,
  Layers,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import {
  type State,
  type Word,
  type Session,
  empty,
  read,
  save,
  parse,
  serialize,
  merge,
  diff,
  skills,
  strength,
  grade,
  record,
  day,
  validateBackup,
  canPractice,
  cloze,
  isSlang,
} from "./core";
import "./style.css";
import ErrorBoundary from "./ErrorBoundary";
import WordDetail from "./DictionaryEntry";
import CollectionBrowser from "./CollectionBrowser";
const uid = () => crypto.randomUUID();
function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(
    new Blob([text], { type: type + ";charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function App() {
  const [state, setState] = useState<State>(empty),
    [loaded, setLoaded] = useState(false),
    [page, setPage] = useState("today"),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [topic, setTopic] = useState(""),
    [collection, setCollection] = useState(""),
    [level, setLevel] = useState(""),
    [status, setStatus] = useState(""),
    [libraryPage, setLibraryPage] = useState(1),
    [detail, setDetail] = useState<string>(),
    [editor, setEditor] = useState<string>(),
    [pending, setPending] = useState<{ words: Word[]; origin: string }>(),
    [availableWords, setAvailableWords] = useState<Word[]>(),
    [backup, setBackup] = useState<State>(),
    [replace, setReplace] = useState(false),
    [settings, setSettings] = useState(false),
    [range, setRange] = useState(30),
    [focus, setFocus] = useState("studied"),
    [evidenceLimit, setEvidenceLimit] = useState(100),
    [practice, setPractice] = useState(1),
    [answer, setAnswer] = useState(""),
    [revealed, setRevealed] = useState(false),
    [hint, setHint] = useState(false),
    [feedback, setFeedback] = useState<string>(),
    [busy, setBusy] = useState(false),
    [summary, setSummary] = useState<string>();
  const hasModal =
    !!detail || editor !== undefined || !!pending || !!backup || settings;
  useEffect(() => {
    if (!hasModal) return;
    const previous = document.activeElement as HTMLElement;
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(".modal button")?.focus(),
    );
    const handle = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll<HTMLElement>(".modal");
      const dialog = dialogs[dialogs.length - 1];
      if (!dialog) return;
      if (e.key === "Escape") {
        setDetail(undefined);
        setEditor(undefined);
        setPending(undefined);
        setBackup(undefined);
        setSettings(false);
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            "button,input,textarea,select,[href]",
          ),
        ).filter(
          (n) => !(n as HTMLButtonElement).disabled && n.offsetParent !== null,
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [hasModal]);
  const lock = useRef(false),
    started = useRef(Date.now()),
    current = useRef(state);
  current.current = state;
  const commit = async (next: State) => {
    await save(next);
    current.current = next;
    setState(next);
  };
  useEffect(() => {
    (async () => {
      try {
        let s = await read();
        const isEmpty = !Object.keys(s.entries).length;
        if (!isEmpty) {
          setState(s);
          setLoaded(true);
        }
        try {
          const res = await fetch(
            import.meta.env.BASE_URL + "data/vocabulary.txt",
            { cache: "no-store" },
          );
          if (!res.ok) throw Error("Không tải được vocabulary.txt");
          const incoming = parse(await res.text());
          if (isEmpty) {
            s = merge(s, incoming, "default");
            await save(s);
          } else if (
            Object.values(diff(s, incoming, "default")).some((n) => n > 0)
          )
            setAvailableWords(incoming);
        } catch (error) {
          if (isEmpty) throw error;
          setNotice(
            "Đang dùng kho đã lưu; chưa kiểm tra được bản mới: " +
              String(error),
          );
        }
        if (isEmpty) {
          setState(s);
          setLoaded(true);
        }
      } catch (e) {
        setNotice("Không thể mở dữ liệu: " + String(e));
      }
    })();
  }, []);
  useEffect(() => {
    setAnswer("");
    setRevealed(false);
    setHint(false);
    const session = current.current.session;
    const saved = session
      ? current.current.history.find(
          (r) => r.id === session.id + ":" + session.index,
        )
      : undefined;
    setFeedback(
      saved ? "Lượt này đã được lưu. Tiếp tục để tránh tính trùng." : undefined,
    );
    setRevealed(!!saved);
    started.current = Date.now();
    lock.current = !!saved;
  }, [state.session?.index, state.session?.id]);
  const active = Object.values(state.entries).filter((e) => !e.archived),
    now = Date.now();
  const due = Object.entries(state.schedules).filter(
    ([k, s]) =>
      s.due <= now &&
      state.entries[k.slice(0, k.lastIndexOf(":"))] &&
      !state.entries[k.slice(0, k.lastIndexOf(":"))].archived &&
      canPractice(
        state.entries[k.slice(0, k.lastIndexOf(":"))].word,
        Number(k.slice(k.lastIndexOf(":") + 1)),
      ),
  );
  const dueWords = new Set(due.map(([k]) => k.slice(0, k.lastIndexOf(":"))))
    .size;
  const overdue = new Set(
    due
      .filter(([, s]) => day(s.due) < day(now))
      .map(([k]) => k.slice(0, k.lastIndexOf(":"))),
  ).size;
  const studiedIds = new Set(state.history.map((h) => h.wordId));
  const fresh = active.filter(
    (e) =>
      !e.known &&
      !studiedIds.has(e.word.id) &&
      canPractice(e.word, 0) &&
      !isSlang(e.word),
  );
  const studiedToday = new Set(
    state.history.filter((h) => day(h.time) === day(now)).map((h) => h.wordId),
  );
  const newToday = new Set(
    state.history
      .filter(
        (h) =>
          day(h.time) === day(now) &&
          !state.history.some(
            (p) => p.wordId === h.wordId && day(p.time) < day(now),
          ),
      )
      .map((h) => h.wordId),
  ).size;
  const planned = Math.min(
    fresh.length,
    Math.max(0, state.daily - newToday),
    due.length > 20 ? 2 : state.daily,
  );
  const filtered = active.filter(
    (e) =>
      (e.word.word + " " + e.word.meaning_vi)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!topic || (e.word.topics || "").split(",").includes(topic)) &&
      (!collection ||
        (e.word.collections || "").split(",").includes(collection)) &&
      (!level || e.word.level === level) &&
      (!status ||
        (status === "known"
          ? e.known
          : status === "new"
            ? !studiedIds.has(e.word.id)
            : studiedIds.has(e.word.id))),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 60));
  const currentLibraryPage = Math.min(libraryPage, pageCount);
  const visibleWords = filtered.slice(
    (currentLibraryPage - 1) * 60,
    currentLibraryPage * 60,
  );
  useEffect(
    () => setLibraryPage(1),
    [search, topic, collection, level, status],
  );
  const selectOptions = (key: string) => [
    ...new Set(
      active.flatMap((e) => (e.word[key] || "").split(",")).filter(Boolean),
    ),
  ];
  const notifyError = (e: unknown) => {
    setNotice(String(e));
    setBusy(false);
    lock.current = false;
  };
  async function source() {
    try {
      const r = await fetch(import.meta.env.BASE_URL + "data/vocabulary.txt", {
        cache: "no-store",
      });
      if (!r.ok) throw Error("Không tải được kho mặc định");
      setPending({ words: parse(await r.text()), origin: "default" });
    } catch (e) {
      notifyError(e);
    }
  }
  async function file(
    event: React.ChangeEvent<HTMLInputElement>,
    json = false,
  ) {
    const f = event.target.files?.[0];
    event.target.value = "";
    if (!f) return;
    try {
      const text = await f.text();
      if (json) setBackup(validateBackup(JSON.parse(text)));
      else setPending({ words: parse(text), origin: "personal" });
    } catch (e) {
      notifyError(e);
    }
  }
  async function start(
    scheduled = true,
    only?: string,
    skillOverride?: number,
  ) {
    try {
      let queue: Session["queue"] = [];
      if (scheduled) {
        queue = due
          .sort((a, b) => a[1].due - b[1].due)
          .map(([k]) => ({
            id: k.slice(0, k.lastIndexOf(":")),
            skill: Number(k.slice(k.lastIndexOf(":") + 1)),
            review: uid(),
          }));
        fresh.slice(0, planned).forEach((e) =>
          (e.goal === "recognition" ? [0, 2] : [0, 1, 2, 3, 4, 5]).forEach(
            (skill) => {
              if (canPractice(e.word, skill))
                queue.push({ id: e.word.id, skill, review: uid() });
            },
          ),
        );
      } else {
        queue = (only ? [state.entries[only]] : filtered)
          .filter((e) => !!e && canPractice(e.word, skillOverride ?? practice))
          .slice(0, 20)
          .map((e) => ({
            id: e.word.id,
            skill: skillOverride ?? practice,
            review: uid(),
          }));
      }
      if (!queue.length) {
        setNotice(
          "Chưa có mục phù hợp. Bạn có thể luyện tự do hoặc thêm từ mới.",
        );
        return;
      }
      await commit({
        ...state,
        session: {
          id: uid(),
          queue,
          index: 0,
          started: Date.now(),
          scheduled,
          count: queue.length,
        },
      });
      setSummary(undefined);
      setPage("learn");
    } catch (e) {
      notifyError(e);
    }
  }
  const task = state.session?.queue[state.session.index],
    entry = task ? state.entries[task.id] : undefined,
    w = entry?.word;
  function speak(text: string, url?: string) {
    setNotice("");
    const synth = () => {
      if (!("speechSynthesis" in window)) {
        setNotice(
          "Thiết bị không hỗ trợ giọng tổng hợp. Bạn có thể tiếp tục dạng bài đọc/viết.",
        );
        return;
      }
      const voices = speechSynthesis
        .getVoices()
        .filter((v) => v.lang.startsWith("en"));
      if (!voices.length) {
        setNotice(
          "Chưa có giọng tiếng Anh trên thiết bị. Hãy cài giọng đọc hoặc chọn bài đọc/viết; bài nghe chưa được đánh giá.",
        );
        return;
      }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voices.find((v) => v.lang === state.voice) || voices[0];
      u.lang = u.voice.lang;
      u.rate = state.rate;
      u.onerror = () =>
        setNotice(
          "Không phát được giọng đọc. Kết quả nghe chưa được xác nhận.",
        );
      speechSynthesis.speak(u);
    };
    if (url) {
      try {
        const u = new URL(url, location.href);
        if (!["http:", "https:"].includes(u.protocol)) throw Error();
        const a = new Audio(u.href);
        a.play().catch(() => {
          setNotice("Âm thanh URL lỗi; chuyển sang giọng tổng hợp nếu có.");
          synth();
        });
      } catch {
        synth();
      }
    } else synth();
  }
  async function submit(result?: boolean, hintOverride?: boolean) {
    if (!task || !w || !state.session || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const self = [0, 2].includes(task.skill),
        ungraded = task.skill === 5;
      const correct = ungraded ? false : self ? !!result : grade(answer, w);
      const prior = state.history.filter(
        (h) => h.wordId === w.id && h.skill === task.skill,
      );
      const r = {
        id: state.session.id + ":" + state.session.index,
        wordId: w.id,
        time: Date.now(),
        skill: task.skill,
        answer,
        correct,
        hint: hintOverride ?? (hint || (!self && revealed)),
        method: ungraded
          ? ("ungraded" as const)
          : self
            ? ("self" as const)
            : ("rule" as const),
        elapsed: Date.now() - started.current,
        session: state.session.id,
        review: task.review,
        gap: prior.length ? Date.now() - prior[prior.length - 1].time : 0,
        first: !state.history.some(
          (h) =>
            h.session === state.session?.id &&
            h.wordId === w.id &&
            h.skill === task.skill,
        ),
      };
      let next = record(state, r, state.session.scheduled);
      if (ungraded)
        next.entries[w.id] = { ...next.entries[w.id], notes: answer };
      if (
        !correct &&
        !ungraded &&
        !state.history.some((h) => h.review === task.review)
      )
        next.session!.queue.splice(
          Math.min(next.session!.index + 4, next.session!.queue.length),
          0,
          { ...task },
        );
      await commit(next);
      setRevealed(true);
      setFeedback(
        ungraded
          ? "Đã lưu câu. Chưa được chấm ngữ pháp hoặc mức độ sử dụng."
          : correct
            ? self
              ? "Đã lưu tự đánh giá."
              : "Chính xác! " +
                (hint
                  ? "Có hỗ trợ — chưa tính là tự nhớ."
                  : "Đã ghi nhận kết quả kiểm tra.")
            : "Cần củng cố. Mục này sẽ xuất hiện lại sau vài câu.",
      );
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  }
  async function next() {
    if (!state.session) return;
    const s = state.session;
    if (s.index + 1 >= s.queue.length) {
      const h = state.history.filter((r) => r.session === s.id);
      const upcoming = Object.values(state.schedules)
        .filter((v) => v.due > Date.now())
        .sort((a, b) => a.due - b.due)[0];
      setSummary(
        `Bạn đã thực hiện ${h.length} lượt. ${h.filter((r) => r.method === "rule" && r.correct && !r.hint).length} lượt kiểm tra đúng không gợi ý; ${h.filter((r) => r.method === "self").length} lượt tự đánh giá; ${h.filter((r) => !r.correct && r.method !== "ungraded").length} lượt cần củng cố. ${s.scheduled ? (upcoming ? "Lần ôn kế tiếp: " + new Date(upcoming.due).toLocaleString("vi-VN") : "Chưa có lịch ôn mới.") : "Luyện tự do không thay đổi lịch ôn."} Xem chi tiết từng kỹ năng trong Tiến độ.`,
      );
      await commit({ ...state, session: undefined });
      setPage("today");
    } else await commit({ ...state, session: { ...s, index: s.index + 1 } });
  }
  const history = state.history.filter(
    (h) => range === 0 || h.time >= now - range * 86400000,
  );
  const tested = history.filter(
      (h) => h.first && h.method === "rule" && !h.hint,
    ),
    delayed = tested.filter((h) => h.gap >= 86400000);
  const ratio = (h: typeof history) =>
    h.length
      ? `${Math.round((h.filter((r) => r.correct).length / h.length) * 100)}% · ${h.length} lượt`
      : "Chưa đủ dữ liệu";
  const focusOptions = [
    ["studied", "Những mục đã học"],
    ["stable", "Nhớ vững qua nhiều ngày"],
    ["writing", "Tự đánh giá nhìn hiểu, chưa kiểm tra viết đúng"],
    ["listening", "Tự đánh giá đọc hiểu, nghe chưa có bằng chứng"],
    ["forgotten", "Thường quên lại (ít nhất 2 lượt)"],
    ["insufficient", "Chưa đủ dữ liệu để kết luận"],
  ];
  const periodHistory = new Map<string, typeof history>();
  for (const r of history) {
    const list = periodHistory.get(r.wordId) || [];
    list.push(r);
    periodHistory.set(r.wordId, list);
  }
  useEffect(() => setEvidenceLimit(100), [focus, range]);
  const evidenceList =
    page === "progress"
      ? active.filter((e) => {
          const h = periodHistory.get(e.word.id) || [];
          const understands = h.some(
            (r) => r.skill === 0 && r.correct && !r.hint,
          );
          if (focus === "stable")
            return skills.some(
              (_, i) => strength(state, e.word.id, i) === "Nhớ khá vững",
            );
          if (focus === "writing")
            return (
              understands &&
              !h.some(
                (r) =>
                  r.skill === 1 && r.correct && !r.hint && r.method === "rule",
              )
            );
          if (focus === "listening")
            return (
              understands &&
              !h.some((r) => [2, 3].includes(r.skill) && r.correct && !r.hint)
            );
          if (focus === "forgotten")
            return (
              h.filter((r) => !r.correct && r.method !== "ungraded").length >= 2
            );
          if (focus === "insufficient")
            return !skills.some(
              (_, i) => strength(state, e.word.id, i) === "Nhớ khá vững",
            );
          return h.length > 0;
        })
      : [];
  const modal = (content: React.ReactNode, close: () => void) => (
    <div className="scrim" onClick={close}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close icon" aria-label="Đóng" onClick={close}>
          <X size={20} />
        </button>
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button
              className="icon"
              aria-label="Đóng thông báo"
              onClick={() => setNotice("")}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {content}
      </section>
    </div>
  );
  if (!loaded)
    return (
      <main className="loading">
        <Leaf />
        <h2>Đang chuẩn bị góc học của bạn…</h2>
        <p role="alert">{notice}</p>
      </main>
    );
  return (
    <div className="app">
      <aside>
        <a
          className="brand"
          aria-label="Lexi IELTS — Hôm nay"
          href="#"
          onClick={() => setPage("today")}
        >
          <span className="brand-icon">
            <Leaf size={24} />
          </span>
          lexi<span className="brand-dot">.</span>
        </a>
        <div className="brand-caption">MỖI TỪ, MỘT BƯỚC TIẾN</div>
        <div className="nav-label">GÓC HỌC CỦA BẠN</div>
        <nav>
          {[
            ["today", "Hôm nay", CalendarDays],
            ["library", "Kho từ", BookOpen],
            ["phrasal-verbs", "Cụm động từ", Layers],
            ["slang", "Slang", MessageCircle],
            ["practice", "Luyện tập", Headphones],
            ["progress", "Tiến độ", ChartNoAxesCombined],
          ].map(([key, label, Icon]) => (
            <button
              key={String(key)}
              className={page === key ? "selected" : ""}
              onClick={() => setPage(String(key))}
            >
              {React.createElement(Icon as typeof Leaf, { size: 20 })}
              <span>{String(label)}</span>
              {key === "today" && due.length > 0 && <b>{due.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="little-spark">✧</div>
          <h4>Chậm mà chắc.</h4>
          <p>
            Không cần học thật nhiều.
            <br />
            Chỉ cần nhớ thêm mỗi ngày.
          </p>
          <span>MỤC TIÊU CỦA BẠN</span>
          <strong>
            IELTS 6.0 – 7.0 <Target size={17} />
          </strong>
        </div>
        <button className="settings" onClick={() => setSettings(true)}>
          <Settings2 size={18} /> Cài đặt & sao lưu
        </button>
        <div className="profile">
          <div className="avatar">B</div>
          <div>
            <strong>Góc học cá nhân</strong>
            <small>Dữ liệu trên thiết bị này</small>
          </div>
          <span className="online" />
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div>
            <span className="breadcrumb">Góc học của bạn</span>
            <ChevronRight size={14} />
            <strong>
              {
                {
                  today: "Hôm nay",
                  library: "Kho từ",
                  "phrasal-verbs": "Cụm động từ",
                  slang: "Slang",
                  practice: "Luyện tập",
                  progress: "Tiến độ",
                  learn: "Phiên học",
                }[page]
              }
            </strong>
          </div>
          <div className="header-right">
            <span className="local-tag">
              <span /> Lưu trên thiết bị
            </span>
            <button
              className="avatar"
              onClick={() => setSettings(true)}
              aria-label="Cài đặt"
            >
              B
            </button>
          </div>
        </header>
        <main>
          {notice && !hasModal && (
            <div className="notice" role="status">
              {notice}
              <button
                className="icon"
                onClick={() => setNotice("")}
                aria-label="Đóng thông báo"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {availableWords && !hasModal && (
            <div className="notice source-update" role="status">
              <span>
                Kho mặc định có bản cập nhật. Xem trước để nhận từ mới và giữ
                lịch sử theo ID.
              </span>
              <button
                onClick={() =>
                  setPending({ words: availableWords, origin: "default" })
                }
              >
                Xem bản cập nhật
              </button>
            </div>
          )}
          {page === "today" && (
            <>
              <div className="greeting">
                <div>
                  <div className="eyebrow">
                    MỘT CHÚT MỖI NGÀY, MỘT CHẶNG ĐƯỜNG DÀI
                  </div>
                  <h1>
                    Hôm nay, mình học gì? <span className="wave">☀</span>
                  </h1>
                  <p>
                    Cùng xây nền tảng vững chắc cho hành trình IELTS của bạn.
                  </p>
                </div>
                <span className="date">
                  <CalendarDays size={16} />
                  {new Date().toLocaleDateString("vi-VN", {
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="pill">
                    <span /> KẾ HOẠCH HÔM NAY
                  </span>
                  <h2>
                    Từng từ nhỏ.
                    <br />
                    Tự tin lớn dần.
                  </h2>
                  <p>
                    Ôn lại điều đã biết, khám phá điều mới.
                    <br />
                    Một buổi học ngắn cũng là một bước tiến.
                  </p>
                  <button
                    className="primary light"
                    onClick={() => (state.session ? setPage("learn") : start())}
                  >
                    {state.session ? "Tiếp tục phiên học" : "Bắt đầu học"}
                    <ArrowRight size={18} />
                  </button>
                  <small>
                    Ưu tiên ôn từ cũ trước · Khoảng{" "}
                    {Math.max(1, Math.ceil((due.length + planned * 4) * 0.6))}{" "}
                    phút
                  </small>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <span className="art-star star-one">✧</span>
                  <span className="art-star star-two">✦</span>
                  <div className="floating-card back-card">
                    <span>mỗi ngày</span>
                    <small>mỗi ngày một chút</small>
                  </div>
                  <div className="floating-card front-card">
                    <span className="card-label">YOUR NEXT CHAPTER</span>
                    <div className="plant">🌱</div>
                    <strong>{active[0]?.word.word || "Sẵn sàng học"}</strong>
                    <span className="phonetic">
                      {active[0]?.word.ipa || "một từ mới, một khởi đầu"}
                    </span>
                    <div className="art-line" />
                    <small>
                      {active[0]?.word.meaning_vi || "Thêm từ để bắt đầu"}
                    </small>
                  </div>
                  <div className="art-chip">
                    <Check size={14} /> Tiến bộ theo cách của bạn
                  </div>
                </div>
              </section>
              <div className="stats">
                <div className="stat">
                  <span className="stat-icon peach">
                    <CalendarDays size={21} />
                  </span>
                  <span>
                    Đến hạn ôn
                    <strong>
                      {dueWords}
                      <small>mục</small>
                    </strong>
                    <em>
                      {overdue
                        ? `${overdue} mục quá hạn`
                        : "Chưa có mục quá hạn"}
                    </em>
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-icon green">
                    <Sparkles size={21} />
                  </span>
                  <span>
                    Từ mới hôm nay
                    <strong>
                      {planned}
                      <small>mục</small>
                    </strong>
                    <em>Mục tiêu {state.daily} từ / ngày</em>
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-icon purple">
                    <BookOpen size={21} />
                  </span>
                  <span>
                    Đã học hôm nay
                    <strong>
                      {studiedToday.size}
                      <small>mục</small>
                    </strong>
                    <em>Mỗi lần nhớ lại đều có ý nghĩa</em>
                  </span>
                </div>
              </div>
              {summary && <div className="notice success">{summary}</div>}
              {due.length > 20 && (
                <div className="notice">
                  Bạn còn nhiều mục cần ôn. Hôm nay giảm đề xuất từ mới xuống 2
                  mục.
                </div>
              )}
              <div className="dashboard-grid">
                <section className="panel pathway">
                  <div className="section-heading">
                    <h3>Một buổi học, bốn bước nhỏ</h3>
                    <span className="muted">HỌC ĐỂ NHỚ LÂU</span>
                  </div>
                  {[
                    [
                      "01",
                      "Ôn lại từ đến hạn",
                      "Đánh thức những gì bạn đã học.",
                      "peach",
                    ],
                    [
                      "02",
                      "Khám phá từ mới",
                      "Hiểu từ qua nghĩa và ngữ cảnh.",
                      "green",
                    ],
                    [
                      "03",
                      "Thử tự nhớ lại",
                      "Không nhìn đáp án, thử sức mình.",
                      "purple",
                    ],
                    [
                      "04",
                      "Đặt câu của riêng bạn",
                      "Biến từ mới thành điều bạn muốn nói.",
                      "blue",
                    ],
                  ].map(([n, title, sub, color]) => (
                    <div className="path-step" key={n}>
                      <span className={"step-number " + color}>{n}</span>
                      <div>
                        <strong>{title}</strong>
                        <p>{sub}</p>
                      </div>
                      {n !== "04" && <ChevronRight size={16} />}
                    </div>
                  ))}
                </section>
                <section className="panel insight">
                  <div className="section-heading">
                    <h3>Hiểu rõ điều mình đã nhớ</h3>
                    <span className="mini-leaf">
                      <Leaf size={18} />
                    </span>
                  </div>
                  <p>
                    Nhìn hiểu, tự viết và nghe nhận ra là những kỹ năng khác
                    nhau.
                  </p>
                  <div className="empty-chart">
                    <div className="insight-symbol">
                      <Target size={45} strokeWidth={1} />
                      <Leaf size={19} />
                    </div>
                    <span>
                      {state.history.length
                        ? `${state.history.length} lượt học đã lưu`
                        : "Hành trình của bạn bắt đầu từ đây"}
                    </span>
                    <small>
                      {state.history.length
                        ? "Xem bằng chứng theo từng kỹ năng."
                        : "Học buổi đầu để có dữ liệu tiến độ thực tế."}
                    </small>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setPage("progress")}
                  >
                    Khám phá tiến độ <ArrowRight size={16} />
                  </button>
                  <small className="fineprint">
                    Bằng chứng thật · Không quy đổi thành band IELTS
                  </small>
                </section>
              </div>
              <section className="collection-section">
                <div className="section-heading">
                  <div>
                    <h3>Kho từ, theo cách của bạn</h3>
                    <p>Học song song nền tảng và chủ đề bạn quan tâm.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setPage("library")}
                  >
                    Xem kho từ <ArrowRight size={16} />
                  </button>
                </div>
                <div className="collections">
                  {[
                    [
                      "foundation",
                      "Aa",
                      "Xây nền tảng",
                      "Từng bước làm quen với từ thông dụng.",
                      "green",
                    ],
                    [
                      "ielts",
                      "◎",
                      "IELTS theo chủ đề",
                      "Kết nối từ vựng với thế giới xung quanh.",
                      "peach",
                    ],
                    [
                      "personal",
                      "✎",
                      "Từ của riêng bạn",
                      "Gom những từ bạn gặp trên hành trình.",
                      "purple",
                    ],
                  ].map(([key, icon, title, sub, color]) => (
                    <button
                      className="collection-card"
                      key={key}
                      onClick={() => {
                        setCollection(key);
                        setPage("library");
                      }}
                    >
                      <span className={"collection-icon " + color}>{icon}</span>
                      <h4>{title}</h4>
                      <p>{sub}</p>
                      <div>
                        {
                          active.filter((e) =>
                            (e.word.collections || "").split(",").includes(key),
                          ).length
                        }{" "}
                        mục từ <ArrowRight size={17} />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
              <div className="bottom-note">
                <Leaf size={15} /> Học để sử dụng, không chỉ để đếm số từ. Mỗi
                người có một nhịp đi riêng.
              </div>
            </>
          )}
          {page === "library" && (
            <>
              <div className="page-title">
                <div>
                  <div className="eyebrow">KHÔNG GIAN TỪ VỰNG</div>
                  <h1>Kho từ của bạn</h1>
                  <p>
                    {
                      new Set(
                        active.map((e) => e.word.word.normalize("NFC").trim()),
                      ).size
                    }{" "}
                    từ/cụm từ ·{" "}
                    {active.filter((e) => !!e.word.meaning_vi?.trim()).length}{" "}
                    mục có nghĩa ·{" "}
                    {
                      active.filter(
                        (e) => e.word.content_status === "reference",
                      ).length
                    }{" "}
                    mục chỉ tra cứu
                  </p>
                  <p className="fineprint">
                    Kho mặc định đối chiếu từ/loại từ/CEFR theo bản lưu PDF
                    Oxford. Nghĩa/ngữ liệu từ từ điển mở hoặc biên soạn được ghi
                    riêng theo từng mục.{" "}
                    <a
                      href={import.meta.env.BASE_URL + "data/SOURCES.md"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Nguồn và phạm vi đối chiếu ↗
                    </a>
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() =>
                    setEditor(
                      "id: \nword: \nmeaning_vi: \nexample_en: \nexample_vi: \ncollections: personal\n",
                    )
                  }
                >
                  <Plus size={18} /> Thêm từ
                </button>
              </div>
              <div className="notice success">
                Oxford 5000:{" "}
                {new Set(
                  active
                    .filter((e) =>
                      (e.word.collections || "")
                        .split(",")
                        .some((c) => c.startsWith("oxford-")),
                    )
                    .map((e) => e.word.word),
                ).size.toLocaleString("vi-VN")}{" "}
                đầu từ/cách viết. Nội dung đã rà soát:{" "}
                {active
                  .filter(
                    (e) =>
                      e.word.content_status !== "dictionary" &&
                      e.word.content_status !== "reference",
                  )
                  .length.toLocaleString("vi-VN")}{" "}
                mục. Nội dung từ từ điển mở được ghi nguồn và nhãn chưa rà soát.
              </div>
              <div className="toolbar">
                <label className="search">
                  <Search size={18} />
                  <input
                    aria-label="Tìm từ và nghĩa"
                    placeholder="Tìm từ hoặc nghĩa tiếng Việt…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Chủ đề"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  <option value="">Mọi chủ đề</option>
                  {selectOptions("topics").map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <select
                  aria-label="Bộ từ"
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                >
                  <option value="">Mọi bộ từ</option>
                  {selectOptions("collections").map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <select
                  aria-label="Trình độ"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="">Mọi trình độ</option>
                  {selectOptions("level").map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <select
                  aria-label="Trạng thái"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Mọi trạng thái</option>
                  <option value="new">Chưa học</option>
                  <option value="studied">Đã học</option>
                  <option value="known">Tự đánh dấu đã biết</option>
                </select>
              </div>
              <div className="file-actions">
                <label className="button">
                  <Upload size={16} /> Nhập .txt
                  <input
                    type="file"
                    accept=".txt,text/plain"
                    hidden
                    onChange={(e) => file(e)}
                  />
                </label>
                <button
                  onClick={() =>
                    download(
                      "vocabulary.txt",
                      serialize(active.map((e) => e.word)),
                    )
                  }
                >
                  <Download size={16} /> Tải kho .txt
                </button>
                <button onClick={source}>↻ Cập nhật kho mặc định</button>
                <span>Chỉnh sửa được lưu trên trình duyệt.</span>
              </div>
              <div className="word-grid" data-total-items={filtered.length}>
                {visibleWords.map((e) => (
                  <button
                    className="word-card"
                    key={e.word.id}
                    onClick={() => setDetail(e.word.id)}
                  >
                    <div>
                      <span className="word-topic">
                        {e.word.topics?.split(",")[0] || "Cá nhân"}
                      </span>
                      <Volume2 size={17} />
                    </div>
                    <h3>{e.word.word}</h3>
                    <p>{e.word.meaning_vi}</p>
                    <small>
                      {e.word.example_en ||
                        "Nguồn chưa có ví dụ; bài điền ngữ cảnh sẽ không được tạo."}
                    </small>
                    {e.word.content_status === "reference" && (
                      <small className="content-status">
                        Chưa có nghĩa phù hợp · chỉ tra cứu
                      </small>
                    )}
                    {e.word.content_status === "dictionary" && (
                      <small className="content-status">
                        Nghĩa từ từ điển mở · chưa rà soát thủ công
                      </small>
                    )}
                    <footer>
                      <span>
                        {e.known
                          ? "Tự đánh dấu đã biết"
                          : studiedIds.has(e.word.id)
                            ? "Đang học"
                            : "Chưa học"}
                      </span>
                      <ChevronRight size={16} />
                    </footer>
                  </button>
                ))}
              </div>
              {filtered.length > 60 && (
                <div className="library-pagination">
                  <button
                    disabled={currentLibraryPage === 1}
                    onClick={() => setLibraryPage(currentLibraryPage - 1)}
                  >
                    ← Trang trước
                  </button>
                  <span>
                    Trang {currentLibraryPage}/{pageCount} ·{" "}
                    {filtered.length.toLocaleString("vi-VN")} mục
                  </span>
                  <button
                    disabled={currentLibraryPage === pageCount}
                    onClick={() => setLibraryPage(currentLibraryPage + 1)}
                  >
                    Trang sau →
                  </button>
                </div>
              )}
              {!filtered.length && (
                <div className="empty-state">
                  Không có từ phù hợp. Thử bỏ bộ lọc hoặc thêm từ của bạn.
                </div>
              )}
              <details className="panel">
                <summary>
                  Mục đã lưu trữ (
                  {
                    Object.values(state.entries).filter((e) => e.archived)
                      .length
                  }
                  )
                </summary>
                {Object.values(state.entries)
                  .filter((e) => e.archived)
                  .map((e) => (
                    <p key={e.word.id}>
                      {e.word.word}{" "}
                      <button
                        onClick={() =>
                          commit({
                            ...state,
                            entries: {
                              ...state.entries,
                              [e.word.id]: { ...e, archived: false },
                            },
                          }).catch(notifyError)
                        }
                      >
                        Khôi phục
                      </button>
                    </p>
                  ))}
              </details>
            </>
          )}
          {(page === "slang" || page === "phrasal-verbs") && (
            <CollectionBrowser
              key={page}
              kind={page}
              entries={active}
              onOpen={setDetail}
              onPractice={(id) => start(false, id, 1)}
            />
          )}
          {page === "practice" && (
            <>
              <div className="eyebrow">CHỦ ĐỘNG NHỚ LẠI</div>
              <h1>Luyện một chút, nhớ lâu hơn.</h1>
              <p>Luyện tự do có lưu bằng chứng nhưng không thay đổi lịch ôn.</p>
              <div className="practice-grid">
                {skills.map((s, i) => (
                  <button
                    key={s}
                    className={
                      "practice-card " + (practice === i ? "chosen" : "")
                    }
                    onClick={() => setPractice(i)}
                  >
                    <span className="step-number green">0{i + 1}</span>
                    <h3>{s}</h3>
                    <p>
                      {
                        [
                          "Nhìn từ → tự nhớ nghĩa, rồi mở đáp án.",
                          "Nhìn nghĩa → gõ từ tiếng Anh.",
                          "Nghe từ → tự nhớ nghĩa.",
                          "Nghe từ → gõ lại chính tả.",
                          "Điền từ còn thiếu trong câu.",
                          "Viết câu của riêng bạn, lưu để tự xem lại.",
                        ][i]
                      }
                    </p>
                    <span>
                      {[0, 2].includes(i)
                        ? "Tự đánh giá"
                        : i === 5
                          ? "Chưa chấm tự động"
                          : "Chấm theo đáp án khai báo"}
                    </span>
                  </button>
                ))}
              </div>
              <button className="primary" onClick={() => start(false)}>
                Bắt đầu luyện · {Math.min(filtered.length, 20)} mục{" "}
                <ArrowRight size={18} />
              </button>
              <p className="fineprint">
                Dùng các mục phù hợp với bộ lọc hiện tại trong Kho từ. Bài nghe
                cần âm thanh hoạt động trên thiết bị.
              </p>
            </>
          )}
          {page === "learn" && w && task && state.session && (
            <>
              <div className="study-top">
                <button onClick={() => setPage("today")}>
                  ← Lưu & tạm dừng
                </button>
                <span>
                  {state.session.scheduled ? "Ôn theo lịch" : "Luyện tự do"} ·{" "}
                  {state.session.index + 1}/{state.session.queue.length}
                </span>
              </div>
              <progress
                value={state.session.index}
                max={state.session.queue.length}
              />
              <section className="study panel">
                <span className="eyebrow">{skills[task.skill]}</span>
                <h2>
                  {[2, 3].includes(task.skill)
                    ? "Lắng nghe và thử nhớ lại"
                    : task.skill === 0 || task.skill === 5
                      ? w.word
                      : w.meaning_vi}
                </h2>
                {[2, 3].includes(task.skill) && (
                  <>
                    <button
                      className="audio-big"
                      onClick={() => speak(w.word, w.audio_word)}
                    >
                      <Volume2 size={28} /> Nghe từ
                    </button>
                    <p className="fineprint">
                      {w.audio_word
                        ? "Âm thanh khai báo; có thể dùng giọng tổng hợp dự phòng."
                        : "Giọng tổng hợp của trình duyệt"}
                    </p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setNotice(
                          "Đã bỏ qua bài nghe, không ghi nhận kết quả và không thay đổi lịch ôn.",
                        );
                        next().catch(notifyError);
                      }}
                    >
                      Không nghe được? Bỏ qua lượt này
                    </button>
                  </>
                )}
                {[1, 4].includes(task.skill) && w.example_en && (
                  <p className="context">{cloze(w)}</p>
                )}
                {task.skill === 5 && (
                  <p>
                    Viết một câu sử dụng từ này. Câu được lưu, chưa được chấm.
                  </p>
                )}
                {![0, 2].includes(task.skill) && (
                  <textarea
                    aria-label="Câu trả lời"
                    autoFocus
                    placeholder={
                      task.skill === 5 ? "Câu của bạn…" : "Gõ câu trả lời…"
                    }
                    value={answer}
                    disabled={!!feedback}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                )}{" "}
                {!feedback && !revealed && (
                  <div className="study-actions">
                    {![0, 2].includes(task.skill) && (
                      <button
                        className="primary"
                        disabled={!answer.trim() || busy}
                        onClick={() => submit()}
                      >
                        {" "}
                        {task.skill === 5 ? "Lưu câu" : "Kiểm tra"}{" "}
                        <Check size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setHint(![0, 2].includes(task.skill));
                        setRevealed(true);
                      }}
                    >
                      Mở đáp án{" "}
                      {[0, 2].includes(task.skill)
                        ? "để tự đánh giá"
                        : "(có gợi ý)"}
                    </button>
                  </div>
                )}
                {revealed && (
                  <div className="answer">
                    <h3>
                      {w.word}{" "}
                      <button
                        className="icon"
                        aria-label="Nghe từ"
                        onClick={() => speak(w.word, w.audio_word)}
                      >
                        <Volume2 size={19} />
                      </button>
                    </h3>
                    <p>{w.meaning_vi}</p>
                    {w.example_en && <p>{w.example_en}</p>}
                    <small>{w.example_vi}</small>
                    {!feedback &&
                      ([0, 2].includes(task.skill) ? (
                        <div className="study-actions">
                          <button
                            onClick={() => {
                              submit(false, false);
                            }}
                          >
                            Quên
                          </button>
                          <button
                            onClick={() => {
                              submit(true, true);
                            }}
                          >
                            Nhớ khó
                          </button>
                          <button
                            className="primary"
                            onClick={() => {
                              submit(true, false);
                            }}
                          >
                            Nhớ rõ
                          </button>
                        </div>
                      ) : (
                        <button
                          className="primary"
                          disabled={busy || !answer.trim()}
                          onClick={() => submit()}
                        >
                          Lưu lượt có hỗ trợ
                        </button>
                      ))}
                  </div>
                )}
                {feedback && (
                  <div className="notice success">
                    {feedback}
                    <button
                      className="primary"
                      onClick={() => next().catch(notifyError)}
                    >
                      Tiếp tục <ArrowRight size={17} />
                    </button>
                  </div>
                )}
                <button
                  className="text-button report"
                  onClick={() => {
                    const note = prompt("Mô tả điểm chưa rõ trong câu hỏi:");
                    if (note)
                      commit({
                        ...state,
                        entries: {
                          ...state.entries,
                          [w.id]: {
                            ...entry!,
                            word: {
                              ...w,
                              note: (w.note || "") + " | Báo câu hỏi: " + note,
                            },
                          },
                        },
                      })
                        .then(() =>
                          setNotice("Đã lưu báo cáo trong ghi chú mục từ."),
                        )
                        .catch(notifyError);
                  }}
                >
                  Báo câu hỏi chưa rõ
                </button>
              </section>
            </>
          )}
          {page === "progress" && (
            <>
              <div className="page-title">
                <div>
                  <div className="eyebrow">TIẾN BỘ CÓ BẰNG CHỨNG</div>
                  <h1>Bạn thực sự nhớ được gì?</h1>
                  <p>
                    Số từ không quy đổi thành band IELTS. Mỗi kỹ năng có bằng
                    chứng riêng.
                  </p>
                </div>
                <select
                  aria-label="Khoảng thời gian"
                  value={range}
                  onChange={(e) => setRange(Number(e.target.value))}
                >
                  <option value={7}>7 ngày</option>
                  <option value={30}>30 ngày</option>
                  <option value={0}>Toàn bộ</option>
                </select>
              </div>
              <div className="stats">
                <div className="stat">
                  <span>
                    Đã tiếp xúc
                    <strong>
                      {new Set(history.map((h) => h.wordId)).size}
                      <small>mục nghĩa</small>
                    </strong>
                    <em>
                      {
                        new Set(
                          history.map(
                            (h) => state.entries[h.wordId]?.word.word,
                          ),
                        ).size
                      }{" "}
                      từ/cụm từ riêng
                    </em>
                  </span>
                </div>
                <div className="stat">
                  <span>
                    Đúng lần đầu, không gợi ý
                    <strong className="metric">{ratio(tested)}</strong>
                    <em>Chỉ kết quả chấm bằng quy tắc</em>
                  </span>
                </div>
                <div className="stat">
                  <span>
                    Nhớ qua các ngày
                    <strong className="metric">{ratio(delayed)}</strong>
                    <em>Lần kiểm tra cách lần trước ≥ 24 giờ</em>
                  </span>
                </div>
              </div>
              <section className="panel">
                <h3>Bức tranh từng kỹ năng</h3>
                {skills.map((s, i) => {
                  const h = tested.filter((r) => r.skill === i);
                  return (
                    <div className="skill-row" key={s}>
                      <span>{s}</span>
                      <span>{ratio(h)}</span>
                      <small>
                        {
                          history.filter(
                            (r) => r.skill === i && r.method === "self",
                          ).length
                        }{" "}
                        tự đánh giá ·{" "}
                        {
                          history.filter(
                            (r) => r.skill === i && r.method === "ungraded",
                          ).length
                        }{" "}
                        chưa chấm
                      </small>
                    </div>
                  );
                })}
                <p className="fineprint">
                  Tự chọn “Nhớ rõ” khác với gõ đúng chưa xem đáp án. Đúng sau
                  khi vừa học là ghi nhớ tức thời.
                </p>
              </section>
              <section className="panel">
                <h3>Nên tập trung vào đâu?</h3>
                <select
                  aria-label="Nhóm bằng chứng"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                >
                  {focusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {evidenceList.slice(0, evidenceLimit).map((e) => (
                  <div className="weak-row" key={e.word.id}>
                    <button
                      className="text-button"
                      onClick={() => setDetail(e.word.id)}
                    >
                      {e.word.word}
                    </button>
                    <span>
                      {e.goal === "recognition"
                        ? "Mục tiêu nhận biết"
                        : "Mục tiêu chủ động"}
                    </span>
                    <span>
                      {skills
                        .map((s, i) => `${s}: ${strength(state, e.word.id, i)}`)
                        .join(" · ")}
                    </span>
                    <button
                      onClick={() =>
                        start(
                          false,
                          e.word.id,
                          focus === "listening"
                            ? 2
                            : focus === "writing"
                              ? 1
                              : undefined,
                        )
                      }
                    >
                      Luyện ngay
                    </button>
                  </div>
                ))}
                {evidenceList.length > evidenceLimit && (
                  <button onClick={() => setEvidenceLimit((n) => n + 100)}>
                    Xem thêm · {Math.min(evidenceLimit, evidenceList.length)}/
                    {evidenceList.length} mục
                  </button>
                )}
                {!evidenceList.length && (
                  <div className="empty-state">
                    Chưa đủ dữ liệu để kết luận. Bắt đầu một phiên học để lưu
                    bằng chứng đầu tiên.
                  </div>
                )}
              </section>
              <section className="panel">
                <h3>Lượng ôn sắp tới</h3>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  return (
                    <div className="skill-row" key={i}>
                      <span>
                        {i === 0 ? "Hôm nay" : d.toLocaleDateString("vi-VN")}
                      </span>
                      <b>
                        {
                          Object.entries(state.schedules).filter(
                            ([k, s]) =>
                              !state.entries[k.slice(0, k.lastIndexOf(":"))]
                                ?.archived && day(s.due) === day(+d),
                          ).length
                        }{" "}
                        lượt kỹ năng
                      </b>
                    </div>
                  );
                })}
              </section>
              <details className="panel">
                <summary>Cách ứng dụng xác định “nhớ khá vững”</summary>
                <p>
                  Với từng kỹ năng: ít nhất 3 lần kiểm tra đúng, không gợi ý,
                  lần thử đầu ở 3 ngày địa phương khác nhau; ít nhất một lần
                  cách lần trước từ 7 ngày. Đây là quy tắc của ứng dụng, không
                  phải chuẩn chứng nhận ngôn ngữ. Tự đánh giá không đủ để kết
                  luận kỹ năng vững. Ôn trễ không đồng nghĩa với quên.
                </p>
                <p>
                  Lịch riêng cho mỗi kỹ năng: 1–3–7–14–30 ngày; sai quay về 1
                  ngày. Lượt thử lại cùng lần ôn không kéo dài lịch. Mục tự đánh
                  dấu đã biết không có bằng chứng kiểm tra.
                </p>
              </details>
            </>
          )}
        </main>
        <footer className="app-footer">
          lexi. <span>Một góc nhỏ cho những bước tiến lớn.</span>
          <span>Riêng tư · Không tài khoản · Không đồng bộ</span>
        </footer>
      </div>
      {detail &&
        state.entries[detail] &&
        modal(
          <WordDetail
            entry={state.entries[detail]}
            state={state}
            speak={speak}
            edit={() => {
              setEditor(serialize([state.entries[detail].word]));
              setDetail(undefined);
            }}
            change={(e) =>
              commit({
                ...state,
                entries: { ...state.entries, [detail]: e },
              }).catch(notifyError)
            }
          />,
          () => setDetail(undefined),
        )}
      {editor !== undefined &&
        modal(
          <>
            <h2>Biên tập mục từ</h2>
            <p>Giữ nguyên ID để giữ lịch sử. Nếu đổi hẳn nghĩa, tạo ID mới.</p>
            <textarea
              className="editor"
              aria-label="Nội dung mục từ"
              value={editor}
              onChange={(e) => setEditor(e.target.value)}
            />
            <button
              className="primary"
              onClick={() => {
                try {
                  const words = parse(editor);
                  if (words.length !== 1)
                    throw Error("Chỉ chỉnh sửa một mục mỗi lần.");
                  const word = words[0];
                  commit({
                    ...state,
                    entries: {
                      ...state.entries,
                      [word.id]: {
                        ...state.entries[word.id],
                        word,
                        origin: "personal",
                        archived: false,
                      },
                    },
                  })
                    .then(() => {
                      setEditor(undefined);
                      setNotice(
                        "Đã lưu trên trình duyệt. Xuất .txt để sửa file trong repository.",
                      );
                    })
                    .catch(notifyError);
                } catch (e) {
                  notifyError(e);
                }
              }}
            >
              Lưu trên trình duyệt
            </button>
          </>,
          () => setEditor(undefined),
        )}
      {pending &&
        modal(
          <>
            <h2>Xem trước cập nhật kho</h2>
            <p>
              Nguồn:{" "}
              {pending.origin === "default"
                ? "Kho mặc định trong repository"
                : "File cá nhân"}
            </p>
            <div className="preview-counts">
              {Object.entries(diff(state, pending.words, pending.origin)).map(
                ([key, n]) => (
                  <div key={key}>
                    <strong>{n}</strong>
                    {
                      (
                        {
                          added: "Thêm mới",
                          changed: "Nội dung thay đổi",
                          archived: "Lưu trữ",
                        } as Record<string, string>
                      )[key]
                    }
                  </div>
                ),
              )}
            </div>
            <p>
              Không xóa lịch sử. Chỉ lưu trữ mục biến mất khỏi cùng nguồn. File
              cá nhân giữ ưu tiên khi cập nhật mặc định; trùng ID với file cá
              nhân sẽ được bỏ qua.
            </p>
            <div className="preview-list">
              {pending.words.slice(0, 60).map((w) => (
                <p key={w.id}>
                  {w.word} — {w.meaning_vi}
                </p>
              ))}
            </div>
            {pending.words.length > 60 && (
              <p className="fineprint">
                Xem trước 60/{pending.words.length.toLocaleString("vi-VN")} mục.
                Xác nhận sẽ áp dụng đầy đủ các mục hợp lệ trong file.
              </p>
            )}
            <button
              className="primary"
              onClick={() =>
                commit(merge(state, pending.words, pending.origin))
                  .then(() => {
                    setPending(undefined);
                    if (pending.origin === "default")
                      setAvailableWords(undefined);
                    setNotice(
                      "Đã cập nhật kho từ, giữ nguyên tiến độ theo ID.",
                    );
                  })
                  .catch(notifyError)
              }
            >
              Xác nhận cập nhật
            </button>
          </>,
          () => setPending(undefined),
        )}
      {settings &&
        modal(
          <>
            <h2>Góc học của bạn</h2>
            <label className="setting-row">
              Từ mới / ngày
              <input
                type="number"
                min={1}
                max={30}
                value={state.daily}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 1 && n <= 30)
                    commit({ ...state, daily: n }).catch(notifyError);
                }}
              />
            </label>
            <label className="setting-row">
              Giọng đọc ưu tiên
              <select
                value={state.voice}
                onChange={(e) =>
                  commit({ ...state, voice: e.target.value }).catch(notifyError)
                }
              >
                <option value="en-GB">Anh–Anh</option>
                <option value="en-US">Anh–Mỹ</option>
              </select>
            </label>
            <label className="setting-row">
              Tốc độ đọc
              <select
                value={state.rate}
                onChange={(e) =>
                  commit({ ...state, rate: Number(e.target.value) }).catch(
                    notifyError,
                  )
                }
              >
                <option value={0.65}>Chậm · 0.65×</option>
                <option value={0.85}>Vừa · 0.85×</option>
                <option value={1}>Tự nhiên · 1×</option>
              </select>
            </label>
            <button onClick={() => speak("Ready to learn")}>
              Nghe thử giọng tổng hợp
            </button>
            <hr />
            <h3>Sao lưu dữ liệu</h3>
            <p>
              IndexedDB lưu trên trình duyệt này. Dữ liệu chưa đồng bộ giữa
              thiết bị và có thể mất khi xóa dữ liệu trình duyệt.
            </p>
            <div className="file-actions">
              <button
                onClick={() =>
                  download(
                    "lexi-backup.json",
                    JSON.stringify(state, null, 2),
                    "application/json",
                  )
                }
              >
                <Download size={16} /> Sao lưu toàn bộ JSON
              </button>
              <label className="button">
                <Upload size={16} /> Khôi phục JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={(e) => file(e, true)}
                />
              </label>
            </div>
            <p className="fineprint">
              JSON chứa kho từ, phiên học, lịch ôn và lịch sử. File .txt chỉ
              chứa nội dung học.
            </p>
          </>,
          () => setSettings(false),
        )}
      {backup &&
        modal(
          <>
            <h2>Khôi phục bản sao lưu</h2>
            <p>
              {Object.keys(backup.entries).length} mục từ ·{" "}
              {backup.history.length} lượt lịch sử ·{" "}
              {Object.keys(backup.schedules).length} lịch kỹ năng
            </p>
            <label className="setting-row">
              Cách khôi phục
              <select
                value={replace ? "replace" : "merge"}
                onChange={(e) => setReplace(e.target.value === "replace")}
              >
                <option value="merge">Hợp nhất (giữ dữ liệu hiện tại)</option>
                <option value="replace">Thay thế toàn bộ</option>
              </select>
            </label>
            <p>
              {replace
                ? "Cảnh báo: toàn bộ dữ liệu hiện tại sẽ được thay thế. Hãy xuất JSON trước."
                : "Mục trùng ID và lịch ôn dùng bản hiện tại; lịch sử hợp nhất theo ID lượt, không cộng trùng. Phiên hiện tại được giữ."}
            </p>
            <button
              className="primary"
              onClick={() => {
                if (replace && !confirm("Thay thế toàn bộ dữ liệu hiện tại?"))
                  return;
                const combined = replace
                  ? backup
                  : {
                      ...state,
                      entries: { ...backup.entries, ...state.entries },
                      schedules: { ...backup.schedules, ...state.schedules },
                      history: [
                        ...new Map(
                          [...backup.history, ...state.history].map((h) => [
                            h.id,
                            h,
                          ]),
                        ).values(),
                      ].sort((a, b) => a.time - b.time),
                    };
                commit(combined)
                  .then(() => {
                    setBackup(undefined);
                    setNotice("Đã khôi phục dữ liệu.");
                  })
                  .catch(notifyError);
              }}
            >
              Xác nhận {replace ? "thay thế" : "hợp nhất"}
            </button>
          </>,
          () => setBackup(undefined),
        )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
