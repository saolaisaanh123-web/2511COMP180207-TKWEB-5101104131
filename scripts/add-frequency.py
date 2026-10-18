"""Export spelling-level English frequency metadata; optionally attach it to TXT.

Install the pinned requirements in data/frequency/requirements.txt, then run:
  python scripts/add-frequency.py --output /workspace/scratch/lexi-frequency-map.json

Add --apply to update the input TXT with the exported frequency fields.

Only exact, single-token Oxford headwords in the pinned frequency table receive
scores. Multiword expressions are never assigned a score derived from their
component tokens. See public/data/frequency-provenance.json for limitations.
"""

import argparse
from collections import Counter, defaultdict
import hashlib
from importlib import metadata
import json
import math
from pathlib import Path

import wordfreq

from corpus_policy import KNOWN_FREQUENCY_CONFLATIONS


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ID = "wordfreq-3.1.1-en-large"
DATA_SHA256 = "dffae8066b78dce0a6667cf5f58e567054f902674667090a7ac8a8a44628b05c"
WHEEL_SHA256 = "4b1c6ecffc6198be3396d5cf871c4423ca71c907c231348d352dd54d62b97473"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def parse_records(text):
    records = []
    for block in text.lstrip("\ufeff").replace("\r\n", "\n").split("\n---\n"):
        if not block.strip():
            continue
        record = {}
        for line in block.strip().splitlines():
            key, separator, value = line.partition(":")
            if not separator:
                raise ValueError(f"Invalid vocabulary line: {line!r}")
            record[key.strip()] = value.strip()
        if not record.get("id") or not record.get("word"):
            raise ValueError("Every record must have an id and word")
        records.append(record)
    if len({record["id"] for record in records}) != len(records):
        raise ValueError("Duplicate vocabulary IDs")
    return records


