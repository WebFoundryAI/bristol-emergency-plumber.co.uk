import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sitemapPath = path.join(rootDir, "sitemap.xml");
const postcodeRegex = /\/emergency-plumber-[a-z]{1,2}\d{1,2}[a-z]?/i;

const sitemap = await fs.readFile(sitemapPath, "utf8");
if (postcodeRegex.test(sitemap)) {
  throw new Error("Sitemap contains postcode URLs. Remove them before deploying.");
}

const scanDir = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      files.push(...(await scanDir(path.join(dir, entry.name))));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
};

const htmlFiles = await scanDir(rootDir);
const offenders = [];

for (const file of htmlFiles) {
  const contents = await fs.readFile(file, "utf8");
  if (postcodeRegex.test(contents)) {
    offenders.push(path.relative(rootDir, file));
  }
}

if (offenders.length > 0) {
  throw new Error(
    `Found postcode URL references in: ${offenders.join(", ")}. Remove them.`,
  );
}

console.log("Postcode checks passed: no postcode URLs in sitemap or HTML files.");
