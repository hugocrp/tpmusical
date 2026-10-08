import { injectable } from "tsyringe";
import type { Logger } from "../../application/ports/Logger.js";

@injectable()
export class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(`[info] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[alerte] ${message}`);
  }
}
