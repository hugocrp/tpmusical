import { inject, injectable } from "tsyringe";
import type { Delivery, UserPreferences, WakeUpMessage } from "../domain/types.js";
import { NotificationFailedError } from "../domain/errors.js";
import type { Delay } from "./ports/Delay.js";
import type { Logger } from "./ports/Logger.js";
import type { NotificationChannel } from "./ports/NotificationChannel.js";
import type { Notifier } from "./ports/Notifier.js";
import { DELAY, LOGGER, NOTIFICATION_CHANNELS, NOTIFICATION_RETRY_DELAY_MS, NOTIFICATION_ROUNDS } from "../di/tokens.js";

interface Target {
  channelName: string;
  channel: NotificationChannel;
  address: string;
}

@injectable()
export class FailoverNotifier implements Notifier {
  constructor(
    @inject(NOTIFICATION_CHANNELS) private readonly channels: Readonly<Record<string, NotificationChannel>>,
    @inject(LOGGER) private readonly logger: Logger,
    @inject(DELAY) private readonly delay: Delay,
    @inject(NOTIFICATION_ROUNDS) private readonly rounds: number,
    @inject(NOTIFICATION_RETRY_DELAY_MS) private readonly retryDelayMs: number,
  ) {}

  async notify(preferences: UserPreferences, message: WakeUpMessage): Promise<Delivery> {
    const incidents: string[] = [];
    const report = (incident: string): void => {
      incidents.push(incident);
      this.logger.warn(incident);
    };

    const targets = this.reachableTargets(preferences, report);

    for (let round = 1; round <= this.rounds && targets.length > 0; round += 1) {
      if (round > 1) {
        await this.delay.wait(this.retryDelayMs);
      }
      for (const target of targets) {
        try {
          await target.channel.send(target.address, message);
          return { channel: target.channelName, incidents };
        } catch (error) {
          report(error instanceof Error ? error.message : `Canal "${target.channelName}" en échec`);
        }
      }
    }

    throw new NotificationFailedError(preferences.userId, incidents);
  }

  private reachableTargets(preferences: UserPreferences, report: (incident: string) => void): Target[] {
    const others = Object.keys(preferences.addresses).filter((name) => name !== preferences.preferredChannel);
    const targets: Target[] = [];

    for (const channelName of [preferences.preferredChannel, ...others]) {
      const channel = Object.hasOwn(this.channels, channelName) ? this.channels[channelName] : undefined;
      const address = Object.hasOwn(preferences.addresses, channelName) ? preferences.addresses[channelName] : undefined;

      if (channel && address) {
        targets.push({ channelName, channel, address });
      } else if (channelName === preferences.preferredChannel) {
        report(
          channel
            ? `Aucune adresse connue pour le canal "${channelName}"`
            : `Canal "${channelName}" non disponible sur cette installation`,
        );
      }
    }
    return targets;
  }
}
