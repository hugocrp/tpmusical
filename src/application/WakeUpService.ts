import { inject, injectable } from "tsyringe";
import type { Track, WakeUpRequest, WakeUpResult } from "../domain/types.js";
import { UserNotFoundError } from "../domain/errors.js";
import type { FallbackTrackSource } from "./ports/FallbackTrackSource.js";
import type { Logger } from "./ports/Logger.js";
import type { MusicProvider } from "./ports/MusicProvider.js";
import type { Notifier } from "./ports/Notifier.js";
import type { TrackSelectionPolicy } from "./ports/TrackSelectionPolicy.js";
import type { UserPreferencesService } from "./ports/UserPreferencesService.js";
import { composeWakeUpMessage } from "./wakeUpMessage.js";
import {
  FALLBACK_TRACK_SOURCE,
  LOGGER,
  MUSIC_PROVIDER,
  NOTIFIER,
  TRACK_SELECTION_POLICY,
  USER_PREFERENCES_SERVICE,
} from "../di/tokens.js";

@injectable()
export class WakeUpService {
  constructor(
    @inject(USER_PREFERENCES_SERVICE) private readonly userPreferences: UserPreferencesService,
    @inject(TRACK_SELECTION_POLICY) private readonly trackSelection: TrackSelectionPolicy,
    @inject(MUSIC_PROVIDER) private readonly musicProvider: MusicProvider,
    @inject(FALLBACK_TRACK_SOURCE) private readonly fallbackTracks: FallbackTrackSource,
    @inject(NOTIFIER) private readonly notifier: Notifier,
    @inject(LOGGER) private readonly logger: Logger,
  ) {}

  async wakeUp(request: WakeUpRequest): Promise<WakeUpResult> {
    const preferences = await this.userPreferences.getPreferences(request.userId);
    if (!preferences) {
      throw new UserNotFoundError(request.userId);
    }

    const incidents: string[] = [];
    const query = this.trackSelection.select(preferences, request);

    let track = await this.findInCatalogue(query, incidents);
    const trackSource = track ? "catalogue" : "secours-local";
    track ??= this.fallbackTracks.pick(query);

    const delivery = await this.notifier.notify(preferences, composeWakeUpMessage(request, track));
    incidents.push(...delivery.incidents);

    return {
      userId: request.userId,
      track,
      trackSource,
      channel: delivery.channel,
      degraded: incidents.length > 0,
      incidents,
    };
  }

  private async findInCatalogue(query: string, incidents: string[]): Promise<Track | null> {
    try {
      const track = await this.musicProvider.findTrack(query);
      if (!track) {
        incidents.push(`Aucun fournisseur musical n'a fourni "${query}" : morceau de secours local`);
      }
      return track;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "erreur inconnue";
      incidents.push(`${reason} : morceau de secours local`);
      this.logger.warn(reason);
      return null;
    }
  }
}
