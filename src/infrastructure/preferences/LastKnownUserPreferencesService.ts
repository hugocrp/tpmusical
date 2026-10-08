import { inject, injectable } from "tsyringe";
import type { Cache } from "../../application/ports/Cache.js";
import type { Logger } from "../../application/ports/Logger.js";
import type { UserPreferencesService } from "../../application/ports/UserPreferencesService.js";
import type { UserPreferences } from "../../domain/types.js";
import { PREFERENCES_CACHE, RAW_USER_PREFERENCES_SERVICE } from "../../di/infrastructureTokens.js";
import { LOGGER } from "../../di/tokens.js";

@injectable()
export class LastKnownUserPreferencesService implements UserPreferencesService {
  constructor(
    @inject(RAW_USER_PREFERENCES_SERVICE) private readonly userPreferences: UserPreferencesService,
    @inject(PREFERENCES_CACHE) private readonly cache: Cache<string, UserPreferences>,
    @inject(LOGGER) private readonly logger: Logger,
  ) {}

  async getPreferences(userId: string): Promise<UserPreferences | null> {
    let preferences: UserPreferences | null;
    try {
      preferences = await this.userPreferences.getPreferences(userId);
    } catch (error) {
      const lastKnown = await this.cache.get(userId);
      if (!lastKnown) {
        throw error;
      }
      this.logger.warn(`Service de préférences indisponible : dernières préférences connues de "${userId}" utilisées`);
      return lastKnown;
    }

    if (preferences) {
      await this.remember(userId, preferences);
    }
    return preferences;
  }

  private async remember(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      await this.cache.set(userId, preferences);
    } catch {
      this.logger.warn(`Préférences de "${userId}" non mémorisées : écriture impossible`);
    }
  }
}
