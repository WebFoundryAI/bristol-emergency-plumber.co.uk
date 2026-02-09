import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleAuth } from "google-auth-library";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const reportsDir = path.join(rootDir, "reports");
const candidatesPath = path.join(reportsDir, "postcodes-candidates.json");
const outputPath = path.join(reportsDir, "postcodes-index-status.json");
const exportPath = path.join(reportsDir, "gsc-pages-export.csv");

const siteUrl = process.env.GSC_SITE_URL;

const candidatesFile = await fs.readFile(candidatesPath, "utf8");
const { candidates } = JSON.parse(candidatesFile);

if (!Array.isArray(candidates)) {
  throw new Error("postcodes-candidates.json is missing a candidates array.");
}

if (candidates.length === 0) {
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "none",
        results: [],
        count: 0,
      },
      null,
      2,
    ),
  );
  console.log("No postcode candidates found; wrote empty index status report.");
  process.exit(0);
}

const hasCredentials = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
const hasExport = await fs
  .access(exportPath)
  .then(() => true)
  .catch(() => false);

if (!hasCredentials && !hasExport) {
  throw new Error(
    "Index status proof unavailable. Set GOOGLE_APPLICATION_CREDENTIALS or provide reports/gsc-pages-export.csv.",
  );
}

if (!siteUrl && hasCredentials) {
  throw new Error("GSC_SITE_URL must be set when using the URL Inspection API.");
}

const normalizeVerdict = ({ coverageState = "", verdict = "", indexingState = "" }) => {
  const combined = `${coverageState} ${verdict} ${indexingState}`.toLowerCase();
  if (combined.includes("not indexed") || combined.includes("excluded")) {
    return "NOT_INDEXED";
  }
  if (combined.includes("indexed") || combined.includes("pass")) {
    return "INDEXED";
  }
  return "UNKNOWN";
};

const buildResult = (url, data, source) => ({
  url,
  source,
  verdict: normalizeVerdict(data),
  coverageState: data.coverageState ?? null,
  indexingState: data.indexingState ?? null,
  verdictRaw: data.verdict ?? null,
});

const fetchFromApi = async () => {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token?.token) {
    throw new Error("Unable to obtain access token for URL Inspection API.");
  }

  const results = [];
  for (const url of candidates) {
    const response = await fetch(
      "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inspectionUrl: url,
          siteUrl,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`URL Inspection API error for ${url}: ${response.status} ${text}`);
    }

    const payload = await response.json();
    const indexStatus = payload?.inspectionResult?.indexStatusResult ?? {};
    results.push(
      buildResult(
        url,
        {
          coverageState: indexStatus.coverageState,
          verdict: indexStatus.verdict,
          indexingState: indexStatus.indexingState,
        },
        "url-inspection-api",
      ),
    );
  }

  return results;
};

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((value) => value.trim());
};

const parseExport = async () => {
  const contents = await fs.readFile(exportPath, "utf8");
  const lines = contents.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    throw new Error("reports/gsc-pages-export.csv is empty.");
  }

  const headers = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
  const urlIndex = headers.findIndex((header) => header.includes("url") || header.includes("page"));
  const statusIndex = headers.findIndex(
    (header) =>
      header.includes("index") || header.includes("coverage") || header.includes("status"),
  );

  if (urlIndex === -1 || statusIndex === -1) {
    throw new Error(
      "Unable to locate URL or index status columns in reports/gsc-pages-export.csv.",
    );
  }

  const lookup = new Map();
  for (const line of lines.slice(1)) {
    const columns = parseCsvLine(line);
    const url = columns[urlIndex];
    const status = columns[statusIndex];
    if (!url) {
      continue;
    }
    lookup.set(url, status);
  }

  return candidates.map((url) => {
    const status = lookup.get(url) ?? "";
    return buildResult(
      url,
      {
        coverageState: status,
      },
      "gsc-export",
    );
  });
};

const results = hasCredentials ? await fetchFromApi() : await parseExport();

await fs.mkdir(reportsDir, { recursive: true });
await fs.writeFile(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: hasCredentials ? "url-inspection-api" : "gsc-export",
      results,
      count: results.length,
    },
    null,
    2,
  ),
);

console.log(`Wrote index status for ${results.length} URLs to ${outputPath}`);
