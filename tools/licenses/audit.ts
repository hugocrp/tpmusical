import { parseSpdxOrOpaque, reduce, satisfies } from "./spdx.js";

export type LicenseFamily = "permissive" | "copyleft" | "proprietary" | "unidentified";
export type PackageScope = "production" | "development";
export type PackageStatus = "allowed" | "development-exception" | "rejected";

export interface LicensePolicy {
  allowed: {
    always: string[];
    developmentOnly: Record<string, string>;
  };
  families: {
    permissive: string[];
    copyleft: string[];
    proprietary: string[];
  };
}

export interface RawScanEntry {
  licenses?: string | string[];
  repository?: string;
}

export type RawScan = Record<string, RawScanEntry>;

export interface AuditedPackage {
  name: string;
  version: string;
  licenses: string;
  family: LicenseFamily;
  scope: PackageScope;
  guessed: boolean;
  status: PackageStatus;
  reason?: string;
}

export interface AuditResult {
  packages: AuditedPackage[];
  violations: AuditedPackage[];
}

const FAMILY_ORDER: LicenseFamily[] = ["permissive", "copyleft", "proprietary", "unidentified"];

const rank = (family: LicenseFamily): number => FAMILY_ORDER.indexOf(family);
const mostPermissive = (families: LicenseFamily[]): LicenseFamily =>
  families.reduce((best, family) => (rank(family) < rank(best) ? family : best));
const mostRestrictive = (families: LicenseFamily[]): LicenseFamily =>
  families.reduce((worst, family) => (rank(family) > rank(worst) ? family : worst));

function matchesPattern(pattern: string, id: string): boolean {
  const normalizedPattern = pattern.toLowerCase();
  const normalizedId = id.toLowerCase();
  return normalizedPattern.endsWith("*")
    ? normalizedId.startsWith(normalizedPattern.slice(0, -1))
    : normalizedId === normalizedPattern;
}

function familyOfId(id: string, policy: LicensePolicy): LicenseFamily {
  const baseId = id.split(" WITH ")[0] ?? id;
  for (const family of ["permissive", "copyleft", "proprietary"] as const) {
    if (policy.families[family].some((pattern) => matchesPattern(pattern, baseId))) {
      return family;
    }
  }
  return "unidentified";
}

function isListed(list: string[], id: string): boolean {
  return list.some((entry) => entry.toLowerCase() === id.toLowerCase());
}

function splitPackageKey(key: string): { name: string; version: string } {
  const separator = key.lastIndexOf("@");
  return separator > 0 ? { name: key.slice(0, separator), version: key.slice(separator + 1) } : { name: key, version: "" };
}

function auditPackage(key: string, entry: RawScanEntry, scope: PackageScope, policy: LicensePolicy): AuditedPackage {
  const declared = Array.isArray(entry.licenses) ? entry.licenses : [entry.licenses ?? "UNKNOWN"];
  const guessed = declared.some((license) => license.trim().endsWith("*"));
  const cleaned = declared.map((license) => license.trim().replace(/\*$/, ""));
  const licenses = cleaned.length === 1 ? (cleaned[0] as string) : `(${cleaned.join(" OR ")})`;

  const node = parseSpdxOrOpaque(licenses);
  const family = reduce<LicenseFamily>(node, (id) => familyOfId(id, policy), mostPermissive, mostRestrictive);

  const isAlwaysAllowed = (id: string): boolean => isListed(policy.allowed.always, id);
  const isDevelopmentAllowed = (id: string): boolean =>
    isAlwaysAllowed(id) || isListed(Object.keys(policy.allowed.developmentOnly), id);

  const base = { ...splitPackageKey(key), licenses, family, scope, guessed };

  if (guessed) {
    return { ...base, status: "rejected", reason: "licence déduite par l'outil et non déclarée par le paquet" };
  }
  if (satisfies(node, isAlwaysAllowed)) {
    return { ...base, status: "allowed" };
  }
  if (scope === "development" && satisfies(node, isDevelopmentAllowed)) {
    return { ...base, status: "development-exception" };
  }
  if (scope === "production" && satisfies(node, isDevelopmentAllowed)) {
    return { ...base, status: "rejected", reason: "exception réservée aux dépendances de développement" };
  }

  const reasons: Record<LicenseFamily, string> = {
    permissive: "licence permissive absente de la liste blanche",
    copyleft: "licence copyleft absente de la liste blanche",
    proprietary: "licence propriétaire",
    unidentified: "licence non identifiée",
  };
  return { ...base, status: "rejected", reason: reasons[family] };
}

