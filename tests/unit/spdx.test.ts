import { describe, expect, it } from "vitest";
import { parseSpdx, parseSpdxOrOpaque, satisfies } from "../../tools/licenses/spdx.js";

const allowed = (...ids: string[]) => (id: string) => ids.includes(id);

describe("parseSpdx", () => {
  it("lit un identifiant simple", () => {
    expect(parseSpdx("MIT")).toEqual({ kind: "license", id: "MIT" });
  });

  it("lit une alternative OR, avec ou sans parenthèses", () => {
    const expected = {
      kind: "or",
      operands: [
        { kind: "license", id: "MIT" },
        { kind: "license", id: "Apache-2.0" },
      ],
    };

    expect(parseSpdx("MIT OR Apache-2.0")).toEqual(expected);
    expect(parseSpdx("(MIT OR Apache-2.0)")).toEqual(expected);
  });

  it("donne à AND la priorité sur OR", () => {
    expect(parseSpdx("MIT OR ISC AND BSD-3-Clause")).toEqual({
      kind: "or",
      operands: [
        { kind: "license", id: "MIT" },
        {
          kind: "and",
          operands: [
            { kind: "license", id: "ISC" },
            { kind: "license", id: "BSD-3-Clause" },
          ],
        },
      ],
    });
  });

  it("respecte les parenthèses imbriquées", () => {
    expect(parseSpdx("(MIT OR ISC) AND Apache-2.0")).toEqual({
      kind: "and",
      operands: [
        {
          kind: "or",
          operands: [
            { kind: "license", id: "MIT" },
            { kind: "license", id: "ISC" },
          ],
        },
        { kind: "license", id: "Apache-2.0" },
      ],
    });
  });

  it("garde l'exception WITH attachée à sa licence", () => {
    expect(parseSpdx("GPL-2.0 WITH Classpath-exception-2.0")).toEqual({
      kind: "license",
      id: "GPL-2.0 WITH Classpath-exception-2.0",
    });
  });

  it.each(["Custom: https://exemple.fr", "MIT OR", "(MIT", "MIT)", "", "AND MIT"])("rejette l'expression invalide %j", (expression) => {
    expect(() => parseSpdx(expression)).toThrow();
  });
});

describe("parseSpdxOrOpaque", () => {
  it("traite une chaîne non SPDX comme une licence opaque", () => {
    expect(parseSpdxOrOpaque("SEE LICENSE IN LICENSE.md")).toEqual({ kind: "license", id: "SEE LICENSE IN LICENSE.md" });
  });
});

describe("satisfies", () => {
  it("accepte un OR dès qu'une alternative est autorisée", () => {
    expect(satisfies(parseSpdx("MIT OR GPL-3.0"), allowed("MIT"))).toBe(true);
  });

  it("exige que tous les termes d'un AND soient autorisés", () => {
    expect(satisfies(parseSpdx("MIT AND GPL-3.0"), allowed("MIT"))).toBe(false);
    expect(satisfies(parseSpdx("MIT AND ISC"), allowed("MIT", "ISC"))).toBe(true);
  });

  it("refuse une licence absente de la liste", () => {
    expect(satisfies(parseSpdx("GPL-3.0"), allowed("MIT"))).toBe(false);
  });
});
