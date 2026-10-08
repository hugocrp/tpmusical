import type { Notifier } from "../../src/application/ports/Notifier.js";
import type { Delivery, UserPreferences, WakeUpMessage } from "../../src/domain/types.js";

export class FakeNotifier implements Notifier {
  public readonly notifications: { preferences: UserPreferences; message: WakeUpMessage }[] = [];

  constructor(private readonly outcome: Delivery | Error = { channel: "email", incidents: [] }) {}

  async notify(preferences: UserPreferences, message: WakeUpMessage): Promise<Delivery> {
    this.notifications.push({ preferences, message });
    if (this.outcome instanceof Error) {
      throw this.outcome;
    }
    return this.outcome;
  }
}
