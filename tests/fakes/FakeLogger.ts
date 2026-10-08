import type { Logger } from "../../src/application/ports/Logger.js";

export class FakeLogger implements Logger {
  public readonly infos: string[] = [];
  public readonly warnings: string[] = [];

  info(message: string): void {
    this.infos.push(message);
  }

  warn(message: string): void {
    this.warnings.push(message);
  }
}
