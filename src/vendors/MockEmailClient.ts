import { inject, injectable } from "tsyringe";
import type { LineWriter } from "./LineWriter.js";
import { MOCK_OUTPUT, SIMULATED_OUTAGES } from "../di/infrastructureTokens.js";

export interface MockMail {
  from: string;
  to: string;
  subject: string;
  text: string;
}

@injectable()
export class MockEmailClient {
  private sentCount = 0;

  constructor(
    @inject(MOCK_OUTPUT) private readonly output: LineWriter,
    @inject(SIMULATED_OUTAGES) private readonly outages: readonly string[],
  ) {}

  async sendMail(mail: MockMail): Promise<{ messageId: string }> {
    if (this.outages.includes("email")) {
      throw new Error("SMTP 421 Service not available");
    }
    this.sentCount += 1;
    this.output.write(`[EMAIL] de=${mail.from} à=${mail.to} objet="${mail.subject}" | ${mail.text}`);
    return { messageId: `mail-${this.sentCount}` };
  }
}
