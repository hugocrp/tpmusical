import { injectable } from "tsyringe";
import type { LineWriter } from "./LineWriter.js";

@injectable()
export class ConsoleLineWriter implements LineWriter {
  write(line: string): void {
    console.log(line);
  }
}
