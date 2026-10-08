import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FailoverNotifier } from "../../src/application/FailoverNotifier.js";
import { ChannelUnavailableError, NotificationFailedError } from "../../src/domain/errors.js";
import type { UserPreferences, WakeUpMessage } from "../../src/domain/types.js";
import { JsonFileCache } from "../../src/infrastructure/cache/JsonFileCache.js";
import { InMemoryUserPreferencesService } from "../../src/infrastructure/preferences/InMemoryUserPreferencesService.js";
import { LastKnownUserPreferencesService } from "../../src/infrastructure/preferences/LastKnownUserPreferencesService.js";
import { TimerDelay } from "../../src/infrastructure/time/TimerDelay.js";
import { FakeCache } from "../fakes/FakeCache.js";
import { FakeDelay } from "../fakes/FakeDelay.js";
import { FakeLogger } from "../fakes/FakeLogger.js";
import { FakeNotificationChannel } from "../fakes/FakeNotificationChannel.js";
import { ALICE } from "../fakes/fixtures.js";

const MESSAGE: WakeUpMessage = { title: "Réveil musical", body: "Bonjour" };

class FlakyChannel extends FakeNotificationChannel {
  constructor(private failuresLeft: number) {
    super();
  }

  override async send(address: string, message: WakeUpMessage): Promise<void> {
    if (this.failuresLeft > 0) {
      this.failuresLeft -= 1;
      throw new ChannelUnavailableError("email", "panne passagère");
    }
    await super.send(address, message);
  }
}

describe("FailoverNotifier : nouveaux essais quand tous les canaux échouent", () => {
  it("retente tous les canaux après une pause et finit par envoyer", async () => {
    const email = new FlakyChannel(1);
    const sms = new FakeNotificationChannel(new ChannelUnavailableError("sms", "panne"));
    const delay = new FakeDelay();
    const notifier = new FailoverNotifier({ email, sms }, new FakeLogger(), delay, 3, 2_000);

    const delivery = await notifier.notify(ALICE, MESSAGE);

    expect(delivery.channel).toBe("email");
    expect(delivery.incidents).toEqual(['Canal "email" indisponible : panne passagère', 'Canal "sms" indisponible : panne']);
    expect(delay.waits).toEqual([2_000]);
    expect(email.sent).toHaveLength(1);
  });

  it("ne fait aucune pause quand le premier tour réussit", async () => {
    const delay = new FakeDelay();
    const notifier = new FailoverNotifier({ email: new FakeNotificationChannel() }, new FakeLogger(), delay, 3, 2_000);

    await notifier.notify(ALICE, MESSAGE);

    expect(delay.waits).toEqual([]);
  });

  it("abandonne après le nombre de tours configuré, en détaillant chaque tentative", async () => {
    const email = new FakeNotificationChannel(new ChannelUnavailableError("email", "panne"));
    const delay = new FakeDelay();
    const notifier = new FailoverNotifier({ email }, new FakeLogger(), delay, 3, 500);

    const failure = await notifier.notify(ALICE, MESSAGE).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(NotificationFailedError);
    expect(delay.waits).toEqual([500, 500]);
    expect((failure as NotificationFailedError).incidents.filter((incident) => incident.includes('"email"'))).toHaveLength(3);
  });

  it("n'attend pas inutilement quand aucun canal n'est joignable", async () => {
    const delay = new FakeDelay();
    const notifier = new FailoverNotifier({}, new FakeLogger(), delay, 3, 2_000);

    await expect(notifier.notify(ALICE, MESSAGE)).rejects.toBeInstanceOf(NotificationFailedError);
    expect(delay.waits).toEqual([]);
  });
});

describe("LastKnownUserPreferencesService", () => {
  function setup(inner: { getPreferences(userId: string): Promise<UserPreferences | null> }) {
    const cache = new FakeCache<UserPreferences>();
    const logger = new FakeLogger();
    return { cache, logger, service: new LastKnownUserPreferencesService(inner, cache, logger) };
  }

  it("retourne les préférences du service et les mémorise", async () => {
    const { service, cache } = setup({ getPreferences: async () => ALICE });

    await expect(service.getPreferences("alice")).resolves.toBe(ALICE);
    expect(cache.entries.get("alice")).toBe(ALICE);
  });

  it("service en panne -> dernières préférences connues, avec une alerte", async () => {
    const { service, cache, logger } = setup({ getPreferences: () => Promise.reject(new Error("panne")) });
    cache.entries.set("alice", ALICE);

    await expect(service.getPreferences("alice")).resolves.toBe(ALICE);
    expect(logger.warnings).toHaveLength(1);
  });

  it("service en panne et utilisateur jamais vu -> l'erreur remonte", async () => {
    const { service } = setup({ getPreferences: () => Promise.reject(new Error("panne")) });

    await expect(service.getPreferences("alice")).rejects.toThrow("panne");
  });

  it("utilisateur inconnu -> null, rien n'est mémorisé", async () => {
    const { service, cache } = setup({ getPreferences: async () => null });

    await expect(service.getPreferences("inconnu")).resolves.toBeNull();
    expect(cache.entries.size).toBe(0);
  });

  it("mémorisation impossible -> les préférences sont quand même retournées", async () => {
    const { service, cache, logger } = setup({ getPreferences: async () => ALICE });
    cache.failOnSet = true;

    await expect(service.getPreferences("alice")).resolves.toBe(ALICE);
    expect(logger.warnings).toHaveLength(1);
  });
});

describe("JsonFileCache", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "reveil-musical-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("conserve les valeurs entre deux instances, donc entre deux lancements", async () => {
    const file = join(directory, "sous-dossier", "cache.json");

    await new JsonFileCache<number>(file).set("a", 1);
    await new JsonFileCache<number>(file).set("b", 2);

    const reopened = new JsonFileCache<number>(file);
    await expect(reopened.get("a")).resolves.toBe(1);
    await expect(reopened.get("b")).resolves.toBe(2);
    expect(JSON.parse(await readFile(file, "utf8"))).toEqual({ a: 1, b: 2 });
  });

  it("retourne undefined pour une clé absente, un fichier absent ou une propriété héritée", async () => {
    const cache = new JsonFileCache<number>(join(directory, "absent.json"));

    await expect(cache.get("a")).resolves.toBeUndefined();
    await cache.set("a", 1);
    await expect(cache.get("b")).resolves.toBeUndefined();
    await expect(cache.get("constructor")).resolves.toBeUndefined();
  });

  it.each(["{ pas du json", "[1, 2]", "null", '"texte"'])("repart de zéro si le fichier est illisible (%s)", async (content) => {
    const file = join(directory, "cache.json");
    await writeFile(file, content);
    const cache = new JsonFileCache<number>(file);

    await expect(cache.get("a")).resolves.toBeUndefined();
    await cache.set("a", 1);
    await expect(cache.get("a")).resolves.toBe(1);
  });
});

describe("Pannes simulées et attente réelle", () => {
  it("InMemoryUserPreferencesService simule une panne du service de préférences", async () => {
    await expect(new InMemoryUserPreferencesService(["preferences"]).getPreferences("u-001")).rejects.toThrow(
      "indisponible",
    );
  });

  it("TimerDelay attend réellement la durée demandée", async () => {
    const start = performance.now();

    await new TimerDelay().wait(20);

    expect(performance.now() - start).toBeGreaterThanOrEqual(15);
  });
});
