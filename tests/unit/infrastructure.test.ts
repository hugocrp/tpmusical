import { afterEach, describe, expect, it, vi } from "vitest";
import { InMemoryCache } from "../../src/infrastructure/cache/InMemoryCache.js";
import { FetchHttpClient } from "../../src/infrastructure/http/FetchHttpClient.js";
import { ConsoleLogger } from "../../src/infrastructure/logging/ConsoleLogger.js";
import { InMemoryUserPreferencesService } from "../../src/infrastructure/preferences/InMemoryUserPreferencesService.js";
import { SystemClock } from "../../src/infrastructure/time/SystemClock.js";
import { ConsoleLineWriter } from "../../src/vendors/ConsoleLineWriter.js";
import { NOTIFICATION_CHANNEL_REGISTRY } from "../../src/config/providers.js";
import { FakeClock } from "../fakes/FakeClock.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("InMemoryCache", () => {
  it("retourne undefined pour une clé absente et la valeur pour une clé présente", async () => {
    const cache = new InMemoryCache<string, number | null>(new FakeClock(), 1_000);

    await cache.set("a", 1);
    await cache.set("vide", null);

    await expect(cache.get("a")).resolves.toBe(1);
    await expect(cache.get("vide")).resolves.toBeNull();
    await expect(cache.get("absente")).resolves.toBeUndefined();
  });

  it("oublie une entrée à l'expiration de sa durée de vie", async () => {
    const clock = new FakeClock();
    const cache = new InMemoryCache<string, number>(clock, 1_000);

    await cache.set("a", 1);
    clock.advance(999);
    await expect(cache.get("a")).resolves.toBe(1);
    clock.advance(1);
    await expect(cache.get("a")).resolves.toBeUndefined();
  });

  it("n'a pas d'état partagé entre instances", async () => {
    const clock = new FakeClock();
    const first = new InMemoryCache<string, number>(clock, 1_000);
    const second = new InMemoryCache<string, number>(clock, 1_000);

    await first.set("a", 1);

    await expect(second.get("a")).resolves.toBeUndefined();
  });
});

describe("FetchHttpClient", () => {
  it("envoie le User-Agent configuré, demande du JSON et borne l'attente", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const body = await new FetchHttpClient("ReveilMusical/1.0 (contact@example.org)", 3_000).getJson("https://example.org/x");

    expect(body).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://example.org/x");
    expect(init.headers).toEqual({ Accept: "application/json", "User-Agent": "ReveilMusical/1.0 (contact@example.org)" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("lève une erreur sur un statut HTTP en échec", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({}, { status: 503 })),
    );

    await expect(new FetchHttpClient("ua", 3_000).getJson("https://example.org/x")).rejects.toThrow("503");
  });

  it("abandonne une requête plus lente que le délai configuré", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      ),
    );

    await expect(new FetchHttpClient("ua", 10).getJson("https://example.org/lent")).rejects.toMatchObject({
      name: "TimeoutError",
    });
  });
});

describe("InMemoryUserPreferencesService", () => {
  const service = new InMemoryUserPreferencesService([]);

  it("retourne null pour un utilisateur inconnu", async () => {
    await expect(service.getPreferences("inconnu")).resolves.toBeNull();
  });

  it.each(["u-001", "u-002", "u-003"])("fournit des préférences cohérentes pour %s", async (userId) => {
    const preferences = await service.getPreferences(userId);

    expect(preferences?.userId).toBe(userId);
    expect(preferences?.fallbackTrack).not.toBe("");
    expect(Object.keys(NOTIFICATION_CHANNEL_REGISTRY)).toContain(preferences?.preferredChannel);
    expect(preferences?.addresses[preferences.preferredChannel]).toBeTruthy();
  });
});

describe("Adaptateurs système", () => {
  it("SystemClock donne l'heure courante en millisecondes", () => {
    const before = Date.now();
    const now = new SystemClock().now();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  it("ConsoleLogger écrit les informations et les alertes sur la console", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const logger = new ConsoleLogger();

    logger.info("tout va bien");
    logger.warn("attention");

    expect(log).toHaveBeenCalledWith("[info] tout va bien");
    expect(warn).toHaveBeenCalledWith("[alerte] attention");
  });

  it("ConsoleLineWriter écrit la ligne telle quelle", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    new ConsoleLineWriter().write("[SMS] bonjour");

    expect(log).toHaveBeenCalledWith("[SMS] bonjour");
  });
});
