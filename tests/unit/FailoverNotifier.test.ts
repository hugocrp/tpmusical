import { describe, expect, it } from "vitest";
import { FailoverNotifier } from "../../src/application/FailoverNotifier.js";
import { ChannelUnavailableError, NotificationFailedError } from "../../src/domain/errors.js";
import type { UserPreferences, WakeUpMessage } from "../../src/domain/types.js";
import { FakeDelay } from "../fakes/FakeDelay.js";
import { FakeLogger } from "../fakes/FakeLogger.js";
import { FakeNotificationChannel } from "../fakes/FakeNotificationChannel.js";
import { ALICE } from "../fakes/fixtures.js";

const MESSAGE: WakeUpMessage = { title: "Réveil musical", body: "Bonjour" };

describe("FailoverNotifier", () => {
  it("envoie sur le canal préféré, à l'adresse de l'utilisateur pour ce canal", async () => {
    const email = new FakeNotificationChannel();
    const sms = new FakeNotificationChannel();
    const notifier = new FailoverNotifier({ email, sms }, new FakeLogger(), new FakeDelay(), 1, 0);

    const delivery = await notifier.notify(ALICE, MESSAGE);

    expect(delivery).toEqual({ channel: "email", incidents: [] });
    expect(email.sent).toEqual([{ address: "alice@example.org", message: MESSAGE }]);
    expect(sms.sent).toEqual([]);
  });

  it("canal préféré en panne -> bascule sur un autre canal de l'utilisateur", async () => {
    const email = new FakeNotificationChannel(new ChannelUnavailableError("email", "panne"));
    const sms = new FakeNotificationChannel();
    const logger = new FakeLogger();
    const notifier = new FailoverNotifier({ email, sms }, logger, new FakeDelay(), 1, 0);

    const delivery = await notifier.notify(ALICE, MESSAGE);

    expect(delivery.channel).toBe("sms");
    expect(delivery.incidents).toEqual(['Canal "email" indisponible : panne']);
    expect(sms.sent).toEqual([{ address: "+33600000001", message: MESSAGE }]);
    expect(logger.warnings).toEqual(delivery.incidents);
  });

  it("canal préféré non installé -> bascule sur un autre canal", async () => {
    const sms = new FakeNotificationChannel();
    const notifier = new FailoverNotifier({ sms }, new FakeLogger(), new FakeDelay(), 1, 0);

    const delivery = await notifier.notify(ALICE, MESSAGE);

    expect(delivery.channel).toBe("sms");
    expect(delivery.incidents).toEqual(['Canal "email" non disponible sur cette installation']);
  });

  it("canal préféré sans adresse connue -> bascule sur un autre canal", async () => {
    const push = new FakeNotificationChannel();
    const email = new FakeNotificationChannel();
    const preferences: UserPreferences = { ...ALICE, preferredChannel: "push" };
    const notifier = new FailoverNotifier({ push, email }, new FakeLogger(), new FakeDelay(), 1, 0);

    const delivery = await notifier.notify(preferences, MESSAGE);

    expect(delivery.channel).toBe("email");
    expect(delivery.incidents).toEqual(['Aucune adresse connue pour le canal "push"']);
    expect(push.sent).toEqual([]);
  });

  it("ne confond pas un nom de canal avec une propriété héritée d'Object", async () => {
    const email = new FakeNotificationChannel();
    const preferences: UserPreferences = { ...ALICE, preferredChannel: "constructor" };
    const notifier = new FailoverNotifier({ email }, new FakeLogger(), new FakeDelay(), 1, 0);

    const delivery = await notifier.notify(preferences, MESSAGE);

    expect(delivery.channel).toBe("email");
  });

  it("erreur non standard d'un canal -> traitée comme une panne", async () => {
    const email = { send: () => Promise.reject("boom") };
    const sms = new FakeNotificationChannel();
    const notifier = new FailoverNotifier({ email, sms }, new FakeLogger(), new FakeDelay(), 1, 0);

    const delivery = await notifier.notify(ALICE, MESSAGE);

    expect(delivery).toEqual({ channel: "sms", incidents: ['Canal "email" en échec'] });
  });

  it("tous les canaux en panne -> NotificationFailedError détaillant chaque tentative", async () => {
    const email = new FakeNotificationChannel(new ChannelUnavailableError("email", "panne"));
    const sms = new FakeNotificationChannel(new ChannelUnavailableError("sms", "panne"));
    const notifier = new FailoverNotifier({ email, sms }, new FakeLogger(), new FakeDelay(), 1, 0);

    const failure = await notifier.notify(ALICE, MESSAGE).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(NotificationFailedError);
    expect((failure as NotificationFailedError).incidents).toEqual([
      'Canal "email" indisponible : panne',
      'Canal "sms" indisponible : panne',
    ]);
  });
});
