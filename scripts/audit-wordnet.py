#!/usr/bin/env python3
"""Fetch pinned, openly licensed OEWN and find source senses for corpus review.

Research helper only: this NEVER edits the vocabulary or marks a meaning reviewed.
Requires PyYAML for reading the publisher's YAML; no runtime app dependency.
All fetched source text and detailed candidate definitions stay in a private cache.
"""

import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import shutil
import urllib.request

from corpus_io import read_records

COMMIT = "45fdb60396dc804526b85f21a23c59983c2c396a"
REPOSITORY = "globalwordnet/english-wordnet"
RAW = f"https://raw.githubusercontent.com/{REPOSITORY}/{COMMIT}/"
TREE_URL = f"https://api.github.com/repos/{REPOSITORY}/git/trees/{COMMIT}?recursive=1"
POS = {
    "noun": {"n"}, "noun phrase": {"n"}, "number": {"n", "a", "s"},
    "verb": {"v"}, "phrasal verb": {"v"}, "verb phrase": {"v"},
    "adjective": {"a", "s"}, "adverb": {"r"},
    "idiom": {"n", "v", "a", "s", "r"},
    "phrase": {"n", "v", "a", "s", "r"},
    "prepositional phrase": {"r", "a", "s"},
}


def normalise(text):
    return re.sub(r"\s+", " ", text.replace("’", "'").replace("–", "-")).strip().casefold()


