import type { InjectionToken } from "tsyringe";
import type { FallbackTrackSource } from "../application/ports/FallbackTrackSource.js";
import type { Logger } from "../application/ports/Logger.js";
import type { MusicProvider } from "../application/ports/MusicProvider.js";
import type { NotificationChannel } from "../application/ports/NotificationChannel.js";
import type { Notifier } from "../application/ports/Notifier.js";
import type { TrackSelectionPolicy } from "../application/ports/TrackSelectionPolicy.js";
import type { UserPreferencesService } from "../application/ports/UserPreferencesService.js";

export const USER_PREFERENCES_SERVICE: InjectionToken<UserPreferencesService> = Symbol("UserPreferencesService");
export const TRACK_SELECTION_POLICY: InjectionToken<TrackSelectionPolicy> = Symbol("TrackSelectionPolicy");
export const MUSIC_PROVIDER: InjectionToken<MusicProvider> = Symbol("MusicProvider");
export const FALLBACK_TRACK_SOURCE: InjectionToken<FallbackTrackSource> = Symbol("FallbackTrackSource");
export const NOTIFIER: InjectionToken<Notifier> = Symbol("Notifier");
export const NOTIFICATION_CHANNELS: InjectionToken<Readonly<Record<string, NotificationChannel>>> =
  Symbol("NotificationChannels");
export const LOGGER: InjectionToken<Logger> = Symbol("Logger");
