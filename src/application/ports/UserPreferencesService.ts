import type { UserPreferences } from "../../domain/types.js";

export interface UserPreferencesService {
  getPreferences(userId: string): Promise<UserPreferences | null>;
}
