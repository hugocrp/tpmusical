import { describe, expect, it } from "vitest";
import { MusicProviderUnavailableError } from "../../src/domain/errors.js";
import type { Track } from "../../src/domain/types.js";
import { InMemoryCache } from "../../src/infrastructure/cache/InMemoryCache.js";
import { CachingMusicProvider } from "../../src/infrastructure/music/CachingMusicProvider.js";
import { FailoverMusicProvider } from "../../src/infrastructure/music/FailoverMusicProvider.js";
import { ItunesMusicProvider } from "../../src/infrastructure/music/ItunesMusicProvider.js";
import { LocalFallbackTrackSource } from "../../src/infrastructure/music/LocalFallbackTrackSource.js";
import { MusicBrainzMusicProvider } from "../../src/infrastructure/music/MusicBrainzMusicProvider.js";
import { RateLimitedMusicProvider } from "../../src/infrastructure/music/RateLimitedMusicProvider.js";
import { FakeClock } from "../fakes/FakeClock.js";
import { FakeHttpClient } from "../fakes/FakeHttpClient.js";
import { FakeLogger } from "../fakes/FakeLogger.js";
import { FakeMusicProvider } from "../fakes/FakeMusicProvider.js";

const RIDERS: Track = { title: "Riders on the Storm", artist: "The Doors" };
const LOVELY: Track = { title: "Lovely Day", artist: "Bill Withers" };

describe("ItunesMusicProvider", () => {
  it("appelle l'API de recherche iTunes avec les bons paramètres", async () => {
    const httpClient = new FakeHttpClient({ results: [] });

    await new ItunesMusicProvider(httpClient).findTrack("Lovely Day");

    expect(httpClient.requestedUrls).toEqual(["https://itunes.apple.com/search?term=Lovely%20Day&media=music&limit=5"]);
  });

  it("ignore les résultats incomplets et prend le premier exploitable", async () => {
    const httpClient = new FakeHttpClient({
      results: [{ artistName: "Sans titre" }, { trackName: "Sans artiste" }, { trackName: "Lovely Day", artistName: "Bill Withers" }],
    });

    await expect(new ItunesMusicProvider(httpClient).findTrack("Lovely Day")).resolves.toEqual(LOVELY);
  });

  it("conserve la cause technique de la panne", async () => {
    const cause = new Error("ETIMEDOUT");
    const failure = await new ItunesMusicProvider(new FakeHttpClient(cause)).findTrack("x").catch((error: unknown) => error);

    expect((failure as Error).cause).toBe(cause);
    expect((failure as Error).message).toContain("iTunes");
  });
});

describe("MusicBrainzMusicProvider", () => {
  it("appelle l'API d'enregistrements MusicBrainz en JSON", async () => {
    const httpClient = new FakeHttpClient({ recordings: [] });

    await new MusicBrainzMusicProvider(httpClient).findTrack("Lovely Day");

    expect(httpClient.requestedUrls).toEqual(["https://musicbrainz.org/ws/2/recording?query=Lovely%20Day&fmt=json&limit=5"]);
  });

  it("assemble les artistes crédités avec leurs séparateurs", async () => {
    const httpClient = new FakeHttpClient({
      recordings: [
        {
          title: "Under Pressure",
          "artist-credit": [{ name: "Queen", joinphrase: " & " }, { name: "David Bowie" }],
        },
      ],
    });

    await expect(new MusicBrainzMusicProvider(httpClient).findTrack("Under Pressure")).resolves.toEqual({
      title: "Under Pressure",
      artist: "Queen & David Bowie",
    });
  });

  it("ignore les enregistrements sans titre ou sans artiste", async () => {
    const httpClient = new FakeHttpClient({
      recordings: [{ title: "Sans artiste" }, { "artist-credit": [{ name: "Sans titre" }] }, { title: "Vide", "artist-credit": [{}] }],
    });

    await expect(new MusicBrainzMusicProvider(httpClient).findTrack("x")).resolves.toBeNull();
  });

  it("conserve la cause technique de la panne", async () => {
    const cause = new Error("HTTP 503");
    const failure = await new MusicBrainzMusicProvider(new FakeHttpClient(cause)).findTrack("x").catch((error: unknown) => error);

    expect((failure as Error).cause).toBe(cause);
    expect((failure as Error).message).toContain("MusicBrainz");
  });
});

describe("RateLimitedMusicProvider", () => {
  it("laisse passer les appels jusqu'au quota puis refuse sans appeler le fournisseur", async () => {
    const inner = new FakeMusicProvider(RIDERS);
    const provider = new RateLimitedMusicProvider(inner, new FakeClock(), "itunes", 2);

    await provider.findTrack("a");
    await provider.findTrack("b");
    const failure = await provider.findTrack("c").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(MusicProviderUnavailableError);
    expect((failure as Error).message).toContain("quota de 2 requêtes par minute");
    expect(inner.queries).toEqual(["a", "b"]);
  });

  it("rouvre le passage une fois la minute glissante écoulée", async () => {
    const inner = new FakeMusicProvider(RIDERS);
    const clock = new FakeClock();
    const provider = new RateLimitedMusicProvider(inner, clock, "itunes", 1);

    await provider.findTrack("a");
    clock.advance(59_999);
    await expect(provider.findTrack("b")).rejects.toBeInstanceOf(MusicProviderUnavailableError);
    clock.advance(1);
    await expect(provider.findTrack("c")).resolves.toEqual(RIDERS);

    expect(inner.queries).toEqual(["a", "c"]);
  });

  it("compte aussi les appels en échec dans le quota", async () => {
    const inner = new FakeMusicProvider(new Error("panne"));
    const provider = new RateLimitedMusicProvider(inner, new FakeClock(), "itunes", 1);

    await expect(provider.findTrack("a")).rejects.toThrow("panne");
    await expect(provider.findTrack("b")).rejects.toBeInstanceOf(MusicProviderUnavailableError);
  });
});

