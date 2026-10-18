import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function writeVocabularyManifest() {
  const vocabularyUrl = new URL(
    "../public/data/vocabulary.txt",
    import.meta.url,
  );
  const manifestUrl = new URL(
    "../public/data/vocabulary-version.json",
    import.meta.url,
  );
  const bytes = await readFile(vocabularyUrl);
  const manifest = {
    version: createHash("sha256").update(bytes).digest("hex"),
    entryCount: (bytes.toString("utf8").match(/^id: /gm) || []).length,
    bytes: bytes.length,
  };
  const next = JSON.stringify(manifest, null, 2) + "\n";
  let previous;
  try {
    previous = await readFile(manifestUrl, "utf8");
  } catch {}
  if (next !== previous) await writeFile(manifestUrl, next);
  return manifest;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const manifest = await writeVocabularyManifest();
  console.log(
    `Vocabulary: ${manifest.entryCount} entries · ${manifest.version.slice(0, 12)}`,
  );
}
