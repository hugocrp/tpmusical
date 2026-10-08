import { describe, expect, it } from "vitest";
import { ChannelUnavailableError } from "../../src/domain/errors.js";
import { EmailNotificationChannel } from "../../src/infrastructure/notification/EmailNotificationChannel.js";
import { PushNotificationChannel } from "../../src/infrastructure/notification/PushNotificationChannel.js";
import { SmsNotificationChannel } from "../../src/infrastructure/notification/SmsNotificationChannel.js";
import { MockEmailClient } from "../../src/vendors/MockEmailClient.js";
import { MockPushService } from "../../src/vendors/MockPushService.js";
import { MockSmsGateway, SMS_MAX_LENGTH } from "../../src/vendors/MockSmsGateway.js";
import { FakeLineWriter } from "../fakes/FakeLineWriter.js";

describe("EmailNotificationChannel", () => {
  it("traduit le message en email : expéditeur configuré, titre en objet, corps en texte", async () => {
    const output = new FakeLineWriter();
    const channel = new EmailNotificationChannel(new MockEmailClient(output, []), "reveil@example.org");

    await channel.send("alice@example.org", { title: "Réveil musical", body: "Bonjour" });

    expect(output.lines).toEqual(['[EMAIL] de=reveil@example.org à=alice@example.org objet="Réveil musical" | Bonjour']);
  });

  it("conserve l'erreur du service d'email comme cause", async () => {
    const channel = new EmailNotificationChannel(new MockEmailClient(new FakeLineWriter(), ["email"]), "reveil@example.org");

    const failure = await channel.send("alice@example.org", { title: "t", body: "b" }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ChannelUnavailableError);
    expect(((failure as Error).cause as Error).message).toBe("SMTP 421 Service not available");
  });
});

describe("SmsNotificationChannel", () => {
  it("tronque le message à la taille maximale d'un SMS au lieu de le perdre", async () => {
    const output = new FakeLineWriter();
    const channel = new SmsNotificationChannel(new MockSmsGateway(output, []));

    await channel.send("+33600000001", { title: "Réveil musical", body: "x".repeat(300) });

    const text = output.lines[0]?.split(" | ")[1] ?? "";
    expect(text).toHaveLength(SMS_MAX_LENGTH);
    expect(text.endsWith("…")).toBe(true);
  });

  it("signale le code d'erreur de la passerelle", async () => {
    const channel = new SmsNotificationChannel(new MockSmsGateway(new FakeLineWriter(), ["sms"]));

    await expect(channel.send("+33600000001", { title: "t", body: "b" })).rejects.toThrow("GATEWAY_DOWN");
  });

  it("gère un rejet sans code d'erreur", async () => {
    const gateway = new MockSmsGateway(new FakeLineWriter(), []);
    gateway.sendSms = () => ({ status: "REJECTED" });

    await expect(new SmsNotificationChannel(gateway).send("+33600000001", { title: "t", body: "b" })).rejects.toThrow(
      "sans code",
    );
  });
});

describe("PushNotificationChannel", () => {
  it("traduit le message en notification push pour l'appareil de l'utilisateur", async () => {
    const output = new FakeLineWriter();
    const channel = new PushNotificationChannel(new MockPushService(output, []));

    await channel.send("device-token-alice", { title: "Réveil musical", body: "Bonjour" });

    expect(output.lines).toEqual(['[PUSH] appareil=device-token-alice titre="Réveil musical" | Bonjour']);
  });
});

describe("Mocks des services de notification", () => {
  it("MockEmailClient numérote les messages envoyés", async () => {
    const client = new MockEmailClient(new FakeLineWriter(), []);
    const mail = { from: "a@example.org", to: "b@example.org", subject: "s", text: "t" };

    await expect(client.sendMail(mail)).resolves.toEqual({ messageId: "mail-1" });
    await expect(client.sendMail(mail)).resolves.toEqual({ messageId: "mail-2" });
  });

  it("MockSmsGateway rejette un message trop long sans rien envoyer", () => {
    const output = new FakeLineWriter();
    const gateway = new MockSmsGateway(output, []);

    expect(gateway.sendSms("+33600000001", "x".repeat(SMS_MAX_LENGTH + 1))).toEqual({
      status: "REJECTED",
      errorCode: "MESSAGE_TOO_LONG",
    });
    expect(gateway.sendSms("+33600000001", "x".repeat(SMS_MAX_LENGTH))).toEqual({ status: "QUEUED" });
    expect(output.lines).toHaveLength(1);
  });
});
