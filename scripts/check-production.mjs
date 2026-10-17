import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const root = resolve("dist");
const expectedCount = (
  await readFile("public/data/vocabulary.txt", "utf8")
).match(/^id: /gm).length;
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".txt": "text/plain",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://local").pathname,
    ).replace(/^\/pages-test\//, "/");
    let file = resolve(root, "." + path);
    if (file !== root && !file.startsWith(root + sep))
      throw Error("Invalid path");
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const bytes = await readFile(file);
    res.setHeader(
      "Content-Type",
      (mime[extname(file)] || "application/octet-stream") + ";charset=utf-8",
    );
    res.end(bytes);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  args: ["--no-sandbox"],
});
try {
  for (const path of ["/", "/pages-test/"]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}${path}`);
    await page
      .getByRole("heading", { name: "Hôm nay, mình học gì?" })
      .waitFor();
    await page.getByRole("button", { name: "Kho từ", exact: true }).click();
    assert.equal(
      Number(await page.locator(".word-grid").getAttribute("data-total-items")),
      expectedCount,
    );
    assert.equal(
      await page.locator(".word-card").count(),
      Math.min(60, expectedCount),
    );
    await page.reload();
    await page
      .getByRole("heading", { name: "Hôm nay, mình học gì?" })
      .waitFor();
    assert.deepEqual(errors, []);
    console.log(
      `PASS: production ${path} renders, loads ${expectedCount} entries, reloads without error`,
    );
    await page.close();
  }
  const page = await browser.newPage();
  await page.route("**/assets/*.js", (r) => r.abort());
  await page.goto(`http://127.0.0.1:${port}/pages-test/`);
  await page.getByText("Không tải được ứng dụng.", { exact: false }).waitFor();
  console.log(
    "PASS: missing JavaScript displays an error instead of a blank page",
  );
  await page.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
