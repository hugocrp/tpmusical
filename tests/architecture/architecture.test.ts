import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(import.meta.dirname, "../../src");

const ALLOWED_INSTANTIATIONS = [/Error$/, /^Map$/, /^Set$/, /^Promise$/];
const BUSINESS_LAYERS = ["domain", "application"];
const BUSINESS_ALLOWED_IMPORTS = ["domain/", "application/", "di/tokens.js"];
const PROVIDER_SPECIFIC_WORDS = [/itunes/i, /musicbrainz/i, /trackViewUrl/, /artist-credit/, /smtp/i, /deviceToken/, /phoneNumber/];

interface SourceFile {
  path: string;
  content: string;
}

function listSourceFiles(directory: string): SourceFile[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }
    return [{ path: relative(SRC, fullPath), content: readFileSync(fullPath, "utf8") }];
  });
}

function importsOf(file: SourceFile): string[] {
  return [...file.content.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1] as string);
}

const files = listSourceFiles(SRC);
const businessFiles = files.filter((file) => BUSINESS_LAYERS.some((layer) => file.path.startsWith(`${layer}/`)));

describe("Règles d'architecture", () => {
  it("le code source est bien analysé", () => {
    expect(files.length).toBeGreaterThan(30);
    expect(businessFiles.length).toBeGreaterThan(10);
  });

  it("IoC/DI : aucune implémentation concrète n'est instanciée par new dans src/", () => {
    const violations = files.flatMap((file) =>
      [...file.content.matchAll(/\bnew\s+([A-Za-z_$][\w$.]*)/g)]
        .map((match) => match[1] as string)
        .filter((className) => !ALLOWED_INSTANTIATIONS.some((allowed) => allowed.test(className)))
        .map((className) => `${file.path} : new ${className}`),
    );

    expect(violations).toEqual([]);
  });

  it("isolation : le métier n'importe que le domaine, ses ports, les jetons et tsyringe", () => {
    const violations = businessFiles.flatMap((file) =>
      importsOf(file)
        .filter((specifier) => specifier !== "tsyringe")
        .map((specifier) => relative(SRC, resolve(SRC, dirname(file.path), specifier)))
        .filter((target) => !BUSINESS_ALLOWED_IMPORTS.some((allowed) => target.startsWith(allowed)))
        .map((target) => `${file.path} -> ${target}`),
    );

    expect(violations).toEqual([]);
  });

  it("isolation : aucun détail technique d'un fournisseur ou d'un canal dans le métier", () => {
    const violations = businessFiles.flatMap((file) =>
      PROVIDER_SPECIFIC_WORDS.filter((word) => word.test(file.content)).map((word) => `${file.path} : ${word}`),
    );

    expect(violations).toEqual([]);
  });

  it("les jetons du métier ne référencent aucun type d'infrastructure", () => {
    const tokens = files.find((file) => file.path === "di/tokens.ts");

    expect(importsOf(tokens as SourceFile).filter((specifier) => !/^tsyringe$|application\/ports\//.test(specifier))).toEqual([]);
  });

  it("dépendances cachées : process.env n'est lu que dans config/env.ts, l'horloge que dans SystemClock", () => {
    const readsEnv = files.filter((file) => /process\.env/.test(file.content)).map((file) => file.path);
    const readsClock = files.filter((file) => /Date\.now\(|new Date\(/.test(file.content)).map((file) => file.path);

    expect(readsEnv).toEqual(["config/env.ts"]);
    expect(readsClock).toEqual(["infrastructure/time/SystemClock.ts"]);
  });

  it("seul l'adaptateur HTTP appelle fetch", () => {
    const callsFetch = files.filter((file) => /\bfetch\(/.test(file.content)).map((file) => file.path);

    expect(callsFetch).toEqual(["infrastructure/http/FetchHttpClient.ts"]);
  });
});
