"""Apply the newest source-backed editorial review without rebuilding vocabulary.

The JSON manifest can contain entries or relative JSON shards. Every reviewed
sense needs its own successful source evidence and original bilingual example.
Default execution previews outside the checkout; --write is explicit. Publisher
bodies are never imported into the application by this script.
"""

import argparse
from collections import Counter
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re
import runpy
from urllib.parse import urlparse

from corpus_io import read_records, serialize_records

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public/data"
VOCABULARY = DATA / "vocabulary.txt"
UPDATE = ROOT / "data/authoring/full-review-2026-10.json"
ESSENTIAL_SENSES = runpy.run_path(str(ROOT / "scripts/apply-essential-senses.py"))
IDENTITY = ("id", "word", "part_of_speech")
REQUIRED_CONTENT = ("meaning_vi", "definition_en", "example_en", "example_vi")
OPTIONAL_CONTENT = ("collocation", "ipa", "register", "region", "example_type", "definition_source")
ENTRY_KEYS = set(IDENTITY + REQUIRED_CONTENT + OPTIONAL_CONTENT + ("source_evidence", "review_note", "previous_part_of_speech", "previous_fields"))
POS_CORRECTION = {"ox-76658a7ce8e611-01": ("diplomatic", "noun", "adjective")}
TRUSTED_HOSTS = {
    "www.oxfordlearnersdictionaries.com", "oxfordlearnersdictionaries.com",
    "dictionary.cambridge.org", "dictionaryblog.cambridge.org",
    "learnenglish.britishcouncil.org", "www.merriam-webster.com",
    "www.britannica.com", "www.collinsdictionary.com", "www.ldoceonline.com",
    "www.ahdictionary.com", "wordnet.princeton.edu", "en-word.net",
    "github.com", "raw.githubusercontent.com",
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def ids_digest(records):
    return digest("\n".join(row["id"] for row in records).encode("utf-8"))


def _single_line(value, label, nonempty=True):
    if not isinstance(value, str) or value.strip() != value or "\n" in value or "\r" in value or (nonempty and not value):
        raise ValueError(f"Full review requires a canonical single-line string: {label}")


def _date(value, label):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError(f"Full review requires an ISO date: {label}")


def reference_only_meaning(value):
    """Recognize dictionary redirects without rejecting Vietnamese verbs.

    'xem xét', 'xem như', 'xem là', 'xem lại' and 'xem qua' express real
    meanings. A bare 'xem bee' / 'xem globalisation' is an English-headword
    redirect. Do not mistake every sentence starting with xem for a redirect.
    """
    if re.match(r"\s*(?:\(\s*như\s*\)|xem mục|xem thêm|see(?: also)?|→|=>|=)\s+\S", value, re.I):
        return True
    bare = re.fullmatch(r"\s*xem\s+([A-Za-z][A-Za-z' -]*)[.]?\s*", value, re.I)
    return bool(bare and bare.group(1).strip().lower() not in {
        "qua", "ra", "phim", "video", "clip", "tv", "tivi", "ti vi",
    })


def _evidence(value, sources, entry_id):
    evidence = value if isinstance(value, list) else [value]
    if not evidence or any(not isinstance(item, dict) for item in evidence):
        raise ValueError(f"Full review needs directly read evidence: {entry_id}")
    result = []
    for item in evidence:
        item = deepcopy(item)
        if "source_id" in item:
            if item["source_id"] not in sources:
                raise ValueError(f"Unknown evidence source: {entry_id}:{item['source_id']}")
            item = {**sources[item["source_id"]], **item}
        url = item.get("url", "")
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname not in TRUSTED_HOSTS or parsed.username or parsed.password:
            raise ValueError(f"Full review needs an approved HTTPS dictionary source: {entry_id}:{url}")
        if parsed.hostname in ("github.com", "raw.githubusercontent.com") and not parsed.path.startswith("/globalwordnet/english-wordnet/"):
            raise ValueError(f"GitHub evidence must use the official English WordNet repository: {entry_id}")
        if item.get("status") != 200 or not re.fullmatch(r"[a-f0-9]{64}", item.get("sha256", "")):
            raise ValueError(f"Full review evidence needs HTTP 200 and a body digest: {entry_id}")
        _date(item.get("checkedAt"), f"source:{entry_id}")
        _single_line(item.get("scope"), f"source scope:{entry_id}")
        result.append(item)
    return result


def load_full_review(path=UPDATE, required=True):
    path = Path(path)
    if not path.exists() and not required:
        return None
    review = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(review, dict):
        raise ValueError("Full review manifest must be an object")
    review = deepcopy(review)
    entries = review.get("entries", [])
    if not isinstance(entries, list):
        raise ValueError("Full review entries must be an array")
    files = [{"path": str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else path.name, "sha256": digest(path.read_bytes())}]
    for shard in review.get("shards", []):
        if not isinstance(shard, str) or not shard or Path(shard).is_absolute():
            raise ValueError("Review shard paths must be relative to the manifest")
        target = (path.parent / shard).resolve()
        if not target.is_relative_to(path.parent.resolve()):
            raise ValueError("Review shard escapes the authoring directory")
        document = json.loads(target.read_text(encoding="utf-8"))
        shard_entries = document if isinstance(document, list) else document.get("entries")
        if not isinstance(shard_entries, list):
            raise ValueError(f"Review shard requires an entries array: {shard}")
        entries.extend(shard_entries)
        files.append({"path": str(target.relative_to(ROOT)) if target.is_relative_to(ROOT) else shard, "sha256": digest(target.read_bytes())})
    review["entries"] = entries
    review["_files"] = files
    validate_full_review(review)
    return review


def validate_full_review(review):
    _single_line(review.get("reviewId"), "reviewId")
    _date(review.get("date"), "date")
    baseline = review.get("baseline", {})
    if not isinstance(baseline.get("entryCount"), int) or baseline["entryCount"] < 1:
        raise ValueError("Full review needs a pinned baseline entryCount")
    for field in ("idsSha256", "vocabularySha256"):
        if not re.fullmatch(r"[a-f0-9]{64}", baseline.get(field, "")):
            raise ValueError(f"Full review needs a pinned baseline {field}")
    sources = review.get("sources", {})
    if isinstance(sources, list):
        sources = {item["id"]: item for item in sources}
    if not isinstance(sources, dict):
        raise ValueError("Full review sources must be a mapping or list with IDs")
    entries = review.get("entries")
    if not isinstance(entries, list) or not entries:
        raise ValueError("Full review cannot promote an empty or implicit set of entries")
    seen = set()
    for row in entries:
        if not isinstance(row, dict) or set(row) - ENTRY_KEYS:
            raise ValueError(f"Full review contains unsupported entry fields: {set(row) - ENTRY_KEYS if isinstance(row, dict) else row}")
        for field in IDENTITY + REQUIRED_CONTENT:
            _single_line(row.get(field), f"{row.get('id')}:{field}")
        if row["id"] in seen:
            raise ValueError(f"Duplicate reviewed stable ID: {row['id']}")
        seen.add(row["id"])
        for field in OPTIONAL_CONTENT + ("review_note", "previous_part_of_speech"):
            if field in row:
                _single_line(row[field], f"{row['id']}:{field}", nonempty=False)
        if row.get("previous_part_of_speech"):
            correction = (row["word"], row["previous_part_of_speech"], row["part_of_speech"])
            if POS_CORRECTION.get(row["id"]) != correction:
                raise ValueError(f"Undeclared POS correction: {row['id']}")
        if row.get("example_type", "authored") not in ("authored", "no-cloze"):
            raise ValueError(f"Full review examples must be explicitly authored: {row['id']}")
        if row.get("definition_source", "oewn") not in ("oewn", "authored"):
            raise ValueError(f"Full review must identify the English definition's authorship: {row['id']}")
        if not any(c.isalpha() for c in row["meaning_vi"]) or reference_only_meaning(row["meaning_vi"]):
            raise ValueError(f"Full review needs a real selected meaning, not a cross-reference: {row['id']}")
        if "previous_fields" in row and (not isinstance(row["previous_fields"], dict) or any(not isinstance(k, str) or not isinstance(v, str) for k, v in row["previous_fields"].items())):
            raise ValueError(f"Review previous_fields must be string TXT fields: {row['id']}")
        evidence = _evidence(row.get("source_evidence"), sources, row["id"])
        if row.get("previous_part_of_speech") and not any(
            "/diplomatic" in urlparse(item["url"]).path or item.get("lemma") == "diplomatic"
            for item in evidence
        ):
            raise ValueError("The diplomatic POS correction needs direct evidence for that headword")
    expected = review.get("expectedEntryCount")
    if expected is not None and (not isinstance(expected, int) or expected != len(entries)):
        raise ValueError("Full review shard count does not match expectedEntryCount")


def evidence_for(review, row):
    sources = review.get("sources", {})
    if isinstance(sources, list):
        sources = {item["id"]: item for item in sources}
    return _evidence(row["source_evidence"], sources, row["id"])


def reviewed_fields(review, row):
    """Only these declared/generated fields may differ during older replays."""
    evidence = evidence_for(review, row)
    fields = {key: row[key] for key in IDENTITY + REQUIRED_CONTENT + OPTIONAL_CONTENT if key in row}
    definition_source = row.get("definition_source", "oewn" if any("globalwordnet/english-wordnet" in item["url"] for item in evidence) else "authored")
    attribution = (
        "Định nghĩa Anh: Open English WordNet, CC BY 4.0; có dữ liệu kế thừa Princeton WordNet theo giấy phép gốc. Nghĩa Việt và ví dụ song ngữ do Jeongyeon biên soạn."
        if definition_source == "oewn" else
        "Nghĩa Việt, giải nghĩa Anh và ví dụ song ngữ do Jeongyeon biên soạn."
    )
    fields.update({
        "content_status": "reviewed", "learning_status": "ready",
        "definition_source": definition_source,
        "example_type": row.get("example_type", "authored"),
        "source": "Đối chiếu nghĩa/từ loại: " + " ; ".join(dict.fromkeys(item["url"] for item in evidence)) + " | " + attribution + " Không phải chứng nhận của nhà xuất bản.",
        "note": row.get("review_note") or "Chỉ luyện nghĩa được chọn và từ loại đang hiển thị; đầu từ có thể còn các nghĩa khác. Đã đối chiếu nguồn về nghĩa; ví dụ song ngữ do Jeongyeon biên soạn.",
        "learning_note": "Nghĩa được chọn đã đối chiếu nguồn; nghĩa Việt và ví dụ Anh–Việt tự biên soạn. Không bao gồm mọi nghĩa hoặc bảo đảm đúng tuyệt đối.",
    })
    return fields


def _assert_identity(current, reviewed):
    if current["id"] != reviewed["id"] or current["word"] != reviewed["word"]:
        raise ValueError(f"Full review cannot create or rename an ID/headword: {reviewed['id']}")
    if current.get("part_of_speech") != reviewed["part_of_speech"]:
        exception = POS_CORRECTION.get(reviewed["id"])
        if not exception or (current["word"], current.get("part_of_speech"), reviewed["part_of_speech"]) != exception or reviewed.get("previous_part_of_speech") != exception[1]:
            raise ValueError(f"Full review cannot change a sense's POS without an explicit supported correction: {reviewed['id']}")


def applies_to(records, review):
    """Synthetic/partial inputs are not implicitly coupled to the real corpus."""
    if review is None or len(records) < review["baseline"]["entryCount"]:
        return False
    size = review["baseline"]["entryCount"]
    if ids_digest(records[:size]) != review["baseline"]["idsSha256"]:
        raise ValueError("Full review stable-ID baseline changed")
    return True


def applicable_full_review(records, path=UPDATE):
    review = load_full_review(path, required=False)
    return review if applies_to(records, review) else None


def apply_full_review(records, review):
    validate_full_review(review)
    if not applies_to(records, review):
        raise ValueError("Full review cannot run on a shorter or unrelated corpus")
    original_ids = [row["id"] for row in records]
    if len(set(original_ids)) != len(original_ids):
        raise ValueError("Full review input has duplicate stable IDs")
    records = deepcopy(records)
    by_id = {row["id"]: row for row in records}
    for reviewed in review["entries"]:
        current = by_id.get(reviewed["id"])
        if current is None:
            raise ValueError(f"Full review cannot add a vocabulary record: {reviewed['id']}")
        _assert_identity(current, reviewed)
        forms = [current["word"], current.get("preferred_us_spelling", ""), *current.get("accepted_answers", "").split("|"), *current.get("spelling_variants", "").split("|")]
        if current["word"] == "a, an":
            forms.extend(["a", "an"])
        if reviewed.get("example_type") != "no-cloze" and not any(form and re.search(r"(?<!\w)" + re.escape(form) + r"(?!\w)", reviewed["example_en"], re.I) for form in forms):
            raise ValueError(f"Authored cloze example does not contain an accepted headword form: {reviewed['id']}")
        current.update(reviewed_fields(review, reviewed))
    if original_ids != [row["id"] for row in records]:
        raise ValueError("Full review changed stable ID order")
    return records


def coverage(records, previous=None):
    result = deepcopy(previous or {})
    statuses = Counter(row.get("content_status") for row in records)
    result.update({key: statuses.get(key, 0) for key in ("reviewed", "dictionary", "reference")})
    result.update({
        "entryCount": len(records),
        "withBilingualContext": sum(bool(row.get("example_en")) and bool(row.get("example_vi")) for row in records),
        "missingContext": sum(not row.get("example_en") or not row.get("example_vi") for row in records),
        "learningReady": sum(row.get("learning_status") == "ready" for row in records),
        "lookupOnly": sum(row.get("learning_status") == "lookup" for row in records),
    })
    if "referenceWords" in result:
        result["referenceWords"] = [{"word": row["word"], "part_of_speech": row.get("part_of_speech", "")} for row in records if row.get("content_status") == "reference"]
    return result


def update_documents(records, text, review, documents):
    documents = deepcopy(documents)
    checksum = digest(text.encode("utf-8"))
    counts = coverage(records, documents.get("oxford-provenance.json", {}).get("coverage"))
    evidence = {item["url"]: item for row in review["entries"] for item in evidence_for(review, row)}
    summary = {
        "reviewId": review["reviewId"], "date": review["date"],
        "canonicalVocabularySha256": checksum,
        "reviewedEntries": len(review["entries"]),
        "scope": "Explicit selected meanings and original bilingual contexts reviewed against directly read source evidence. Historical word-list facts are preserved separately; this is not publisher certification or a claim to cover every sense.",
    }
    for name, document in documents.items():
        if not isinstance(document, dict):
            continue
        if name != "frequency-provenance.json" and "coverage" in document:
            document["coverage"] = deepcopy(counts)
        for key in ("canonicalVocabularySha256", "sourceUpdateCanonicalHash"):
            if key in document:
                document[key] = checksum
        if "contentReview" in document:
            document["contentReview"]["canonicalVocabularySha256"] = checksum
            supplemental = document["contentReview"].get("supplementalSourceReview")
            if isinstance(supplemental, dict) and "canonicalVocabularySha256" in supplemental:
                supplemental["canonicalVocabularySha256"] = checksum
        if "currentCanonicalVocabulary" in document:
            document["currentCanonicalVocabulary"]["sha256"] = checksum
        for key in ("supplementalSourceReview",):
            if isinstance(document.get(key), dict) and "canonicalVocabularySha256" in document[key]:
                document[key]["canonicalVocabularySha256"] = checksum
        document["fullVocabularyReview"] = deepcopy(summary)
    documents["full-review-provenance.json"] = {
        **summary, "baseline": deepcopy(review["baseline"]), "files": deepcopy(review.get("_files", [])),
        "coverage": counts, "sources": list(evidence.values()),
        "entries": [{"id": row["id"], "word": row["word"], "partOfSpeech": row["part_of_speech"], "meaningVi": row["meaning_vi"], "evidence": evidence_for(review, row)} for row in review["entries"]],
        "limitations": ["A source match supports a selected sense and part of speech; it does not certify a Vietnamese translation or every authored sentence.", "Oxford CEFR membership, corpus frequency and regional preferences remain separate evidence; they are not inferred from a WordNet match.", "Reading one selected sense is not verification of all senses of a headword."],
    }
    return ESSENTIAL_SENSES["add_provenance"](documents, records, text)


def write_manifest(text, count):
    return {"version": digest(text.encode("utf-8")), "entryCount": count, "bytes": len(text.encode("utf-8"))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=UPDATE)
    parser.add_argument("--output", type=Path, default=Path("/tmp/jeongyeon-full-review.preview.txt"))
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    if args.output.resolve() == VOCABULARY.resolve() and not args.write:
        parser.error("Updating canonical vocabulary.txt requires --write")
    original = VOCABULARY.read_bytes()
    review = load_full_review(args.input)
    records = apply_full_review(read_records(VOCABULARY), review)
    records = ESSENTIAL_SENSES["apply_essential_senses"](records)
    text = serialize_records(records)
    names = ("oxford-provenance.json", "frequency-provenance.json", "content-review-provenance.json", "source-update-provenance.json")
    documents = update_documents(records, text, review, {name: json.loads((DATA / name).read_text(encoding="utf-8")) for name in names if (DATA / name).exists()})
    if args.write:
        if VOCABULARY.read_bytes() != original:
            raise RuntimeError("Canonical TXT changed during review; rerun against its latest version")
        VOCABULARY.write_text(text, encoding="utf-8", newline="\n")
        for name, document in documents.items():
            (DATA / name).write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (DATA / "vocabulary-version.json").write_text(json.dumps(write_manifest(text, len(records)), indent=2) + "\n", encoding="utf-8")
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8", newline="\n")
        args.output.with_suffix(".json").write_text(json.dumps(documents["full-review-provenance.json"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"mode": "write" if args.write else "preview", "reviewed": len(review["entries"]), "coverage": coverage(records), "sha256": digest(text.encode("utf-8"))}, ensure_ascii=False))


if __name__ == "__main__":
    main()
