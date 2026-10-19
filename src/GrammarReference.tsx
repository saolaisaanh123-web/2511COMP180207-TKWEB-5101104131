import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import {
  searchGrammar,
  type GrammarArticle,
  type GrammarGroup,
} from "./grammar-reference";
import "./grammar-reference.css";

type GrammarReferenceProps = {
  articles: GrammarArticle[];
  groups: GrammarGroup[];
};

type Example = { en: string; vi: string };

function Examples({ examples }: { examples: Example[] }) {
  return (
    <div className="grammar-examples">
      {examples.map((example, index) => (
        <div className="grammar-example" key={`${index}-${example.en}`}>
          <p lang="en">{example.en}</p>
          <p>{example.vi}</p>
        </div>
      ))}
    </div>
  );
}

function sourceUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.href;
  } catch {
    // The source title remains readable when a content file has an invalid URL.
  }
  return undefined;
}

function sourceDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export default function GrammarReference({
  articles,
  groups,
}: GrammarReferenceProps) {
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState<string | undefined>();
  const [articleId, setArticleId] = useState<string | undefined>();
  const articleHeading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const resultButtons = useRef(new Map<string, HTMLButtonElement>());
  const returnToArticle = useRef<string | undefined>(undefined);
  const results = useMemo(
    () => searchGrammar(articles, query, groupId),
    [articles, query, groupId],
  );
  const catalogGroups = useMemo(() => {
    if (!query.trim()) return groups;
    const ranks = new Map<string, number>();
    results.forEach((item, index) => {
      if (!ranks.has(item.groupId)) ranks.set(item.groupId, index);
    });
    // Keep related results grouped while putting the group containing the best
    // name/alias match before groups that mention the topic only in their prose.
    return [...groups].sort(
      (left, right) =>
        (ranks.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (ranks.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [groups, query, results]);
  const article = articles.find((item) => item.id === articleId);
  const group = groups.find((item) => item.id === article?.groupId);
  const activeGroup = groups.find((item) => item.id === groupId);
  const hasFilters = !!query.trim() || !!groupId;
  const usesBritishCouncil = articles.some((item) =>
    item.sources.some((source) => {
      try {
        return (
          new URL(source.url).hostname === "learnenglish.britishcouncil.org"
        );
      } catch {
        return false;
      }
    }),
  );
  const usesCambridge = articles.some((item) =>
    item.sources.some((source) => {
      try {
        return new URL(source.url).hostname === "dictionary.cambridge.org";
      } catch {
        return false;
      }
    }),
  );

  useEffect(() => {
    if (articleId) {
      articleHeading.current?.focus({ preventScroll: true });
      articleHeading.current?.scrollIntoView({ block: "start" });
    } else if (returnToArticle.current) {
      resultButtons.current
        .get(returnToArticle.current)
        ?.focus({ preventScroll: true });
      resultButtons.current
        .get(returnToArticle.current)
        ?.scrollIntoView({ block: "nearest" });
      returnToArticle.current = undefined;
    }
  }, [articleId]);

  function clearFilters() {
    setQuery("");
    setGroupId(undefined);
    searchInput.current?.focus();
  }

  function returnToList() {
    returnToArticle.current = articleId;
    setArticleId(undefined);
  }

  return (
    <section className="grammar-reference" aria-labelledby="grammar-heading">
      {article ? (
        <>
          <button type="button" className="grammar-back" onClick={returnToList}>
            <ArrowLeft size={17} aria-hidden="true" />
            Về danh mục ngữ pháp
          </button>
          <article className="grammar-article" data-grammar-id={article.id}>
            <div className="grammar-article-intro">
              <span className="grammar-eyebrow">
                <BookOpen size={15} aria-hidden="true" />
                {group?.title || "Ngữ pháp tiếng Anh"}
              </span>
              <h1 id="grammar-heading" ref={articleHeading} tabIndex={-1}>
                {article.title}
              </h1>
              <p className="grammar-summary">{article.summary}</p>
            </div>

            <div className="grammar-quick-reference">
              <span className="grammar-section-label">Xem nhanh</span>
              {article.whenToUse.length > 0 && (
                <section aria-labelledby="grammar-when-heading">
                  <h2 id="grammar-when-heading">Dùng khi nào?</h2>
                  <ul>
                    {article.whenToUse.map((usage, index) => (
                      <li key={index}>{usage}</li>
                    ))}
                  </ul>
                </section>
              )}
              {article.structures.length > 0 && (
                <section aria-labelledby="grammar-structure-heading">
                  <h2 id="grammar-structure-heading">Cấu trúc chính</h2>
                  <ul className="grammar-structures">
                    {article.structures.map((structure, index) => (
                      <li key={index}>{structure}</li>
                    ))}
                  </ul>
                </section>
              )}
              {article.examples.length > 0 && (
                <section aria-labelledby="grammar-example-heading">
                  <h2 id="grammar-example-heading">Ví dụ</h2>
                  <Examples examples={article.examples.slice(0, 2)} />
                </section>
              )}
            </div>

            <div className="grammar-expanded-reference">
              {article.examples.length > 2 && (
                <details className="grammar-detail">
                  <summary>
                    Ví dụ khác
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <div className="grammar-detail-body">
                    <Examples examples={article.examples.slice(2)} />
                  </div>
                </details>
              )}
              {article.notes.length > 0 && (
                <details className="grammar-detail">
                  <summary>
                    Lưu ý và ngoại lệ
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <div className="grammar-detail-body">
                    <ul>
                      {article.notes.map((note, index) => (
                        <li key={index}>{note}</li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}
              {article.mistakes.length > 0 && (
                <details className="grammar-detail">
                  <summary>
                    Lỗi thường gặp
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <div className="grammar-detail-body grammar-mistakes">
                    {article.mistakes.map((mistake, index) => (
                      <div className="grammar-mistake" key={index}>
                        {mistake.context && (
                          <p className="grammar-mistake-context">
                            <strong>Ngữ cảnh: </strong>
                            {mistake.context}
                          </p>
                        )}
                        <p className="grammar-incorrect">
                          <strong>
                            {mistake.context
                              ? "Tránh trong ngữ cảnh này: "
                              : "Tránh: "}
                          </strong>
                          <span lang="en">{mistake.wrong}</span>
                        </p>
                        <p className="grammar-correct">
                          <strong>Nên dùng: </strong>
                          <span lang="en">{mistake.correct}</span>
                        </p>
                        <p>{mistake.explanation}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {article.comparisons.map((comparison, index) => (
                <details className="grammar-detail" key={`comparison-${index}`}>
                  <summary>
                    {comparison.title}
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <div className="grammar-detail-body">
                    <p>{comparison.explanation}</p>
                    {comparison.examples && (
                      <Examples examples={comparison.examples} />
                    )}
                  </div>
                </details>
              ))}
              {article.details.map((detail, index) => (
                <details className="grammar-detail" key={`detail-${index}`}>
                  <summary>
                    {detail.title}
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <div className="grammar-detail-body">
                    {detail.paragraphs.map((paragraph, paragraphIndex) => (
                      <p key={paragraphIndex}>{paragraph}</p>
                    ))}
                    {detail.examples && <Examples examples={detail.examples} />}
                  </div>
                </details>
              ))}
            </div>

            <section
              className="grammar-sources"
              aria-labelledby="grammar-sources-heading"
            >
              <h2 id="grammar-sources-heading">Nguồn tham khảo</h2>
              <p>
                Nội dung tiếng Việt và ví dụ được biên soạn lại để tra cứu. Mở
                nguồn để xem giải thích gốc và ngữ cảnh đầy đủ.
              </p>
              <ul>
                {article.sources.map((source, index) => {
                  const url = sourceUrl(source.url);
                  return (
                    <li key={`${index}-${source.url}`}>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {source.title}
                          <ExternalLink size={15} aria-hidden="true" />
                          <span className="grammar-visually-hidden">
                            {" "}
                            (mở thẻ mới)
                          </span>
                        </a>
                      ) : (
                        <span>{source.title}</span>
                      )}
                      <span className="grammar-source-date">
                        Đối chiếu ngày {sourceDate(source.accessedAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </article>
        </>
      ) : (
        <>
          <div className="grammar-intro">
            <span className="grammar-eyebrow">
              <BookOpen size={15} aria-hidden="true" />
              NHỚ LẠI ĐỂ DÙNG ĐÚNG
            </span>
            <h1 id="grammar-heading" tabIndex={-1}>
              Tra cứu ngữ pháp
            </h1>
            <p>
              Tìm chủ điểm cần xem lại, đọc tóm tắt và mở rộng phần giải thích
              khi cần. Kiến thức được nhóm theo cách dùng để bạn tra nhanh.
            </p>
            {usesBritishCouncil && !usesCambridge && (
              <p className="grammar-provenance">
                Nguồn chính: British Council LearnEnglish. Nội dung tiếng Việt
                và ví dụ được biên soạn lại; trang nguồn đã đối chiếu được dẫn ở
                cuối từng bài.
              </p>
            )}
          </div>

          <div className="grammar-tools">
            <label className="grammar-search" htmlFor="grammar-search-input">
              <Search size={19} aria-hidden="true" />
              <span className="grammar-visually-hidden">
                Tìm chủ điểm ngữ pháp
              </span>
              <input
                id="grammar-search-input"
                ref={searchInput}
                type="search"
                autoComplete="off"
                aria-label="Tìm chủ điểm ngữ pháp"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ví dụ: bị động, bi dong, passive"
                aria-describedby="grammar-search-help"
                aria-controls="grammar-results"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    searchInput.current?.focus();
                  }}
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              )}
            </label>
            <p id="grammar-search-help">
              Tìm bằng tiếng Việt có dấu, không dấu hoặc tên tiếng Anh.
            </p>
            <fieldset className="grammar-groups">
              <legend>Lọc theo nhóm kiến thức</legend>
              <button
                type="button"
                className={!groupId ? "selected" : ""}
                aria-pressed={!groupId}
                onClick={() => setGroupId(undefined)}
              >
                Tất cả <span>{articles.length}</span>
              </button>
              {groups.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={groupId === item.id ? "selected" : ""}
                  aria-pressed={groupId === item.id}
                  onClick={() => setGroupId(item.id)}
                >
                  {item.title}
                  <span>
                    {
                      articles.filter((entry) => entry.groupId === item.id)
                        .length
                    }
                  </span>
                </button>
              ))}
            </fieldset>
          </div>

          <div className="grammar-result-heading">
            <p role="status" aria-live="polite" aria-atomic="true">
              {results.length} chủ điểm
              {query.trim() ? ` cho “${query.trim()}”` : ""}
              {activeGroup ? ` · ${activeGroup.title}` : ""}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters}>
                Xóa bộ lọc
              </button>
            )}
          </div>

          <div id="grammar-results" className="grammar-catalog">
            {results.length === 0 ? (
              <div className="grammar-empty">
                <Search size={25} aria-hidden="true" />
                <h2>Chưa tìm thấy chủ điểm phù hợp</h2>
                <p>Thử từ khóa ngắn hơn, tên tiếng Anh hoặc chọn nhóm khác.</p>
                {hasFilters && (
                  <button type="button" onClick={clearFilters}>
                    Xem tất cả chủ điểm
                  </button>
                )}
              </div>
            ) : (
              catalogGroups.map((item) => {
                const groupResults = results.filter(
                  (entry) => entry.groupId === item.id,
                );
                if (groupResults.length === 0) return null;
                return (
                  <section
                    className="grammar-catalog-group"
                    key={item.id}
                    aria-labelledby={`grammar-group-${item.id}`}
                  >
                    <div className="grammar-group-intro">
                      <h2 id={`grammar-group-${item.id}`}>{item.title}</h2>
                      <p>{item.description}</p>
                    </div>
                    <div className="grammar-cards">
                      {groupResults.map((entry) => (
                        <button
                          type="button"
                          className="grammar-card"
                          key={entry.id}
                          data-grammar-id={entry.id}
                          ref={(element) => {
                            if (element)
                              resultButtons.current.set(entry.id, element);
                            else resultButtons.current.delete(entry.id);
                          }}
                          onClick={() => setArticleId(entry.id)}
                          aria-label={`Xem ${entry.title}`}
                        >
                          <span className="grammar-card-copy">
                            <strong>{entry.title}</strong>
                            <span>{entry.summary}</span>
                          </span>
                          <ArrowRight size={18} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}
