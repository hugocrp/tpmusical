import { describe, expect, it } from "vitest";
import { parseWakeUpRequest } from "../../src/controllers/wakeUpRequest.js";
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
      port: 3000,
      httpUserAgent: ENV_DEFAULTS.HTTP_USER_AGENT,
      httpTimeoutMs: 3000,
      musicProviders: ["itunes", "musicbrainz"],
      musicCacheTtlMs: 86_400_000,
      notificationChannels: ["email", "sms", "push"],
      notificationRounds: 3,
      notificationRetryDelayMs: 2000,
      preferencesCacheFile: ".reveil-musical/preferences.json",
      emailSender: ENV_DEFAULTS.EMAIL_SENDER,
      simulatedOutages: [],
    });
  });

  it("lit les variables d'environnement, listes nettoyées et normalisées", () => {
    const config = loadEnvConfig({
      PORT: "8080",
      HTTP_USER_AGENT: "MonApp/2.0 (moi@example.org)",
      HTTP_TIMEOUT_MS: "500",
      MUSIC_PROVIDERS: " MusicBrainz , itunes,",
      MUSIC_CACHE_TTL_SECONDS: "60",
      NOTIFICATION_CHANNELS: "push",
      NOTIFICATION_ROUNDS: "5",
      NOTIFICATION_RETRY_DELAY_MS: "100",
      PREFERENCES_CACHE_FILE: "/tmp/preferences.json",
      EMAIL_SENDER: "bonjour@example.org",
      SIMULATED_OUTAGES: "sms, email",
    });

    expect(config).toEqual({
      port: 8080,
      httpUserAgent: "MonApp/2.0 (moi@example.org)",
      httpTimeoutMs: 500,
      musicProviders: ["musicbrainz", "itunes"],
      musicCacheTtlMs: 60_000,
      notificationChannels: ["push"],
      notificationRounds: 5,
      notificationRetryDelayMs: 100,
      preferencesCacheFile: "/tmp/preferences.json",
      emailSender: "bonjour@example.org",
      simulatedOutages: ["sms", "email"],
    });
  });

  it("accepte une liste de fournisseurs musicaux vide", () => {
    expect(loadEnvConfig({ MUSIC_PROVIDERS: "" }).musicProviders).toEqual([]);
  });

  it.each(["abc", "0", "-5", "1.5", ""])("rejette un délai HTTP invalide (%j)", (value) => {
    expect(() => loadEnvConfig({ HTTP_TIMEOUT_MS: value })).toThrow("HTTP_TIMEOUT_MS");
  });

  it("rejette un port invalide", () => {
    expect(() => loadEnvConfig({ PORT: "http" })).toThrow("PORT");
  });

  it("rejette un nombre de tours ou une pause invalide", () => {
    expect(() => loadEnvConfig({ NOTIFICATION_ROUNDS: "0" })).toThrow("NOTIFICATION_ROUNDS");
    expect(() => loadEnvConfig({ NOTIFICATION_RETRY_DELAY_MS: "vite" })).toThrow("NOTIFICATION_RETRY_DELAY_MS");
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
    expect(parseWakeUpRequest({ userId: " u-001 ", day: "lundi", weather: "Pluie" })).toEqual({
      userId: "u-001",
      day: "LUNDI",
      weather: "PLUIE",
    });
  });

  it.each([[undefined], [null], ["texte"], [42], [[]]])("rejette un corps qui n'est pas un objet (%j)", (body) => {
    expect(() => parseWakeUpRequest(body)).toThrow(InvalidWakeUpRequestError);
  });

  it.each([
    [{ day: "LUNDI", weather: "PLUIE" }, "userId"],
    [{ userId: "  ", day: "LUNDI", weather: "PLUIE" }, "userId"],
    [{ userId: 42, day: "LUNDI", weather: "PLUIE" }, "userId"],
    [{ userId: "u-001", weather: "PLUIE" }, "day"],
    [{ userId: "u-001", day: "LUNDI" }, "weather"],
  ])("rejette un champ manquant, vide ou mal typé (%j)", (body, field) => {
    expect(() => parseWakeUpRequest(body)).toThrow(`le champ "${field}" est obligatoire`);
  });

  it("rejette un jour inconnu en listant les valeurs attendues", () => {
    expect(() => parseWakeUpRequest({ userId: "u-001", day: "MONDAY", weather: "PLUIE" })).toThrow(
      'valeur "MONDAY" inconnue pour "day" (attendu : LUNDI | MARDI',
    );
  });

  it("rejette une météo inconnue", () => {
    expect(() => parseWakeUpRequest({ userId: "u-001", day: "LUNDI", weather: "GRELE" })).toThrow('inconnue pour "weather"');
  });
});