def attach_frequency(text, values):
    """Preserve record/field order and non-frequency lines; use UTF-8/LF output."""
    blocks = []
    frequency_fields = ("frequency_zipf", "frequency_source", "frequency_note")
    for block in text.lstrip("\ufeff").replace("\r\n", "\n").split("\n---\n"):
        if not block.strip():
            continue
        lines = block.strip("\n").splitlines()
        record = parse_records("\n".join(lines))[0]
        fields = values[record["id"]]
        found = set()
        for index, line in enumerate(lines):
            key = line.partition(":")[0].strip()
            if key in frequency_fields:
                lines[index] = f"{key}: {fields[key]}".rstrip()
                found.add(key)
        for key in frequency_fields:
            if key not in found and (key != "frequency_note" or fields[key]):
                lines.append(f"{key}: {fields[key]}".rstrip())
        blocks.append("\n".join(lines))
    updated = "\n---\n".join(blocks) + "\n"
    before = parse_records(text)
    after = parse_records(updated)
    without_frequency = lambda record: {key: value for key, value in record.items() if key not in frequency_fields}
    if [without_frequency(row) for row in before] != [without_frequency(row) for row in after]:
        raise ValueError("Attaching frequency metadata changed vocabulary content or stable IDs")
    return updated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vocabulary", type=Path, default=ROOT / "public/data/vocabulary.txt")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--provenance", type=Path, help="Metadata output; defaults beside --output for previews, or public metadata with --apply")
    parser.add_argument("--apply", action="store_true", help="Attach the exported frequency fields to --vocabulary, preserving all other fields and record order")
    args = parser.parse_args()
    if args.output.resolve() == args.vocabulary.resolve():
        parser.error("Frequency JSON output cannot replace the canonical vocabulary TXT")
    if args.provenance is None:
        args.provenance = ROOT / "public/data/frequency-provenance.json" if args.apply else args.output.with_suffix(".provenance.json")
    if not args.apply and args.provenance.resolve() == (ROOT / "public/data/frequency-provenance.json").resolve():
        parser.error("Changing public frequency provenance requires --apply; use a preview metadata path instead")
    if metadata.version("wordfreq") != "3.1.1":
        raise SystemExit("Use wordfreq==3.1.1; changing the source requires a new audit.")
    data_path = Path(wordfreq.__file__).parent / "data/large_en.msgpack.gz"
    if sha256(data_path.read_bytes()) != DATA_SHA256:
        raise SystemExit("English frequency data differs from the audited wordfreq 3.1.1 file.")

    original_bytes = args.vocabulary.read_bytes()
    records = parse_records(original_bytes.decode("utf-8"))
    # Direct table lookup avoids wordfreq's multi-token frequency approximation.
    frequencies = wordfreq.get_frequency_dict("en", wordlist="large")
    result = {}
    unscored = []
    case_normalized = []
    spellings = defaultdict(list)
    for record in records:
        headword = record["word"]
        lookup = headword.casefold()
        collections = {item.strip() for item in record.get("collections", "").split(",")}
        is_oxford = bool(collections & {"oxford-3000", "oxford-5000"})
        reason = ""
        if not is_oxford:
            reason = "outside_oxford_headwords"
        elif headword in KNOWN_FREQUENCY_CONFLATIONS:
            reason = "known_case_or_lemma_sense_conflation"
        elif any(char.isspace() for char in headword) or "," in headword or "/" in headword:
            reason = "multiword_or_alternatives_not_an_observed_phrase_frequency"
        elif lookup not in frequencies:
            reason = "no_exact_spelling_in_pinned_table"
        if reason:
            note = KNOWN_FREQUENCY_CONFLATIONS.get(headword, record.get("frequency_note", ""))
            result[record["id"]] = {"frequency_zipf": "", "frequency_source": "", "frequency_note": note}
            unscored.append({"id": record["id"], "word": headword, "reason": reason, **({"note": note} if note else {})})
            continue
        score = round(9 + math.log10(frequencies[lookup]), 2)
        result[record["id"]] = {"frequency_zipf": f"{score:.2f}", "frequency_source": SOURCE_ID, "frequency_note": record.get("frequency_note", "")}
        spellings[lookup].append(headword)
        if headword != lookup:
            case_normalized.append({"id": record["id"], "word": headword, "lookup": lookup})

    provenance = {
        "sourceId": SOURCE_ID,
        "name": "wordfreq 3.1.1, English large word list",
        "author": "Robyn Speer and the attributed source contributors",
        "homepage": "https://github.com/rspeer/wordfreq/",
        "package": "https://pypi.org/project/wordfreq/3.1.1/",
        "wheel": {
            "url": "https://files.pythonhosted.org/packages/24/61/62835c475d69872d30689f284497853fe33fe1d6dd18f57346d13305861d/wordfreq-3.1.1-py3-none-any.whl",
            "sha256": WHEEL_SHA256,
        },
        "dataFile": {"pathInPackage": "wordfreq/data/large_en.msgpack.gz", "sha256": DATA_SHA256},
        "dataLicense": "CC-BY-SA-4.0",
        "codeLicense": "Apache-2.0",
        "licenseFile": "licenses/CC-BY-SA-4.0.txt",
        "attributionFile": "licenses/wordfreq-NOTICE.txt",
        "upstreamLicenseAndCitations": "licenses/wordfreq-upstream-attribution.txt",
        "method": {
            "language": "en",
            "wordlist": "large",
            "lookup": "Exact casefolded headword lookup in get_frequency_dict; no token-product phrase estimates, lemmatization, synonym substitution or estimated missing values.",
            "metric": "Zipf = 9 + log10(proportion), rounded to 0.01 as quantized by the source. Higher means more frequent; ties have no additional frequency distinction.",
            "unknown": "Empty frequency_zipf and frequency_source; never zero or an invented score.",
            "case": "Casefolded spelling frequency. Known case/lemma-sense conflations IT, May, March and found are explicitly unscored; other values still do not distinguish senses or POS.",
            "scope": "Oxford headwords only. Multiword expressions, alternatives, missing forms and documented known conflations stay unscored.",
        },
        "limitations": [
            "Frequency belongs to a spelling, not a particular meaning, grammatical part of speech, or inflectional lemma family.",
            "General English aggregate across seven source domains: Wikipedia, subtitles (including freely available SUBTLEX data), news, books, web text, Twitter and Reddit; not a count specifically from American news.",
            "Historical pinned snapshot; not real-time usage, learner usefulness, IELTS importance, or an Oxford frequency score.",
            "wordfreq combines estimates from sources and rounds them. Decimal precision represents the source scale, not absolute accuracy or a claim to an exact corpus count.",
        ],
        "modifications": "Selected exact headwords present in the app, converted table proportions to the source Zipf scale, attached by stable app ID; no source text or full frequency table redistributed.",
        "inputBeforeAttachingMetadata": {"filename": args.vocabulary.name, "sha256": sha256(original_bytes)},
        "coverage": {
            "records": len(records),
            "scored": len(records) - len(unscored),
            "unscored": len(unscored),
            "unscoredByReason": dict(Counter(row["reason"] for row in unscored)),
            "caseNormalizedScoredHeadwords": len(case_normalized),
            "caseConflationGroupsPresentInApp": [
                {"lookup": key, "headwords": values}
                for key, values in spellings.items() if len(set(values)) > 1
            ],
        },
        "caseNormalizedScoredHeadwords": case_normalized,
        "unscoredEntries": unscored,
        "knownConflationExclusions": [{"word": word, "note": note} for word, note in KNOWN_FREQUENCY_CONFLATIONS.items()],
    }
    updated = attach_frequency(original_bytes.decode("utf-8"), result) if args.apply else None
    if updated is not None:
        provenance["outputAfterAttachingMetadata"] = {"filename": args.vocabulary.name, "sha256": sha256(updated.encode("utf-8"))}
        provenance["currentCanonicalVocabulary"] = provenance["outputAfterAttachingMetadata"].copy()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.provenance.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if updated is not None:
        args.vocabulary.write_text(updated, encoding="utf-8", newline="\n")
    args.provenance.write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(provenance["coverage"], ensure_ascii=False))


if __name__ == "__main__":
    main()
