import type { UserPreferencesService } from "../../src/application/ports/UserPreferencesService.js";
import type { UserPreferences } from "../../src/domain/types.js";

export class FakeUserPreferencesService implements UserPreferencesService {
  constructor(private readonly users: readonly UserPreferences[]) {}

  async getPreferences(userId: string): Promise<UserPreferences | null> {
    return this.users.find((user) => user.userId === userId) ?? null;
  }
}
