import { injectable } from "tsyringe";
import type { DayOfWeek, UserPreferences, Weather } from "../domain/types.js";
import type { TrackSelectionPolicy } from "./ports/TrackSelectionPolicy.js";

@injectable()
export class DayAndWeatherTrackSelectionPolicy implements TrackSelectionPolicy {
  select(preferences: UserPreferences, context: { day: DayOfWeek; weather: Weather }): string {
    return (
      preferences.tracksByDay[context.day]?.[context.weather] ??
      preferences.tracksByWeather[context.weather] ??
      preferences.fallbackTrack
    );
  }
}
