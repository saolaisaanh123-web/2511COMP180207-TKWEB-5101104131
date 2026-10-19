"""Explicit editorial exclusions shared by content and frequency exporters."""

KNOWN_FREQUENCY_CONFLATIONS = {
    "IT": "Không xếp hạng: dữ liệu phân biệt chữ hoa chưa có; điểm của it chủ yếu phản ánh đại từ, không riêng ngành công nghệ thông tin.",
    "May": "Không xếp hạng: tần suất cách viết may không tách tháng Năm khỏi trợ động từ may.",
    "March": "Không xếp hạng: tần suất cách viết march không tách tháng Ba khỏi động từ hoặc danh từ march.",
    "found": "Không xếp hạng: tần suất cách viết found không tách nghĩa thành lập khỏi quá khứ hoặc phân từ của find.",
}

# Editorial spelling alternatives for the selected, reviewed sense and POS.
# This is an explicit list, never a generic -ise/-ize, hyphen or fuzzy rewrite.
# In particular, UK practise (verb) accepts US practice; the separate practice
# noun must not acquire practise. The immutable reviewed seed stays unchanged.
REVIEWED_SPELLING_VARIANTS = {
    "neighbour-01": ("neighbour", "noun", ("neighbor",)),
    "practise-01": ("practise", "verb", ("practice",)),
    "ox-9bf86920ceaf83-01": ("characterize", "verb", ("characterise",)),
    "well-being-01": ("well-being", "noun", ("wellbeing",)),
    "healthcare-01": ("healthcare", "noun", ("health care",)),
    "ox-cbbeb3cc2d482a-01": ("coordination", "noun", ("co-ordination",)),
    "ox-91e1620ca8e28e-01": ("film-maker", "noun", ("filmmaker",)),
    "ox-65fc87903cb2ce-01": ("fundraising", "noun", ("fund-raising",)),
    "ox-04225201515016-01": ("no one", "pronoun", ("no-one",)),
    "ox-f61fc65b2a7677-01": ("non-profit", "adjective", ("nonprofit",)),
}


def apply_reviewed_spelling_variants(records):
    """Append only curated spellings, failing closed if a sense's POS changes.

    Existing hand-edited alternatives survive reapplication. No other fields,
    IDs, senses or lookup/ready decisions are changed by this overlay.
    """
    by_id = {row["id"]: row for row in records}
    for entry_id, (headword, part_of_speech, alternatives) in REVIEWED_SPELLING_VARIANTS.items():
        row = by_id[entry_id]
        if (
            row["word"] != headword
            or row["part_of_speech"] != part_of_speech
            or row.get("learning_status") != "ready"
            or row.get("content_status") != "reviewed"
        ):
            raise ValueError(f"Spelling review requires the reviewed headword and POS: {entry_id}")
        spellings = [value.strip() for value in row.get("spelling_variants", "").split("|") if value.strip()]
        # Keep accepted_answers unchanged: existing recall content keys include
        # that field. Equivalent spellings must not invalidate learned content.
        row["spelling_variants"] = "|".join(dict.fromkeys([*spellings, *alternatives]))
