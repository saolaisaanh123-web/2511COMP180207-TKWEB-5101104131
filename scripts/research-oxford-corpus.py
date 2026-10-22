"""Fetch private, resumable Oxford evidence for editorial corpus review.

This never edits vocabulary, marks an entry ready, or copies publisher content
into the shipped app. Review packets contain publisher text for private
comparison only. A matching headword/POS is not semantic verification.

Requires lxml in the research environment (not an application dependency).
Default output is outside the repository. Example:
  python3 scripts/research-oxford-corpus.py --function-words --fetch
  python3 scripts/research-oxford-corpus.py --ids /tmp/missing-wordnet.json --fetch
"""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import threading
import time
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urldefrag, urlparse
from urllib.request import Request, urlopen

from corpus_io import read_records

try:
    from lxml import html
except ImportError as exc:
    raise SystemExit("Research extraction requires lxml; the app does not.") from exc


ROOT = Path(__file__).resolve().parents[1]
BASE = "https://www.oxfordlearnersdictionaries.com"
INDEX_URL = BASE + "/wordlists/oxford3000-5000"
DEFAULT_OUT = Path("/workspace/scratch/jeongyeon-full-review")
CONTENT_POS = {"noun", "verb", "adjective", "adverb"}


def normalize(value):
    value = unicodedata.normalize("NFKC", value).casefold()
    return re.sub(r"\s+", " ", value.replace("’", "'").strip())


def text(node):
    return " ".join(node.text_content().split())


def classes(node, name):
    return node.xpath('.//*[contains(concat(" ",normalize-space(@class)," ")," ' + name + ' ")]')


def unique(values):
    return list(dict.fromkeys(value for value in values if value))


def source_record(url, data, status, final_url, checked_at):
    return {"url": url, "finalURL": final_url, "status": status,
            "checkedAt": checked_at, "sha256": hashlib.sha256(data).hexdigest(),
            "bytes": len(data)}


