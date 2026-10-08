import { inject, injectable } from "tsyringe";
import type { Clock } from "../../application/ports/Clock.js";
import type { MusicProvider } from "../../application/ports/MusicProvider.js";
import { MusicProviderUnavailableError } from "../../domain/errors.js";
import type { Track } from "../../domain/types.js";
import {
  CLOCK,
  MUSIC_PROVIDER_NAME,
  MUSIC_PROVIDER_RATE_LIMIT,
  RAW_MUSIC_PROVIDER,
} from "../../di/infrastructureTokens.js";

const WINDOW_MS = 60_000;

@injectable()
export class RateLimitedMusicProvider implements MusicProvider {
  private recentCalls: number[] = [];

  constructor(
    @inject(RAW_MUSIC_PROVIDER) private readonly musicProvider: MusicProvider,
    @inject(CLOCK) private readonly clock: Clock,
    @inject(MUSIC_PROVIDER_NAME) private readonly providerName: string,
    @inject(MUSIC_PROVIDER_RATE_LIMIT) private readonly maxRequestsPerMinute: number,
  ) {}

  async findTrack(query: string): Promise<Track | null> {
    const now = this.clock.now();
    this.recentCalls = this.recentCalls.filter((time) => now - time < WINDOW_MS);

    if (this.recentCalls.length >= this.maxRequestsPerMinute) {
      throw new MusicProviderUnavailableError(
        this.providerName,
        `quota de ${this.maxRequestsPerMinute} requêtes par minute atteint`,
      );
    }

    this.recentCalls.push(now);
    return this.musicProvider.findTrack(query);
  }
}
