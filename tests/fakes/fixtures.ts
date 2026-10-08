import type { UserPreferences } from "../../src/domain/types.js";

export const ALICE: UserPreferences = {
  userId: "alice",
  tracksByWeather: { SOLEIL: "Here Comes the Sun", PLUIE: "Riders on the Storm" },
  tracksByDay: { DIMANCHE: { PLUIE: "Sunday Morning" } },
  fallbackTrack: "Good Morning",
  preferredChannel: "email",
  addresses: { email: "alice@example.org", sms: "+33600000001" },
};

export const ITUNES_FOUND = {
  resultCount: 1,
  results: [
    {
      trackName: "Riders on the Storm",
      artistName: "The Doors",
      trackViewUrl: "https://music.apple.com/us/album/riders-on-the-storm/640047463",
    },
  ],
};

export const ITUNES_NOT_FOUND = { resultCount: 0, results: [] };

export const MUSICBRAINZ_FOUND = {
  count: 1,
  recordings: [
    {
      id: "b1a9c0e9-d987-4042-ae91-78d6a3267d69",
      title: "Riders on the Storm",
      "artist-credit": [{ name: "The Doors", artist: { id: "9efff43b", name: "The Doors" } }],
    },
  ],
};

export const MUSICBRAINZ_NOT_FOUND = { count: 0, recordings: [] };
