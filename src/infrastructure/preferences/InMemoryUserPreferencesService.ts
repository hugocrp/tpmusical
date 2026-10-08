import { inject, injectable } from "tsyringe";
import type { UserPreferencesService } from "../../application/ports/UserPreferencesService.js";
import type { UserPreferences } from "../../domain/types.js";
import { SIMULATED_OUTAGES } from "../../di/infrastructureTokens.js";

const USERS: readonly UserPreferences[] = [
  {
    userId: "u-001",
    tracksByWeather: {
      SOLEIL: "Here Comes the Sun",
      PLUIE: "Riders on the Storm",
      NEIGE: "Let It Snow",
      NUAGEUX: "Both Sides Now",
    },
    tracksByDay: {
      LUNDI: { PLUIE: "I Don't Like Mondays" },
      SAMEDI: { SOLEIL: "Walking on Sunshine", PLUIE: "Singin' in the Rain" },
      DIMANCHE: { SOLEIL: "Sunday Morning", PLUIE: "Sunday Morning" },
    },
    fallbackTrack: "Good Morning",
    preferredChannel: "email",
    addresses: { email: "alice@example.org", sms: "+33600000001", push: "device-token-alice" },
  },
  {
    userId: "u-002",
    tracksByWeather: { SOLEIL: "Walking on Sunshine", PLUIE: "Purple Rain" },
    tracksByDay: { VENDREDI: { SOLEIL: "Friday I'm in Love", NUAGEUX: "Friday I'm in Love" } },
    fallbackTrack: "Wake Me Up",
    preferredChannel: "sms",
    addresses: { sms: "+33600000002", email: "bob@example.org" },
  },
  {
    userId: "u-003",
    tracksByWeather: { NEIGE: "Snow (Hey Oh)" },
    tracksByDay: {},
    fallbackTrack: "Lovely Day",
    preferredChannel: "push",
    addresses: { push: "device-token-chloe", email: "chloe@example.org" },
  },
];

@injectable()
export class InMemoryUserPreferencesService implements UserPreferencesService {
  constructor(@inject(SIMULATED_OUTAGES) private readonly outages: readonly string[]) {}

  async getPreferences(userId: string): Promise<UserPreferences | null> {
    if (this.outages.includes("preferences")) {
      throw new Error("Service de préférences indisponible");
    }
    return USERS.find((user) => user.userId === userId) ?? null;
  }
}
