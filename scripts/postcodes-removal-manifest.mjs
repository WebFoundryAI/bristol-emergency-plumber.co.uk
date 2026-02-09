import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const reportsDir = path.join(rootDir, "reports");
const candidatesPath = path.join(reportsDir, "postcodes-candidates.json");
const statusPath = path.join(reportsDir, "postcodes-index-status.json");
const outputPath = path.join(reportsDir, "postcodes-to-remove.json");

const candidatesFile = await fs.readFile(candidatesPath, "utf8");
const statusFile = await fs.readFile(statusPath, "utf8");

const { candidates } = JSON.parse(candidatesFile);
const { results } = JSON.parse(statusFile);

if (!Array.isArray(candidates) || !Array.isArray(results)) {
  throw new Error("Invalid candidates or index status report format.");
}

const resultMap = new Map(results.map((result) => [result.url, result]));
const missing = candidates.filter((url) => !resultMap.has(url));

if (missing.length > 0) {
  throw new Error(
    `Index status missing for ${missing.length} URLs. Regenerate postcodes-index-status.json.`,
  );
}

const toRemove = candidates.filter((url) => resultMap.get(url)?.verdict === "NOT_INDEXED");

await fs.mkdir(reportsDir, { recursive: true });
await fs.writeFile(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "postcodes-index-status.json",
      urls: toRemove,
      count: toRemove.length,
    },
    null,
    2,
  ),
);

console.log(`Wrote ${toRemove.length} URLs to remove to ${outputPath}`);
