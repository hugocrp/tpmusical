import { inject, injectable } from "tsyringe";
import type { LineWriter } from "./LineWriter.js";
import { MOCK_OUTPUT, SIMULATED_OUTAGES } from "../di/infrastructureTokens.js";

export interface PushPayload {
  deviceToken: string;
  notification: {
    title: string;
    body: string;
  };
}

export type PushCallback = (error: Error | null) => void;

@injectable()
export class MockPushService {
  constructor(
    @inject(MOCK_OUTPUT) private readonly output: LineWriter,
    @inject(SIMULATED_OUTAGES) private readonly outages: readonly string[],
  ) {}

  push(payload: PushPayload, callback: PushCallback): void {
    if (this.outages.includes("push")) {
      callback(new Error("Push service unreachable"));
      return;
    }
    this.output.write(
      `[PUSH] appareil=${payload.deviceToken} titre="${payload.notification.title}" | ${payload.notification.body}`,
    );
    callback(null);
  }
}
