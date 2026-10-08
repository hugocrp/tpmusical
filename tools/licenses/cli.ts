import { readFileSync, writeFileSync } from "node:fs";
import { auditScans, renderReport, type LicensePolicy, type RawScan } from "./audit.js";

const DIRECTORY = "licenses";

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(`${DIRECTORY}/${file}`, "utf8")) as T;
}

const policy = readJson<LicensePolicy>("policy.json");
const result = auditScans(readJson<RawScan>("licenses.json"), readJson<RawScan>("licenses.production.json"), policy);

writeFileSync(`${DIRECTORY}/licenses.md`, renderReport(result, { platform: `${process.platform}-${process.arch}` }));

for (const pkg of result.violations) {
  console.error(`LICENCE REFUSEE : ${pkg.name}@${pkg.version} (${pkg.licenses}, ${pkg.scope}) - ${pkg.reason}`);
}

const production = result.packages.filter((pkg) => pkg.scope === "production").length;
console.log(
  `${result.packages.length} paquets analysés (${production} en production), ${result.violations.length} violation(s). Rapport : ${DIRECTORY}/licenses.md`,
);

process.exit(result.violations.length === 0 ? 0 : 1);
