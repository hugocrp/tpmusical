import { injectable } from "tsyringe";
import type { Logger } from "../../application/ports/Logger.js";

@injectable()
export class ConsoleLogger implements Logger {
  warn(message: string): void {
    console.warn(`[alerte] ${message}`);
  }
}
