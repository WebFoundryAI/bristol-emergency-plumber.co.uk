import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sitemapPath = path.join(rootDir, "sitemap.xml");
const reportsDir = path.join(rootDir, "reports");
const outputPath = path.join(reportsDir, "postcodes-candidates.json");
const postcodeRegex = /\/emergency-plumber-[a-z]{1,2}\d{1,2}[a-z]?(\.html)?\/?$/i;

const sitemapContents = await fs.readFile(sitemapPath, "utf8");
const locRegex = /<loc>([^<]+)<\/loc>/g;
const urls = [];
let match;

while ((match = locRegex.exec(sitemapContents)) !== null) {
  urls.push(match[1].trim());
}

const candidates = urls.filter((url) => postcodeRegex.test(new URL(url).pathname));

await fs.mkdir(reportsDir, { recursive: true });
await fs.writeFile(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "sitemap.xml",
      pattern: postcodeRegex.source,
      candidates,
      count: candidates.length,
    },
    null,
    2,
  ),
);

console.log(`Wrote ${candidates.length} postcode candidate URLs to ${outputPath}`);
