import type { InjectionToken } from "tsyringe";
import type { MusicProvider } from "../application/ports/MusicProvider.js";
import type { NotificationChannel } from "../application/ports/NotificationChannel.js";
import { ItunesMusicProvider } from "../infrastructure/music/ItunesMusicProvider.js";
import { MusicBrainzMusicProvider } from "../infrastructure/music/MusicBrainzMusicProvider.js";
import { EmailNotificationChannel } from "../infrastructure/notification/EmailNotificationChannel.js";
import { PushNotificationChannel } from "../infrastructure/notification/PushNotificationChannel.js";
import { SmsNotificationChannel } from "../infrastructure/notification/SmsNotificationChannel.js";

export interface MusicProviderRegistration {
  adapter: InjectionToken<MusicProvider>;
  maxRequestsPerMinute: number;
}

export const MUSIC_PROVIDER_REGISTRY = {
  itunes: { adapter: ItunesMusicProvider, maxRequestsPerMinute: 20 },
  musicbrainz: { adapter: MusicBrainzMusicProvider, maxRequestsPerMinute: 50 },
} satisfies Record<string, MusicProviderRegistration>;

export const NOTIFICATION_CHANNEL_REGISTRY = {
  email: EmailNotificationChannel,
  sms: SmsNotificationChannel,
  push: PushNotificationChannel,
} satisfies Record<string, InjectionToken<NotificationChannel>>;

export type MusicProviderName = keyof typeof MUSIC_PROVIDER_REGISTRY;
export type NotificationChannelName = keyof typeof NOTIFICATION_CHANNEL_REGISTRY;

export function notificationChannelAdapter(name: NotificationChannelName): InjectionToken<NotificationChannel> {
  return NOTIFICATION_CHANNEL_REGISTRY[name];
}

function resolveNames<Name extends string>(variable: string, values: readonly string[], registry: Record<Name, unknown>): Name[] {
  for (const value of values) {
    if (!Object.hasOwn(registry, value)) {
      throw new Error(`${variable} invalide : "${value}" (attendu : ${Object.keys(registry).join(" | ")})`);
    }
  }
  return [...new Set(values)] as Name[];
}

export function resolveMusicProviders(values: readonly string[]): MusicProviderName[] {
  return resolveNames("MUSIC_PROVIDERS", values, MUSIC_PROVIDER_REGISTRY);
}

export function resolveNotificationChannels(values: readonly string[]): NotificationChannelName[] {
  const names = resolveNames("NOTIFICATION_CHANNELS", values, NOTIFICATION_CHANNEL_REGISTRY);
  if (names.length === 0) {
    throw new Error("NOTIFICATION_CHANNELS invalide : au moins un canal est requis");
  }
  return names;
}
