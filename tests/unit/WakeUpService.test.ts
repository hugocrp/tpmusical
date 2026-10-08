import { describe, expect, it } from "vitest";
import { WakeUpService } from "../../src/application/WakeUpService.js";
import { DayAndWeatherTrackSelectionPolicy } from "../../src/application/DayAndWeatherTrackSelectionPolicy.js";
import { MusicProviderUnavailableError, NotificationFailedError, UserNotFoundError } from "../../src/domain/errors.js";
import type { Delivery, Track } from "../../src/domain/types.js";
import { LocalFallbackTrackSource } from "../../src/infrastructure/music/LocalFallbackTrackSource.js";
import { FakeLogger } from "../fakes/FakeLogger.js";
import { FakeMusicProvider } from "../fakes/FakeMusicProvider.js";
import { FakeNotifier } from "../fakes/FakeNotifier.js";
import { FakeUserPreferencesService } from "../fakes/FakeUserPreferencesService.js";
import { ALICE } from "../fakes/fixtures.js";

const RIDERS: Track = { title: "Riders on the Storm", artist: "The Doors" };

function setup(options: { music?: Track | null | Error; delivery?: Delivery | Error } = {}) {
  const musicProvider = new FakeMusicProvider(options.music === undefined ? RIDERS : options.music);
  const notifier = new FakeNotifier(options.delivery);
  const logger = new FakeLogger();
  const service = new WakeUpService(
    new FakeUserPreferencesService([ALICE]),
    new DayAndWeatherTrackSelectionPolicy(),
    musicProvider,
    new LocalFallbackTrackSource(),
    notifier,
    logger,
  );
  return { service, musicProvider, notifier, logger };
}

describe("WakeUpService", () => {
  it("cas nominal : cherche le morceau choisi pour la météo et notifie l'utilisateur", async () => {
    const { service, musicProvider, notifier } = setup();

    const result = await service.wakeUp({ userId: "alice", day: "LUNDI", weather: "PLUIE" });

    expect(musicProvider.queries).toEqual(["Riders on the Storm"]);
    expect(notifier.notifications).toHaveLength(1);
    expect(notifier.notifications[0]?.preferences).toBe(ALICE);
    expect(notifier.notifications[0]?.message.body).toContain("« Riders on the Storm » de The Doors");
    expect(notifier.notifications[0]?.message.body).toContain("lundi");
    expect(result).toEqual({
      userId: "alice",
      track: RIDERS,
      trackSource: "catalogue",
      channel: "email",
      degraded: false,
      incidents: [],
    });
  });

  it("le morceau cherché dépend du jour de la semaine", async () => {
    const { service, musicProvider } = setup();

    await service.wakeUp({ userId: "alice", day: "DIMANCHE", weather: "PLUIE" });

    expect(musicProvider.queries).toEqual(["Sunday Morning"]);
  });

  it("météo non couverte par l'utilisateur -> cherche son morceau de secours", async () => {
    const { service, musicProvider } = setup();

    await service.wakeUp({ userId: "alice", day: "MARDI", weather: "NEIGE" });

    expect(musicProvider.queries).toEqual(["Good Morning"]);
  });

  it("utilisateur inconnu -> UserNotFoundError, aucun envoi", async () => {
    const { service, notifier } = setup();

    await expect(service.wakeUp({ userId: "inconnu", day: "LUNDI", weather: "PLUIE" })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
    expect(notifier.notifications).toEqual([]);
  });

  it("panne des fournisseurs musicaux -> envoi quand même, avec un morceau local (mode dégradé)", async () => {
    const { service, notifier, logger } = setup({ music: new MusicProviderUnavailableError("iTunes", "appel en échec") });

    const result = await service.wakeUp({ userId: "alice", day: "LUNDI", weather: "PLUIE" });

    expect(notifier.notifications).toHaveLength(1);
    expect(result.track).toEqual({ title: "Riders on the Storm", artist: "The Doors" });
    expect(result.trackSource).toBe("secours-local");
    expect(result.degraded).toBe(true);
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0]).toContain("iTunes");
    expect(logger.warnings).toHaveLength(1);
  });

  it("erreur inattendue d'un fournisseur musical -> envoi quand même", async () => {
    const musicProvider = { findTrack: () => Promise.reject("boom") };
    const notifier = new FakeNotifier();
    const service = new WakeUpService(
      new FakeUserPreferencesService([ALICE]),
      new DayAndWeatherTrackSelectionPolicy(),
      musicProvider,
      new LocalFallbackTrackSource(),
      notifier,
      new FakeLogger(),
    );

    const result = await service.wakeUp({ userId: "alice", day: "LUNDI", weather: "SOLEIL" });

    expect(notifier.notifications).toHaveLength(1);
    expect(result.trackSource).toBe("secours-local");
    expect(result.incidents[0]).toContain("erreur inconnue");
  });

  it("morceau introuvable chez tous les fournisseurs -> morceau local, jamais de silence", async () => {
    const { service, notifier } = setup({ music: null });

    const result = await service.wakeUp({ userId: "alice", day: "LUNDI", weather: "PLUIE" });

    expect(notifier.notifications).toHaveLength(1);
    expect(result.trackSource).toBe("secours-local");
    expect(result.degraded).toBe(true);
  });

  it("canal préféré en panne mais autre canal utilisé -> résultat dégradé avec l'incident", async () => {
    const { service } = setup({ delivery: { channel: "sms", incidents: ['Canal "email" indisponible : panne'] } });

    const result = await service.wakeUp({ userId: "alice", day: "LUNDI", weather: "PLUIE" });

    expect(result.channel).toBe("sms");
    expect(result.trackSource).toBe("catalogue");
    expect(result.degraded).toBe(true);
    expect(result.incidents).toEqual(['Canal "email" indisponible : panne']);
  });

  it("aucun canal disponible -> l'erreur remonte à l'appelant", async () => {
    const { service } = setup({ delivery: new NotificationFailedError("alice", ["tout est en panne"]) });

    await expect(service.wakeUp({ userId: "alice", day: "LUNDI", weather: "PLUIE" })).rejects.toBeInstanceOf(
      NotificationFailedError,
    );
  });
});
