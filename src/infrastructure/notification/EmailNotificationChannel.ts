import { inject, injectable } from "tsyringe";
import type { NotificationChannel } from "../../application/ports/NotificationChannel.js";
import { ChannelUnavailableError } from "../../domain/errors.js";
import type { WakeUpMessage } from "../../domain/types.js";
import type { MockEmailClient } from "../../vendors/MockEmailClient.js";
import { EMAIL_SENDER, MOCK_EMAIL_CLIENT } from "../../di/infrastructureTokens.js";

@injectable()
export class EmailNotificationChannel implements NotificationChannel {
  constructor(
    @inject(MOCK_EMAIL_CLIENT) private readonly emailClient: MockEmailClient,
    @inject(EMAIL_SENDER) private readonly sender: string,
  ) {}

  async send(address: string, message: WakeUpMessage): Promise<void> {
    try {
      await this.emailClient.sendMail({ from: this.sender, to: address, subject: message.title, text: message.body });
    } catch (cause) {
      throw new ChannelUnavailableError("email", "envoi refusé par le service d'email", cause);
    }
  }
}
