import type { LineWriter } from "../../src/vendors/LineWriter.js";

export class FakeLineWriter implements LineWriter {
  public readonly lines: string[] = [];

  write(line: string): void {
    this.lines.push(line);
  }
}
