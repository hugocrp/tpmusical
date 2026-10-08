import { inject, injectable } from "tsyringe";
import type { Cache } from "../../application/ports/Cache.js";
import type { MusicProvider } from "../../application/ports/MusicProvider.js";
import type { Track } from "../../domain/types.js";
import { MUSIC_CACHE, RATE_LIMITED_MUSIC_PROVIDER } from "../../di/infrastructureTokens.js";

@injectable()
export class CachingMusicProvider implements MusicProvider {
  constructor(
    @inject(RATE_LIMITED_MUSIC_PROVIDER) private readonly musicProvider: MusicProvider,
    @inject(MUSIC_CACHE) private readonly cache: Cache<string, Track | null>,
  ) {}

  async findTrack(query: string): Promise<Track | null> {
    const key = query.trim().toLowerCase().replace(/\s+/g, " ");

    const cached = await this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const track = await this.musicProvider.findTrack(query);
    await this.cache.set(key, track);
    return track;
  }
}
