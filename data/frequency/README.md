# Reproducing frequency metadata

The application uses **general English spelling frequency**, from `wordfreq==3.1.1`, as a secondary ordering estimate within a CEFR level. This is neither an Oxford frequency score nor a measurement specifically of American news. The source mixes seven domains and is a historical snapshot. It does not distinguish meanings, parts of speech, or capitalization: `May/may` and `IT/it` have the same spelling estimate.

Install into a temporary directory or a virtual environment, then export a map:

```sh
python -m pip install --target /tmp/lexi-wordfreq-package --cache-dir /tmp/lexi-pip-cache -r data/frequency/requirements.txt
PYTHONPATH=/tmp/lexi-wordfreq-package python scripts/add-frequency.py --output /workspace/scratch/lexi-frequency-map.json
```

The script checks the package version and the SHA256 of `large_en.msgpack.gz`. By default it does not change `vocabulary.txt`. The exported object maps each existing stable ID to `frequency_zipf` and `frequency_source`; both are empty for an unscored entry. An empty score is **unknown**, not an assertion that a word is rare. Its provenance includes coverage and every unscored entry.

After regenerating the complete corpus from the pinned source extracts in `/workspace/scratch`, attach frequency metadata with this pipeline:

```sh
python scripts/build-full-corpus.py /workspace/scratch
PYTHONPATH=/tmp/lexi-wordfreq-package python scripts/add-frequency.py --output /workspace/scratch/lexi-frequency-map.json --apply
```

`--apply` adds or replaces only `frequency_zipf` and `frequency_source` in the input TXT. It preserves stable IDs, record order, existing field order and all other field lines. Output uses UTF-8 with LF line endings and a final newline. Repeating the command produces identical TXT bytes. Corpus generation must come first because it rebuilds the TXT from its source inputs. Application builds use the committed TXT directly and do not need these preparation commands.

The score is `9 + log10(proportion)` to two decimal places, the same quantized Zipf scale provided by wordfreq. A score of 6 means an aggregate estimate around one occurrence per thousand tokens; higher scores indicate greater frequency. Exact ties do not imply a meaningful difference and may be sorted alphabetically. The score applies to the spelling across all senses, not necessarily the particular sense taught in Jeongyeon.

Only Oxford headwords with an exact casefolded entry in the pinned table receive a score. Multiword expressions, headwords containing alternatives, and compounds not found verbatim remain unscored. In particular, the script does not use wordfreq's multi-token approximation as though it were an observed idiom frequency. It does not score the app's slang meanings from a common literal spelling.

The selected values and attached source IDs are derived from wordfreq data under **CC BY-SA 4.0**. Keep `public/data/licenses/wordfreq-NOTICE.txt`, its upstream attribution and the CC BY-SA license when redistributing the derived values. Code licensing is separate; installing the package is not needed for the website or its normal build.
