"""Small, lossless-by-field helpers for the canonical editable TXT corpus."""

from pathlib import Path


def parse_records(text):
    records = []
    for block in text.lstrip("\ufeff").replace("\r\n", "\n").split("\n---\n"):
        if not block.strip():
            continue
        record = {}
        for line in block.strip().splitlines():
            key, separator, value = line.partition(":")
            if not separator or not key.strip() or key.strip() in record:
                raise ValueError(f"Invalid or duplicate vocabulary field: {line!r}")
            record[key.strip()] = value.strip()
        if not record.get("id") or not record.get("word"):
            raise ValueError("Every record needs a stable id and headword")
        records.append(record)
    if len({record["id"] for record in records}) != len(records):
        raise ValueError("Duplicate stable vocabulary IDs")
    return records


def serialize_records(records):
    return "\n---\n".join(
        "\n".join(f"{key}: {value}".rstrip() for key, value in record.items())
        for record in records
    ) + "\n"


def read_records(path):
    return parse_records(Path(path).read_text(encoding="utf-8"))
