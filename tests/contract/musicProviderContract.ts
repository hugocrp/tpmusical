import { describe, expect, it } from "vitest";
import type { MusicProvider } from "../../src/application/ports/MusicProvider.js";
import { MusicProviderUnavailableError } from "../../src/domain/errors.js";
import type { Track } from "../../src/domain/types.js";
import { FakeHttpClient } from "../fakes/FakeHttpClient.js";

export interface MusicProviderContractFixtures {
  createProvider: (httpClient: FakeHttpClient) => MusicProvider;
  foundResponse: unknown;
  expectedTrack: Track;
  notFoundResponse: unknown;
  malformedResponse: unknown;
}

export function describeMusicProviderContract(name: string, fixtures: MusicProviderContractFixtures): void {
  describe(`Contrat MusicProvider (${name})`, () => {
    it("morceau trouvé -> titre et artiste, sans champ propre au fournisseur", async () => {
      const provider = fixtures.createProvider(new FakeHttpClient(fixtures.foundResponse));

      const track = await provider.findTrack("Riders on the Storm");

      expect(track).toEqual(fixtures.expectedTrack);
      expect(Object.keys(track ?? {}).sort()).toEqual(["artist", "title"]);
    });

    it("morceau introuvable -> null", async () => {
      const provider = fixtures.createProvider(new FakeHttpClient(fixtures.notFoundResponse));

      await expect(provider.findTrack("Morceau totalement inconnu")).resolves.toBeNull();
    });

    it("panne du fournisseur -> MusicProviderUnavailableError", async () => {
      const provider = fixtures.createProvider(new FakeHttpClient(new Error("ECONNRESET")));

      await expect(provider.findTrack("Riders on the Storm")).rejects.toBeInstanceOf(MusicProviderUnavailableError);
    });

    it("réponse au format inattendu -> MusicProviderUnavailableError", async () => {
      const provider = fixtures.createProvider(new FakeHttpClient(fixtures.malformedResponse));

      await expect(provider.findTrack("Riders on the Storm")).rejects.toBeInstanceOf(MusicProviderUnavailableError);
    });

    it("caractères accentués et espaces -> encodés dans l'URL", async () => {
      const httpClient = new FakeHttpClient(fixtures.foundResponse);
      const provider = fixtures.createProvider(httpClient);

      await provider.findTrack("Été indien & co");

      expect(httpClient.requestedUrls).toHaveLength(1);
      expect(httpClient.requestedUrls[0]).toContain(encodeURIComponent("Été indien & co"));
    });
  });
}
