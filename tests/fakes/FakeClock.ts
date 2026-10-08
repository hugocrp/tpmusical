import type { Clock } from "../../src/application/ports/Clock.js";

export class FakeClock implements Clock {
  constructor(private time = 0) {}

  now(): number {
    return this.time;
  }

  advance(milliseconds: number): void {
    this.time += milliseconds;
  }
}
