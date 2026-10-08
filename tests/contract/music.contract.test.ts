import { InMemoryCache } from "../../src/infrastructure/cache/InMemoryCache.js";
import { CachingMusicProvider } from "../../src/infrastructure/music/CachingMusicProvider.js";
import { ItunesMusicProvider } from "../../src/infrastructure/music/ItunesMusicProvider.js";
import { MusicBrainzMusicProvider } from "../../src/infrastructure/music/MusicBrainzMusicProvider.js";
import { RateLimitedMusicProvider } from "../../src/infrastructure/music/RateLimitedMusicProvider.js";
import type { Track } from "../../src/domain/types.js";
import { FakeClock } from "../fakes/FakeClock.js";
import { ITUNES_FOUND, ITUNES_NOT_FOUND, MUSICBRAINZ_FOUND, MUSICBRAINZ_NOT_FOUND } from "../fakes/fixtures.js";
import { describeMusicProviderContract } from "./musicProviderContract.js";

const expectedTrack: Track = { title: "Riders on the Storm", artist: "The Doors" };

describeMusicProviderContract("iTunes", {
  createProvider: (httpClient) => new ItunesMusicProvider(httpClient),
  foundResponse: ITUNES_FOUND,
  expectedTrack,
  notFoundResponse: ITUNES_NOT_FOUND,
  malformedResponse: { errorMessage: "Invalid request" },
});

describeMusicProviderContract("MusicBrainz", {
  createProvider: (httpClient) => new MusicBrainzMusicProvider(httpClient),
  foundResponse: MUSICBRAINZ_FOUND,
  expectedTrack,
  notFoundResponse: MUSICBRAINZ_NOT_FOUND,
  malformedResponse: { error: "Your requests are exceeding the allowable rate limit" },
});

describeMusicProviderContract("iTunes avec quota et cache", {
  createProvider: (httpClient) => {
    const clock = new FakeClock();
    return new CachingMusicProvider(
      new RateLimitedMusicProvider(new ItunesMusicProvider(httpClient), clock, "itunes", 20),
      new InMemoryCache<string, Track | null>(clock, 60_000),
    );
  },
  foundResponse: ITUNES_FOUND,
  expectedTrack,
  notFoundResponse: ITUNES_NOT_FOUND,
  malformedResponse: null,
});
