import { describe, expect, it } from "vitest";
import { WakeUpService } from "../../src/application/WakeUpService.js";
import { loadEnvConfig } from "../../src/config/env.js";
import { buildContainer } from "../../src/container.js";
import { HTTP_CLIENT, MOCK_OUTPUT } from "../../src/di/infrastructureTokens.js";
import { LOGGER, MUSIC_PROVIDER } from "../../src/di/tokens.js";
import { NotificationFailedError } from "../../src/domain/errors.js";
import { FakeHttpClient } from "../fakes/FakeHttpClient.js";
import { FakeLineWriter } from "../fakes/FakeLineWriter.js";
import { FakeLogger } from "../fakes/FakeLogger.js";
import { ITUNES_FOUND, ITUNES_NOT_FOUND, MUSICBRAINZ_FOUND } from "../fakes/fixtures.js";

function setup(env: NodeJS.ProcessEnv = {}) {
  const httpClient = new FakeHttpClient()
    .route("itunes.apple.com", ITUNES_FOUND)
    .route("musicbrainz.org", MUSICBRAINZ_FOUND);
  const output = new FakeLineWriter();
  const logger = new FakeLogger();

  const container = buildContainer(loadEnvConfig(env));
  container.registerInstance(HTTP_CLIENT, httpClient);
  container.registerInstance(MOCK_OUTPUT, output);
  container.registerInstance(LOGGER, logger);

  return { wakeUpService: container.resolve(WakeUpService), container, httpClient, output, logger };
}

