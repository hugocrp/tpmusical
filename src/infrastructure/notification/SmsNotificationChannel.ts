import { inject, injectable } from "tsyringe";
import type { NotificationChannel } from "../../application/ports/NotificationChannel.js";
import { ChannelUnavailableError } from "../../domain/errors.js";
import type { WakeUpMessage } from "../../domain/types.js";
import { SMS_MAX_LENGTH, type MockSmsGateway } from "../../vendors/MockSmsGateway.js";
import { MOCK_SMS_GATEWAY } from "../../di/infrastructureTokens.js";

const ELLIPSIS = "…";

@injectable()
export class SmsNotificationChannel implements NotificationChannel {
  constructor(@inject(MOCK_SMS_GATEWAY) private readonly smsGateway: MockSmsGateway) {}

  async send(address: string, message: WakeUpMessage): Promise<void> {
    const text = `${message.title} - ${message.body}`;
    const fitted = text.length > SMS_MAX_LENGTH ? `${text.slice(0, SMS_MAX_LENGTH - ELLIPSIS.length)}${ELLIPSIS}` : text;

    const receipt = this.smsGateway.sendSms(address, fitted);
    if (receipt.status !== "QUEUED") {
      throw new ChannelUnavailableError("sms", `envoi rejeté par la passerelle (${receipt.errorCode ?? "sans code"})`);
    }
  }
}