describe("CachingMusicProvider", () => {
  function setup(outcome: Track | null | Error) {
    const inner = new FakeMusicProvider(outcome);
    const clock = new FakeClock();
    const provider = new CachingMusicProvider(inner, new InMemoryCache<string, Track | null>(clock, 1_000));
    return { inner, clock, provider };
  }

  it("ne sollicite le fournisseur qu'une fois pour la même recherche, à la casse et aux espaces près", async () => {
    const { inner, provider } = setup(RIDERS);

    await provider.findTrack("Riders on the Storm");
    await expect(provider.findTrack("  riders  ON the storm ")).resolves.toEqual(RIDERS);

    expect(inner.queries).toEqual(["Riders on the Storm"]);
  });

  it("met aussi en cache les morceaux introuvables", async () => {
    const { inner, provider } = setup(null);

    await provider.findTrack("inconnu");
    await expect(provider.findTrack("inconnu")).resolves.toBeNull();

    expect(inner.queries).toHaveLength(1);
  });

  it("ne met pas les pannes en cache", async () => {
    const { inner, provider } = setup(new Error("panne"));

    await expect(provider.findTrack("a")).rejects.toThrow("panne");
    inner.willReturn(RIDERS);
    await expect(provider.findTrack("a")).resolves.toEqual(RIDERS);

    expect(inner.queries).toHaveLength(2);
  });

  it("continue de répondre depuis le cache quand le fournisseur tombe", async () => {
    const { inner, provider } = setup(RIDERS);

    await provider.findTrack("Riders on the Storm");
    inner.willReturn(new Error("panne"));

    await expect(provider.findTrack("Riders on the Storm")).resolves.toEqual(RIDERS);
  });

  it("interroge de nouveau le fournisseur après expiration", async () => {
    const { inner, clock, provider } = setup(RIDERS);

    await provider.findTrack("a");
    clock.advance(1_000);
    await provider.findTrack("a");

    expect(inner.queries).toHaveLength(2);
  });
});

describe("FailoverMusicProvider", () => {
  it("s'arrête au premier fournisseur qui trouve le morceau", async () => {
    const first = new FakeMusicProvider(RIDERS);
    const second = new FakeMusicProvider(LOVELY);
    const logger = new FakeLogger();

    await expect(new FailoverMusicProvider([first, second], logger).findTrack("q")).resolves.toEqual(RIDERS);

    expect(second.queries).toEqual([]);
    expect(logger.warnings).toEqual([]);
  });

  it("passe au fournisseur suivant en cas de panne, en la journalisant", async () => {
    const first = new FakeMusicProvider(new MusicProviderUnavailableError("iTunes", "appel en échec"));
    const second = new FakeMusicProvider(LOVELY);
    const logger = new FakeLogger();

    await expect(new FailoverMusicProvider([first, second], logger).findTrack("q")).resolves.toEqual(LOVELY);

    expect(logger.warnings).toEqual(['Fournisseur musical "iTunes" indisponible : appel en échec']);
  });

  it("passe au fournisseur suivant quand le morceau est introuvable", async () => {
    const first = new FakeMusicProvider(null);
    const second = new FakeMusicProvider(LOVELY);

    await expect(new FailoverMusicProvider([first, second], new FakeLogger()).findTrack("q")).resolves.toEqual(LOVELY);
  });

  it("retourne null quand tous les fournisseurs échouent, sans lever d'erreur", async () => {
    const first = new FakeMusicProvider(new Error("panne"));
    const second = { findTrack: () => Promise.reject("boom") };
    const logger = new FakeLogger();

    await expect(new FailoverMusicProvider([first, second], logger).findTrack("q")).resolves.toBeNull();

    expect(logger.warnings).toEqual(["panne", "Fournisseur musical en échec"]);
  });

  it("retourne null sans aucun fournisseur configuré", async () => {
    await expect(new FailoverMusicProvider([], new FakeLogger()).findTrack("q")).resolves.toBeNull();
  });
});

describe("LocalFallbackTrackSource", () => {
  const source = new LocalFallbackTrackSource();

  it("retrouve le morceau demandé s'il fait partie de la liste locale", () => {
    expect(source.pick("  lovely day ")).toEqual(LOVELY);
  });

  it("retourne toujours un morceau, même pour une recherche inconnue ou vide", () => {
    for (const query of ["Morceau inconnu", ""]) {
      const track = source.pick(query);
      expect(track.title).not.toBe("");
      expect(track.artist).not.toBe("");
    }
  });
});
