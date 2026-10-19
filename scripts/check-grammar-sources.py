#!/usr/bin/env python3
"""Read-only live check of the exact reference URLs used by grammar articles.

CI uses the offline source-integrity tests. Run this explicitly when reviewing
or refreshing content; publisher availability is not a stable CI dependency.
Only response metadata is written to --report, never the source article text.
"""
import argparse
import concurrent.futures
import hashlib
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]


class ArticleInfo(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.title = []
        self.depth = 0
        self.started = False
        self.body = []

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.in_title = True
        if tag == "div":
            if self.depth:
                self.depth += 1
            elif not self.started and "field--name-body" in dict(attrs).get("class", "").split():
                self.started = True
                self.depth = 1

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "div" and self.depth:
            self.depth -= 1

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.depth:
            self.body.append(data)


def check(url):
    checked = datetime.now(ZoneInfo("Asia/Bangkok")).isoformat(timespec="seconds")
    result = {"url": url, "checkedAt": checked, "ok": False}
    try:
        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme != "https" or parsed.hostname != "learnenglish.britishcouncil.org" or parsed.username:
            raise ValueError("Unexpected source host or scheme")
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "text/html"})
        with urllib.request.urlopen(request, timeout=30) as response:
            data = response.read(3 * 1024 * 1024)
            result.update(status=response.status, finalURL=response.url, bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
        info = ArticleInfo()
        info.feed(data.decode("utf-8", errors="replace"))
        title = " ".join(" ".join(info.title).split())
        body = " ".join(" ".join(info.body).split())
        result.update(title=title, articleCharacters=len(body))
        if result["status"] != 200 or re.search(r"just a moment|access denied|not found", title, re.I):
            raise ValueError("Publisher did not return an article")
        if not info.started or len(body) < 80:
            raise ValueError("No readable grammar article body")
        if urllib.parse.urlsplit(result["finalURL"]).hostname != parsed.hostname:
            raise ValueError("Unexpected cross-site redirect")
        result["ok"] = True
    except (OSError, ValueError, urllib.error.URLError) as error:
        result["error"] = str(error)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    articles = []
    for path in sorted((ROOT / "data/grammar").glob("*.json")):
        articles.extend(json.loads(path.read_text(encoding="utf-8")))
    urls = sorted({source["url"].split("#", 1)[0] for article in articles for source in article["sources"]})
    if not urls:
        raise SystemExit("No authored grammar sources to check")
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        results = list(executor.map(check, urls))
    report = {"articles": len(articles), "sourceCount": len(urls), "passed": sum(row["ok"] for row in results), "results": results}
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Grammar articles: {len(articles)}; source pages: {report['passed']}/{len(urls)} passed")
    for row in results:
        if not row["ok"]:
            print(f"FAIL {row['url']}: {row.get('error', 'unavailable')}")
    return 0 if all(row["ok"] for row in results) else 1


if __name__ == "__main__":
    sys.exit(main())
