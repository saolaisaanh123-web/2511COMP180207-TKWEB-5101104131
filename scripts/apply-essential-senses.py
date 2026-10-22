"""Append explicitly reviewed core senses; preview is read-only by default.

This is a separate, additive layer after the historical source/full review.
Pinned authoring documents and the original 5,558 records are not rewritten.
"""

import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re
import runpy

from corpus_io import read_records, serialize_records

ROOT = Path(__file__).resolve().parents[1]
UPDATE = ROOT / "data/authoring/essential-senses-2026-10-22.json"
VOCABULARY = ROOT / "public/data/vocabulary.txt"


def digest(value):
    return hashlib.sha256(value).hexdigest()


def ids_digest(records):
    return digest("\n".join(row["id"] for row in records).encode())


def load_essential_senses(path=UPDATE, required=False):
    path = Path(path)
    if not path.exists() and not required:
        return None
    review = json.loads(path.read_text(encoding="utf-8"))
    baseline = review.get("baseline", {})
    if not isinstance(baseline.get("entryCount"), int) or baseline["entryCount"] < 1:
        raise ValueError("Essential senses require a stable baseline")
    for key in ("idsSha256", "vocabularySha256"):
        if not re.fullmatch(r"[a-f0-9]{64}", baseline.get(key, "")):
            raise ValueError("Essential senses require a pinned baseline hash")
    seen = set()
    facts = json.loads((ROOT / "data/lexicons/american-oxford-2026-10.json").read_text(encoding="utf-8"))["facts"]
    for entry in review.get("entries", []):
        word, source, fact = entry.get("word", {}), entry.get("source", {}), entry.get("americanFact", {})
        if not word.get("id") or word["id"] in seen or word["id"] in {"__proto__", "constructor", "prototype"}:
            raise ValueError("Essential senses need distinct explicit stable IDs")
        seen.add(word["id"])
        if any(not isinstance(value, str) or "\n" in value or "\r" in value for value in word.values()):
            raise ValueError("Essential sense TXT values must be single-line strings")
        for key in ("word", "part_of_speech", "meaning_vi", "definition_en", "example_en", "example_vi"):
            if not word.get(key, "").strip():
                raise ValueError("Essential senses cannot contain missing teaching content")
        if word.get("learning_status") != "ready" or word.get("content_status") != "reviewed":
            raise ValueError("Essential sense content must be explicitly reviewed")
        if not re.search(r"(?<!\w)" + re.escape(word["word"]) + r"(?!\w)", word["example_en"], re.I):
            raise ValueError("Essential sense context must contain the target answer")
        if not source.get("url", "").startswith("https://www.oxfordlearnersdictionaries.com/definition/american_english/") or source.get("status") != 200 or not re.fullmatch(r"[a-f0-9]{64}", source.get("sha256", "")):
            raise ValueError("Essential senses need directly read American dictionary evidence")
        if not re.match(r"^\d{4}-\d{2}-\d{2}", source.get("checkedAt", "")):
            raise ValueError("Essential dictionary evidence requires an actual date")
        if fact.get("word") != word["word"] or fact.get("cefr") != word.get("level") or fact.get("pos") != "v." or word["part_of_speech"] != "verb":
            raise ValueError("Essential sense/POS/CEFR must match the exact American list fact")
        index = entry.get("americanFactIndex")
        if not isinstance(index, int) or index < 0 or index >= len(facts) or facts[index] != fact:
            raise ValueError("Essential sense must retain the exact pinned American fact, including homograph/sense")
    if not seen:
        raise ValueError("Essential sense additions cannot be implicit or empty")
    return review


def applies_to(records, review):
    return bool(review and len(records) >= review["baseline"]["entryCount"] and
                ids_digest(records[:review["baseline"]["entryCount"]]) == review["baseline"]["idsSha256"])


def separate_essential_senses(records, review=None):
    """Allow older overlays to replay their prefix without silently losing a newer layer."""
    review = review or load_essential_senses()
    if not applies_to(records, review):
        return deepcopy(records), []
    size = review["baseline"]["entryCount"]
    declared = [entry["word"] for entry in review["entries"]]
    tail = records[size:]
    if len(tail) > len(declared) or [r["id"] for r in tail] != [r["id"] for r in declared[:len(tail)]]:
        raise ValueError("Undeclared records or reordered essential senses after the stable baseline")
    for actual, expected in zip(tail, declared):
        if any(actual.get(key, "") != value for key, value in expected.items()):
            raise ValueError("An essential sense has conflicting declared fields; update its authoring record first")
    return deepcopy(records[:size]), deepcopy(tail)


def apply_essential_senses(records, review=None):
    review = review or load_essential_senses()
    if not applies_to(records, review):
        return deepcopy(records)
    base, tail = separate_essential_senses(records, review)
    by_id = {row["id"] for row in base}
    declared = [entry["word"] for entry in review["entries"]]
    if any(row["id"] in by_id for row in declared):
        raise ValueError("Essential sense ID collides with an existing stable ID")
    return base + tail + deepcopy(declared[len(tail):])


def add_provenance(documents, records, text, review=None):
    review = review or load_essential_senses()
    if not applies_to(records, review):
        return documents
    summary = {
        "reviewId": review["reviewId"], "date": review["date"],
        "canonicalVocabularySha256": digest(text.encode()),
        "addedEntries": len(review["entries"]),
        "scope": review["scope"],
    }
    for document in documents.values():
        if isinstance(document, dict):
            document["essentialSenses"] = deepcopy(summary)
    documents["essential-senses-provenance.json"] = {
        "reviewId": review["reviewId"], "date": review["date"],
        "baseline": deepcopy(review["baseline"]),
        "canonicalVocabularySha256": digest(text.encode()),
        "scope": review["scope"], "addedEntries": len(review["entries"]),
        "entries": deepcopy(review["entries"]),
    }
    return documents


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("/tmp/jeongyeon-essential-senses.preview.txt"))
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    if args.output.resolve() == VOCABULARY.resolve() and not args.write:
        parser.error("Replacing canonical TXT requires --write")
    before = VOCABULARY.read_bytes()
    review = load_essential_senses(required=True)
    records = read_records(VOCABULARY)
    if not applies_to(records, review):
        raise ValueError("Essential senses cannot apply to an unrelated or shorter corpus")
    records = apply_essential_senses(records, review)
    text = serialize_records(records)
    source_update = runpy.run_path(str(ROOT / "scripts/apply-source-update.py"))
    update = source_update["load_source_update"]()
    names = ("oxford-provenance.json", "frequency-provenance.json", "content-review-provenance.json")
    documents = source_update["update_provenance"](records, text, update, *[
        json.loads((ROOT / "public/data" / name).read_text()) for name in names
    ])
    add_provenance(documents, records, text, review)
    destination = VOCABULARY if args.write else args.output
    destination.parent.mkdir(parents=True, exist_ok=True)
    if args.write and VOCABULARY.read_bytes() != before:
        raise RuntimeError("Canonical TXT changed while preparing additions; rerun against latest file")
    destination.write_text(text, encoding="utf-8")
    if args.write:
        for name, document in documents.items():
            (ROOT / "public/data" / name).write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        manifest = {"version": digest(text.encode()), "entryCount": len(records), "bytes": len(text.encode())}
        (ROOT / "public/data/vocabulary-version.json").write_text(json.dumps(manifest, indent=2) + "\n")
    else:
        assert VOCABULARY.read_bytes() == before
    print(f"Essential senses: {len(review['entries'])} declared; {len(records)} canonical records; {'applied' if args.write else 'preview only'}")


if __name__ == "__main__":
    main()
