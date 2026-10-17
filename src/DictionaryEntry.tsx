import { BookOpen, ExternalLink, Volume2 } from "lucide-react";
import { type State, skills, strength } from "./core";
import "./dictionary.css";

type DictionaryEntryProps = {
  entry: State["entries"][string];
  state: State;
  speak: (text: string, url?: string) => void;
  edit: () => void;
  change: (entry: State["entries"][string]) => void;
};

function referenceLinks(source: string) {
  const matches = source.match(/https:\/\/[^\s<>"'`]+/g) || [];
  const links = new Set<string>();
  for (const match of matches) {
    try {
      const url = new URL(match.replace(/[.,;:!?)\]。]+$/, ""));
      if (url.protocol === "https:" && !url.username && !url.password) {
        links.add(url.href);
      }
    } catch {
      // Invalid links remain visible as source text, without becoming links.
    }
  }
  return [...links];
}

function audioUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export default function DictionaryEntry({
  entry,
  state,
  speak,
  edit,
  change,
}: DictionaryEntryProps) {
  const w = entry.word;
  const imported = w.content_status === "dictionary";
  const reference = w.content_status === "reference";
  const sources = referenceLinks(w.source || "");
  const isOxfordList =
    (w.collections || "")
      .split(",")
      .some((collection) => /^oxford(?:[-_ ]|$)/i.test(collection.trim())) ||
    sources.some((source) => {
      const hostname = new URL(source).hostname;
      return (
        hostname === "oxfordlearnersdictionaries.com" ||
        hostname.endsWith(".oxfordlearnersdictionaries.com")
      );
    });
  const wordAudio = audioUrl(w.audio_word);
  const exampleAudio = audioUrl(w.audio_example);
  const history = state.history
    .filter((result) => result.wordId === w.id)
    .slice()
    .reverse();

  return (
    <article className="dict-entry">
      <header className="dict-header">
        <div className="dict-kicker">
          <BookOpen size={15} aria-hidden="true" />
          <span>Lexi IELTS · Sổ từ cá nhân</span>
        </div>
        <h2 className="dict-headword" lang="en">
          {w.word}
        </h2>
        <div className="dict-grammar">
          <span className="dict-pos" lang={w.part_of_speech ? "en" : "vi"}>
            {reference
              ? "Từ loại nguồn cần đối chiếu"
              : w.part_of_speech || "Chưa khai báo từ loại"}
          </span>
          {w.level && !reference && (
            <span className="dict-level">{w.level}</span>
          )}
        </div>
        <p className="dict-level-note">
          {reference
            ? "Bản nguồn có xung đột hoặc thiếu nghĩa phù hợp; chưa xác nhận nhãn học."
            : w.level
              ? isOxfordList
                ? "Mức từ/loại từ trong danh sách Oxford. Mức này không xác nhận riêng từng nghĩa."
                : "Mức CEFR do nguồn của mục từ khai báo; chưa đối chiếu riêng từng nghĩa."
              : "Chưa đối chiếu mức CEFR."}
        </p>
        <div className="dict-pronunciation">
          <span className="dict-ipa" lang={w.ipa ? "en" : "vi"}>
            {w.ipa || "IPA chưa đối chiếu"}
          </span>
          <button
            className="dict-audio"
            aria-label="Nghe từ"
            title={
              wordAudio
                ? "Phát âm thanh từ URL; dùng giọng tổng hợp nếu phát thất bại"
                : "Phát từ bằng giọng tổng hợp của trình duyệt"
            }
            onClick={() => speak(w.word, wordAudio)}
          >
            <Volume2 size={17} aria-hidden="true" />
            {wordAudio ? "Nghe từ · âm thanh URL" : "Nghe từ · giọng tổng hợp"}
          </button>
        </div>
        <p className="dict-muted">
          {wordAudio
            ? "Âm thanh theo URL của mục từ; giọng tổng hợp dự phòng nếu không phát được."
            : "Giọng tổng hợp của trình duyệt; không phải bản ghi phát âm Oxford."}
        </p>
      </header>

      <section className="dict-meaning" aria-label="Nghĩa đang học">
        <div className="dict-sense-number" aria-hidden="true">
          1
        </div>
        <div className="dict-sense-body">
          <p className="dict-label">
            {imported ? "Giải nghĩa từ nguồn" : "Giải nghĩa biên soạn"}
          </p>
          <p className="dict-definition" lang="en">
            {w.definition_en || "Chưa có giải nghĩa tiếng Anh trong dữ liệu."}
          </p>
          <p className="dict-label">
            {imported
              ? "Nghĩa tiếng Việt · nguồn từ điển mở"
              : "Nghĩa tiếng Việt · biên soạn"}
          </p>
          <p className="dict-translation" lang="vi">
            {w.meaning_vi ||
              "Chưa có nghĩa cùng từ loại đáng tin cậy; mục này chỉ để tra cứu nguồn."}
          </p>
          <p className="dict-muted dict-sense-note">
            Mục này học một nghĩa; mã {w.id}. Không phải toàn bộ các nghĩa của
            từ.
          </p>

          {w.collocation && (
            <div className="dict-collocation">
              <h3>Cụm từ & cấu trúc</h3>
              <p lang="en">{w.collocation}</p>
            </div>
          )}

          <div className="dict-example">
            <div className="dict-example-heading">
              <h3>
                {imported
                  ? "Ngữ liệu từ nguồn (có thể là cụm từ)"
                  : "Ví dụ biên soạn"}
              </h3>
              <button
                className="dict-audio"
                aria-label="Nghe câu"
                title={
                  exampleAudio
                    ? "Phát câu từ URL; dùng giọng tổng hợp nếu phát thất bại"
                    : "Phát câu bằng giọng tổng hợp của trình duyệt"
                }
                onClick={() => speak(w.example_en, exampleAudio)}
              >
                <Volume2 size={16} aria-hidden="true" />
                {exampleAudio
                  ? "Nghe câu · âm thanh URL"
                  : "Nghe câu · giọng tổng hợp"}
              </button>
            </div>
            <p className="dict-example-en" lang="en">
              {w.example_en ||
                "Nguồn chưa cung cấp ví dụ; ứng dụng không tự tạo bài điền ngữ cảnh cho mục này."}
            </p>
            <p className="dict-example-vi" lang="vi">
              {w.example_vi}
            </p>
            <p className="dict-muted">
              {imported
                ? "Nghĩa và ngữ liệu được nhập theo giấy phép của nguồn từ điển mở, chưa rà soát thủ công từng mục. Chúng không phải định nghĩa hoặc ví dụ Oxford."
                : "Giải nghĩa, bản dịch và ví dụ do Lexi/người nhập biên soạn; không phải nội dung trích nguyên văn từ Oxford."}
            </p>
          </div>
        </div>
      </section>

      <section className="dict-source" aria-label="Nguồn và đối chiếu">
        <h3>Nguồn & đối chiếu</h3>
        <p className="dict-source-text">{w.source || "Chưa khai báo nguồn."}</p>
        {sources.length > 0 && (
          <ul className="dict-reference-list">
            {sources.map((url, index) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  Đối chiếu nguồn {sources.length > 1 ? index + 1 : ""}
                  <span className="dict-reference-host">
                    {new URL(url).hostname}
                  </span>
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}
        {w.note && <p className="dict-source-note">{w.note}</p>}
        {w.topics && <p className="dict-muted">Chủ đề: {w.topics}</p>}
      </section>

      {(imported || reference) && (
        <div className="notice">
          {reference
            ? "Mục nguồn có xung đột hoặc thiếu nghĩa đã đối chiếu; chưa dùng để kiểm tra."
            : "Nội dung từ điển mở chưa rà soát từng mục. Kiểm tra nguồn và sửa nghĩa/ví dụ nếu cần trước khi học chuyên sâu."}
        </div>
      )}
      <section className="dict-learning" aria-label="Việc học của bạn">
        <h3>Việc học của bạn</h3>
        <label className="dict-goal">
          <span>Mục tiêu</span>
          <select
            value={entry.goal || "active"}
            onChange={(event) => change({ ...entry, goal: event.target.value })}
          >
            <option value="active">Sử dụng chủ động</option>
            <option value="recognition">Nhận biết</option>
          </select>
        </label>
        <label className="dict-known">
          <input
            type="checkbox"
            checked={!!entry.known}
            onChange={(event) =>
              change({ ...entry, known: event.target.checked })
            }
          />
          <span>
            Tôi đã biết từ này <small>(tự đánh dấu, chưa kiểm tra)</small>
          </span>
        </label>
        <div className="dict-user-sentence">
          <p className="dict-label">
            Câu của bạn {entry.notes && "· Chưa được chấm"}
          </p>
          <p lang={entry.notes ? "en" : "vi"}>
            {entry.notes || "Chưa có câu tự viết."}
          </p>
        </div>
      </section>

      <details className="dict-details">
        <summary>Tiến độ từng kỹ năng & lịch sử</summary>
        <ul className="dict-skill-list">
          {skills.map((skill, index) => (
            <li key={skill}>
              <strong>{skill}</strong>
              <span>{strength(state, w.id, index)}</span>
              <small>
                Ôn tiếp:{" "}
                {state.schedules[w.id + ":" + index]
                  ? new Date(
                      state.schedules[w.id + ":" + index].due,
                    ).toLocaleString("vi-VN")
                  : "Chưa có lịch"}
              </small>
            </li>
          ))}
        </ul>
        <h3>Lịch sử học</h3>
        <div className="dict-history">
          {history.length === 0 && (
            <p className="dict-muted">Chưa có lượt học nào cho mục từ này.</p>
          )}
          {history.map((result) => (
            <p key={result.id}>
              <time>{new Date(result.time).toLocaleString("vi-VN")}</time> ·{" "}
              {skills[result.skill]} ·{" "}
              {result.method === "ungraded"
                ? "Chưa chấm"
                : result.correct
                  ? "Đúng / tự nhớ"
                  : "Quên / sai"}{" "}
              ·{" "}
              {result.method === "self"
                ? "Tự đánh giá"
                : result.method === "rule"
                  ? "Chấm quy tắc"
                  : "Tự viết"}
              {result.hint ? " · Có hỗ trợ" : ""}
              <br />
              Trả lời: {result.answer || "(tự đánh giá)"} ·{" "}
              {Math.round(result.elapsed / 1000)}s · cách lần trước{" "}
              {(result.gap / 86400000).toFixed(1)} ngày
            </p>
          ))}
        </div>
      </details>

      <div className="dict-actions">
        <button onClick={edit}>Sửa mục từ</button>
        <button onClick={() => change({ ...entry, archived: true })}>
          Lưu trữ (giữ lịch sử)
        </button>
      </div>
    </article>
  );
}
