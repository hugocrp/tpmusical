import { setTimeout } from "node:timers/promises";
import { injectable } from "tsyringe";
import type { Delay } from "../../application/ports/Delay.js";

@injectable()
export class TimerDelay implements Delay {
  async wait(milliseconds: number): Promise<void> {
    await setTimeout(milliseconds);
  }
}
