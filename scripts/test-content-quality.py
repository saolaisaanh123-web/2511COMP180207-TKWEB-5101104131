"""Corpus regressions from the learning audit; no network or extra packages."""

import hashlib
import json
from pathlib import Path
import runpy
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from corpus_io import read_records
from corpus_policy import (
    KNOWN_FREQUENCY_CONFLATIONS,
    REVIEWED_SPELLING_VARIANTS,
    apply_reviewed_spelling_variants,
)


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public/data"


class CorpusQualityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = read_records(DATA / "vocabulary.txt")
        cls.by_word = {row["word"]: row for row in cls.rows}
        cls.by_id = {row["id"]: row for row in cls.rows}
        cls.metadata = json.loads((DATA / "oxford-provenance.json").read_text())
        cls.facts = {row["sourceFactIndex"]: row for row in cls.metadata["entries"] + cls.metadata["additionalFacts"]}

    def test_coverage_and_original_ids_survive(self):
        self.assertEqual(len(self.rows), 5162)
        self.assertEqual(len(self.by_id), 5162)
        self.assertEqual(sum("oxford-" in row.get("collections", "") for row in self.rows), 4955)
        self.assertEqual(sum("phrasal-verbs" in row.get("collections", "").split(",") for row in self.rows), 100)
        self.assertEqual(sum("slang" in row.get("collections", "").split(",") for row in self.rows), 107)
        for original in read_records(DATA / "reviewed-vocabulary.txt"):
            self.assertEqual(self.by_id[original["id"]]["word"], original["word"])

    def test_only_reviewed_bilingual_content_enters_learning(self):
        for row in self.rows:
            ready = row["learning_status"] == "ready"
            self.assertEqual(ready, row["content_status"] == "reviewed", row["word"])
            if ready:
                self.assertTrue(any(char.isalpha() for char in row["meaning_vi"]), row["word"])
                self.assertTrue(row.get("example_en") and row.get("example_vi"), row["word"])
            else:
                self.assertEqual(row["learning_status"], "lookup")
                self.assertTrue(row["learning_note"])

    def test_curated_overlay_and_sense_source_are_reproducible(self):
        overlay = read_records(ROOT / "data/authoring/content-review-2026-10.txt")
        self.assertEqual(len(overlay), 38)
        for reviewed in overlay:
            actual = self.by_id[reviewed["id"]]
            for key, value in reviewed.items():
                self.assertEqual(actual[key], value, (actual["word"], key))
            fact = self.facts[int(actual["source_fact_index"])]
            self.assertEqual(fact["word"], actual["word"])
            self.assertEqual(fact["cefr"], actual["level"])
            self.assertIn(actual["word"].casefold(), actual["example_en"].casefold())

    def test_lie_homograph_is_not_given_the_other_meanings_cefr(self):
        lie = self.by_word["lie"]
        self.assertEqual(lie["source_fact_index"], "2175")
        self.assertEqual(lie["level"], "B1")
        self.assertEqual(self.facts[2175]["sense"], "tell a lie")
        self.assertEqual(self.facts[433]["cefr"], "A1")
        self.assertEqual(self.facts[433]["homograph"], "lie1")
        self.assertEqual(len(self.facts), 5323)

    def test_known_bad_source_contexts_cannot_reappear(self):
        self.assertIn("nên", self.by_word["should"]["meaning_vi"])
        self.assertIn("sáng hôm qua", self.by_word["yesterday"]["example_vi"])
        self.assertIn("will send", self.by_word["will"]["example_en"])
        self.assertIn("six weekly lessons", self.by_word["consist"]["example_en"])
        self.assertIn("characterize the climate", self.by_word["characterize"]["example_en"])
        self.assertIn("cite the original study", self.by_word["cite"]["example_en"])
        self.assertIn("nhà tù", self.by_word["jail"]["meaning_vi"])

    def test_reviewed_spelling_variants_are_explicit_and_pos_specific(self):
        for entry_id, (headword, part_of_speech, alternatives) in REVIEWED_SPELLING_VARIANTS.items():
            row = self.by_id[entry_id]
            self.assertEqual(row["word"], headword)
            self.assertEqual(row["part_of_speech"], part_of_speech)
            self.assertEqual(row["learning_status"], "ready")
            self.assertEqual(row["accepted_answers"], headword)
            self.assertEqual(row["spelling_variants"].split("|"), list(alternatives))
        # UK/US verb forms are interchangeable here; UK practise is never a noun.
        self.assertIn("practice", self.by_word["practise"]["spelling_variants"].split("|"))
        self.assertEqual(self.by_word["practice"]["accepted_answers"], "practice")
        self.assertFalse(self.by_word["practice"].get("spelling_variants"))
        # Misspellings and different words must not become spelling variants;
        # this whitelist makes no blanket judgment about synonyms in context.
        invalid = {
            "neighbour": ["neigbour", "neighbourhood"],
            "practise": ["practize", "exercise"],
            "characterize": ["characterice", "characterization"],
            "well-being": ["wellness"],
            "healthcare": ["healthy care"],
            "coordination": ["cooperation"],
            "film-maker": ["filmmaking"],
            "fundraising": ["fundraise"],
            "no one": ["noone", "nobody"],
            "non-profit": ["profitable", "charitable"],
        }
        for headword, rejected in invalid.items():
            for answer in rejected:
                row = self.by_word[headword]
                self.assertNotIn(answer, [*row["accepted_answers"].split("|"), *row["spelling_variants"].split("|")])

    def test_spelling_overlay_is_additive_idempotent_and_rejects_changed_senses(self):
        records = [dict(row) for row in self.rows]
        original = [dict(row) for row in records]
        apply_reviewed_spelling_variants(records)
        apply_reviewed_spelling_variants(records)
        self.assertEqual(records, original)
        # Existing canonical/manual alternatives must not disappear on review.
        edited = next(row for row in records if row["id"] == "neighbour-01")
        edited["spelling_variants"] += "|manual spelling"
        apply_reviewed_spelling_variants(records)
        self.assertIn("manual spelling", edited["spelling_variants"])
        changed = next(row for row in records if row["id"] == "practise-01")
        changed["part_of_speech"] = "noun"
        with self.assertRaises(ValueError):
            apply_reviewed_spelling_variants(records)

    def test_known_frequency_conflations_remain_unscored(self):
        for word in KNOWN_FREQUENCY_CONFLATIONS:
            self.assertFalse(self.by_word[word]["frequency_zipf"], word)
            self.assertFalse(self.by_word[word]["frequency_source"], word)
            self.assertTrue(self.by_word[word]["frequency_note"], word)
        frequency = json.loads((DATA / "frequency-provenance.json").read_text())
        self.assertEqual(frequency["coverage"]["scored"], sum(bool(row.get("frequency_zipf")) for row in self.rows))
        self.assertEqual(frequency["coverage"]["unscored"], sum(not row.get("frequency_zipf") for row in self.rows))

    def test_frequency_attachment_cannot_replace_reviewed_content(self):
        # The attachment helper has no need to load the optional pinned package;
        # corpus preservation must still be testable in the ordinary CI image.
        with patch.dict(sys.modules, {"wordfreq": SimpleNamespace()}):
            exporter = runpy.run_path(str(ROOT / "scripts/add-frequency.py"))
        values = {
            row["id"]: {key: row.get(key, "") for key in ("frequency_zipf", "frequency_source", "frequency_note")}
            for row in self.rows
        }
        text = (DATA / "vocabulary.txt").read_text(encoding="utf-8")
        self.assertEqual(exporter["attach_frequency"](text, values), text)

    def test_metadata_counts_and_hashes_match_canonical_corpus(self):
        coverage = self.metadata["coverage"]
        for status in ["reviewed", "dictionary", "reference"]:
            self.assertEqual(coverage[status], sum(row["content_status"] == status for row in self.rows))
        self.assertEqual(coverage["learningReady"], sum(row["learning_status"] == "ready" for row in self.rows))
        digest = hashlib.sha256((DATA / "vocabulary.txt").read_bytes()).hexdigest()
        self.assertEqual(self.metadata["contentReview"]["canonicalVocabularySha256"], digest)
        self.assertEqual(json.loads((DATA / "content-review-provenance.json").read_text())["canonicalVocabularySha256"], digest)
        self.assertEqual(json.loads((DATA / "frequency-provenance.json").read_text())["currentCanonicalVocabulary"]["sha256"], digest)

    def test_content_preview_is_idempotent_and_does_not_write_canonical(self):
        original = (DATA / "vocabulary.txt").read_bytes()
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "preview.txt"
            subprocess.run([sys.executable, str(ROOT / "scripts/apply-content-review.py"), "--output", str(output)], check=True, capture_output=True)
            self.assertEqual(output.read_bytes(), original)
        self.assertEqual((DATA / "vocabulary.txt").read_bytes(), original)

    def test_reference_conflict_is_not_guessed(self):
        diplomatic = self.by_word["diplomatic"]
        self.assertEqual(diplomatic["content_status"], "reference")
        self.assertEqual(diplomatic["learning_status"], "lookup")
        self.assertFalse(diplomatic["meaning_vi"])


if __name__ == "__main__":
    unittest.main()
