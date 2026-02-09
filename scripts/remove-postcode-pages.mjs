import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const reportsDir = path.join(rootDir, "reports");
const manifestPath = path.join(reportsDir, "postcodes-to-remove.json");

const manifestFile = await fs.readFile(manifestPath, "utf8");
const { urls } = JSON.parse(manifestFile);

if (!Array.isArray(urls)) {
  throw new Error("postcodes-to-remove.json must include a urls array.");
}

const deleteIfExists = async (filePath) => {
  await fs
    .stat(filePath)
    .then(() => fs.unlink(filePath))
    .then(() => {
      console.log(`Deleted ${filePath}`);
    })
    .catch((error) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
};

for (const url of urls) {
  const { pathname } = new URL(url);
  const trimmed = pathname.replace(/^\//, "").replace(/\/$/, "");
  if (!trimmed) {
    continue;
  }

  const directHtml = path.join(rootDir, `${trimmed}.html`);
  const directIndex = path.join(rootDir, trimmed, "index.html");
  await deleteIfExists(directHtml);
  await deleteIfExists(directIndex);
}

console.log(`Processed ${urls.length} postcode removal URLs.`);
