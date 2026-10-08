import { inject, injectable } from "tsyringe";
import type { LineWriter } from "./LineWriter.js";
import { MOCK_OUTPUT, SIMULATED_OUTAGES } from "../di/infrastructureTokens.js";

export const SMS_MAX_LENGTH = 160;

export interface SmsReceipt {
  status: "QUEUED" | "REJECTED";
  errorCode?: string;
}

@injectable()
export class MockSmsGateway {
  constructor(
    @inject(MOCK_OUTPUT) private readonly output: LineWriter,
    @inject(SIMULATED_OUTAGES) private readonly outages: readonly string[],
  ) {}

  sendSms(phoneNumber: string, text: string): SmsReceipt {
    if (this.outages.includes("sms")) {
      return { status: "REJECTED", errorCode: "GATEWAY_DOWN" };
    }
    if (text.length > SMS_MAX_LENGTH) {
      return { status: "REJECTED", errorCode: "MESSAGE_TOO_LONG" };
    }
    this.output.write(`[SMS] vers=${phoneNumber} | ${text}`);
    return { status: "QUEUED" };
  }
}
