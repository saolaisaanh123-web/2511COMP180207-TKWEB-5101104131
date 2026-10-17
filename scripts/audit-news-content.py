"""Verify sourced expression excerpts against saved publisher pages, then save provenance.

Offline preparation only; normal app builds read the committed TXT and JSON.
Pass research JSON files whose entries include publisher metadata, a saved HTML
path and its SHA256. Full articles are never copied into the published app.
"""
import argparse
from collections import Counter
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)

    def handle_data(self, text):
        if not self.skip:
            self.parts.append(text)


def normalized(text):
    return re.sub(r"\s+", " ", text).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("research", nargs="+", type=Path)
    args = parser.parse_args()
    candidates = [row for path in args.research for row in json.loads(path.read_text())]
    blocks = (ROOT / "data/authoring/news-idioms.txt").read_text().split("\n---\n")
    words = [
        {k: v.strip() for k, v in (line.split(":", 1) for line in block.strip().splitlines())}
        for block in blocks if block.strip()
    ]
    proof = []
    article_words = Counter()
    for word in words:
        matches = [row for row in candidates if row["source_url"] == word["news_url"]
                   and row["source_excerpt"] == word["news_excerpt"]]
        assert len(matches) == 1, f"Missing or ambiguous research: {word['id']}"
        row = matches[0]
        raw = Path(row["fetched_html_path"]).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == row["fetched_html_sha256"], word["id"]
        html = raw.decode("utf-8", "replace")
        text = VisibleText()
        text.feed(html)
        excerpt = normalized(row["source_excerpt"])
        assert excerpt in normalized(" ".join(text.parts)), word["id"]
        assert row["source_date"] in html, word["id"]
        assert 0 < len(excerpt.split()) <= 30, word["id"]
        article_words[row["source_url"]] += len(excerpt.split())
        assert word["news_source"] == row["source_publisher"], word["id"]
        assert word["news_title"] == row["source_title"], word["id"]
        assert word["news_date"] == row["source_date"], word["id"]
        assert word["news_source_type"] == ("reporting" if row["source_type"] == "news" else "language-lesson"), word["id"]
        assert word["expression_type"] == "idiom" and not word["level"], word["id"]
        assert word["word"].casefold() in word["example_en"].casefold(), word["id"]
        proof.append({
            "id": word["id"], "headword": word["word"],
            "sourceTargetPhrase": row["phrase"],
            "publisher": row["source_publisher"], "title": row["source_title"],
            "url": row["source_url"], "publishedDate": row["source_date"],
            "sourceType": word["news_source_type"],
            "editorialCategory": row.get("editorial_category", "news report or interview"),
            "reportingEvidence": row.get("reporting_evidence", row["source_evidence"]),
            "excerpt": row["source_excerpt"], "verifiedOn": row["verified_on"],
            "retrievedAt": row["retrieved_at"],
            "retrievedHtmlSha256": row["fetched_html_sha256"],
        })
    assert len({row["id"] for row in proof}) == len(proof)
    assert all(count <= 90 for count in article_words.values())
    result = {
        "scope": "Selected idioms attested in US publisher news articles, features or interview transcripts; not a frequency-ranked or exhaustive list.",
        "method": "Verified full publisher HTTPS pages and publication metadata; whitespace-normalized short excerpts checked against saved HTML and SHA256. A headline use is identified separately. Inflected forms and article/pronoun variants may differ from the teaching headword.",
        "content": "English explanations, Vietnamese meanings, usage notes and practice examples are authored by Jeongyeon. Short source quotations are separately attributed; publisher articles are not redistributed or licensed as app-authored content.",
        "limitations": [
            "A single attestation does not establish how often an expression is used.",
            "Source dates are historical publication dates, not a claim of current news or current popularity.",
            "Reporting can quote interviewees or political figures; their words are not an editorial endorsement or an independent factual finding.",
            "Broadcast transcripts may contain transcription errors and do not replace listening to the original recording.",
        ],
        "coverage": {"expressions": len(proof), "articles": len(article_words),
                     "publishers": dict(Counter(row["publisher"] for row in proof))},
        "entries": proof,
    }
    (ROOT / "public/data/news-provenance.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result["coverage"], ensure_ascii=False))


if __name__ == "__main__":
    main()
