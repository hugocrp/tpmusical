import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const SCANNER = "license-checker@25.0.1";
const DIRECTORY = "licenses";

type ScanEntry = Record<string, unknown>;

function scan(extraArguments: string[]): Record<string, ScanEntry> {
  const output = execFileSync(
    "npx",
    ["--yes", SCANNER, "--json", "--excludePrivatePackages", "--relativeLicensePath", ...extraArguments],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "inherit"] },
  );

  const raw = JSON.parse(output) as Record<string, ScanEntry>;
  return Object.fromEntries(
    Object.entries(raw).map(([key, { path: _absolutePath, ...entry }]) => [key, entry]),
  );
}

function write(file: string, content: Record<string, ScanEntry>): void {
  writeFileSync(`${DIRECTORY}/${file}`, `${JSON.stringify(content, null, 2)}\n`);
  console.log(`${DIRECTORY}/${file} : ${Object.keys(content).length} paquets`);
}

write("licenses.json", scan([]));
write("licenses.production.json", scan(["--production"]));
