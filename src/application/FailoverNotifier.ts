import { inject, injectable } from "tsyringe";
import type { Delivery, UserPreferences, WakeUpMessage } from "../domain/types.js";
import { NotificationFailedError } from "../domain/errors.js";
import type { Logger } from "./ports/Logger.js";
import type { NotificationChannel } from "./ports/NotificationChannel.js";
import type { Notifier } from "./ports/Notifier.js";
import { LOGGER, NOTIFICATION_CHANNELS } from "../di/tokens.js";

@injectable()
export class FailoverNotifier implements Notifier {
  constructor(
    @inject(NOTIFICATION_CHANNELS) private readonly channels: Readonly<Record<string, NotificationChannel>>,
    @inject(LOGGER) private readonly logger: Logger,
  ) {}

  async notify(preferences: UserPreferences, message: WakeUpMessage): Promise<Delivery> {
    const incidents: string[] = [];

    for (const channelName of this.candidateChannels(preferences)) {
      const failure = await this.trySend(channelName, preferences, message);
      if (failure === null) {
        return { channel: channelName, incidents };
      }
      incidents.push(failure);
      this.logger.warn(failure);
    }

    throw new NotificationFailedError(preferences.userId, incidents);
  }

  private candidateChannels(preferences: UserPreferences): string[] {
    const others = Object.keys(preferences.addresses).filter((name) => name !== preferences.preferredChannel);
    return [preferences.preferredChannel, ...others];
  }

  private async trySend(channelName: string, preferences: UserPreferences, message: WakeUpMessage): Promise<string | null> {
    const channel = Object.hasOwn(this.channels, channelName) ? this.channels[channelName] : undefined;
    if (!channel) {
      return `Canal "${channelName}" non disponible sur cette installation`;
    }

    const address = Object.hasOwn(preferences.addresses, channelName) ? preferences.addresses[channelName] : undefined;
    if (!address) {
      return `Aucune adresse connue pour le canal "${channelName}"`;
    }

    try {
      await channel.send(address, message);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : `Canal "${channelName}" en échec`;
    }
  }
}
