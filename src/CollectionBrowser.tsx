import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Info,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import type { Entry } from "./core";
import "./collection-browser.css";

type CollectionBrowserProps = {
  entries: Entry[];
  kind: "slang" | "phrasal-verbs";
  onOpen: (id: string) => void;
  onPractice: (id: string) => void;
};

const PAGE_SIZE = 24;
const expressionLabels: Record<string, string> = {
  idiom: "Thành ngữ",
  slang: "Tiếng lóng",
  colloquialism: "Cách nói đời thường",
  abbreviation: "Từ viết tắt",
  term: "Thuật ngữ",
};
const formatCount = (count: number) => count.toLocaleString("vi-VN");
const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi-VN");

function matchesCollection(entry: Entry, kind: CollectionBrowserProps["kind"]) {
  if (entry.archived) return false;
  return (entry.word.collections || "").split(",").some((value) => {
    const collection = value
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");
    return (
      collection === kind ||
      (kind === "phrasal-verbs" && collection === "phrasal-verb")
    );
  });
}

export default function CollectionBrowser({
  entries,
  kind,
  onOpen,
  onPractice,
}: CollectionBrowserProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("asc");
  const [expressionType, setExpressionType] = useState("all");
  const [contextSource, setContextSource] = useState("all");
  const [pagination, setPagination] = useState({ key: "", page: 1 });
  const isSlang = kind === "slang";
  const title = isSlang ? "Slang" : "Cụm động từ";
  const headingId = `coll-${kind}-heading`;
  const resultsId = `coll-${kind}-results`;
  const collectionEntries = useMemo(
    () => entries.filter((entry) => matchesCollection(entry, kind)),
    [entries, kind],
  );
  const headwordCount = useMemo(
    () =>
      new Set(
        collectionEntries.map(({ word }) => word.word.trim().toLowerCase()),
      ).size,
    [collectionEntries],
  );
  const filtered = useMemo(() => {
    const search = searchable(query.trim());
    return collectionEntries
      .filter(
        ({ word, notes }) =>
          (!isSlang ||
            expressionType === "all" ||
            word.expression_type === expressionType) &&
          (!isSlang ||
            contextSource === "all" ||
            (contextSource === "none"
              ? !word.news_source_type
              : word.news_source_type === contextSource)) &&
          (!search ||
            searchable(
              [
                word.word,
                word.meaning_vi,
                word.definition_en,
                word.note,
                word.register,
                word.region,
                expressionLabels[word.expression_type],
                word.news_source,
                word.news_title,
                word.news_excerpt,
                word.news_context_vi,
                notes,
              ]
                .filter(Boolean)
                .join(" "),
            ).includes(search)),
      )
      .sort((a, b) => {
        const order =
          a.word.word.localeCompare(b.word.word, "en", {
            sensitivity: "base",
          }) || a.word.id.localeCompare(b.word.id);
        return sort === "asc" ? order : -order;
      });
  }, [collectionEntries, query, sort, expressionType, contextSource, isSlang]);
  // A search, sort, or collection change starts at page 1, including on the first render.
  const paginationKey = `${kind}\u0000${query}\u0000${sort}\u0000${expressionType}\u0000${contextSource}`;
  const hasFilters =
    !!query.trim() ||
    (isSlang && (expressionType !== "all" || contextSource !== "all"));
  const clearFilters = () => {
    setQuery("");
    setExpressionType("all");
    setContextSource("all");
  };
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page =
    pagination.key === paginationKey ? Math.min(pagination.page, pageCount) : 1;
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const setPage = (nextPage: number) =>
    setPagination({ key: paginationKey, page: nextPage });

  return (
    <section className="coll-browser" aria-labelledby={headingId}>
      <div className={`coll-intro ${isSlang ? "coll-intro-slang" : ""}`}>
        <div className="coll-intro-copy">
          <span className="coll-eyebrow">
            {isSlang ? (
              <MessageCircle size={15} aria-hidden="true" />
            ) : (
              <BookOpen size={15} aria-hidden="true" />
            )}
            {isSlang ? "TIẾNG ANH ĐỜI THƯỜNG" : "HỌC THEO NGỮ CẢNH"}
          </span>
          <h1 id={headingId}>{title}</h1>
          <p className="coll-intro-description">
            {isSlang
              ? "Học tiếng lóng, thành ngữ và cách nói đời thường qua nghĩa, cách dùng và ngữ cảnh có nguồn."
              : "Học nghĩa của cả cụm, cấu trúc đi kèm và vị trí của tân ngữ."}
          </p>
        </div>
        <dl className="coll-counts" aria-label={`Dữ liệu ${title}`}>
          <div>
            <dt>Từ / cụm từ</dt>
            <dd>{formatCount(headwordCount)}</dd>
          </div>
          <div>
            <dt>Mục nghĩa</dt>
            <dd>{formatCount(collectionEntries.length)}</dd>
          </div>
        </dl>
      </div>

      <div className="coll-guidance">
        <Info size={18} aria-hidden="true" />
        <p>
          {isSlang ? (
            <>
              <strong>Thành ngữ không nhất thiết là tiếng lóng.</strong> Xem
              nhãn loại cách nói và sắc thái trước khi dùng. Ngữ cảnh từ bản
              tin, phỏng vấn được tách riêng với chuyên mục học tiếng Anh và ví
              dụ biên soạn. Một bài có dùng cụm từ chưa chứng minh cụm đó xuất
              hiện thường xuyên. Các mục này không mặc định có mức CEFR; cách
              nói thân mật thường không phù hợp IELTS Writing trang trọng.
            </>
          ) : (
            <>
              <strong>Một cụm có thể có nhiều nghĩa.</strong> Xem ghi chú của
              từng mục để biết cụm có cần tân ngữ, có tách được hay không và đại
              từ đứng ở đâu. Sắc thái trang trọng thay đổi theo từng cụm và từng
              nghĩa.
            </>
          )}
        </p>
      </div>

      <div className="coll-toolbar">
        <div className="coll-search">
          <Search size={18} aria-hidden="true" />
          <label className="coll-sr-only" htmlFor={`coll-${kind}-search`}>
            Tìm trong {title}: từ, nghĩa hoặc ghi chú
          </label>
          <input
            id={`coll-${kind}-search`}
            type="search"
            value={query}
            placeholder="Tìm từ, nghĩa hoặc ghi chú…"
            onChange={(event) => setQuery(event.target.value)}
            aria-controls={resultsId}
          />
          {query && (
            <button
              type="button"
              className="coll-clear"
              onClick={() => setQuery("")}
              aria-label="Xóa nội dung tìm kiếm"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <label className="coll-sort" htmlFor={`coll-${kind}-sort`}>
          <ArrowDownAZ size={18} aria-hidden="true" />
          <span className="coll-sr-only">Sắp xếp {title}</span>
          <select
            id={`coll-${kind}-sort`}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="asc">Từ A đến Z</option>
            <option value="desc">Từ Z đến A</option>
          </select>
        </label>
      </div>

      {isSlang && (
        <div
          className="coll-filters"
          aria-label="Lọc cách nói và nguồn ngữ cảnh"
        >
          <label htmlFor="coll-slang-type">
            <span>Loại cách nói</span>
            <select
              id="coll-slang-type"
              value={expressionType}
              onChange={(event) => setExpressionType(event.target.value)}
              aria-controls={resultsId}
            >
              <option value="all">Tất cả loại</option>
              {Object.entries(expressionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="coll-slang-context">
            <span>Nguồn ngữ cảnh</span>
            <select
              id="coll-slang-context"
              value={contextSource}
              onChange={(event) => setContextSource(event.target.value)}
              aria-controls={resultsId}
            >
              <option value="all">Tất cả nguồn</option>
              <option value="reporting">Bản tin / phỏng vấn</option>
              <option value="language-lesson">Chuyên mục học tiếng Anh</option>
              <option value="none">Chưa gắn ngữ cảnh nguồn</option>
            </select>
          </label>
          {hasFilters && (
            <button type="button" onClick={clearFilters}>
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      <p
        className="coll-results-summary"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {filtered.length > 0 ? (
          <>
            Hiển thị {formatCount(start + 1)}–
            {formatCount(Math.min(start + PAGE_SIZE, filtered.length))} /{" "}
            {formatCount(filtered.length)} mục nghĩa
            {hasFilters ? " phù hợp" : ""}.
          </>
        ) : hasFilters ? (
          "Không tìm thấy mục phù hợp."
        ) : (
          "Chưa có mục từ trong bộ sưu tập này."
        )}
        {collectionEntries.length > 0 && (
          <span>Mỗi thẻ là một nghĩa để học.</span>
        )}
      </p>

      <div id={resultsId} className="coll-results">
        {visible.length ? (
          <div className="coll-grid">
            {visible.map(({ word }) => (
              <article className="coll-card" key={word.id}>
                <div className="coll-card-top">
                  <h2 lang="en">{word.word}</h2>
                  {word.part_of_speech && (
                    <span className="coll-pos" lang="en">
                      {word.part_of_speech}
                    </span>
                  )}
                </div>
                {(word.expression_type ||
                  word.register ||
                  word.region ||
                  word.news_source) && (
                  <div className="coll-tags">
                    {expressionLabels[word.expression_type] && (
                      <span className="coll-expression-type">
                        {expressionLabels[word.expression_type]}
                      </span>
                    )}
                    {word.register && (
                      <span>
                        <span className="coll-sr-only">Sắc thái: </span>
                        {word.register}
                      </span>
                    )}
                    {word.region && (
                      <span>
                        <span className="coll-sr-only">Vùng miền: </span>
                        {word.region}
                      </span>
                    )}
                    {word.news_source && (
                      <span className="coll-source-tag">
                        {word.news_source_type === "language-lesson"
                          ? "Bài học"
                          : "Ngữ cảnh"}
                        : {word.news_source}
                      </span>
                    )}
                  </div>
                )}
                <p className="coll-meaning" lang="vi">
                  {word.meaning_vi}
                </p>
                {word.example_en && (
                  <div className="coll-example">
                    <span className="coll-label">VÍ DỤ BIÊN SOẠN</span>
                    <p lang="en">{word.example_en}</p>
                    {word.example_vi && (
                      <p className="coll-example-vi" lang="vi">
                        {word.example_vi}
                      </p>
                    )}
                  </div>
                )}
                {word.note && (
                  <div className="coll-usage">
                    <span className="coll-label">LƯU Ý SỬ DỤNG</span>
                    <p>{word.note}</p>
                  </div>
                )}
                <div className="coll-actions">
                  <button
                    type="button"
                    onClick={() => onOpen(word.id)}
                    aria-label={`Xem chi tiết và nguồn của ${word.word}`}
                  >
                    <BookOpen size={15} aria-hidden="true" /> Chi tiết & nguồn
                  </button>
                  <button
                    type="button"
                    className="coll-practice"
                    onClick={() => onPractice(word.id)}
                    aria-label={`Luyện ${word.word}`}
                  >
                    Luyện mục này <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="coll-empty">
            <Search size={28} aria-hidden="true" />
            <h2>
              {hasFilters
                ? "Chưa tìm thấy từ bạn cần"
                : "Bộ sưu tập chưa có dữ liệu"}
            </h2>
            <p>
              {hasFilters
                ? "Thử từ ngắn hơn, nghĩa tiếng Việt hoặc bỏ bớt bộ lọc."
                : "Vào Kho từ để kiểm tra và xác nhận bản cập nhật dữ liệu trên thiết bị này."}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters}>
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div
          className="coll-pagination"
          role="group"
          aria-label={`Phân trang ${title}`}
        >
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            aria-controls={resultsId}
          >
            <ChevronLeft size={17} aria-hidden="true" /> Trang trước
          </button>
          <span>
            Trang <strong>{formatCount(page)}</strong> /{" "}
            {formatCount(pageCount)}
          </span>
          <button
            type="button"
            disabled={page === pageCount}
            onClick={() => setPage(page + 1)}
            aria-controls={resultsId}
          >
            Trang sau <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
