"""Safety, provenance and deterministic replay checks for the complete review."""

from copy import deepcopy
import hashlib
import json
from pathlib import Path
import runpy
import tempfile
import unittest
from unittest.mock import patch

from corpus_io import serialize_records

ROOT = Path(__file__).resolve().parents[1]
FULL = runpy.run_path(str(ROOT / "scripts/apply-full-review.py"))
OLD = runpy.run_path(str(ROOT / "scripts/apply-source-update.py"))


class FullReviewTests(unittest.TestCase):
    def setUp(self):
        self.records = [{"id": "stable-01", "word": "bee", "part_of_speech": "noun", "meaning_vi": "nghĩa nguồn cũ sai", "definition_en": "", "example_en": "", "example_vi": "", "collections": "foundation,oxford-3000", "level": "B1", "source_fact_index": "1", "accepted_answers": "bee", "content_status": "dictionary", "learning_status": "lookup", "source": "Historical source", "note": "unreviewed", "learning_note": "unreviewed", "personal_extra": "preserve"}]
        self.row = {"id": "stable-01", "word": "bee", "part_of_speech": "noun", "meaning_vi": "con ong", "definition_en": "An insect that visits flowers.", "definition_source": "authored", "example_en": "A bee landed on the yellow flower.", "example_vi": "Một con ong đậu lên bông hoa màu vàng.", "source_evidence": [{"url": "https://www.oxfordlearnersdictionaries.com/definition/american_english/bee", "status": 200, "checkedAt": "2026-10-21", "sha256": "a" * 64, "scope": "selected insect sense and noun POS"}]}
        self.review = {"reviewId": "review-2026-10", "date": "2026-10-21", "baseline": {"entryCount": 1, "idsSha256": FULL["ids_digest"](self.records), "vocabularySha256": FULL["digest"](serialize_records(self.records).encode())}, "entries": [self.row]}

    def apply(self, records=None, review=None):
        return FULL["apply_full_review"](records or self.records, review or self.review)

    def test_explicit_original_content_preserves_ids_order_and_undeclared_data(self):
        original = deepcopy(self.records)
        result = self.apply()
        self.assertEqual(self.records, original)
        self.assertEqual([r["id"] for r in result], [r["id"] for r in original])
        for key in ("collections", "level", "source_fact_index", "accepted_answers", "personal_extra"):
            self.assertEqual(result[0][key], original[0][key])
        self.assertEqual(result[0]["meaning_vi"], "con ong")
        self.assertEqual(result[0]["content_status"], "reviewed")
        self.assertEqual(result[0]["learning_status"], "ready")
        self.assertEqual(result[0]["example_type"], "authored")
        self.assertNotIn("unreviewed", result[0]["note"])
        self.assertEqual(self.apply(result), result)

    def test_scope_is_explicit_and_does_not_change_unreviewed_or_new_personal_fields(self):
        records = deepcopy(self.records) + [{**self.records[0], "id": "second", "word": "other"}]
        result = self.apply(records)
        self.assertEqual(result[1], records[1])
        records[0]["custom_personal"] = "preserve even after a repeated review"
        self.assertEqual(self.apply(records)[0]["custom_personal"], records[0]["custom_personal"])

    def test_missing_or_bad_evidence_fails_closed(self):
        for changes in ({"status": 403}, {"sha256": "bad"}, {"url": "http://www.oxfordlearnersdictionaries.com/bee"}, {"url": "https://example.com/bee"}, {"url": "https://raw.githubusercontent.com/untrusted/repo/bee"}, {"scope": ""}):
            review = deepcopy(self.review)
            review["entries"][0]["source_evidence"][0].update(changes)
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.apply(review=review)
        for evidence in ([], None, "no", {}):
            review = deepcopy(self.review)
            review["entries"][0]["source_evidence"] = evidence
            with self.subTest(evidence=evidence), self.assertRaises(ValueError):
                self.apply(review=review)

    def test_real_vietnamese_verbs_are_not_mistaken_for_dictionary_redirects(self):
        for meaning in ("xem xét và tìm cách xử lý một vấn đề", "xem như; coi là", "xem là một trường hợp đặc biệt", "xem lại; kiểm tra lại", "xem qua", "xem phim"):
            self.assertFalse(FULL["reference_only_meaning"](meaning), meaning)
        for meaning in ("xem bee", "Xem globalisation", "xem sudden", "xem mục bee", "xem thêm bee", "see bee", "→ bee"):
            self.assertTrue(FULL["reference_only_meaning"](meaning), meaning)

    def test_unrelated_ids_pos_changes_duplicates_and_status_bypass_fail_closed(self):
        for key, value in (("id", "renamed"), ("word", "wasp"), ("part_of_speech", "verb"), ("meaning_vi", "xem bee"), ("example_en", "An insect landed on a flower."), ("learning_status", "ready")):
            review = deepcopy(self.review)
            review["entries"][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.apply(review=review)
        review = deepcopy(self.review)
        review["entries"] *= 2
        with self.assertRaises(ValueError):
            self.apply(review=review)
        changed = deepcopy(self.records)
        changed[0]["id"] = "tampered"
        with self.assertRaises(ValueError):
            self.apply(changed)

    def test_diplomatic_is_the_only_explicit_supported_pos_correction(self):
        records = [{**self.records[0], "id": "ox-76658a7ce8e611-01", "word": "diplomatic", "accepted_answers": "diplomatic", "part_of_speech": "noun"}]
        review = deepcopy(self.review)
        review["baseline"]["idsSha256"] = FULL["ids_digest"](records)
        review["entries"] = [{**self.row, "id": records[0]["id"], "word": "diplomatic", "part_of_speech": "adjective", "previous_part_of_speech": "noun", "example_en": "They used a diplomatic approach."}]
        review["entries"][0]["source_evidence"][0]["url"] = "https://www.oxfordlearnersdictionaries.com/definition/american_english/diplomatic"
        self.assertEqual(self.apply(records, review)[0]["part_of_speech"], "adjective")
        self.assertEqual(self.apply(self.apply(records, review), review)[0]["part_of_speech"], "adjective")
        del review["entries"][0]["previous_part_of_speech"]
        with self.assertRaises(ValueError):
            self.apply(records, review)

    def test_source_references_and_licensed_gloss_attribution_remain_distinct(self):
        review = deepcopy(self.review)
        evidence = review["entries"][0]["source_evidence"][0]
        evidence["url"] = "https://raw.githubusercontent.com/globalwordnet/english-wordnet/45fdb60396dc804526b85f21a23c59983c2c396a/src/yaml/noun.animal.yaml"
        evidence["sense_ref"] = "selected-synset"
        review["sources"] = {"oewn": evidence}
        review["entries"][0]["source_evidence"] = {"source_id": "oewn"}
        review["entries"][0]["definition_source"] = "oewn"
        result = self.apply(review=review)[0]
        self.assertIn("CC BY 4.0", result["source"])
        self.assertIn("Princeton", result["source"])
        self.assertIn("Nghĩa Việt và ví dụ", result["source"])
        self.assertEqual(result["definition_source"], "oewn")

    def test_sharded_loader_count_uniqueness_and_path_boundaries(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = {**self.review, "entries": [], "shards": ["part.json"], "expectedEntryCount": 1}
            (root / "part.json").write_text(json.dumps({"entries": [self.row]}))
            target = root / "review.json"
            target.write_text(json.dumps(manifest))
            loaded = FULL["load_full_review"](target)
            self.assertEqual(loaded["entries"], self.review["entries"])
            self.assertEqual(len(loaded["_files"]), 2)
            manifest["shards"] = ["../escape.json"]
            target.write_text(json.dumps(manifest))
            with self.assertRaises(ValueError):
                FULL["load_full_review"](target)

    def test_current_metadata_hashes_and_counts_update_without_mutating_pinned_facts(self):
        result = self.apply()
        text = serialize_records(result)
        documents = {"oxford-provenance.json": {"coverage": {"referenceWords": [{"word": "old"}]}, "entries": [{"sourceFactIndex": 1}], "contentReview": {"canonicalVocabularySha256": "old"}, "sourceUpdateCanonicalHash": "old"}, "content-review-provenance.json": {"coverage": {}, "canonicalVocabularySha256": "old"}, "frequency-provenance.json": {"coverage": {"scored": 1}, "currentCanonicalVocabulary": {"sha256": "old"}}, "source-update-provenance.json": {"coverage": {}, "canonicalVocabularySha256": "old"}}
        documents["oxford-provenance.json"]["contentReview"]["supplementalSourceReview"] = {"canonicalVocabularySha256": "old"}
        original = deepcopy(documents)
        updated = FULL["update_documents"](result, text, self.review, documents)
        self.assertEqual(documents, original)
        checksum = hashlib.sha256(text.encode()).hexdigest()
        self.assertEqual(updated["oxford-provenance.json"]["entries"], original["oxford-provenance.json"]["entries"])
        self.assertEqual(updated["oxford-provenance.json"]["coverage"]["learningReady"], 1)
        self.assertEqual(updated["oxford-provenance.json"]["contentReview"]["supplementalSourceReview"]["canonicalVocabularySha256"], checksum)
        self.assertEqual(updated["frequency-provenance.json"]["coverage"], {"scored": 1})
        self.assertEqual(updated["frequency-provenance.json"]["currentCanonicalVocabulary"]["sha256"], checksum)
        self.assertEqual(updated["content-review-provenance.json"]["canonicalVocabularySha256"], checksum)
        self.assertEqual(updated["full-review-provenance.json"]["canonicalVocabularySha256"], checksum)
        self.assertEqual(updated["full-review-provenance.json"]["sources"][0]["status"], 200)

    def test_older_addition_replay_accepts_only_exact_newer_declared_review(self):
        # Use a miniature older source update whose addition is now reviewed.
        base = [{**self.records[0], "id": "original-01", "word": "old"}]
        old_addition = deepcopy(self.records[0])
        old_addition["collections"] = "foundation"
        old_addition["definition_en"] = "Old incomplete source"
        old_addition["example_en"] = "Old source bee"
        old_addition["example_vi"] = "Câu nguồn cũ"
        old_addition["learning_note"] = "Historical lookup"
        old = {"date": "2026-10-20", "baseline": {"entryCount": 1, "idsSha256": OLD["ids_digest"](base), "vocabularySha256": "a" * 64}, "sources": [{"url": "https://www.oxfordlearnersdictionaries.com/definition/american_english/bee", "status": 200, "title": "Oxford", "checkedAt": "2026-10-20", "sha256": "b" * 64, "scope": "sense"}], "additions": [old_addition]}
        records = base + [old_addition]
        review = deepcopy(self.review)
        review["baseline"]["entryCount"] = 2
        review["baseline"]["idsSha256"] = FULL["ids_digest"](records)
        latest = self.apply(records, review)
        with patch.dict(OLD["FULL_REVIEW"], {"applicable_full_review": lambda rows: review}):
            self.assertEqual(OLD["apply_source_update"](latest, old), latest)
            bad = deepcopy(latest)
            bad[-1]["meaning_vi"] = "unexpected edit"
            with self.assertRaises(ValueError):
                OLD["apply_source_update"](bad, old)


if __name__ == "__main__":
    unittest.main()