describe("Réveil musical de bout en bout (conteneur réel, frontières externes simulées)", () => {
  it("cas nominal : morceau du premier fournisseur, envoyé sur le canal préféré", async () => {
    const { wakeUpService, httpClient, output } = setup();

    const result = await wakeUpService.wakeUp({ userId: "u-001", day: "MARDI", weather: "PLUIE" });

    expect(result).toEqual({
      userId: "u-001",
      track: { title: "Riders on the Storm", artist: "The Doors" },
      trackSource: "catalogue",
      channel: "email",
      degraded: false,
      incidents: [],
    });
    expect(httpClient.requestedUrls).toHaveLength(1);
    expect(httpClient.requestedUrls[0]).toContain("itunes.apple.com");
    expect(output.lines).toHaveLength(1);
    expect(output.lines[0]).toContain("[EMAIL]");
    expect(output.lines[0]).toContain("alice@example.org");
    expect(output.lines[0]).toContain("« Riders on the Storm » de The Doors");
  });

  it("le morceau recherché change avec le jour, à météo identique", async () => {
    const { wakeUpService, httpClient } = setup();

    await wakeUpService.wakeUp({ userId: "u-001", day: "MARDI", weather: "PLUIE" });
    await wakeUpService.wakeUp({ userId: "u-001", day: "SAMEDI", weather: "PLUIE" });

    expect(httpClient.requestedUrls[0]).toContain(encodeURIComponent("Riders on the Storm"));
    expect(httpClient.requestedUrls[1]).toContain(encodeURIComponent("Singin' in the Rain"));
  });

  it("aucun champ propre à un fournisseur ne sort du système", async () => {
    const { wakeUpService, output } = setup();

    const result = await wakeUpService.wakeUp({ userId: "u-001", day: "MARDI", weather: "PLUIE" });

    const everything = JSON.stringify(result) + output.lines.join("\n");
    expect(everything).not.toContain("trackViewUrl");
    expect(everything).not.toContain("music.apple.com");
    expect(everything).not.toContain("artist-credit");
  });

  it("iTunes en panne -> MusicBrainz prend le relais, sans dégradation pour l'utilisateur", async () => {
    const { wakeUpService, httpClient, logger } = setup();
    httpClient.route("itunes.apple.com", new Error("HTTP 503"));

    const result = await wakeUpService.wakeUp({ userId: "u-001", day: "MARDI", weather: "PLUIE" });

    expect(result.trackSource).toBe("catalogue");
    expect(result.track).toEqual({ title: "Riders on the Storm", artist: "The Doors" });
    expect(httpClient.requestedUrls.map((url) => new URL(url).hostname)).toEqual(["itunes.apple.com", "musicbrainz.org"]);
    expect(logger.warnings).toHaveLength(1);
  });

  it("l'ordre des fournisseurs se change par configuration", async () => {
    const { wakeUpService, httpClient } = setup({ MUSIC_PROVIDERS: "musicbrainz,itunes" });

    await wakeUpService.wakeUp({ userId: "u-001", day: "MARDI", weather: "PLUIE" });

    expect(httpClient.requestedUrls.map((url) => new URL(url).hostname)).toEqual(["musicbrainz.org"]);
  });

  it("tous les fournisseurs musicaux en panne -> réveil envoyé avec un morceau local", async () => {
    const { wakeUpService, httpClient, output } = setup();
    httpClient.failWith(new Error("réseau coupé")).route("itunes", new Error("503")).route("musicbrainz", new Error("503"));

    const result = await wakeUpService.wakeUp({ userId: "u-002", day: "JEUDI", weather: "NEIGE" });

    expect(result.trackSource).toBe("secours-local");
    expect(result.track).toEqual({ title: "Wake Me Up", artist: "Avicii" });
    expect(result.degraded).toBe(true);
    expect(output.lines).toHaveLength(1);
    expect(output.lines[0]).toContain("[SMS]");
  });

  it("canal préféré en panne -> réveil envoyé sur un autre canal de l'utilisateur", async () => {
    const { wakeUpService, output } = setup({ SIMULATED_CHANNEL_OUTAGES: "sms" });

    const result = await wakeUpService.wakeUp({ userId: "u-002", day: "LUNDI", weather: "PLUIE" });

    expect(result.channel).toBe("email");
    expect(result.degraded).toBe(true);
    expect(output.lines).toHaveLength(1);
    expect(output.lines[0]).toContain("bob@example.org");
  });

  it("fournisseurs et canal préféré en panne en même temps -> réveil quand même envoyé", async () => {
    const { wakeUpService, httpClient, output } = setup({ SIMULATED_CHANNEL_OUTAGES: "push" });
    httpClient.route("itunes", new Error("503")).route("musicbrainz", new Error("503"));

    const result = await wakeUpService.wakeUp({ userId: "u-003", day: "DIMANCHE", weather: "SOLEIL" });

    expect(result.trackSource).toBe("secours-local");
    expect(result.channel).toBe("email");
    expect(result.incidents).toHaveLength(2);
    expect(output.lines).toHaveLength(1);
  });

  it("tous les canaux en panne -> NotificationFailedError, signalée à l'appelant", async () => {
    const { wakeUpService } = setup({ SIMULATED_CHANNEL_OUTAGES: "email,sms,push" });

    await expect(wakeUpService.wakeUp({ userId: "u-001", day: "MARDI", weather: "PLUIE" })).rejects.toBeInstanceOf(
      NotificationFailedError,
    );
  });

  it("deux réveils pour le même morceau -> un seul appel au fournisseur (cache)", async () => {
    const { wakeUpService, httpClient } = setup();

    await wakeUpService.wakeUp({ userId: "u-001", day: "MARDI", weather: "PLUIE" });
    await wakeUpService.wakeUp({ userId: "u-001", day: "MERCREDI", weather: "PLUIE" });

    expect(httpClient.requestedUrls).toHaveLength(1);
  });

  it("quota iTunes atteint -> les recherches suivantes passent par MusicBrainz", async () => {
    const { container, httpClient } = setup();
    httpClient.route("itunes.apple.com", ITUNES_NOT_FOUND);
    const musicProvider = container.resolve(MUSIC_PROVIDER);

    for (let index = 0; index < 25; index += 1) {
      await musicProvider.findTrack(`morceau ${index}`);
    }

    const itunesCalls = httpClient.requestedUrls.filter((url) => url.includes("itunes.apple.com"));
    const musicBrainzCalls = httpClient.requestedUrls.filter((url) => url.includes("musicbrainz.org"));
    expect(itunesCalls).toHaveLength(20);
    expect(musicBrainzCalls).toHaveLength(25);
  });

  it("sans aucun fournisseur configuré -> morceau local, aucun appel réseau", async () => {
    const { wakeUpService, httpClient } = setup({ MUSIC_PROVIDERS: "" });

    const result = await wakeUpService.wakeUp({ userId: "u-001", day: "LUNDI", weather: "SOLEIL" });

    expect(result.track).toEqual({ title: "Here Comes the Sun", artist: "The Beatles" });
    expect(httpClient.requestedUrls).toEqual([]);
  });

  it("refuse de démarrer avec un fournisseur ou un canal inconnu", () => {
    expect(() => buildContainer(loadEnvConfig({ MUSIC_PROVIDERS: "spotify" }))).toThrow("MUSIC_PROVIDERS");
    expect(() => buildContainer(loadEnvConfig({ NOTIFICATION_CHANNELS: "fax" }))).toThrow("NOTIFICATION_CHANNELS");
  });
});
