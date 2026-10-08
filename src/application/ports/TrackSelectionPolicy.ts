import type { DayOfWeek, UserPreferences, Weather } from "../../domain/types.js";

export interface TrackSelectionPolicy {
  select(preferences: UserPreferences, context: { day: DayOfWeek; weather: Weather }): string;
}
