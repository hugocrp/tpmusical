export const WEATHERS = ["SOLEIL", "PLUIE", "NEIGE", "NUAGEUX"] as const;
export type Weather = (typeof WEATHERS)[number];

export const DAYS_OF_WEEK = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface WakeUpRequest {
  userId: string;
  day: DayOfWeek;
  weather: Weather;
}

export interface Track {
  title: string;
  artist: string;
}

export interface UserPreferences {
  userId: string;
  tracksByWeather: Partial<Record<Weather, string>>;
  tracksByDay: Partial<Record<DayOfWeek, Partial<Record<Weather, string>>>>;
  fallbackTrack: string;
  preferredChannel: string;
  addresses: Readonly<Record<string, string>>;
}

export interface WakeUpMessage {
  title: string;
  body: string;
}

export interface Delivery {
  channel: string;
  incidents: string[];
}

export type TrackSource = "catalogue" | "secours-local";

export interface WakeUpResult {
  userId: string;
  track: Track;
  trackSource: TrackSource;
  channel: string;
  degraded: boolean;
  incidents: string[];
}
