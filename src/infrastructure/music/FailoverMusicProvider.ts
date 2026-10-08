import { inject, injectable } from "tsyringe";
import type { Logger } from "../../application/ports/Logger.js";
import type { MusicProvider } from "../../application/ports/MusicProvider.js";
import type { Track } from "../../domain/types.js";
import { MUSIC_PROVIDER_CHAIN } from "../../di/infrastructureTokens.js";
import { LOGGER } from "../../di/tokens.js";

@injectable()
export class FailoverMusicProvider implements MusicProvider {
  constructor(
    @inject(MUSIC_PROVIDER_CHAIN) private readonly providers: readonly MusicProvider[],
    @inject(LOGGER) private readonly logger: Logger,
  ) {}

  async findTrack(query: string): Promise<Track | null> {
    for (const provider of this.providers) {
      try {
        const track = await provider.findTrack(query);
        if (track) {
          return track;
        }
      } catch (error) {
        this.logger.warn(error instanceof Error ? error.message : "Fournisseur musical en échec");
      }
    }
    return null;
  }
}
