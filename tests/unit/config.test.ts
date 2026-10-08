import { describe, expect, it } from "vitest";
import { parseWakeUpRequest } from "../../src/cli/parseWakeUpRequest.js";
import { ENV_DEFAULTS, loadEnvConfig } from "../../src/config/env.js";
import {
  MUSIC_PROVIDER_REGISTRY,
  NOTIFICATION_CHANNEL_REGISTRY,
  resolveMusicProviders,
  resolveNotificationChannels,
} from "../../src/config/providers.js";
import { InvalidWakeUpRequestError } from "../../src/domain/errors.js";

describe("loadEnvConfig", () => {
  it("applique les valeurs par défaut quand rien n'est défini", () => {
    expect(loadEnvConfig({})).toEqual({
      httpUserAgent: ENV_DEFAULTS.HTTP_USER_AGENT,
      httpTimeoutMs: 3000,
      musicProviders: ["itunes", "musicbrainz"],
      musicCacheTtlMs: 86_400_000,
      notificationChannels: ["email", "sms", "push"],
      emailSender: ENV_DEFAULTS.EMAIL_SENDER,
      simulatedChannelOutages: [],
    });
  });

  it("lit les variables d'environnement, listes nettoyées et normalisées", () => {
    const config = loadEnvConfig({
      HTTP_USER_AGENT: "MonApp/2.0 (moi@example.org)",
      HTTP_TIMEOUT_MS: "500",
      MUSIC_PROVIDERS: " MusicBrainz , itunes,",
      MUSIC_CACHE_TTL_SECONDS: "60",
      NOTIFICATION_CHANNELS: "push",
      EMAIL_SENDER: "bonjour@example.org",
      SIMULATED_CHANNEL_OUTAGES: "sms, email",
    });

    expect(config).toEqual({
      httpUserAgent: "MonApp/2.0 (moi@example.org)",
      httpTimeoutMs: 500,
      musicProviders: ["musicbrainz", "itunes"],
      musicCacheTtlMs: 60_000,
      notificationChannels: ["push"],
      emailSender: "bonjour@example.org",
      simulatedChannelOutages: ["sms", "email"],
    });
  });

  it("accepte une liste de fournisseurs musicaux vide", () => {
    expect(loadEnvConfig({ MUSIC_PROVIDERS: "" }).musicProviders).toEqual([]);
  });

  it.each(["abc", "0", "-5", "1.5", ""])("rejette un délai HTTP invalide (%j)", (value) => {
    expect(() => loadEnvConfig({ HTTP_TIMEOUT_MS: value })).toThrow("HTTP_TIMEOUT_MS");
  });

  it("rejette une durée de cache invalide", () => {
    expect(() => loadEnvConfig({ MUSIC_CACHE_TTL_SECONDS: "demain" })).toThrow("MUSIC_CACHE_TTL_SECONDS");
  });
});

describe("registres de fournisseurs et de canaux", () => {
  it("les valeurs par défaut de la configuration sont toutes enregistrées", () => {
    const defaults = loadEnvConfig({});

    expect(resolveMusicProviders(defaults.musicProviders)).toEqual(defaults.musicProviders);
    expect(resolveNotificationChannels(defaults.notificationChannels)).toEqual(defaults.notificationChannels);
  });

  it.each(Object.keys(MUSIC_PROVIDER_REGISTRY))("accepte le fournisseur musical enregistré %s", (name) => {
    expect(resolveMusicProviders([name])).toEqual([name]);
  });

  it.each(Object.keys(NOTIFICATION_CHANNEL_REGISTRY))("accepte le canal enregistré %s", (name) => {
    expect(resolveNotificationChannels([name])).toEqual([name]);
  });

  it("conserve l'ordre de priorité et retire les doublons", () => {
    expect(resolveMusicProviders(["musicbrainz", "itunes", "musicbrainz"])).toEqual(["musicbrainz", "itunes"]);
  });

  it("accepte l'absence de fournisseur musical (secours local seul)", () => {
    expect(resolveMusicProviders([])).toEqual([]);
  });

  it("rejette un fournisseur musical inconnu en listant les valeurs attendues", () => {
    expect(() => resolveMusicProviders(["spotify"])).toThrow('MUSIC_PROVIDERS invalide : "spotify" (attendu : itunes | musicbrainz)');
  });

  it("rejette un canal inconnu, y compris un nom de propriété d'Object", () => {
    expect(() => resolveNotificationChannels(["whatsapp"])).toThrow("NOTIFICATION_CHANNELS");
    expect(() => resolveNotificationChannels(["constructor"])).toThrow("NOTIFICATION_CHANNELS");
  });

  it("exige au moins un canal de notification", () => {
    expect(() => resolveNotificationChannels([])).toThrow("au moins un canal");
  });

  it("déclare un quota par minute pour chaque fournisseur musical", () => {
    expect(MUSIC_PROVIDER_REGISTRY.itunes.maxRequestsPerMinute).toBe(20);
    for (const registration of Object.values(MUSIC_PROVIDER_REGISTRY)) {
      expect(registration.maxRequestsPerMinute).toBeGreaterThan(0);
    }
  });
});

describe("parseWakeUpRequest", () => {
  it("lit l'identifiant, le jour et la météo, sans tenir compte de la casse", () => {
    expect(parseWakeUpRequest([" u-001 ", "lundi", "Pluie"])).toEqual({ userId: "u-001", day: "LUNDI", weather: "PLUIE" });
  });

  it.each([
    [[]],
    [["u-001"]],
    [["u-001", "LUNDI"]],
    [["u-001", "LUNDI", "PLUIE", "en trop"]],
    [["  ", "LUNDI", "PLUIE"]],
  ])("rejette un nombre d'arguments incorrect ou un identifiant vide (%j)", (args) => {
    expect(() => parseWakeUpRequest(args)).toThrow(InvalidWakeUpRequestError);
  });

  it("rejette un jour inconnu", () => {
    expect(() => parseWakeUpRequest(["u-001", "MONDAY", "PLUIE"])).toThrow('valeur "MONDAY" inconnue pour le jour');
  });

  it("rejette une météo inconnue", () => {
    expect(() => parseWakeUpRequest(["u-001", "LUNDI", "GRELE"])).toThrow('valeur "GRELE" inconnue pour la météo');
  });
});
