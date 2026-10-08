import { injectable } from "tsyringe";
import type { Clock } from "../../application/ports/Clock.js";

@injectable()
export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}
