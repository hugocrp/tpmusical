import { inject, injectable } from "tsyringe";
import type { NotificationChannel } from "../../application/ports/NotificationChannel.js";
import { ChannelUnavailableError } from "../../domain/errors.js";
import type { WakeUpMessage } from "../../domain/types.js";
import type { MockPushService } from "../../vendors/MockPushService.js";
import { MOCK_PUSH_SERVICE } from "../../di/infrastructureTokens.js";

@injectable()
export class PushNotificationChannel implements NotificationChannel {
  constructor(@inject(MOCK_PUSH_SERVICE) private readonly pushService: MockPushService) {}

  send(address: string, message: WakeUpMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      this.pushService.push(
        { deviceToken: address, notification: { title: message.title, body: message.body } },
        (error) => {
          if (error) {
            reject(new ChannelUnavailableError("push", "notification refusée par le service push", error));
            return;
          }
          resolve();
        },
      );
    });
  }
}