export function auditScans(fullScan: RawScan, productionScan: RawScan, policy: LicensePolicy): AuditResult {
  const keys = Object.keys(fullScan);
  if (keys.length === 0) {
    throw new Error("Scan vide : aucun paquet analysé, l'audit ne peut pas conclure");
  }

  const packages = keys
    .map((key) => auditPackage(key, fullScan[key] as RawScanEntry, key in productionScan ? "production" : "development", policy))
    .sort((a, b) => a.name.localeCompare(b.name, "en") || a.version.localeCompare(b.version, "en"));

  return { packages, violations: packages.filter((pkg) => pkg.status === "rejected") };
}

const STATUS_LABELS: Record<PackageStatus, string> = {
  allowed: "autorisée",
  "development-exception": "exception développement",
  rejected: "refusée",
};

const escapeCell = (value: string): string => value.replace(/\|/g, "\\|");

function bulletList(packages: AuditedPackage[]): string[] {
  return packages.length === 0
    ? ["Aucun."]
    : packages.map(
        (pkg) => `- \`${pkg.name}@${pkg.version}\` : ${escapeCell(pkg.licenses)} (${pkg.scope}, ${STATUS_LABELS[pkg.status]})`,
      );
}

export function renderReport(result: AuditResult, context: { platform: string }): string {
  const { packages, violations } = result;
  const production = packages.filter((pkg) => pkg.scope === "production");

  const byLicense = new Map<string, AuditedPackage[]>();
  for (const pkg of packages) {
    byLicense.set(pkg.licenses, [...(byLicense.get(pkg.licenses) ?? []), pkg]);
  }
  const summaryRows = [...byLicense.entries()]
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([licenses, group]) => {
      const statuses = [...new Set(group.map((pkg) => STATUS_LABELS[pkg.status]))].join(", ");
      const inProduction = group.filter((pkg) => pkg.scope === "production").length;
      return `| ${escapeCell(licenses)} | ${group[0]?.family} | ${group.length} | ${inProduction} | ${statuses} |`;
    });

  const detailRows = packages.map(
    (pkg) =>
      `| ${pkg.name} | ${pkg.version} | ${escapeCell(pkg.licenses)}${pkg.guessed ? " (déduite)" : ""} | ${pkg.family} | ${pkg.scope} | ${STATUS_LABELS[pkg.status]} |`,
  );

  const verdict =
    violations.length === 0
      ? ["Conforme : toutes les licences respectent la politique."]
      : [
          `Non conforme : ${violations.length} paquet(s) en violation.`,
          "",
          ...violations.map((pkg) => `- \`${pkg.name}@${pkg.version}\` : ${escapeCell(pkg.licenses)} (${pkg.scope}) - ${pkg.reason}`),
        ];

  return [
    "# Audit des licences",
    "",
    "Fichier généré par `npm run licenses` : ne pas modifier à la main.",
    "",
    `- Plateforme du scan : ${context.platform} (les binaires natifs optionnels dépendent de la plateforme)`,
    `- Paquets analysés : ${packages.length} (${production.length} en production, ${packages.length - production.length} en développement uniquement)`,
    "- Scans bruts : [`licenses.json`](licenses.json) (tout l'arbre) et [`licenses.production.json`](licenses.production.json) (dépendances de production)",
    "- Politique : [`policy.json`](policy.json) - décisions : [`decisions.md`](decisions.md)",
    "",
    "## Verdict",
    "",
    ...verdict,
    "",
    "## Synthèse par licence",
    "",
    "| Licence | Famille | Paquets | Dont production | Statut |",
    "|---|---|---|---|---|",
    ...summaryRows,
    "",
    "## Signalements",
    "",
    "### Copyleft",
    "",
    ...bulletList(packages.filter((pkg) => pkg.family === "copyleft")),
    "",
    "### Propriétaires",
    "",
    ...bulletList(packages.filter((pkg) => pkg.family === "proprietary")),
    "",
    "### Non identifiées ou déduites par l'outil",
    "",
    ...bulletList(packages.filter((pkg) => pkg.family === "unidentified" || pkg.guessed)),
    "",
    "## Classification de chaque paquet",
    "",
    "| Paquet | Version | Licence | Famille | Portée | Statut |",
    "|---|---|---|---|---|---|",
    ...detailRows,
    "",
  ].join("\n");
}
