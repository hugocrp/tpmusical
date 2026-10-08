import type { Delay } from "../../src/application/ports/Delay.js";

export class FakeDelay implements Delay {
  public readonly waits: number[] = [];

  async wait(milliseconds: number): Promise<void> {
    this.waits.push(milliseconds);
  }
}
