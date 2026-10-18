import { defineConfig } from "vite";
import { writeVocabularyManifest } from "./scripts/build-vocabulary-manifest.mjs";

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "vocabulary-version",
      async buildStart() {
        await writeVocabularyManifest();
      },
      configureServer(server) {
        server.watcher.on("change", async (file) => {
          if (
            file.replaceAll("\\", "/").endsWith("/public/data/vocabulary.txt")
          ) {
            try {
              await writeVocabularyManifest();
            } catch (error) {
              server.config.logger.error(
                `Cannot update vocabulary version: ${error}`,
              );
            }
          }
        });
      },
    },
  ],
});