class Research:
    def __init__(self, out):
        self.out = out
        self.cache = out / "cache"
        self.cache.mkdir(parents=True, exist_ok=True)
        self.stop = threading.Event()
        self.lock = threading.Lock()
        self.blocks = 0

    def fetch(self, url):
        url = urldefrag(url)[0]
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname != "www.oxfordlearnersdictionaries.com":
            raise ValueError("Research fetch accepts official HTTPS Oxford URLs only")
        key = hashlib.sha256(url.encode()).hexdigest()
        body_path, meta_path = self.cache / (key + ".html"), self.cache / (key + ".json")
        if body_path.exists() and meta_path.exists():
            body = body_path.read_bytes()
            meta = json.loads(meta_path.read_text())
            if hashlib.sha256(body).hexdigest() != meta.get("sha256") or meta.get("url") != url:
                raise ValueError("Cached source hash/URL mismatch")
            return body, {**meta, "cacheHit": True}
        if self.stop.is_set():
            raise RuntimeError("Stopped after repeated publisher/proxy blocking; no bypass attempted")
        time.sleep(0.25)
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(request, timeout=40) as response:
                body, status, final_url = response.read(), response.status, response.url
            if status != 200:
                raise ValueError(f"Unexpected HTTP {status}")
            meta = source_record(url, body, status, final_url,
                                 datetime.now(timezone.utc).isoformat(timespec="seconds"))
            body_path.write_bytes(body)
            meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n")
            return body, {**meta, "cacheHit": False}
        except (HTTPError, URLError) as exc:
            if getattr(exc, "code", None) in (403, 429) or "403" in str(exc):
                with self.lock:
                    self.blocks += 1
                    if self.blocks >= 5:
                        self.stop.set()
            raise

    def index(self):
        data, meta = self.fetch(INDEX_URL)
        doc = html.fromstring(data)
        rows = []
        for item in doc.xpath('//li[@data-hw]'):
            anchors = item.xpath('./a[contains(@href,"/definition/")]')
            if not anchors:
                continue
            pos = classes(item, "pos")
            rows.append({"word": item.attrib["data-hw"], "pos": text(pos[0]) if pos else "",
                         "url": urljoin(BASE, anchors[0].attrib["href"]),
                         "cefr": item.attrib.get("data-ox5000", "")})
        if len(rows) < 4000:
            raise ValueError("Official index did not contain expected actual lexical links")
        result = {"source": meta, "title": doc.xpath('string(//title)'), "rows": rows}
        (self.out / "official-index.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
        return rows

    def parse_entry(self, url):
        data, source = self.fetch(url)
        doc = html.fromstring(data)
        entries = doc.xpath('//*[@id="entryContent"]')
        if not entries:
            raise ValueError("No lexical entry content; search/home/challenge is not a definition")
        entry = entries[0]
        heads = classes(entry, "headword") or classes(entry, "h")
        positions = classes(entry, "pos")
        if not heads or not positions:
            raise ValueError("No entry headword/POS")
        # Sense blocks keep grammar/labels beside the particular meaning. Nested
        # idioms are separate lexical material and never silently selected.
        sense_nodes = classes(entry, "sense") or classes(entry, "sn-g")
        if not sense_nodes:
            sense_nodes = [entry]
        senses = []
        for sense in sense_nodes:
            definitions = classes(sense, "def")
            if not definitions:
                continue
            senses.append({"anchor": sense.attrib.get("id", ""),
                           "definitions": unique(text(x) for x in definitions),
                           "examples": unique(text(x) for x in classes(sense, "x")),
                           "patterns": unique(text(x) for x in classes(sense, "cf")),
                           "labels": unique(text(x) for k in ("grammar", "gram", "reg", "geo") for x in classes(sense, k))})
        if not senses:
            raise ValueError("No definitions in lexical entry")
        ipa = []
        for scope in entry.xpath('.//*[@geo="n_am"]'):
            for phon in classes(scope, "phon"):
                ipa.append("".join(phon.xpath('./text()')).strip().strip("/"))
        for scope in classes(entry, "phons_n_am"):
            ipa.extend(text(x).strip("/") for x in classes(scope, "phon"))
        links = unique(urljoin(BASE, a.attrib["href"]) for a in entry.xpath('.//a[contains(@href,"/definition/")]'))
        for script in entry.xpath('.//script|.//style|.//*[@id="ring-links-box"]'):
            script.drop_tree()
        return {"source": {**source, "title": doc.xpath('string(//title)')},
                "headword": text(heads[0]), "pos": text(positions[0]),
                "ipaNorthAmerican": unique(ipa), "senses": senses,
                "entryText": text(entry), "relatedLinks": links}


def pos_matches(wanted, actual):
    wanted, actual = normalize(wanted), normalize(actual)
    if wanted == "article":
        return "article" in actual
    if wanted == "interjection":
        return actual in {"exclamation", "interjection"}
    return wanted == actual or wanted in re.split(r"\s*(?:,|/|and)\s*", actual)


def candidate_urls(record, index):
    words = unique(normalize(w) for w in [record["word"], record.get("preferred_us_spelling", ""),
                                         *record.get("accepted_answers", "").split("|")])
    if record["word"] == "a, an":
        words += ["a", "an"]
    matching = [x for x in index if normalize(x["word"]) in words and pos_matches(record["part_of_speech"], x["pos"])]
    # Actual publisher href is the fallback; the American variant is a candidate
    # only and must pass exact returned headword/POS checks after fetching.
    urls = []
    for item in matching:
        urls += [item["url"].replace("/definition/english/", "/definition/american_english/"), item["url"]]
    for url in re.findall(r"https://www\.oxfordlearnersdictionaries\.com/definition/[^\s;|]+", record.get("source", "")):
        urls.append(url.rstrip(".,)"))
    return unique(urls)


def packet(research, row, index):
    attempts = []
    aliases = {normalize(x) for x in [row["word"], row.get("preferred_us_spelling", ""), *row.get("accepted_answers", "").split("|")] if x}
    if row["word"] == "a, an":
        aliases |= {"a", "an"}
    for url in candidate_urls(row, index):
        try:
            evidence = research.parse_entry(url)
            headword = re.sub(r"\d+$", "", evidence["headword"]).strip()
            if normalize(headword) not in aliases or not pos_matches(row["part_of_speech"], evidence["pos"]):
                attempts.append({"url": url, "error": "returned headword/POS mismatch", "headword": evidence["headword"], "pos": evidence["pos"]})
                continue
            return {"id": row["id"], "word": row["word"], "pos": row["part_of_speech"],
                    "original": row, "evidence": evidence, "attempts": attempts,
                    "status": "source_available_pending_semantic_review"}
        except Exception as exc:
            attempts.append({"url": url, "error": str(exc)})
    return {"id": row["id"], "word": row["word"], "pos": row["part_of_speech"],
            "original": row, "attempts": attempts, "status": "unresolved"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--ids", type=Path, help="JSON list of IDs or objects with id; exact corpus IDs only")
    parser.add_argument("--function-words", action="store_true")
    parser.add_argument("--all", action="store_true", help="Include reviewed entries as well as lookup")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--workers", type=int, choices=(1, 2, 3), default=3)
    parser.add_argument("--fetch", action="store_true", help="Fetch lexical pages; default only builds plan")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    research = Research(args.out)
    index = research.index()
    rows = read_records(ROOT / "public/data/vocabulary.txt")
    if not args.all:
        rows = [x for x in rows if x.get("learning_status") == "lookup"]
    if args.function_words:
        rows = [x for x in rows if x["part_of_speech"] not in CONTENT_POS]
    if args.ids:
        ids = json.loads(args.ids.read_text())
        ids = {x if isinstance(x, str) else x["id"] for x in ids}
        rows = [x for x in rows if x["id"] in ids]
        if ids - {x["id"] for x in rows}:
            raise ValueError("Requested IDs absent from selected corpus")
    if args.limit is not None:
        rows = rows[:args.limit]
    plan = [{"id": x["id"], "word": x["word"], "pos": x["part_of_speech"], "candidates": candidate_urls(x, index)} for x in rows]
    (args.out / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"planned": len(plan), "withoutCandidates": sum(not x["candidates"] for x in plan), "fetch": args.fetch}), flush=True)
    if not args.fetch:
        return
    packets = []
    with (args.out / "review-packets.jsonl").open("w") as output:
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            pending = {pool.submit(packet, research, x, index): x for x in rows}
            for future in as_completed(pending):
                result = future.result()
                packets.append(result)
                output.write(json.dumps(result, ensure_ascii=False) + "\n")
                output.flush()
                if len(packets) % 20 == 0 or len(packets) == len(rows):
                    print(json.dumps({"completed": len(packets), "total": len(rows), "sourceAvailable": sum(x["status"] != "unresolved" for x in packets), "blocked": research.blocks}), flush=True)
    packets.sort(key=lambda x: next(i for i, row in enumerate(rows) if row["id"] == x["id"]))
    (args.out / "review-packets.json").write_text(json.dumps(packets, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
