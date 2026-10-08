import type { Logger } from "../../src/application/ports/Logger.js";

export class FakeLogger implements Logger {
  public readonly warnings: string[] = [];

  warn(message: string): void {
    this.warnings.push(message);
  }
}
