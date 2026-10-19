"""Preview the reviewed, stable-ID content overlay without rebuilding the corpus.

The committed vocabulary.txt is canonical. Default output is a disposable preview:
  python scripts/apply-content-review.py
Use --write only after reviewing the diff. It intentionally replaces the fields
listed in the 38 review records; other records and unmentioned fields survive.
Edit the authored overlay as well as the canonical TXT when revising these senses.
"""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

from corpus_io import parse_records, read_records, serialize_records
from corpus_policy import (
    KNOWN_FREQUENCY_CONFLATIONS as CONFLATED,
    REVIEWED_SPELLING_VARIANTS,
    apply_reviewed_spelling_variants,
)


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "data/authoring/content-review-2026-10.txt"
VOCABULARY = ROOT / "public/data/vocabulary.txt"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("/tmp/jeongyeon-content-review.preview.txt"))
    parser.add_argument("--write", action="store_true", help="Explicitly update the canonical TXT and its public metadata")
    args = parser.parse_args()
    if args.output.resolve() == VOCABULARY.resolve() and not args.write:
        parser.error("Updating canonical vocabulary.txt requires --write")
    original = VOCABULARY.read_bytes()
    records = parse_records(original.decode("utf-8"))
    by_id = {row["id"]: row for row in records}
    metadata_path = ROOT / "public/data/oxford-provenance.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    all_facts = {fact["sourceFactIndex"]: {k: v for k, v in fact.items() if k not in ("id", "canonicalWord")} for fact in metadata["entries"] + metadata["additionalFacts"]}
    previous_primary = {row["id"]: row["sourceFactIndex"] for row in metadata["entries"]}
    overrides = read_records(REVIEW)
    for override in overrides:
        row = by_id.get(override["id"])
        if row is None or row["word"] != override["word"]:
            raise ValueError(f"Review overlay cannot create or rename an ID: {override['id']}")
        fact = all_facts[int(override["source_fact_index"])]
        if fact["word"] != row["word"]:
            raise ValueError(f"Source fact belongs to a different headword: {row['word']}")
        row.update(override)
        row["level"] = fact["cefr"]
        source = next(source for source in metadata["provenance"]["sources"] if source["list"] == fact["list"])
        row["source"] = (
            "Nghĩa, định nghĩa Anh, ví dụ và ghi chú tự biên soạn, rà lại 2026-10; không phải nội dung định nghĩa Oxford. | "
            f"{fact['list']}, tr. {fact['page']}, dòng: {fact['source_row']} [{fact['cefr']}]. "
            f"Bản PDF lưu: {source['mirror_url']}"
        )
    for row in records:
        ready = row.get("content_status") == "reviewed"
        row["learning_status"] = "ready" if ready else "lookup"
        row.setdefault("learning_note", "")
        if not ready:
            row["learning_note"] = "Chỉ tra cứu, chưa đưa vào bài học: nghĩa hoặc ví dụ chưa được rà thủ công cho nghĩa đang hiển thị."
        elif not row["learning_note"]:
            row["learning_note"] = "Nội dung bài học do ứng dụng biên soạn và rà lại; không phải toàn bộ nghĩa của đầu từ."
        if row["id"] in previous_primary:
            row.setdefault("source_fact_index", str(previous_primary[row["id"]]))
        if row["word"] in CONFLATED:
            row["frequency_zipf"] = ""
            row["frequency_source"] = ""
            row["frequency_note"] = CONFLATED[row["word"]]
    apply_reviewed_spelling_variants(records)
    text = serialize_records(records)
    # Structural and semantic invariants matter more than a forced round count.
    assert [row["id"] for row in records] == [row["id"] for row in parse_records(original.decode("utf-8"))]
    assert len(records) == 5162
    assert len(all_facts) == 5323
    assert sum("oxford-" in row.get("collections", "") for row in records) == 4955
    assert all(any(char.isalpha() for char in row.get("meaning_vi", "")) for row in records if row["learning_status"] == "ready")
    assert all(row.get("example_en") and row.get("example_vi") for row in records if row["learning_status"] == "ready")
    primary = []
    for previous in metadata["entries"]:
        row = by_id[previous["id"]]
        fact = all_facts[int(row["source_fact_index"])]
        primary.append({"id": row["id"], **fact, "canonicalWord": row["word"]})
    selected_indexes = {fact["sourceFactIndex"] for fact in primary}
    metadata["entries"] = primary
    metadata["additionalFacts"] = [all_facts[index] for index in sorted(all_facts) if index not in selected_indexes]
    metadata["coverage"].update({
        "entryCount": len(records),
        **dict(Counter(row["content_status"] for row in records)),
        "withBilingualContext": sum(bool(row.get("example_en")) and bool(row.get("example_vi")) for row in records),
        "missingContext": sum(not row.get("example_en") or not row.get("example_vi") for row in records),
        "learningReady": sum(row["learning_status"] == "ready" for row in records),
        "lookupOnly": sum(row["learning_status"] == "lookup" for row in records),
    })
    metadata["contentReview"] = {"overlay": "../../data/authoring/content-review-2026-10.txt", "entries": len(overrides), "scope": "Targeted modern-meaning corrections and authored bilingual contexts; not an assertion that all Oxford meanings have been reviewed.", "canonicalVocabularySha256": digest(text.encode("utf-8"))}
    provenance = {
        "reviewId": "2026-10-learning-quality",
        "date": "2026-10-18",
        "method": "Targeted editorial review of audit findings. Definitions and bilingual practice examples are original app-authored content. Oxford sourceFactIndex identifies the exact pinned headword/POS/homograph fact, not publisher approval of the authored definition.",
        "overlay": "data/authoring/content-review-2026-10.txt",
        "overlaySha256": digest(REVIEW.read_bytes()),
        "canonicalVocabularySha256": digest(text.encode("utf-8")),
        "reviewedCorrections": [{"id": row["id"], "word": row["word"], "sourceFactIndex": int(row["source_fact_index"]), "meaningVi": row["meaning_vi"]} for row in overrides],
        "coverage": metadata["coverage"],
        "limitations": ["Reviewed means an app editorial check, not external certification or an accuracy guarantee.", "Only one selected sense is taught per current Oxford spelling group; additional source facts remain in oxford-provenance.json.", "Unreviewed historical-source meanings stay searchable with learning_status lookup and are excluded from practice.", "No IPA or recorded audio was invented or added by this review."],
        "spellingReview": {
            "date": "2026-10-20",
            "method": "Explicit editorial spelling alternatives for the existing reviewed sense and part of speech, including regional spellings and established compound-word spellings. No fuzzy matching, synonyms, inflections or additional senses are implied; not publisher certification.",
            "policy": "scripts/corpus_policy.py:REVIEWED_SPELLING_VARIANTS",
            "entries": [
                {"id": entry_id, "word": headword, "partOfSpeech": part_of_speech, "alternatives": list(alternatives)}
                for entry_id, (headword, part_of_speech, alternatives) in REVIEWED_SPELLING_VARIANTS.items()
            ],
        },
    }
    frequency_path = ROOT / "public/data/frequency-provenance.json"
    frequency = json.loads(frequency_path.read_text(encoding="utf-8"))
    old_unscored = {item["id"]: item for item in frequency["unscoredEntries"]}
    for row in records:
        if row["word"] in CONFLATED:
            old_unscored[row["id"]] = {"id": row["id"], "word": row["word"], "reason": "known_case_or_lemma_sense_conflation", "note": CONFLATED[row["word"]]}
    frequency["unscoredEntries"] = [old_unscored[row["id"]] for row in records if not row.get("frequency_zipf")]
    frequency["coverage"]["scored"] = sum(bool(row.get("frequency_zipf")) for row in records)
    frequency["coverage"]["unscored"] = len(frequency["unscoredEntries"])
    frequency["coverage"]["unscoredByReason"] = dict(Counter(item["reason"] for item in frequency["unscoredEntries"]))
    frequency["caseNormalizedScoredHeadwords"] = [item for item in frequency["caseNormalizedScoredHeadwords"] if item["word"] not in CONFLATED]
    frequency["coverage"]["caseNormalizedScoredHeadwords"] = len(frequency["caseNormalizedScoredHeadwords"])
    frequency["coverage"]["caseConflationGroupsPresentInApp"] = []
    frequency["knownConflationExclusions"] = [{"word": word, "note": note} for word, note in CONFLATED.items()]
    frequency["currentCanonicalVocabulary"] = {"filename": "vocabulary.txt", "sha256": digest(text.encode("utf-8"))}
    frequency["historicalExportNote"] = "inputBeforeAttachingMetadata and outputAfterAttachingMetadata describe the original pinned frequency export, before later editorial corrections; currentCanonicalVocabulary identifies the current canonical TXT."
    frequency["method"]["case"] = "Casefolded spelling frequency. Known case/lemma-sense conflations IT, May, March and found are explicitly unscored; other values still do not distinguish senses or POS."
    frequency["method"]["scope"] = "Exact Oxford spellings only, excluding multiword/alternative forms, missing source forms and explicitly documented known conflations."
    if args.write:
        if VOCABULARY.read_bytes() != original:
            raise RuntimeError("Canonical TXT changed while previewing; rerun against the latest file")
        VOCABULARY.write_text(text, encoding="utf-8", newline="\n")
        for path, value in [(metadata_path, metadata), (frequency_path, frequency), (ROOT / "public/data/content-review-provenance.json", provenance)]:
            path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8", newline="\n")
        args.output.with_suffix(".json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"mode": "write" if args.write else "preview", "output": str(VOCABULARY if args.write else args.output), "corrections": len(overrides), "coverage": metadata["coverage"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
