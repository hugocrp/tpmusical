import type { NotificationChannel } from "../../src/application/ports/NotificationChannel.js";
import type { WakeUpMessage } from "../../src/domain/types.js";

export class FakeNotificationChannel implements NotificationChannel {
  public readonly sent: { address: string; message: WakeUpMessage }[] = [];

  constructor(private readonly failure?: Error) {}

  async send(address: string, message: WakeUpMessage): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.sent.push({ address, message });
  }
}
