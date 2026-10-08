import { describe, expect, it } from "vitest";
import { auditScans, renderReport, type AuditedPackage, type LicensePolicy, type RawScan } from "../../tools/licenses/audit.js";

const policy: LicensePolicy = {
  allowed: {
    always: ["MIT", "ISC", "Apache-2.0", "BSD-3-Clause"],
    developmentOnly: { "MPL-2.0": "licenses/decisions.md" },
  },
  families: {
    permissive: ["MIT", "ISC", "Apache-2.0", "BSD-3-Clause", "Unlicense"],
    copyleft: ["GPL-*", "AGPL-*", "LGPL-*", "MPL-*"],
    proprietary: ["UNLICENSED", "SEE LICENSE IN *"],
  },
};

function audit(licenses: string | string[], scope: "production" | "development" = "production"): AuditedPackage {
  const scan: RawScan = { "paquet@1.0.0": { licenses } };
  const result = auditScans(scan, scope === "production" ? scan : { "autre@1.0.0": { licenses: "MIT" } }, policy);
  return result.packages[0] as AuditedPackage;
}

describe("auditScans : licences autorisées", () => {
  it.each(["MIT", "ISC", "Apache-2.0", "BSD-3-Clause"])("autorise %s", (license) => {
    expect(audit(license)).toMatchObject({ family: "permissive", status: "allowed" });
  });

  it("compare les identifiants sans tenir compte de la casse", () => {
    expect(audit("mit").status).toBe("allowed");
  });

  it("autorise une alternative OR dont un terme est autorisé", () => {
    expect(audit("(MIT OR GPL-3.0)")).toMatchObject({ family: "permissive", status: "allowed" });
  });

  it("traite un tableau de licences comme des alternatives", () => {
    expect(audit(["MIT", "GPL-3.0"])).toMatchObject({ family: "permissive", status: "allowed" });
  });
});

describe("auditScans : licences refusées", () => {
  it.each(["GPL-3.0", "GPL-2.0-only", "GPL-3.0-or-later", "AGPL-3.0", "LGPL-2.1", "LGPL-3.0-or-later"])(
    "refuse la licence copyleft %s",
    (license) => {
      expect(audit(license)).toMatchObject({ family: "copyleft", status: "rejected" });
    },
  );

  it("refuse un AND dont un terme n'est pas autorisé, même si l'autre l'est", () => {
    expect(audit("MIT AND GPL-3.0")).toMatchObject({ family: "copyleft", status: "rejected" });
  });

  it("refuse une double licence dont toutes les alternatives sont copyleft", () => {
    expect(audit("(AGPL-3.0-or-later OR LGPL-3.0-or-later)")).toMatchObject({ family: "copyleft", status: "rejected" });
  });

  it("refuse une exception WITH non listée", () => {
    expect(audit("GPL-2.0 WITH Classpath-exception-2.0")).toMatchObject({ family: "copyleft", status: "rejected" });
  });

  it("refuse une licence permissive absente de la liste blanche", () => {
    expect(audit("Unlicense")).toMatchObject({ family: "permissive", status: "rejected" });
  });

  it.each(["UNLICENSED", "SEE LICENSE IN LICENSE.md"])("refuse la licence propriétaire %s", (license) => {
    expect(audit(license)).toMatchObject({ family: "proprietary", status: "rejected" });
  });

  it.each(["UNKNOWN", "Custom: https://exemple.fr", "Licence maison"])("refuse la licence non identifiée %s", (license) => {
    expect(audit(license)).toMatchObject({ family: "unidentified", status: "rejected" });
  });

  it("refuse une licence déduite par l'outil (suffixe *) et la signale", () => {
    expect(audit("MIT*")).toMatchObject({ licenses: "MIT", guessed: true, status: "rejected" });
  });

  it("refuse un paquet sans licence renseignée", () => {
    const result = auditScans({ "paquet@1.0.0": {} }, {}, policy);

    expect(result.packages[0]).toMatchObject({ family: "unidentified", status: "rejected" });
  });
});

describe("auditScans : exception réservée au développement", () => {
  it("tolère MPL-2.0 dans les dépendances de développement", () => {
    expect(audit("MPL-2.0", "development")).toMatchObject({ family: "copyleft", scope: "development", status: "development-exception" });
  });

  it("refuse MPL-2.0 dans les dépendances de production", () => {
    expect(audit("MPL-2.0", "production")).toMatchObject({ scope: "production", status: "rejected" });
  });

  it("ne tolère pas une autre licence copyleft en développement", () => {
    expect(audit("GPL-3.0", "development")).toMatchObject({ status: "rejected" });
  });
});

describe("auditScans : structure du résultat", () => {
  it("sépare le nom et la version, y compris pour un paquet à portée", () => {
    const result = auditScans({ "@esbuild/darwin-arm64@0.27.7": { licenses: "MIT" } }, {}, policy);

    expect(result.packages[0]).toMatchObject({ name: "@esbuild/darwin-arm64", version: "0.27.7" });
  });

  it("déduit la portée de la présence dans le scan de production", () => {
    const full: RawScan = { "a@1.0.0": { licenses: "MIT" }, "b@1.0.0": { licenses: "MIT" } };
    const result = auditScans(full, { "a@1.0.0": { licenses: "MIT" } }, policy);

    expect(result.packages.map((pkg) => [pkg.name, pkg.scope])).toEqual([
      ["a", "production"],
      ["b", "development"],
    ]);
  });

  it("liste uniquement les paquets refusés dans les violations", () => {
    const full: RawScan = { "a@1.0.0": { licenses: "MIT" }, "b@1.0.0": { licenses: "GPL-3.0" } };
    const result = auditScans(full, full, policy);

    expect(result.violations.map((pkg) => pkg.name)).toEqual(["b"]);
  });

  it("échoue sur un scan vide plutôt que de conclure à la conformité", () => {
    expect(() => auditScans({}, {}, policy)).toThrow(/Scan vide/);
  });
});

describe("renderReport", () => {
  const full: RawScan = {
    "a@1.0.0": { licenses: "MIT" },
    "b@2.0.0": { licenses: "MPL-2.0" },
    "c@3.0.0": { licenses: "GPL-3.0" },
  };

  it("annonce la conformité quand il n'y a aucune violation", () => {
    const report = renderReport(auditScans({ "a@1.0.0": full["a@1.0.0"] as RawScan[string] }, {}, policy), { platform: "test" });

    expect(report).toContain("Conforme");
    expect(report).not.toContain("Non conforme");
  });

  it("liste chaque violation avec sa raison", () => {
    const report = renderReport(auditScans(full, { "a@1.0.0": { licenses: "MIT" }, "c@3.0.0": { licenses: "GPL-3.0" } }, policy), {
      platform: "test",
    });

    expect(report).toContain("Non conforme : 1 paquet(s) en violation.");
    expect(report).toContain("`c@3.0.0` : GPL-3.0 (production) - licence copyleft absente de la liste blanche");
  });

  it("signale les licences copyleft et classe chaque paquet", () => {
    const report = renderReport(auditScans(full, {}, policy), { platform: "test" });

    expect(report).toContain("- `b@2.0.0` : MPL-2.0 (development, exception développement)");
    expect(report).toContain("| a | 1.0.0 | MIT | permissive | development | autorisée |");
  });
});
