export type SpdxNode =
  | { kind: "license"; id: string }
  | { kind: "and" | "or"; operands: SpdxNode[] };

export function parseSpdx(expression: string): SpdxNode {
  const tokens = expression.match(/\(|\)|[^\s()]+/g) ?? [];
  let position = 0;

  const peek = (): string | undefined => tokens[position];
  const isKeyword = (token: string | undefined, keyword: string): boolean => token?.toUpperCase() === keyword;

  function parseOr(): SpdxNode {
    const operands = [parseAnd()];
    while (isKeyword(peek(), "OR")) {
      position++;
      operands.push(parseAnd());
    }
    return operands.length === 1 ? (operands[0] as SpdxNode) : { kind: "or", operands };
  }

  function parseAnd(): SpdxNode {
    const operands = [parseTerm()];
    while (isKeyword(peek(), "AND")) {
      position++;
      operands.push(parseTerm());
    }
    return operands.length === 1 ? (operands[0] as SpdxNode) : { kind: "and", operands };
  }

  function parseTerm(): SpdxNode {
    const token = peek();
    if (token === undefined || token === ")" || isKeyword(token, "AND") || isKeyword(token, "OR")) {
      throw new Error(`Expression SPDX invalide : "${expression}"`);
    }
    position++;
    if (token === "(") {
      const inner = parseOr();
      if (peek() !== ")") {
        throw new Error(`Expression SPDX invalide : "${expression}"`);
      }
      position++;
      return inner;
    }
    if (isKeyword(peek(), "WITH")) {
      position++;
      const exception = peek();
      if (exception === undefined || exception === "(" || exception === ")") {
        throw new Error(`Expression SPDX invalide : "${expression}"`);
      }
      position++;
      return { kind: "license", id: `${token} WITH ${exception}` };
    }
    return { kind: "license", id: token };
  }

  const node = parseOr();
  if (position !== tokens.length) {
    throw new Error(`Expression SPDX invalide : "${expression}"`);
  }
  return node;
}

export function parseSpdxOrOpaque(expression: string): SpdxNode {
  try {
    return parseSpdx(expression);
  } catch {
    return { kind: "license", id: expression.trim() };
  }
}

export function satisfies(node: SpdxNode, isAllowed: (id: string) => boolean): boolean {
  if (node.kind === "license") {
    return isAllowed(node.id);
  }
  return node.kind === "or"
    ? node.operands.some((operand) => satisfies(operand, isAllowed))
    : node.operands.every((operand) => satisfies(operand, isAllowed));
}

export function reduce<T>(node: SpdxNode, onLicense: (id: string) => T, onOr: (values: T[]) => T, onAnd: (values: T[]) => T): T {
  if (node.kind === "license") {
    return onLicense(node.id);
  }
  const values = node.operands.map((operand) => reduce(operand, onLicense, onOr, onAnd));
  return node.kind === "or" ? onOr(values) : onAnd(values);
}
