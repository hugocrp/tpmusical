import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { WakeUpService } from "../../src/application/WakeUpService.js";
import { loadEnvConfig } from "../../src/config/env.js";
import { buildContainer } from "../../src/container.js";
import { HTTP_CLIENT, MOCK_OUTPUT, PREFERENCES_CACHE } from "../../src/di/infrastructureTokens.js";
import { DELAY, LOGGER } from "../../src/di/tokens.js";
import type { UserPreferences } from "../../src/domain/types.js";
import { FakeCache } from "../fakes/FakeCache.js";
import { FakeDelay } from "../fakes/FakeDelay.js";
import { FakeHttpClient } from "../fakes/FakeHttpClient.js";
import { FakeLineWriter } from "../fakes/FakeLineWriter.js";
import { FakeLogger } from "../fakes/FakeLogger.js";
import { ITUNES_FOUND, MUSICBRAINZ_FOUND } from "../fakes/fixtures.js";

function setup(env: NodeJS.ProcessEnv = {}) {
  const httpClient = new FakeHttpClient().route("itunes.apple.com", ITUNES_FOUND).route("musicbrainz.org", MUSICBRAINZ_FOUND);
  const output = new FakeLineWriter();
  const logger = new FakeLogger();

  const container = buildContainer(loadEnvConfig(env));
  container.registerInstance(HTTP_CLIENT, httpClient);
  container.registerInstance(MOCK_OUTPUT, output);
  container.registerInstance(LOGGER, logger);
  container.registerInstance(DELAY, new FakeDelay());
  container.registerInstance(PREFERENCES_CACHE, new FakeCache<UserPreferences>());

  return { app: createApp(container.resolve(WakeUpService), logger), httpClient, output, logger };
}

const VALID_BODY = { userId: "u-001", day: "MARDI", weather: "PLUIE" };

describe("POST /wakeup", () => {
  it("200 : envoie le réveil et décrit ce qui s'est passé", async () => {
    const { app, output } = setup();

    const response = await request(app).post("/wakeup").send(VALID_BODY);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      userId: "u-001",
      track: { title: "Riders on the Storm", artist: "The Doors" },
      trackSource: "catalogue",
      channel: "email",
      degraded: false,
      incidents: [],
    });
    expect(output.lines).toHaveLength(1);
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("200 en mode dégradé : fournisseurs et canal préféré en panne, le réveil part quand même", async () => {
    const { app, httpClient, output } = setup({ SIMULATED_OUTAGES: "email" });
    httpClient.route("itunes", new Error("503")).route("musicbrainz", new Error("503"));

    const response = await request(app).post("/wakeup").send(VALID_BODY);

    expect(response.status).toBe(200);
    expect(response.body.trackSource).toBe("secours-local");
    expect(response.body.channel).toBe("sms");
    expect(response.body.degraded).toBe(true);
    expect(response.body.incidents).toHaveLength(2);
    expect(output.lines).toHaveLength(1);
  });

  it("la réponse ne contient aucun champ propre à un fournisseur", async () => {
    const { app } = setup();

    const response = await request(app).post("/wakeup").send(VALID_BODY);

    expect(response.text).not.toContain("trackViewUrl");
    expect(response.text).not.toContain("artist-credit");
  });

  it("deux demandes pour le même morceau -> un seul appel au fournisseur (le cache vit avec le serveur)", async () => {
    const { app, httpClient } = setup();

    await request(app).post("/wakeup").send(VALID_BODY);
    await request(app).post("/wakeup").send({ ...VALID_BODY, day: "MERCREDI" });

    expect(httpClient.requestedUrls).toHaveLength(1);
  });

  it.each([
    [{ userId: "u-001", day: "MARDI" }],
    [{ userId: "u-001", day: "MONDAY", weather: "PLUIE" }],
    [{ userId: "", day: "MARDI", weather: "PLUIE" }],
    [["u-001", "MARDI", "PLUIE"]],
  ])("400 : demande invalide (%j), aucun envoi", async (body) => {
    const { app, output } = setup();

    const response = await request(app).post("/wakeup").send(body);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Demande de réveil invalide");
    expect(output.lines).toEqual([]);
  });

  it("400 : corps JSON illisible ou absent", async () => {
    const { app } = setup();

    const malformed = await request(app).post("/wakeup").set("Content-Type", "application/json").send("{ userId: ");
    const missing = await request(app).post("/wakeup");

    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toContain("corps JSON illisible");
    expect(missing.status).toBe(400);
  });

  it("404 : utilisateur inconnu", async () => {
    const { app } = setup();

    const response = await request(app).post("/wakeup").send({ ...VALID_BODY, userId: "inconnu" });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain("inconnu");
  });

  it("503 : tous les canaux en panne, avec le détail de chaque tentative", async () => {
    const { app } = setup({ SIMULATED_OUTAGES: "email,sms,push" });

    const response = await request(app).post("/wakeup").send(VALID_BODY);

    expect(response.status).toBe(503);
    expect(response.body.incidents).toHaveLength(9);
  });

  it("503 : panne inattendue, journalisée, sans détail technique dans la réponse", async () => {
    const { app, logger } = setup({ SIMULATED_OUTAGES: "preferences" });

    const response = await request(app).post("/wakeup").send(VALID_BODY);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: "Réveil impossible pour le moment" });
    expect(logger.warnings).toEqual(["Réveil en échec : Service de préférences indisponible"]);
  });

  it("503 : erreur qui n'est pas une Error", async () => {
    const logger = new FakeLogger();
    const failing = { wakeUp: () => Promise.reject("boom") } as unknown as WakeUpService;

    const response = await request(createApp(failing, logger)).post("/wakeup").send(VALID_BODY);

    expect(response.status).toBe(503);
    expect(logger.warnings).toEqual(["Réveil en échec : erreur inconnue"]);
  });

  it("404 : route inconnue", async () => {
    const { app } = setup();

    expect((await request(app).get("/wakeup")).status).toBe(404);
  });
});