def git_blob_sha(body):
    return hashlib.sha1(f"blob {len(body)}\0".encode() + body).hexdigest()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def request(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Jeongyeon-source-review/1.0"})
    with urllib.request.urlopen(req, timeout=40) as response:
        body = response.read()
        if response.status != 200:
            raise ValueError(f"HTTP {response.status}: {url}")
        return body, response.geturl()


def fetch(cache, relative, expected=None, seed=None):
    path = cache / relative
    if not path.exists() and seed and (seed / relative).exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(seed / relative, path)
    cached = path.exists()
    if cached:
        body = path.read_bytes()
        if expected and git_blob_sha(body) != expected:
            raise ValueError(f"Cached body differs from pinned source tree: {relative}")
        final_url = RAW + relative
    else:
        body, final_url = request(RAW + relative)
        if expected and git_blob_sha(body) != expected:
            raise ValueError(f"Fetched body differs from pinned source tree: {relative}")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
    return {
        "path": relative, "url": RAW + relative, "final_url": final_url,
        "read_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "cache_status": "pinned_git_blob_verified" if cached else "fetched_http_200",
        "sha256": hashlib.sha256(body).hexdigest(), "bytes": len(body),
        "git_blob_sha": git_blob_sha(body),
    }


def aliases(record):
    result = [(record["word"], "headword")]
    if record.get("preferred_us_spelling"):
        result.append((record["preferred_us_spelling"], "declared_us_spelling"))
    for value in record.get("accepted_answers", "").split("|"):
        if value.strip():
            result.append((value.strip(), "accepted_answer"))
    seen = set()
    for word, method in result:
        word = normalise(word)
        if word and word not in seen:
            seen.add(word)
            yield word, method


def inflection_candidates(word, pos):
    """Conservative candidates, explicitly labelled for human review, not proof."""
    if "n" in pos:
        if word.endswith("ies"):
            yield word[:-3] + "y"
        if word.endswith("es"):
            yield word[:-2]
        if word.endswith("s") and not word.endswith("ss"):
            yield word[:-1]
    if "v" in pos:
        if word.endswith("ied"):
            yield word[:-3] + "y"
        if word.endswith("ed"):
            yield word[:-2]
            yield word[:-1]
        if word.endswith("ing"):
            yield word[:-3]
            yield word[:-3] + "e"
        if word.endswith("es"):
            yield word[:-2]
        if word.endswith("s"):
            yield word[:-1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", type=Path, default=Path("public/data/vocabulary.txt"))
    parser.add_argument("--cache", type=Path, default=Path("/workspace/scratch/jeongyeon-full-review/oewn"))
    parser.add_argument("--output", type=Path, default=Path("/workspace/scratch/jeongyeon-full-review/wordnet-candidates.json"))
    parser.add_argument("--seed-cache", type=Path, default=Path("/tmp/jeongyeon-alternative-dictionaries/oewn"))
    args = parser.parse_args()
    try:
        import yaml
    except ImportError as error:
        raise SystemExit("Research helper requires PyYAML; it is not an app dependency.") from error
    loader = getattr(yaml, "CSafeLoader", yaml.SafeLoader)
    args.cache.mkdir(parents=True, exist_ok=True)
    tree_path = args.cache / "tree.json"
    if not tree_path.exists() and (args.seed_cache / "tree.json").exists():
        shutil.copyfile(args.seed_cache / "tree.json", tree_path)
    if not tree_path.exists():
        body, _ = request(TREE_URL)
        tree_path.write_bytes(body)
    tree = json.loads(tree_path.read_text())
    if tree["sha"] != COMMIT or tree.get("truncated"):
        raise ValueError("Unpinned or incomplete OEWN source tree")
    files = {item["path"]: item["sha"] for item in tree["tree"] if item["type"] == "blob"}
    entry_paths = sorted(path for path in files if re.fullmatch(r"src/yaml/entries-.*\.yaml", path))
    synset_paths = sorted(path for path in files if re.fullmatch(r"src/yaml/(adj|adv|noun|verb)\..*\.yaml", path))
    sources = []

    def fetch_batch(paths):
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(fetch, args.cache, path, files[path], args.seed_cache): path for path in paths}
            for future in concurrent.futures.as_completed(futures):
                info = future.result()
                sources.append(info)
                print(f"source {len(sources)}: {info['path']} ({info['cache_status']})", flush=True)

    fetch_batch(["README.md", "LICENSE.md", "WNDB_License.txt"] + entry_paths)
    lexicon = {}
    forms = {}
    for path in entry_paths:
        data = yaml.load((args.cache / path).read_text(encoding="utf-8"), Loader=loader)
        for lemma, by_pos in data.items():
            for entry_pos, entry in by_pos.items():
                base_pos = entry_pos.split("-", 1)[0]
                if base_pos not in {"n", "v", "a", "s", "r"}:
                    continue
                value = {"lemma": lemma, "pos": base_pos, "entry_key": entry_pos, "entry": entry, "lexical_source": RAW + path}
                lexicon.setdefault(normalise(lemma), []).append(value)
                for form in entry.get("form", []):
                    forms.setdefault(normalise(form), []).append(value)
    records = read_records(args.corpus)
    matches = []
    for record in records:
        allowed = POS.get(record["part_of_speech"], set())
        found = []
        seen = set()

        def add(values, method, alias):
            for value in values:
                if value["pos"] not in allowed:
                    continue
                key = (value["lemma"], value["entry_key"])
                if key in seen:
                    continue
                seen.add(key)
                found.append({**value, "match_method": method, "queried_alias": alias})

        for alias, method in aliases(record):
            add(lexicon.get(alias, []), method, alias)
            add(forms.get(alias, []), "source_declared_form", alias)
            for singular in inflection_candidates(alias, allowed):
                add(lexicon.get(singular, []), "heuristic_inflection_candidate", alias)
        matches.append((record, found))
    missing = [record for record, found in matches if not found]
    write_json(args.output.with_name("wordnet-missing.json"), missing)
    print(f"Lexical coverage: {len(matches) - len(missing)}/{len(matches)}; missing/function-word IDs ready at {args.output.with_name('wordnet-missing.json')}", flush=True)
    fetch_batch(synset_paths)
    synsets = {}
    for path in synset_paths:
        body = (args.cache / path).read_text(encoding="utf-8")
        lines = {match.group(1): index for index, line in enumerate(body.splitlines(), 1) if (match := re.fullmatch(r"([0-9]{8}-[nvars]):", line))}
        for key, value in yaml.load(body, Loader=loader).items():
            synsets[key] = {**value, "source_url": RAW + path, "browser_url": f"https://github.com/{REPOSITORY}/blob/{COMMIT}/{path}#L{lines.get(key, 1)}", "source_line": lines.get(key)}
    result = []
    for record, found in matches:
        candidates = []
        for match in found:
            for sense in match["entry"].get("sense", []):
                synset = synsets.get(sense["synset"])
                if not synset:
                    continue
                candidates.append({
                    "lemma": match["lemma"], "pos": match["pos"],
                    "synset": sense["synset"], "sense_id": sense["id"],
                    "match_method": match["match_method"], "queried_alias": match["queried_alias"],
                    "definitions": synset.get("definition", []), "examples": synset.get("example", []),
                    "members": synset.get("members", []),
                    "pronunciation": match["entry"].get("pronunciation", []),
                    "source_url": synset["source_url"], "browser_url": synset["browser_url"],
                    "lexical_source": match["lexical_source"],
                })
        result.append({
            "id": record["id"], "word": record["word"], "part_of_speech": record["part_of_speech"],
            "current": {key: record.get(key, "") for key in ["meaning_vi", "definition_en", "example_en", "example_vi", "collocation", "learning_status", "accepted_answers", "preferred_us_spelling"]},
            "review_status": "candidate_senses_require_semantic_review" if candidates else "source_missing_or_unsupported_pos",
            "candidates": candidates,
        })
    write_json(args.output, {
        "source": {"name": "Open English WordNet", "repository": f"https://github.com/{REPOSITORY}", "commit": COMMIT, "license": "CC BY 4.0; retains Princeton WordNet attribution and original terms", "checked_at": dt.datetime.now(dt.timezone.utc).isoformat()},
        "limitations": ["Lexical candidates do not validate Vietnamese meanings or examples.", "Do not infer frequency, CEFR, naturalness or American region from source ordering.", "Heuristic inflection candidates require manual selection.", "Function words and modern expressions are outside much of WordNet's scope."],
        "counts": {"corpus_records": len(records), "with_candidate_senses": sum(bool(row['candidates']) for row in result), "missing_or_unsupported_pos": sum(not row['candidates'] for row in result), "source_files": len(sources)},
        "records": result,
    })
    write_json(args.output.with_name("wordnet-sources.json"), sorted(sources, key=lambda value: value["path"]))
    print(f"Wrote candidate senses: {args.output}", flush=True)


if __name__ == "__main__":
    main()
